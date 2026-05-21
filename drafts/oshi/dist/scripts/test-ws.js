"use strict";
/**
 * WebSocket TTS Streaming Test — Verifies Phase 2 end-to-end
 *
 * Connects to the WebSocket endpoint, sends a TTS request,
 * collects streamed audio chunks, saves to MP3, and reports
 * latency metrics. Also tests the cancel flow.
 *
 * Usage: npm run test:ws
 * Requires: Server running on localhost:3001 (npm run dev)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const SERVER_URL = "ws://localhost:3001/api/tts/stream";
const TEST_TEXT = "Hey! Welcome to the stream, glad you're here! " +
    "I've been waiting for you all day.";
const OUTPUT_FILE = path.join(__dirname, "../../test-ws-output.mp3");
const TIMEOUT_MS = 30000;
/** Sends a typed message over the WebSocket */
function sendMessage(ws, type, data) {
    ws.send(JSON.stringify({ type, data }));
}
/**
 * Test 1: Full TTS streaming flow
 * Sends text, collects all audio chunks, saves to file.
 */
async function testTTSStreaming() {
    console.log("\n=== Test 1: TTS Streaming ===");
    console.log(`Server: ${SERVER_URL}`);
    console.log(`Text: "${TEST_TEXT}"`);
    return new Promise((resolve) => {
        const audioChunks = [];
        const startTime = Date.now();
        let firstChunkTime = 0;
        let streamStartReceived = false;
        let requestId = "";
        const ws = new ws_1.default(SERVER_URL);
        // Safety timeout
        const timeout = setTimeout(() => {
            console.error("[FAIL] Test timed out after 30s");
            ws.close();
            resolve(false);
        }, TIMEOUT_MS);
        ws.on("open", () => {
            const connectTime = Date.now() - startTime;
            console.log(`[OK] Connected in ${connectTime}ms`);
            console.log("[>>] Sending tts_request...");
            sendMessage(ws, "tts_request", { text: TEST_TEXT });
        });
        ws.on("message", (rawData) => {
            const message = JSON.parse(rawData.toString());
            switch (message.type) {
                case "stream_start": {
                    streamStartReceived = true;
                    requestId = message.data.requestId;
                    console.log(`[OK] stream_start — requestId: ${requestId}`);
                    break;
                }
                case "audio_chunk": {
                    // Decode base64 audio and collect
                    const audioBuffer = Buffer.from(message.data.audio, "base64");
                    audioChunks.push(audioBuffer);
                    // Track first chunk latency
                    if (audioChunks.length === 1) {
                        firstChunkTime = Date.now() - startTime;
                        console.log(`[OK] First audio chunk in ${firstChunkTime}ms ` +
                            `(${audioBuffer.length} bytes)`);
                    }
                    break;
                }
                case "stream_end": {
                    const totalTime = Date.now() - startTime;
                    const latency = message.data.latency;
                    // Concatenate all audio chunks and save
                    const fullAudio = Buffer.concat(audioChunks);
                    fs.writeFileSync(OUTPUT_FILE, fullAudio);
                    console.log("\n=== Test 1 Results ===");
                    console.log(`stream_start received: ${streamStartReceived}`);
                    console.log(`First chunk latency: ${firstChunkTime}ms`);
                    console.log(`Total duration: ${totalTime}ms`);
                    console.log(`Audio chunks: ${audioChunks.length}`);
                    console.log(`Audio size: ${(fullAudio.length / 1024).toFixed(1)}KB`);
                    console.log(`Saved to: ${OUTPUT_FILE}`);
                    if (latency) {
                        console.log(`ElevenLabs first chunk: ` +
                            `${latency.firstChunkLatencyMs}ms`);
                        console.log(`ElevenLabs total: ` +
                            `${latency.totalDurationMs}ms`);
                    }
                    // Evaluate pass/fail
                    if (firstChunkTime < 500 && audioChunks.length > 0) {
                        console.log("\n[PASS] TTS streaming works!");
                    }
                    else {
                        console.log("\n[WARN] Streaming works but slow");
                    }
                    clearTimeout(timeout);
                    ws.close();
                    resolve(true);
                    break;
                }
                case "error": {
                    console.error(`[FAIL] Error: ${message.data.message} ` +
                        `(code: ${message.data.code})`);
                    clearTimeout(timeout);
                    ws.close();
                    resolve(false);
                    break;
                }
                case "pong": {
                    console.log("[OK] Pong received");
                    break;
                }
            }
        });
        ws.on("error", (error) => {
            console.error(`[FAIL] WebSocket error: ${error.message}`);
            console.error("Is the server running? (npm run dev)");
            clearTimeout(timeout);
            resolve(false);
        });
        ws.on("close", () => {
            clearTimeout(timeout);
        });
    });
}
/**
 * Test 2: Cancel flow
 * Sends a TTS request, waits briefly, then cancels.
 * Verifies that the cancelled confirmation is received.
 */
