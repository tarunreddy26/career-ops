/**
 * TTS Test Route — POST /api/tts/test
 *
 * Accepts a text string, sends it through the ElevenLabs WebSocket
 * streaming pipeline, and streams the audio response back to the client.
 * Used for verifying the TTS service works end-to-end.
 */
import { FastifyInstance } from "fastify";
export declare function ttsTestRoutes(fastify: FastifyInstance): Promise<void>;
//# sourceMappingURL=tts-test.route.d.ts.map