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
import type { GenkiTier, ReturnDialogueTier, DecayResult, RestoreResult, MessageRestoreResult } from "../types/genki.types";
/** Default genki value for brand new users */
export declare const DEFAULT_GENKI_VALUE = 80;
/**
 * Calculates genki decay based on time elapsed since last activity.
 * Run server-side on each session open.
 *
 * @param currentGenki - Current genki value before decay
 * @param lastActiveAt - When the user was last active (UTC)
 * @param now - Current time (injectable for testing)
 * @returns DecayResult with new value, days elapsed, and decay applied
 */
export declare function calculateDecay(currentGenki: number, lastActiveAt: Date, now?: Date): DecayResult;
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
export declare function applyDailyCheckin(currentGenki: number, lastCheckinAt: Date, now?: Date): RestoreResult;
/**
 * Applies the per-message bonus (+2 per message, capped at
 * +10 per session). Called each time the user sends a message.
 *
 * @param currentGenki - Current genki value
 * @param sessionMessagePoints - Total message points already
 *   earned this session (caller tracks this)
 * @returns MessageRestoreResult with updated values
 */
export declare function applyMessageBonus(currentGenki: number, sessionMessagePoints: number): MessageRestoreResult;
/**
 * Maps a genki value (0–100) to its animation tier.
 * Used by the frontend + VRM controller to set the
 * correct idle animation state.
 */
export declare function getGenkiTier(genkiValue: number): GenkiTier;
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
export declare function getReturnDialogueTier(daysElapsed: number): ReturnDialogueTier;
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
export declare function processSessionOpen(genkiValue: number, lastActiveAt: Date, lastCheckinAt: Date, now?: Date): {
    genki_value: number;
    genki_tier: GenkiTier;
    days_elapsed: number;
    return_dialogue_tier: ReturnDialogueTier;
    decay_applied: number;
    daily_bonus_applied: number;
};
//# sourceMappingURL=genki-meter.d.ts.map