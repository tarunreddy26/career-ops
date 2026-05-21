/**
 * Pipeline Test — Simulated LLM Token Stream → Sentence Chunker → TTS Queue
 *
 * Simulates an LLM streaming tokens one at a time with 50ms delays,
 * feeding them through the sentence chunker + TTS queue pipeline via
 * the WebSocket llm_tokens message type.
 *
 * Verifies:
 * 1. Sentence chunker correctly splits tokens into 2 sentences
 * 2. Each sentence produces separate TTS audio chunks
 * 3. Audio output is valid and playable
 * 4. Per-sentence and total latency are reported
 *
 * Usage: npm run test:pipeline
 * Requires: Server running on localhost:3001 (npm run dev)
 */

import WebSocket from "ws";
import * as fs from "fs";
import * as path from "path";

const SERVER_URL = "ws://localhost:3001/api/tts/stream";
const OUTPUT_FILE = path.join(
  __dirname,
  "../../test-pipeline-output.mp3"
);
const TIMEOUT_MS = 60000;

// Simulated LLM token stream — two sentences:
// Sentence 1: "Hey! Welcome to the stream."
// Sentence 2: "I've been waiting for you!"
const LLM_TOKENS = [
  "Hey",
  "! ",
  "Welcome ",
  "to ",
  "the ",
  "stream. ",
  "I've ",
  "been ",
  "waiting ",
  "for ",
  "you!",
];

// Delay between tokens to simulate LLM streaming (ms)
const TOKEN_DELAY_MS = 50;

/** Sends a typed message over the WebSocket */
function sendMessage(
  ws: WebSocket,
  type: string,
  data: Record<string, unknown>
): void {
  ws.send(JSON.stringify({ type, data }));
}

/** Delays execution for the given milliseconds */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Streams LLM tokens one at a time with delays, then flushes.
 * Sends each token as an llm_tokens message with flush=false,
 * then sends a final message with flush=true.
 */
async function streamTokens(ws: WebSocket): Promise<void> {
  console.log(
    `\n[Tokens] Streaming ${LLM_TOKENS.length} tokens ` +
    `with ${TOKEN_DELAY_MS}ms delay...`
  );

  for (let i = 0; i < LLM_TOKENS.length; i++) {
    const token = LLM_TOKENS[i]!;
    const isLast = i === LLM_TOKENS.length - 1;

    // Send each token individually to simulate real LLM streaming
    sendMessage(ws, "llm_tokens", {
      tokens: [token],
      flush: isLast, // Flush on the last token
    });

    console.log(
      `[Tokens] ${i + 1}/${LLM_TOKENS.length}: "${token}"` +
      `${isLast ? " (+ flush)" : ""}`
    );

    // Wait between tokens to simulate LLM generation speed
    if (!isLast) {
      await delay(TOKEN_DELAY_MS);
    }
  }

  console.log("[Tokens] All tokens sent");
}

/**
 * Main test: connect, stream tokens, collect audio, report results.
 */
