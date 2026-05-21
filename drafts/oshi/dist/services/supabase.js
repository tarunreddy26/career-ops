"use strict";
/**
 * Supabase Client + Genki DB Helpers
 *
 * Initializes the Supabase client and provides typed helper
 * functions for reading/writing genki state to the users table.
 *
 * All DB access goes through this file — if we ever swap
 * Supabase for another provider, only this file changes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseClient = getSupabaseClient;
exports.getUserGenkiState = getUserGenkiState;
exports.updateUserGenkiState = updateUserGenkiState;
const supabase_js_1 = require("@supabase/supabase-js");
const genki_meter_1 = require("./genki-meter");
// ─── Singleton client ──────────────────────────────────────
let supabase = null;
/**
 * Returns the Supabase client, creating it on first call.
 * Reads SUPABASE_URL and SUPABASE_ANON_KEY from env vars.
 */
function getSupabaseClient() {
    if (supabase)
        return supabase;
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
        throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env — " +
            "see .env.example for required variables");
    }
    supabase = (0, supabase_js_1.createClient)(url, anonKey);
    console.log("[Supabase] Client initialized");
    return supabase;
}
// ─── DB Helper Functions ───────────────────────────────────
/**
 * Fetches the genki state for a user. If the user doesn't
 * exist yet, creates a new row with default values.
 *
 * @param userId - Unique user identifier
 * @returns GenkiUserState with current values from DB
 */
async function getUserGenkiState(userId) {
    const client = getSupabaseClient();
    // Try to fetch existing user
    const { data, error } = await client
        .from("users")
        .select("genki_value, last_active_at, last_checkin_at")
        .eq("user_id", userId)
        .single();
    if (error && error.code === "PGRST116") {
        // No row found — create a new user with defaults
        return createNewUser(userId);
    }
    if (error) {
        throw new Error(`[Supabase] Failed to fetch user: ${error.message}`);
    }
    const row = data;
    return {
        genki_value: row.genki_value,
        last_active_at: new Date(row.last_active_at),
        last_checkin_at: new Date(row.last_checkin_at),
    };
}
/**
 * Creates a new user row with default genki values.
 * Called automatically when getUserGenkiState finds no existing row.
 *
 * Default: genki 80, last_active_at = now, last_checkin_at = epoch
 * (epoch ensures first session open gets the daily check-in bonus)
 */
async function createNewUser(userId) {
    const client = getSupabaseClient();
    const now = new Date();
    const newState = {
        genki_value: genki_meter_1.DEFAULT_GENKI_VALUE,
        last_active_at: now,
        last_checkin_at: new Date(0), // epoch — first open gets daily bonus
    };
    const { error } = await client
        .from("users")
        .insert({
        user_id: userId,
        genki_value: newState.genki_value,
        last_active_at: now.toISOString(),
        last_checkin_at: newState.last_checkin_at.toISOString(),
    });
    if (error) {
        throw new Error(`[Supabase] Failed to create user: ${error.message}`);
    }
    console.log(`[Supabase] New user created: ${userId} (genki: ${genki_meter_1.DEFAULT_GENKI_VALUE})`);
    return newState;
}
/**
 * Updates the genki state for an existing user.
 * Called after session-open or message bonus calculations.
 *
 * @param userId - Unique user identifier
 * @param updates - Partial genki state fields to update
 */
async function updateUserGenkiState(userId, updates) {
    const client = getSupabaseClient();
    // Build the update payload — only include fields that changed
    const payload = {};
    if (updates.genki_value !== undefined) {
        payload.genki_value = updates.genki_value;
    }
    if (updates.last_active_at) {
        payload.last_active_at = updates.last_active_at.toISOString();
    }
    if (updates.last_checkin_at) {
        payload.last_checkin_at = updates.last_checkin_at.toISOString();
    }
    const { error } = await client
        .from("users")
        .update(payload)
        .eq("user_id", userId);
    if (error) {
        throw new Error(`[Supabase] Failed to update user: ${error.message}`);
    }
}
//# sourceMappingURL=supabase.js.map