/**
 * WebSocket TTS Streaming Route — GET /api/tts/stream
 *
 * Real-time TTS streaming over WebSocket. Frontend sends text,
 * backend streams audio chunks back immediately as ElevenLabs
 * produces them (no buffering). Supports cancel/interrupt for
 * barge-in and queues up to 1 pending request.
 *
 * Message protocol defined in: src/types/ws-messages.types.ts
 */
import { FastifyInstance } from "fastify";
export declare function ttsStreamRoutes(fastify: FastifyInstance): Promise<void>;
//# sourceMappingURL=tts-stream.route.d.ts.map