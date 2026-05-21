/**
 * Genki Meter API Routes — Session Open & Message Bonus
 *
 * POST /api/genki/session-open
 *   Called when the user opens the app. Calculates decay from
 *   inactivity, applies daily check-in bonus, and returns the
 *   current genki state + return dialogue prompt.
 *
 * POST /api/genki/message
 *   Called each time the user sends a message. Applies +2 bonus
 *   (capped at +10 per session). Returns updated genki value.
 *
 * Persistence: Supabase (Postgres) — see src/services/supabase.ts
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  processSessionOpen,
  applyMessageBonus,
  getGenkiTier,
} from "../services/genki-meter";
import {
  getUserGenkiState,
  updateUserGenkiState,
} from "../services/supabase";
import {
  RETURN_DIALOGUE_PROMPTS,
} from "../types/genki.types";
import type {
  SessionOpenResponse,
} from "../types/genki.types";

// ─── Request/Response schemas ──────────────────────────────

interface SessionOpenBody {
  user_id: string;
}

interface MessageBody {
  user_id: string;
  /** Total message bonus points accumulated this session
   *  (tracked by the client — we validate server-side) */
  session_message_points: number;
}

// ─── Route registration ────────────────────────────────────

export async function genkiRoutes(
  fastify: FastifyInstance
): Promise<void> {
  /**
   * POST /api/genki/session-open
   *
   * Called on app open. Runs the full decay → restore → tier
   * calculation and returns everything the frontend needs to
   * animate the genki bar and set the VRM state.
   */
  fastify.post(
    "/api/genki/session-open",
    async (
      request: FastifyRequest<{ Body: SessionOpenBody }>,
      reply: FastifyReply
    ) => {
      const { user_id } = request.body;

      if (!user_id) {
        return reply.status(400).send({
          error: "user_id is required",
        });
      }

      try {
        const now = new Date();

        // Fetch current state from Supabase (auto-creates if new user)
        const state = await getUserGenkiState(user_id);
        const previousGenki = state.genki_value;

        // Run the full session-open calculation
        const result = processSessionOpen(
          state.genki_value,
          state.last_active_at,
          state.last_checkin_at,
          now
        );

        // Persist updated state to Supabase
        const updates: {
          genki_value: number;
          last_active_at: Date;
          last_checkin_at?: Date;
        } = {
          genki_value: result.genki_value,
          last_active_at: now,
        };

        // Only update last_checkin_at if daily bonus was granted
        if (result.daily_bonus_applied > 0) {
          updates.last_checkin_at = now;
        }
        await updateUserGenkiState(user_id, updates);

        // Build the response for the frontend
        const response: SessionOpenResponse = {
          genki_value: result.genki_value,
          genki_tier: result.genki_tier,
          days_elapsed: result.days_elapsed,
          return_dialogue_tier: result.return_dialogue_tier,
          return_dialogue_prompt:
            RETURN_DIALOGUE_PROMPTS[result.return_dialogue_tier],
          breakdown: {
            previous_genki: previousGenki,
            decay_applied: result.decay_applied,
            daily_bonus_applied: result.daily_bonus_applied,
            final_genki: result.genki_value,
          },
        };

        request.log.info({
          msg: "genki_session_open",
          user_id,
          previous: previousGenki,
          decay: result.decay_applied,
          daily_bonus: result.daily_bonus_applied,
          final: result.genki_value,
          tier: result.genki_tier,
          days_elapsed: result.days_elapsed,
        });

        return reply.send(response);
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : "Unknown error";
        request.log.error({
          msg: "genki_session_open_error",
          user_id,
          error: message,
        });
        return reply.status(500).send({
          error: "Failed to process session open",
          detail: message,
        });
      }
    }
  );

  /**
   * POST /api/genki/message
   *
   * Called each time the user sends a chat message.
   * Applies +2 bonus (capped at +10/session).
   * Returns the updated genki value and tier.
   */
  fastify.post(
    "/api/genki/message",
    async (
      request: FastifyRequest<{ Body: MessageBody }>,
      reply: FastifyReply
    ) => {
      const { user_id, session_message_points } = request.body;

      if (!user_id) {
        return reply.status(400).send({
          error: "user_id is required",
        });
      }

      try {
        // Fetch current state from Supabase
        const state = await getUserGenkiState(user_id);

        // Apply message bonus
        const result = applyMessageBonus(
          state.genki_value,
          session_message_points ?? 0
        );

        // Persist updated genki value
        await updateUserGenkiState(user_id, {
          genki_value: result.new_genki_value,
        });

        return reply.send({
          genki_value: result.new_genki_value,
          genki_tier: getGenkiTier(result.new_genki_value),
          points_added: result.points_added,
          session_total: result.session_total,
        });
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : "Unknown error";
        request.log.error({
          msg: "genki_message_error",
          user_id,
          error: message,
        });
        return reply.status(500).send({
          error: "Failed to apply message bonus",
          detail: message,
        });
      }
    }
  );

  /**
   * GET /api/genki/:user_id
   *
   * Returns the current genki state for a user without
   * modifying it. Useful for polling or reconnection.
   */
  fastify.get(
    "/api/genki/:user_id",
    async (
      request: FastifyRequest<{ Params: { user_id: string } }>,
      reply: FastifyReply
    ) => {
      const { user_id } = request.params;

      try {
        const state = await getUserGenkiState(user_id);

        return reply.send({
          genki_value: state.genki_value,
          genki_tier: getGenkiTier(state.genki_value),
          last_active_at: state.last_active_at.toISOString(),
          last_checkin_at: state.last_checkin_at.toISOString(),
        });
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : "Unknown error";
        return reply.status(500).send({
          error: "Failed to fetch genki state",
          detail: message,
        });
      }
    }
  );
}
