"use strict";
/**
 * Genki Meter Service — Pure functions for decay, restore, and tier logic
 *
 * All functions are pure (no side effects, no DB access) so they can
 * be unit tested in isolation. The session-open route composes these
 * to compute the full genki update on each session open.
 *
 * Decay formula (from brief):
 *   hours_elapsed = (now - last_active_at) / 3600
 *   days_elapsed  = floor(hours_elapsed / 24)
 *   decay         = min(days_elapsed * 10, 70)
 *   genki_value   = max(genki_value - decay, 0)
 *
 * Restore rules:
 *   +20 on first open of the day (daily check-in)
 *   +2 per message sent, capped at +10 per session
 *   Max genki: 100
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_GENKI_VALUE = void 0;
exports.calculateDecay = calculateDecay;
exports.applyDailyCheckin = applyDailyCheckin;
exports.applyMessageBonus = applyMessageBonus;
exports.getGenkiTier = getGenkiTier;
exports.getReturnDialogueTier = getReturnDialogueTier;
exports.processSessionOpen = processSessionOpen;
// ─── Constants from the brief ──────────────────────────────
/** Points lost per 24 hours of inactivity */
const DECAY_PER_DAY = 10;
/** Maximum total decay in a single calculation — even a week
 *  away doesn't fully zero her out (leaves an ember at 10) */
const MAX_DECAY = 70;
/** Genki floor — never goes below this */
const GENKI_FLOOR = 0;
/** Genki ceiling — never exceeds this */
const GENKI_CAP = 100;
/** Default genki value for brand new users */
exports.DEFAULT_GENKI_VALUE = 80;
/** Points granted on first open of the day */
const DAILY_CHECKIN_BONUS = 20;
/** Points granted per message sent */
const MESSAGE_BONUS = 2;
/** Maximum message bonus points per session */
const MESSAGE_BONUS_CAP = 10;
// ─── Decay ─────────────────────────────────────────────────
/**
 * Calculates genki decay based on time elapsed since last activity.
 * Run server-side on each session open.
 *
 * @param currentGenki - Current genki value before decay
 * @param lastActiveAt - When the user was last active (UTC)
 * @param now - Current time (injectable for testing)
 * @returns DecayResult with new value, days elapsed, and decay applied
 */
function calculateDecay(currentGenki, lastActiveAt, now = new Date()) {
    // Calculate full days of inactivity
    const msElapsed = now.getTime() - lastActiveAt.getTime();
    const hoursElapsed = msElapsed / (1000 * 60 * 60);
    const daysElapsed = Math.floor(hoursElapsed / 24);
    // No decay if less than 24 hours have passed
    if (daysElapsed <= 0) {
        return {
            new_genki_value: currentGenki,
            days_elapsed: 0,
            decay_applied: 0,
        };
    }
    // Apply decay: -10 per day, capped at 70 max decay
    const rawDecay = daysElapsed * DECAY_PER_DAY;
    const cappedDecay = Math.min(rawDecay, MAX_DECAY);
    // Floor at 0 — genki never goes negative
    const newGenki = Math.max(currentGenki - cappedDecay, GENKI_FLOOR);
    const actualDecay = currentGenki - newGenki;
    return {
        new_genki_value: newGenki,
        days_elapsed: daysElapsed,
        decay_applied: actualDecay,
    };
}
// ─── Restore: Daily Check-in ───────────────────────────────
/**
 * Applies the daily check-in bonus (+20) if the user hasn't
 * already received it today. Checks last_checkin_at to prevent
 * double-granting within the same calendar day (UTC).
 *
 * @param currentGenki - Current genki value (after decay)
 * @param lastCheckinAt - When the last daily bonus was granted
 * @param now - Current time (injectable for testing)
 * @returns RestoreResult with new value and whether bonus was granted
 */
