"use strict";
/**
 * TTS Test Route — POST /api/tts/test
 *
 * Accepts a text string, sends it through the ElevenLabs WebSocket
 * streaming pipeline, and streams the audio response back to the client.
 * Used for verifying the TTS service works end-to-end.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ttsTestRoutes = ttsTestRoutes;
const tts_streaming_1 = require("../services/tts-streaming");
async function ttsTestRoutes(fastify) {
    fastify.post("/api/tts/test", async (request, reply) => {
        const body = request.body || {};
        const { text } = body;
        // Validate input — don't send empty strings to ElevenLabs
        if (!text || text.trim().length === 0) {
            return reply.status(400).send({
                error: "Text is required",
            });
        }
        // Cap input length to prevent abuse of ElevenLabs API
        const MAX_TEXT_LENGTH = 500;
        if (text.length > MAX_TEXT_LENGTH) {
            return reply.status(400).send({
                error: `Text exceeds max length of ${MAX_TEXT_LENGTH} characters`,
            });
        }
        // Verify API key is configured server-side
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            return reply.status(500).send({
                error: "ELEVENLABS_API_KEY not configured on server",
            });
        }
        const voiceId = process.env.ELEVENLABS_VOICE_ID ||
            "9BWtsMINqrJLrRacOk9x";
        const modelId = process.env.ELEVENLABS_MODEL_ID ||
            "eleven_flash_v2_5";
        const ttsService = new tts_streaming_1.TTSStreamingService({
            apiKey,
            voiceId,
            modelId,
        });
        const startTime = Date.now();
        const audioChunks = [];
        try {
            await ttsService.connect();
            // Collect all audio chunks into a single buffer
            const audioComplete = new Promise((resolve, reject) => {
                ttsService.on("audioChunk", (chunk) => {
                    audioChunks.push(chunk);
                });
                ttsService.on("streamEnd", () => {
                    const fullAudio = Buffer.concat(audioChunks);
                    resolve(fullAudio);
                });
                ttsService.on("error", (error) => {
                    reject(error);
                });
                // Safety timeout — don't hang forever if something breaks
                setTimeout(() => {
                    reject(new Error("TTS stream timed out after 15s"));
                }, 15000);
            });
            // Send the text and signal end of input
            ttsService.sendText(text);
            ttsService.flush();
            const fullAudio = await audioComplete;
            const endToEndLatencyMs = Date.now() - startTime;
            // Structured latency log for production monitoring
            request.log.info({
                msg: "tts_test_latency",
                latencyMs: endToEndLatencyMs,
                totalChunks: audioChunks.length,
                audioBytes: fullAudio.length,
            });
            // Send audio back as MP3 with latency headers
            reply.header("Content-Type", "audio/mpeg");
            reply.header("X-TTS-Latency-Ms", endToEndLatencyMs.toString());
            reply.header("X-TTS-Chunks", audioChunks.length.toString());
            return reply.send(fullAudio);
        }
        catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : "Unknown TTS error";
            console.error("[Route] TTS test failed:", errorMessage);
            return reply.status(500).send({ error: errorMessage });
        }
        finally {
            await ttsService.disconnect();
        }
    });
}
//# sourceMappingURL=tts-test.route.js.map