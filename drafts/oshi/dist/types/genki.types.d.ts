/**
 * Type definitions for the Genki Meter — Daily Retention Loop
 *
 * The genki meter is a persistent energy value (0–100) tied to each
 * user's relationship with their vtuber. It decays when inactive
 * and restores through daily interaction.
 */
/** The four animation/behaviour tiers based on genki value */
export type GenkiTier = "full_energy" | "good" | "tired" | "very_tired";
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
export declare const GENKI_TIER_THRESHOLDS: {
    readonly full_energy: {
        readonly min: 76;
        readonly max: 100;
    };
    readonly good: {
        readonly min: 51;
        readonly max: 75;
    };
    readonly tired: {
        readonly min: 26;
        readonly max: 50;
    };
    readonly very_tired: {
        readonly min: 0;
        readonly max: 25;
    };
};
/**
 * Return dialogue tiers — injected into the AI system prompt
 * based on how long the user was absent.
 */
export type ReturnDialogueTier = "short_absence" | "medium_absence" | "long_absence" | "no_absence";
/** System prompt additions for each return dialogue tier */
export declare const RETURN_DIALOGUE_PROMPTS: Record<ReturnDialogueTier, string>;
/** Stored genki state for a user (maps to DB fields) */
export interface GenkiUserState {
    /** Current genki level, 0–100. Default 80 for new users. */
    genki_value: number;
    /** UTC timestamp of the user's last session open */
    last_active_at: Date;
    /** UTC timestamp of last daily check-in reward granted */
    last_checkin_at: Date;
}
/** Result of the decay calculation */
export interface DecayResult {
    /** New genki value after decay is applied */
    new_genki_value: number;
    /** How many full days elapsed since last active */
    days_elapsed: number;
    /** How many points were subtracted */
    decay_applied: number;
}
/** Result of the restore calculation */
export interface RestoreResult {
    /** New genki value after restore is applied */
    new_genki_value: number;
    /** Points added from daily check-in (+20 or 0) */
    daily_bonus_applied: number;
    /** Whether the daily check-in was granted this call */
    daily_checkin_granted: boolean;
}
/** Result of applying +2 per message (capped at +10/session) */
export interface MessageRestoreResult {
    /** New genki value after message bonus */
    new_genki_value: number;
    /** Points added this message (+2 or 0 if cap hit) */
    points_added: number;
    /** Total message bonus accumulated this session so far */
    session_total: number;
}
/** Response shape for the session-open API endpoint */
export interface SessionOpenResponse {
    /** Current genki value after decay + daily restore */
    genki_value: number;
    /** Which animation tier to display */
    genki_tier: GenkiTier;
    /** Full days of inactivity (for return dialogue selection) */
    days_elapsed: number;
    /** Which return dialogue tier to use */
    return_dialogue_tier: ReturnDialogueTier;
    /** System prompt addition for the return dialogue */
    return_dialogue_prompt: string;
    /** Breakdown of what happened during this session open */
    breakdown: {
        previous_genki: number;
        decay_applied: number;
        daily_bonus_applied: number;
        final_genki: number;
    };
}
//# sourceMappingURL=genki.types.d.ts.map