function applyDailyCheckin(currentGenki, lastCheckinAt, now = new Date()) {
    // Check if the last check-in was on a different UTC day
    const lastCheckinDay = lastCheckinAt.toISOString().slice(0, 10);
    const todayDay = now.toISOString().slice(0, 10);
    const isNewDay = lastCheckinDay !== todayDay;
    if (!isNewDay) {
        // Already checked in today — no bonus
        return {
            new_genki_value: currentGenki,
            daily_bonus_applied: 0,
            daily_checkin_granted: false,
        };
    }
    // Grant the +20 daily bonus, capped at 100
    const bonusApplied = Math.min(DAILY_CHECKIN_BONUS, GENKI_CAP - currentGenki);
    const newGenki = Math.min(currentGenki + DAILY_CHECKIN_BONUS, GENKI_CAP);
    return {
        new_genki_value: newGenki,
        daily_bonus_applied: bonusApplied,
        daily_checkin_granted: true,
    };
}
// ─── Restore: Message Bonus ────────────────────────────────
/**
 * Applies the per-message bonus (+2 per message, capped at
 * +10 per session). Called each time the user sends a message.
 *
 * @param currentGenki - Current genki value
 * @param sessionMessagePoints - Total message points already
 *   earned this session (caller tracks this)
 * @returns MessageRestoreResult with updated values
 */
function applyMessageBonus(currentGenki, sessionMessagePoints) {
    // Check if we've hit the per-session cap
    if (sessionMessagePoints >= MESSAGE_BONUS_CAP) {
        return {
            new_genki_value: currentGenki,
            points_added: 0,
            session_total: sessionMessagePoints,
        };
    }
    // Calculate how many points we can actually add
    const remainingSessionCap = MESSAGE_BONUS_CAP - sessionMessagePoints;
    const pointsToAdd = Math.min(MESSAGE_BONUS, remainingSessionCap);
    // Cap at 100 — genki never exceeds max
    const actualPointsAdded = Math.min(pointsToAdd, GENKI_CAP - currentGenki);
    const newGenki = currentGenki + actualPointsAdded;
    return {
        new_genki_value: newGenki,
        points_added: actualPointsAdded,
        session_total: sessionMessagePoints + actualPointsAdded,
    };
}
// ─── Tier Mapping ──────────────────────────────────────────
/**
 * Maps a genki value (0–100) to its animation tier.
 * Used by the frontend + VRM controller to set the
 * correct idle animation state.
 */
function getGenkiTier(genkiValue) {
    if (genkiValue >= 76)
        return "full_energy";
    if (genkiValue >= 51)
        return "good";
    if (genkiValue >= 26)
        return "tired";
    return "very_tired";
}
// ─── Return Dialogue Tier ──────────────────────────────────
/**
 * Determines the return dialogue tier based on days absent.
 * The AI system prompt uses this to set her emotional tone
 * on the user's return.
 *
 * | Days Away | Tier            |
 * |-----------|-----------------|
 * | 0         | no_absence      |
 * | 1–2       | short_absence   |
 * | 3–6       | medium_absence  |
 * | 7+        | long_absence    |
 */
function getReturnDialogueTier(daysElapsed) {
    if (daysElapsed <= 0)
        return "no_absence";
    if (daysElapsed <= 2)
        return "short_absence";
    if (daysElapsed <= 6)
        return "medium_absence";
    return "long_absence";
}
// ─── Full Session Open (composes all the above) ────────────
/**
 * Runs the complete session-open calculation:
 * 1. Calculate decay from inactivity
 * 2. Apply daily check-in bonus (if new day)
 * 3. Determine tier and return dialogue
 *
 * This is the main function the API route calls.
 * It takes the user's stored state and returns everything
 * the frontend needs.
 *
 * @param genkiValue - Stored genki value from DB
 * @param lastActiveAt - Stored last_active_at from DB
 * @param lastCheckinAt - Stored last_checkin_at from DB
 * @param now - Current time (injectable for testing)
 */
function processSessionOpen(genkiValue, lastActiveAt, lastCheckinAt, now = new Date()) {
    const previousGenki = genkiValue;
    // Step 1: Apply decay
    const decayResult = calculateDecay(genkiValue, lastActiveAt, now);
    // Step 2: Apply daily check-in bonus
    const restoreResult = applyDailyCheckin(decayResult.new_genki_value, lastCheckinAt, now);
    // Step 3: Determine tier and dialogue
    const finalGenki = restoreResult.new_genki_value;
    const genkiTier = getGenkiTier(finalGenki);
    const returnDialogueTier = getReturnDialogueTier(decayResult.days_elapsed);
    return {
        genki_value: finalGenki,
        genki_tier: genkiTier,
        days_elapsed: decayResult.days_elapsed,
        return_dialogue_tier: returnDialogueTier,
        decay_applied: decayResult.decay_applied,
        daily_bonus_applied: restoreResult.daily_bonus_applied,
    };
}
//# sourceMappingURL=genki-meter.js.map