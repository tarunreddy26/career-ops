"use strict";
/**
 * Genki Meter Unit Tests — Pure function tests
 *
 * Tests all genki meter logic without needing a server or database.
 * Covers every acceptance criteria case from the brief:
 *   - New user default (80)
 *   - 1-day decay (-10)
 *   - 7-day max decay (-70, floor at 10)
 *   - Daily check-in grant (+20)
 *   - Message bonus cap (+10/session)
 *   - Genki never below 0 or above 100
 *
 * Usage: npm run test:genki
 */
Object.defineProperty(exports, "__esModule", { value: true });
const genki_meter_1 = require("../services/genki-meter");
// ─── Test helpers ──────────────────────────────────────────
let passed = 0;
let failed = 0;
/** Simple assertion — logs pass/fail for each test */
function assert(testName, actual, expected) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr === expectedStr) {
        passed++;
        console.log(`  ✅ ${testName}`);
    }
    else {
        failed++;
        console.log(`  ❌ ${testName}`);
        console.log(`     Expected: ${expectedStr}`);
        console.log(`     Actual:   ${actualStr}`);
    }
}
/** Creates a Date offset by the given hours from a base date */
function hoursAgo(hours, from = new Date()) {
    return new Date(from.getTime() - hours * 60 * 60 * 1000);
}
/** Creates a Date offset by the given days from a base date */
function daysAgo(days, from = new Date()) {
    return hoursAgo(days * 24, from);
}
// ─── Tests ─────────────────────────────────────────────────
console.log("Genki Meter Unit Tests");
console.log("======================\n");
// Use a fixed "now" for deterministic tests
const NOW = new Date("2026-03-25T12:00:00Z");
// ─── Decay Function Tests ──────────────────────────────────
console.log("1. Decay Function");
console.log("─────────────────");
// No decay if less than 24 hours
(() => {
    const result = (0, genki_meter_1.calculateDecay)(80, hoursAgo(23, NOW), NOW);
    assert("No decay at 23 hours", result.new_genki_value, 80);
    assert("0 days elapsed at 23h", result.days_elapsed, 0);
    assert("0 decay applied at 23h", result.decay_applied, 0);
})();
// 1 day decay: -10
(() => {
    const result = (0, genki_meter_1.calculateDecay)(80, daysAgo(1, NOW), NOW);
    assert("1-day decay: 80 → 70", result.new_genki_value, 70);
    assert("1 day elapsed", result.days_elapsed, 1);
    assert("10 decay applied", result.decay_applied, 10);
})();
// 2 day decay: -20
(() => {
    const result = (0, genki_meter_1.calculateDecay)(80, daysAgo(2, NOW), NOW);
    assert("2-day decay: 80 → 60", result.new_genki_value, 60);
    assert("2 days elapsed", result.days_elapsed, 2);
    assert("20 decay applied", result.decay_applied, 20);
})();
// 5 day decay: -50
(() => {
    const result = (0, genki_meter_1.calculateDecay)(80, daysAgo(5, NOW), NOW);
    assert("5-day decay: 80 → 30", result.new_genki_value, 30);
    assert("50 decay applied", result.decay_applied, 50);
})();
// 7 day decay: capped at -70 (80 - 70 = 10)
(() => {
    const result = (0, genki_meter_1.calculateDecay)(80, daysAgo(7, NOW), NOW);
    assert("7-day max decay: 80 → 10 (ember)", result.new_genki_value, 10);
    assert("70 max decay applied", result.decay_applied, 70);
})();
// 14 days — still capped at -70 (not -140)
(() => {
    const result = (0, genki_meter_1.calculateDecay)(80, daysAgo(14, NOW), NOW);
    assert("14-day decay still capped at 70: 80 → 10", result.new_genki_value, 10);
    assert("Still 70 max decay", result.decay_applied, 70);
})();
// Decay from low genki — floor at 0
(() => {
    const result = (0, genki_meter_1.calculateDecay)(15, daysAgo(3, NOW), NOW);
    assert("Decay floors at 0: 15 - 30 → 0", result.new_genki_value, 0);
    assert("Only 15 actually decayed", result.decay_applied, 15);
})();
// Zero genki stays at zero
(() => {
    const result = (0, genki_meter_1.calculateDecay)(0, daysAgo(5, NOW), NOW);
    assert("Zero stays zero", result.new_genki_value, 0);
    assert("0 decay from 0", result.decay_applied, 0);
})();
console.log("");
// ─── Daily Check-in Tests ──────────────────────────────────
console.log("2. Daily Check-in Restore");
console.log("─────────────────────────");
// First open of a new day: +20
(() => {
    const yesterday = new Date("2026-03-24T18:00:00Z");
    const result = (0, genki_meter_1.applyDailyCheckin)(60, yesterday, NOW);
    assert("Daily check-in: 60 → 80", result.new_genki_value, 80);
    assert("20 bonus applied", result.daily_bonus_applied, 20);
    assert("Check-in granted", result.daily_checkin_granted, true);
})();
// Already checked in today — no bonus
(() => {
    const earlierToday = new Date("2026-03-25T08:00:00Z");
    const result = (0, genki_meter_1.applyDailyCheckin)(60, earlierToday, NOW);
    assert("Same day: no bonus, stays 60", result.new_genki_value, 60);
    assert("0 bonus", result.daily_bonus_applied, 0);
    assert("Not granted", result.daily_checkin_granted, false);
})();
// Check-in at cap — doesn't exceed 100
(() => {
    const yesterday = new Date("2026-03-24T18:00:00Z");
    const result = (0, genki_meter_1.applyDailyCheckin)(90, yesterday, NOW);
    assert("Cap at 100: 90 + 20 → 100", result.new_genki_value, 100);
    assert("Only 10 actually added", result.daily_bonus_applied, 10);
})();
// Already at 100
(() => {
    const yesterday = new Date("2026-03-24T18:00:00Z");
    const result = (0, genki_meter_1.applyDailyCheckin)(100, yesterday, NOW);
    assert("Already 100: stays 100", result.new_genki_value, 100);
    assert("0 bonus at cap", result.daily_bonus_applied, 0);
})();
console.log("");
// ─── Message Bonus Tests ───────────────────────────────────
console.log("3. Message Bonus Restore");
console.log("────────────────────────");
// First message: +2
(() => {
    const result = (0, genki_meter_1.applyMessageBonus)(60, 0);
    assert("First msg: 60 → 62", result.new_genki_value, 62);
    assert("2 points added", result.points_added, 2);
    assert("Session total: 2", result.session_total, 2);
})();
// Fifth message: +2 (total 10 — at cap)
(() => {
    const result = (0, genki_meter_1.applyMessageBonus)(68, 8);
    assert("5th msg: 68 → 70", result.new_genki_value, 70);
    assert("2 points added", result.points_added, 2);
    assert("Session total: 10 (cap)", result.session_total, 10);
})();
// Sixth message: 0 (cap already hit)
(() => {
    const result = (0, genki_meter_1.applyMessageBonus)(70, 10);
    assert("6th msg: capped, stays 70", result.new_genki_value, 70);
    assert("0 points (capped)", result.points_added, 0);
    assert("Session total stays 10", result.session_total, 10);
})();
// Message at genki 99 — doesn't exceed 100
(() => {
    const result = (0, genki_meter_1.applyMessageBonus)(99, 0);
    assert("Message at 99: caps at 100", result.new_genki_value, 100);
    assert("Only 1 point added", result.points_added, 1);
})();
console.log("");
// ─── Tier Mapping Tests ────────────────────────────────────
console.log("4. Genki Tier Mapping");
console.log("─────────────────────");
assert("100 → full_energy", (0, genki_meter_1.getGenkiTier)(100), "full_energy");
assert("76 → full_energy", (0, genki_meter_1.getGenkiTier)(76), "full_energy");
assert("75 → good", (0, genki_meter_1.getGenkiTier)(75), "good");
assert("51 → good", (0, genki_meter_1.getGenkiTier)(51), "good");
assert("50 → tired", (0, genki_meter_1.getGenkiTier)(50), "tired");
assert("26 → tired", (0, genki_meter_1.getGenkiTier)(26), "tired");
assert("25 → very_tired", (0, genki_meter_1.getGenkiTier)(25), "very_tired");
assert("0 → very_tired", (0, genki_meter_1.getGenkiTier)(0), "very_tired");
console.log("");
// ─── Return Dialogue Tier Tests ────────────────────────────
console.log("5. Return Dialogue Tiers");
console.log("────────────────────────");
assert("0 days → no_absence", (0, genki_meter_1.getReturnDialogueTier)(0), "no_absence");
assert("1 day → short_absence", (0, genki_meter_1.getReturnDialogueTier)(1), "short_absence");
assert("2 days → short_absence", (0, genki_meter_1.getReturnDialogueTier)(2), "short_absence");
assert("3 days → medium_absence", (0, genki_meter_1.getReturnDialogueTier)(3), "medium_absence");
assert("5 days → medium_absence", (0, genki_meter_1.getReturnDialogueTier)(5), "medium_absence");
assert("6 days → medium_absence", (0, genki_meter_1.getReturnDialogueTier)(6), "medium_absence");
assert("7 days → long_absence", (0, genki_meter_1.getReturnDialogueTier)(7), "long_absence");
assert("30 days → long_absence", (0, genki_meter_1.getReturnDialogueTier)(30), "long_absence");
console.log("");
// ─── Full Session Open Integration Tests ───────────────────
console.log("6. Full Session Open (Integration)");
console.log("──────────────────────────────────");
// New user, first ever open (no decay, gets daily check-in)
(() => {
    const result = (0, genki_meter_1.processSessionOpen)(genki_meter_1.DEFAULT_GENKI_VALUE, // 80
    new Date("2026-03-24T12:00:00Z"), // last active yesterday
    new Date("2026-03-24T12:00:00Z"), // last checkin yesterday
    NOW);
    // Decay: 1 day × 10 = 10 → 80 - 10 = 70
    // Daily bonus: +20 → 70 + 20 = 90
    assert("Session open: decay + restore = 90", result.genki_value, 90);
    assert("Tier: full_energy", result.genki_tier, "full_energy");
    assert("1 day elapsed", result.days_elapsed, 1);
    assert("Short absence dialogue", result.return_dialogue_tier, "short_absence");
})();
// User gone for 7 days: max decay + daily bonus
(() => {
    const result = (0, genki_meter_1.processSessionOpen)(80, daysAgo(7, NOW), // last active 7 days ago
    daysAgo(7, NOW), // last checkin 7 days ago
    NOW);
    // Decay: 7 days × 10 = 70 (capped at 70) → 80 - 70 = 10
    // Daily bonus: +20 → 10 + 20 = 30
    assert("7-day absence: 80 → 10 → 30", result.genki_value, 30);
    assert("Tier: tired", result.genki_tier, "tired");
    assert("Long absence dialogue", result.return_dialogue_tier, "long_absence");
})();
// Same-day return — no decay, no daily bonus (already checked in)
(() => {
    const earlierToday = new Date("2026-03-25T08:00:00Z");
    const result = (0, genki_meter_1.processSessionOpen)(75, earlierToday, // active earlier today
    earlierToday, // checked in earlier today
    NOW);
    // No decay (< 24h), no daily bonus (same day)
    assert("Same-day return: stays 75", result.genki_value, 75);
    assert("Tier: good", result.genki_tier, "good");
    assert("No absence dialogue", result.return_dialogue_tier, "no_absence");
})();
// Edge: very low genki + long absence → floors at 0, then +20
(() => {
    const result = (0, genki_meter_1.processSessionOpen)(20, daysAgo(5, NOW), daysAgo(5, NOW), NOW);
    // Decay: 5 × 10 = 50 → 20 - 50 = 0 (floored)
    // Daily bonus: +20 → 0 + 20 = 20
    assert("Low genki + long absence: 20 → 0 → 20", result.genki_value, 20);
    assert("Tier: very_tired", result.genki_tier, "very_tired");
})();
console.log("");
// ─── Acceptance Criteria Verification ──────────────────────
console.log("7. Acceptance Criteria Checks");
console.log("─────────────────────────────");
// AC2: 24h inactive loses 10 points
(() => {
    const result = (0, genki_meter_1.calculateDecay)(80, daysAgo(1, NOW), NOW);
    assert("AC2: 24h inactive → -10 points", result.decay_applied, 10);
})();
// AC3: First open of day adds 20
(() => {
    const yesterday = new Date("2026-03-24T18:00:00Z");
    const result = (0, genki_meter_1.applyDailyCheckin)(50, yesterday, NOW);
    assert("AC3: First daily open → +20", result.daily_bonus_applied, 20);
})();
// AC3: Chatting adds up to 10 per session
(() => {
    let genki = 50;
    let sessionPoints = 0;
    // Send 6 messages — should cap at +10 total
    for (let i = 0; i < 6; i++) {
        const result = (0, genki_meter_1.applyMessageBonus)(genki, sessionPoints);
        genki = result.new_genki_value;
        sessionPoints = result.session_total;
    }
    assert("AC3: 6 messages → +10 cap (50 → 60)", genki, 60);
    assert("AC3: Session points capped at 10", sessionPoints, 10);
})();
// AC7: Genki never below 0
(() => {
    const result = (0, genki_meter_1.calculateDecay)(5, daysAgo(3, NOW), NOW);
    assert("AC7: Never below 0", result.new_genki_value >= 0, true);
})();
// AC7: Genki never above 100
(() => {
    const result = (0, genki_meter_1.applyDailyCheckin)(95, daysAgo(1, NOW), NOW);
    assert("AC7: Never above 100", result.new_genki_value <= 100, true);
})();
console.log("");
// ─── Results ───────────────────────────────────────────────
console.log("========================================");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("========================================");
if (failed > 0) {
    console.log("\n❌ SOME TESTS FAILED");
    process.exit(1);
}
else {
    console.log("\n✅ ALL TESTS PASSED");
    process.exit(0);
}
//# sourceMappingURL=test-genki.js.map