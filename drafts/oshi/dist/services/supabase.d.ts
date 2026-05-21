/**
 * Supabase Client + Genki DB Helpers
 *
 * Initializes the Supabase client and provides typed helper
 * functions for reading/writing genki state to the users table.
 *
 * All DB access goes through this file — if we ever swap
 * Supabase for another provider, only this file changes.
 */
import { SupabaseClient } from "@supabase/supabase-js";
import type { GenkiUserState } from "../types/genki.types";
/**
 * Returns the Supabase client, creating it on first call.
 * Reads SUPABASE_URL and SUPABASE_ANON_KEY from env vars.
 */
export declare function getSupabaseClient(): SupabaseClient;
/**
 * Fetches the genki state for a user. If the user doesn't
 * exist yet, creates a new row with default values.
 *
 * @param userId - Unique user identifier
 * @returns GenkiUserState with current values from DB
 */
export declare function getUserGenkiState(userId: string): Promise<GenkiUserState>;
/**
 * Updates the genki state for an existing user.
 * Called after session-open or message bonus calculations.
 *
 * @param userId - Unique user identifier
 * @param updates - Partial genki state fields to update
 */
export declare function updateUserGenkiState(userId: string, updates: {
    genki_value?: number;
    last_active_at?: Date;
    last_checkin_at?: Date;
}): Promise<void>;
//# sourceMappingURL=supabase.d.ts.map