"use strict";
/**
 * Standalone TTS Test Script
 *
 * Tests the ElevenLabs WebSocket streaming pipeline directly
 * without needing the Fastify server running.
 *
 * Usage: npx ts-node src/scripts/test-tts.ts
 * Output: Saves audio to test-output.mp3 and prints latency
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const tts_streaming_1 = require("../services/tts-streaming");
// Load env vars from project root
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") });
const TEST_SENTENCE = "Hey! Welcome to the stream, glad you're here!";
async function runTTSTest() {
    // Validate API key exists before attempting connection
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        console.error("ERROR: ELEVENLABS_API_KEY not found in .env file.\n" +
            "Copy .env.example to .env and add your key.");
        process.exit(1);
    }
    const voiceId = process.env.ELEVENLABS_VOICE_ID ||
        "9BWtsMINqrJLrRacOk9x";
    const modelId = process.env.ELEVENLABS_MODEL_ID ||
        "eleven_flash_v2_5";
    console.log("=== Oshi AI VTuber — TTS Streaming Test ===");
    console.log(`Voice ID: ${voiceId}`);
    console.log(`Model: ${modelId}`);
    console.log(`Test text: "${TEST_SENTENCE}"`);
    console.log("");
    const ttsService = new tts_streaming_1.TTSStreamingService({
        apiKey,
        voiceId,
        modelId,
    });
    const audioChunks = [];
    const startTime = Date.now();
    let firstChunkTime = null;
    // Track first audio chunk for latency measurement
    ttsService.on("streamStart", () => {
        firstChunkTime = Date.now();
        const latency = firstChunkTime - startTime;
        console.log(`[TEST] First audio chunk received — ${latency}ms`);
    });
    // Collect all audio chunks
    ttsService.on("audioChunk", (chunk) => {
        audioChunks.push(chunk);
    });
    // Log any errors
    ttsService.on("error", (error) => {
        console.error(`[TEST] Error: ${error.message}`);
    });
    try {
        // Step 1: Connect to ElevenLabs WebSocket
        console.log("[TEST] Connecting to ElevenLabs...");
        await ttsService.connect();
        const connectTime = Date.now() - startTime;
        console.log(`[TEST] Connected in ${connectTime}ms`);
        // Step 2: Send test text and wait for all audio
        const audioComplete = new Promise((resolve, reject) => {
            ttsService.on("streamEnd", resolve);
            ttsService.on("error", reject);
            // Safety timeout
            setTimeout(() => {
                reject(new Error("Test timed out after 15 seconds"));
            }, 15000);
        });
        console.log("[TEST] Sending text...");
        ttsService.sendText(TEST_SENTENCE);
        ttsService.flush();
        await audioComplete;
        // Step 3: Save audio to file
        const fullAudio = Buffer.concat(audioChunks);
        const outputPath = path_1.default.resolve(__dirname, "../../test-output.mp3");
        fs_1.default.writeFileSync(outputPath, fullAudio);
        // Step 4: Print results
        const totalLatency = Date.now() - startTime;
        const firstChunkLatency = firstChunkTime
            ? firstChunkTime - startTime
            : "N/A";
        console.log("");
        console.log("=== Test Results ===");
        console.log(`First chunk latency: ${firstChunkLatency}ms`);
        console.log(`Total duration: ${totalLatency}ms`);
        console.log(`Audio chunks: ${audioChunks.length}`);
        console.log(`Audio size: ${(fullAudio.length / 1024).toFixed(1)}KB`);
        console.log(`Saved to: ${outputPath}`);
        console.log("");
        // Check if we hit the latency target from the brief (<200ms)
        if (typeof firstChunkLatency === "number" &&
            firstChunkLatency < 200) {
            console.log("PASS — First chunk under 200ms target!");
        }
        else if (typeof firstChunkLatency === "number" &&
            firstChunkLatency < 500) {
            console.log("WARN — First chunk under 500ms but above 200ms target");
        }
        else {
            console.log("SLOW — First chunk above 500ms, investigate latency");
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[TEST] Failed: ${message}`);
        process.exit(1);
    }
    finally {
        await ttsService.disconnect();
    }
}
// Run the test
runTTSTest();
//# sourceMappingURL=test-tts.js.map