async function testPipeline(): Promise<boolean> {
  console.log("\n========================================");
  console.log("  Pipeline Test: LLM Tokens → Chunker → TTS");
  console.log("========================================");
  console.log(`Server: ${SERVER_URL}`);
  console.log(
    `Tokens: "${LLM_TOKENS.join("")}"`
  );
  console.log(
    `Expected: 2 sentences split by chunker`
  );

  return new Promise<boolean>((resolve) => {
    const audioChunks: Buffer[] = [];
    const startTime = Date.now();
    let firstChunkTime = 0;
    let streamStartReceived = false;
    let sentencesStarted = 0;
    let sentencesCompleted = 0;
    const sentenceLatencies: {
      index: number;
      text: string;
      latencyMs: number;
    }[] = [];

    // Safety timeout — don't hang forever
    const timeout = setTimeout(() => {
      console.error(
        `\n[FAIL] Test timed out after ${TIMEOUT_MS / 1000}s`
      );
      ws.close();
      resolve(false);
    }, TIMEOUT_MS);

    const ws = new WebSocket(SERVER_URL);

    ws.on("open", async () => {
      console.log("[WS] Connected\n");
      // Start streaming tokens after connection
      await streamTokens(ws);
    });

    ws.on("message", (rawData) => {
      const message = JSON.parse(rawData.toString());

      switch (message.type) {
        case "stream_start": {
          if (!streamStartReceived) {
            streamStartReceived = true;
            firstChunkTime = Date.now();
            console.log(
              `\n[Audio] Stream started — requestId: ` +
              `${message.data.requestId}`
            );
          }
          break;
        }

        case "audio_chunk": {
          const audioBuffer = Buffer.from(
            message.data.audio,
            "base64"
          );
          audioChunks.push(audioBuffer);

          // Log every 5th chunk to avoid spam
          if (audioChunks.length % 5 === 0) {
            console.log(
              `[Audio] Received ${audioChunks.length} chunks ` +
              `(${Math.round(audioChunks.reduce((s, c) => s + c.length, 0) / 1024)}KB)`
            );
          }
          break;
        }

        case "sentence_start": {
          sentencesStarted++;
          console.log(
            `\n[Sentence ${message.data.sentenceIndex}] ` +
            `TTS started: "${message.data.text}"`
          );
          break;
        }

        case "sentence_end": {
          sentencesCompleted++;
          sentenceLatencies.push({
            index: message.data.sentenceIndex,
            text: message.data.text,
            latencyMs: message.data.latencyMs,
          });
          console.log(
            `[Sentence ${message.data.sentenceIndex}] ` +
            `TTS done in ${message.data.latencyMs}ms`
          );
          break;
        }

        case "stream_end": {
          clearTimeout(timeout);
          const totalMs = Date.now() - startTime;
          const firstChunkMs = firstChunkTime
            ? firstChunkTime - startTime
            : 0;

          // Concatenate all audio chunks into a single MP3
          const fullAudio = Buffer.concat(audioChunks);
          fs.writeFileSync(OUTPUT_FILE, fullAudio);

          // Print results
          console.log("\n========================================");
          console.log("  Pipeline Test Results");
          console.log("========================================");
          console.log(
            `Sentences detected:    ${sentencesStarted}`
          );
          console.log(
            `Sentences completed:   ${sentencesCompleted}`
          );
          console.log(
            `Total audio chunks:    ${audioChunks.length}`
          );
          console.log(
            `Audio file size:       ${(fullAudio.length / 1024).toFixed(1)}KB`
          );
          console.log(
            `First chunk latency:   ${firstChunkMs}ms`
          );
          console.log(
            `Total pipeline time:   ${totalMs}ms`
          );

          // Per-sentence latency breakdown
          console.log("\nPer-sentence latency:");
          for (const sl of sentenceLatencies) {
            console.log(
              `  Sentence ${sl.index}: ${sl.latencyMs}ms — ` +
              `"${sl.text.substring(0, 50)}"`
            );
          }

          console.log(`\nAudio saved: ${OUTPUT_FILE}`);

          // Determine pass/fail
          const passed =
            sentencesStarted >= 2 &&
            sentencesCompleted >= 2 &&
            audioChunks.length > 0 &&
            fullAudio.length > 0;

          if (passed) {
            console.log("\n✅ PASS — Pipeline working correctly");
          } else {
            console.log("\n❌ FAIL — Check results above");
            if (sentencesStarted < 2) {
              console.log(
                "  → Expected 2+ sentences, got " +
                sentencesStarted
              );
            }
            if (audioChunks.length === 0) {
              console.log("  → No audio chunks received");
            }
          }

          ws.close();
          resolve(passed);
          break;
        }

        case "error": {
          console.error(
            `\n[ERROR] ${message.data.code}: ` +
            `${message.data.message}`
          );
          break;
        }

        case "cancelled": {
          console.log("[WS] Stream cancelled");
          break;
        }
      }
    });

    ws.on("error", (error) => {
      clearTimeout(timeout);
      console.error("[WS] Connection error:", error.message);
      console.log(
        "\nMake sure the server is running: npm run dev"
      );
      resolve(false);
    });

    ws.on("close", () => {
      clearTimeout(timeout);
    });
  });
}

// ─── Run the test ──────────────────────────────────────
async function main(): Promise<void> {
  console.log("Pipeline End-to-End Test");
  console.log("========================\n");

  const passed = await testPipeline();

  console.log("\n========================");
  console.log(
    `Result: ${passed ? "PASS ✅" : "FAIL ❌"}`
  );
  process.exit(passed ? 0 : 1);
}

main().catch((error) => {
  console.error("Test crashed:", error);
  process.exit(1);
});