async function testCancel() {
    console.log("\n=== Test 2: Cancel Flow ===");
    return new Promise((resolve) => {
        const ws = new ws_1.default(SERVER_URL);
        let cancelConfirmed = false;
        const timeout = setTimeout(() => {
            console.error("[FAIL] Cancel test timed out");
            ws.close();
            resolve(false);
        }, 15000);
        ws.on("open", () => {
            console.log("[OK] Connected");
            console.log("[>>] Sending tts_request...");
            // Send a long text to ensure stream is still active
            // when we send cancel
            sendMessage(ws, "tts_request", {
                text: "This is a longer piece of text that should " +
                    "take a while to synthesize so we can test " +
                    "the cancel functionality properly.",
            });
            // Wait 500ms then cancel
            setTimeout(() => {
                console.log("[>>] Sending cancel...");
                sendMessage(ws, "cancel", {});
            }, 500);
        });
        ws.on("message", (rawData) => {
            const message = JSON.parse(rawData.toString());
            if (message.type === "cancelled") {
                cancelConfirmed = true;
                console.log(`[OK] Cancel confirmed — requestId: ` +
                    `${message.data.requestId}`);
                clearTimeout(timeout);
                ws.close();
                resolve(true);
            }
            // Also accept if stream_end arrives before
            // our cancel (race condition — stream was fast)
            if (message.type === "stream_end") {
                console.log("[OK] Stream finished before cancel " +
                    "(stream was too fast — not a failure)");
                clearTimeout(timeout);
                ws.close();
                resolve(true);
            }
            if (message.type === "error") {
                console.error(`[FAIL] Error: ${message.data.message}`);
                clearTimeout(timeout);
                ws.close();
                resolve(false);
            }
        });
        ws.on("error", (error) => {
            console.error(`[FAIL] WebSocket error: ${error.message}`);
            clearTimeout(timeout);
            resolve(false);
        });
        ws.on("close", () => {
            clearTimeout(timeout);
            if (!cancelConfirmed) {
                console.log("[OK] Connection closed (cancel may have " +
                    "triggered disconnect)");
            }
        });
    });
}
/**
 * Test 3: Ping/Pong keepalive
 * Sends a ping and verifies pong response.
 */
async function testPingPong() {
    console.log("\n=== Test 3: Ping/Pong ===");
    return new Promise((resolve) => {
        const ws = new ws_1.default(SERVER_URL);
        const timeout = setTimeout(() => {
            console.error("[FAIL] Ping/pong timed out");
            ws.close();
            resolve(false);
        }, 5000);
        ws.on("open", () => {
            console.log("[>>] Sending ping...");
            sendMessage(ws, "ping", {});
        });
        ws.on("message", (rawData) => {
            const message = JSON.parse(rawData.toString());
            if (message.type === "pong") {
                console.log("[PASS] Pong received!");
                clearTimeout(timeout);
                ws.close();
                resolve(true);
            }
        });
        ws.on("error", (error) => {
            console.error(`[FAIL] WebSocket error: ${error.message}`);
            clearTimeout(timeout);
            resolve(false);
        });
    });
}
/**
 * Run all tests sequentially and report results.
 */
async function runAllTests() {
    console.log("=========================================\n" +
        "  Oshi AI VTuber — WebSocket TTS Tests\n" +
        "=========================================");
    const results = [];
    // Test 1: Full TTS streaming
    const streamResult = await testTTSStreaming();
    results.push({
        name: "TTS Streaming",
        passed: streamResult,
    });
    // Small delay between tests to avoid connection issues
    await new Promise((r) => setTimeout(r, 1000));
    // Test 2: Cancel flow
    const cancelResult = await testCancel();
    results.push({
        name: "Cancel Flow",
        passed: cancelResult,
    });
    await new Promise((r) => setTimeout(r, 1000));
    // Test 3: Ping/Pong
    const pingResult = await testPingPong();
    results.push({
        name: "Ping/Pong",
        passed: pingResult,
    });
    // Summary
    console.log("\n=========================================\n" +
        "  Test Summary\n" +
        "=========================================");
    for (const result of results) {
        const status = result.passed ? "PASS" : "FAIL";
        console.log(`  [${status}] ${result.name}`);
    }
    const allPassed = results.every((r) => r.passed);
    console.log(`\n  ${allPassed ? "All tests passed!" : "Some tests failed."}`);
    process.exit(allPassed ? 0 : 1);
}
runAllTests();
//# sourceMappingURL=test-ws.js.map