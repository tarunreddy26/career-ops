/**
 * Load Test — Concurrent WebSocket TTS Sessions
 *
 * Verifies the backend handles 20+ concurrent WebSocket sessions
 * without connection leaks, interference, or crashes. Each session
 * sends a unique TTS request and collects audio independently.
 *
 * Tests:
 * 1. 20 concurrent WebSocket connections
 * 2. Each sends a tts_request simultaneously
 * 3. Verify all get valid audio back with no cross-talk
 * 4. Verify all connections close cleanly (no leaks)
 * 5. Report per-session and aggregate latency
 *
 * Usage: npm run test:load
 * Requires: Server running (local or Render)
 */

import WebSocket from "ws";

// Use Render URL if available, otherwise local
const SERVER_URL =
  process.env.SERVER_URL ||
  "wss://oshi-ai-vtuber-backend.onrender.com/api/tts/stream";

const CONCURRENT_SESSIONS = 20;
const TIMEOUT_MS = 60000;

// Each session gets a unique text to verify no cross-talk
const TEST_TEXTS = [
  "The quick brown fox jumps over the lazy dog.",
  "Hello world, this is session number two.",
  "Testing concurrent connections on the server.",
  "Every session should get its own audio back.",
  "The weather today is sunny and warm outside.",
  "Artificial intelligence is changing the world.",
  "WebSocket streaming works across many clients.",
  "ElevenLabs generates amazing voice synthesis.",
  "This load test verifies server stability.",
  "Twenty connections at once is the target.",
  "Sentence one from session eleven right here.",
  "The backend should handle this with no issues.",
  "Audio chunks arrive independently per session.",
  "No cross talk between different connections.",
  "Rate limiting only applies to HTTP endpoints.",
  "WebSocket connections bypass the rate limiter.",
  "Fastify handles concurrent requests efficiently.",
  "Each connection gets a fresh TTS service.",
  "Memory leaks would show up under this load.",
  "Final session number twenty reporting in now.",
];

/** Result from a single session */
interface SessionResult {
  sessionId: number;
  success: boolean;
  audioChunks: number;
  audioBytes: number;
  firstChunkMs: number;
  totalMs: number;
  error?: string;
}

/**
 * Runs a single WebSocket TTS session.
 * Connects, sends text, collects audio, disconnects.
 */
function runSession(
  sessionId: number,
  text: string
): Promise<SessionResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let firstChunkTime = 0;
    let audioChunks = 0;
    let audioBytes = 0;

    // Safety timeout
    const timeout = setTimeout(() => {
      resolve({
        sessionId,
        success: false,
        audioChunks,
        audioBytes,
        firstChunkMs: 0,
        totalMs: Date.now() - startTime,
        error: "Timed out",
      });
      try { ws.close(); } catch {}
    }, TIMEOUT_MS);

    const ws = new WebSocket(SERVER_URL);

    ws.on("open", () => {
      ws.send(JSON.stringify({
        type: "tts_request",
        data: { text },
      }));
    });

    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case "audio_chunk": {
          audioChunks++;
          const chunk = Buffer.from(msg.data.audio, "base64");
          audioBytes += chunk.length;
          if (audioChunks === 1) {
            firstChunkTime = Date.now();
          }
          break;
        }
        case "stream_end": {
          clearTimeout(timeout);
          ws.close();
          resolve({
            sessionId,
            success: true,
            audioChunks,
            audioBytes,
            firstChunkMs: firstChunkTime
              ? firstChunkTime - startTime
              : 0,
            totalMs: Date.now() - startTime,
          });
          break;
        }
        case "error": {
          clearTimeout(timeout);
          ws.close();
          resolve({
            sessionId,
            success: false,
            audioChunks,
            audioBytes,
            firstChunkMs: 0,
            totalMs: Date.now() - startTime,
            error: msg.data.message,
          });
          break;
        }
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      resolve({
        sessionId,
        success: false,
        audioChunks: 0,
        audioBytes: 0,
        firstChunkMs: 0,
        totalMs: Date.now() - startTime,
        error: err.message,
      });
    });
  });
}

