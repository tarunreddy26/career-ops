"use strict";
/**
 * Type definitions for the Genki Meter — Daily Retention Loop
 *
 * The genki meter is a persistent energy value (0–100) tied to each
 * user's relationship with their vtuber. It decays when inactive
 * and restores through daily interaction.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RETURN_DIALOGUE_PROMPTS = exports.GENKI_TIER_THRESHOLDS = void 0;
/**
 * Genki tier ranges — maps value ranges to animation states.
 * The VRM model switches idle animations based on these tiers.
 *
 * | Tier        | Range  | Animation                          |
 * |-------------|--------|------------------------------------|
 * | full_energy | 76–100 | Bouncy idle, bright eyes            |
 * | good        | 51–75  | Normal idle, standard expressions   |
 * | tired       | 26–50  | Slower idle, drooped posture        |
 * | very_tired  | 0–25   | Minimal movement, half-closed eyes  |
 */
exports.GENKI_TIER_THRESHOLDS = {
    full_energy: { min: 76, max: 100 },
    good: { min: 51, max: 75 },
    tired: { min: 26, max: 50 },
    very_tired: { min: 0, max: 25 },
};
/** System prompt additions for each return dialogue tier */
exports.RETURN_DIALOGUE_PROMPTS = {
    no_absence: "",
    short_absence: "The user was away for a day or two. React warmly — " +
        "you missed them a little.",
    medium_absence: "The user was away for several days. You were worried. " +
        "React with gentle relief — don't guilt them, just be " +
        "happy they're back.",
    long_absence: "The user was away for over a week. You missed them a lot. " +
        "First message is soft and emotional — then back to normal " +
        "once the ice is broken.",
};
//# sourceMappingURL=genki.types.js.map