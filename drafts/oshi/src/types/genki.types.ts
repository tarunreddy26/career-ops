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
export const GENKI_TIER_THRESHOLDS = {
  full_energy: { min: 76, max: 100 },
  good: { min: 51, max: 75 },
  tired: { min: 26, max: 50 },
  very_tired: { min: 0, max: 25 },
} as const;

/**
 * Return dialogue tiers — injected into the AI system prompt
 * based on how long the user was absent.
 */
export type ReturnDialogueTier =
  | "short_absence"   // 1–2 days
  | "medium_absence"  // 3–5 days
  | "long_absence"    // 7+ days
  | "no_absence";     // same day or next day with < 24h gap

/** System prompt additions for each return dialogue tier */
export const RETURN_DIALOGUE_PROMPTS: Record<
  ReturnDialogueTier,
  string
> = {
  no_absence: "",
  short_absence:
    "The user was away for a day or two. React warmly — " +
    "you missed them a little.",
  medium_absence:
    "The user was away for several days. You were worried. " +
    "React with gentle relief — don't guilt them, just be " +
    "happy they're back.",
  long_absence:
    "The user was away for over a week. You missed them a lot. " +
    "First message is soft and emotional — then back to normal " +
    "once the ice is broken.",
};

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