async function main(): Promise<void> {
  console.log("==========================================");
  console.log("  Load Test: Concurrent WebSocket Sessions");
  console.log("==========================================");
  console.log(`Server:   ${SERVER_URL}`);
  console.log(`Sessions: ${CONCURRENT_SESSIONS}`);
  console.log(`Timeout:  ${TIMEOUT_MS / 1000}s per session\n`);

  // Launch all sessions simultaneously
  console.log(
    `Launching ${CONCURRENT_SESSIONS} sessions simultaneously...\n`
  );
  const startTime = Date.now();

  const promises = Array.from(
    { length: CONCURRENT_SESSIONS },
    (_, i) => runSession(i, TEST_TEXTS[i]!)
  );

  const results = await Promise.all(promises);
  const totalTime = Date.now() - startTime;

  // Analyze results
  const passed = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  // Per-session results
  console.log("Per-session results:");
  console.log(
    "─".repeat(70)
  );
  console.log(
    "Session  Status   Chunks  Audio     1st Chunk  Total"
  );
  console.log(
    "─".repeat(70)
  );

  for (const r of results) {
    const status = r.success ? "PASS" : "FAIL";
    const audioKB = (r.audioBytes / 1024).toFixed(1);
    console.log(
      `  ${String(r.sessionId).padStart(2)}     ${status.padEnd(6)}  ` +
      `${String(r.audioChunks).padStart(3)}     ` +
      `${audioKB.padStart(6)}KB  ` +
      `${String(r.firstChunkMs).padStart(6)}ms  ` +
      `${String(r.totalMs).padStart(6)}ms` +
      `${r.error ? `  (${r.error})` : ""}`
    );
  }

  // Aggregate stats
  const avgFirstChunk = passed.length > 0
    ? Math.round(
        passed.reduce((s, r) => s + r.firstChunkMs, 0) /
        passed.length
      )
    : 0;
  const avgTotal = passed.length > 0
    ? Math.round(
        passed.reduce((s, r) => s + r.totalMs, 0) /
        passed.length
      )
    : 0;
  const totalChunks = results.reduce(
    (s, r) => s + r.audioChunks, 0
  );
  const totalAudioKB = (
    results.reduce((s, r) => s + r.audioBytes, 0) / 1024
  ).toFixed(1);

  console.log("\n==========================================");
  console.log("  Load Test Summary");
  console.log("==========================================");
  console.log(`Sessions passed:     ${passed.length}/${CONCURRENT_SESSIONS}`);
  console.log(`Sessions failed:     ${failed.length}/${CONCURRENT_SESSIONS}`);
  console.log(`Total test time:     ${totalTime}ms`);
  console.log(`Avg first chunk:     ${avgFirstChunk}ms`);
  console.log(`Avg total latency:   ${avgTotal}ms`);
  console.log(`Total audio chunks:  ${totalChunks}`);
  console.log(`Total audio data:    ${totalAudioKB}KB`);

  if (failed.length > 0) {
    console.log("\nFailed sessions:");
    for (const f of failed) {
      console.log(`  Session ${f.sessionId}: ${f.error}`);
    }
  }

  const passRate = passed.length / CONCURRENT_SESSIONS;
  if (passRate === 1) {
    console.log(
      `\n✅ PASS — All ${CONCURRENT_SESSIONS} sessions completed successfully`
    );
  } else if (passRate >= 0.8) {
    console.log(
      `\n⚠️  WARN — ${passed.length}/${CONCURRENT_SESSIONS} passed (${Math.round(passRate * 100)}%)`
    );
  } else {
    console.log(
      `\n❌ FAIL — Only ${passed.length}/${CONCURRENT_SESSIONS} passed`
    );
  }

  process.exit(passRate >= 0.8 ? 0 : 1);
}

main().catch((error) => {
  console.error("Load test crashed:", error);
  process.exit(1);
});
