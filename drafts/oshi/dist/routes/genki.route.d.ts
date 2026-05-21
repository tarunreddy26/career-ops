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
import { FastifyInstance } from "fastify";
export declare function genkiRoutes(fastify: FastifyInstance): Promise<void>;
//# sourceMappingURL=genki.route.d.ts.map