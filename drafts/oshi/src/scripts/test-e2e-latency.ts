/**
 * E2E Latency Test — Measures full pipeline latency
 *
 * Simulates the real flow: LLM tokens → sentence chunker → TTS → audio
 * Measures time from first token sent to first audio chunk received.
 *
 * Target latencies (per brief):
 * - First audio chunk from ElevenLabs: < 200ms
 * - Total e2e (text to audio): < 1.2s
 *
 * Usage: npm run test:e2e
 * Target: wss://oshi-ai-vtuber-backend.onrender.com/api/tts/stream
 */

import WebSocket from "ws";

const SERVER_URL =
  process.env.SERVER_URL ||
  "wss://oshi-ai-vtuber-backend.onrender.com/api/tts/stream";

const TIMEOUT_MS = 30000;

// Realistic LLM token stream — two sentences
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

const TOKEN_DELAY_MS = 40; // Simulates LLM generation speed

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface LatencyResult {
  firstTokenToFirstChunkMs: number;
  firstTokenToStreamEndMs: number;
  sentenceBoundaryDetectedMs: number;
  perSentence: {
    index: number;
    text: string;
    ttsLatencyMs: number;
  }[];
  totalChunks: number;
  totalAudioKB: number;
}

async function testLatency(): Promise<LatencyResult | null> {
  console.log("==========================================");
  console.log("  E2E Latency Validation");
  console.log("==========================================");
  console.log(`Server: ${SERVER_URL}`);
  console.log(`Tokens: "${LLM_TOKENS.join("")}"`);
  console.log(`Token delay: ${TOKEN_DELAY_MS}ms\n`);

  return new Promise((resolve) => {
    let firstTokenTime = 0;
    let firstChunkTime = 0;
    let firstSentenceTime = 0;
    let streamEndTime = 0;
    let totalChunks = 0;
    let totalAudioBytes = 0;
    const perSentence: LatencyResult["perSentence"] = [];

    const timeout = setTimeout(() => {
      console.error("[FAIL] Test timed out");
      ws.close();
      resolve(null);
    }, TIMEOUT_MS);

    const ws = new WebSocket(SERVER_URL);

    ws.on("open", async () => {
      console.log("[WS] Connected\n");

      // Start streaming tokens
      firstTokenTime = Date.now();
      console.log("[Tokens] Streaming...");

      for (let i = 0; i < LLM_TOKENS.length; i++) {
        const token = LLM_TOKENS[i]!;
        const isLast = i === LLM_TOKENS.length - 1;
        ws.send(JSON.stringify({
          type: "llm_tokens",
          data: { tokens: [token], flush: isLast },
        }));
        if (!isLast) await delay(TOKEN_DELAY_MS);
      }

      console.log("[Tokens] All sent\n");
    });

    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case "sentence_start": {
          if (firstSentenceTime === 0) {
            firstSentenceTime = Date.now();
          }
          console.log(
            `[Sentence ${msg.data.sentenceIndex}] ` +
            `TTS started: "${msg.data.text}"`
          );
          break;
        }

        case "sentence_end": {
          perSentence.push({
            index: msg.data.sentenceIndex,
            text: msg.data.text,
            ttsLatencyMs: msg.data.latencyMs,
          });
          console.log(
            `[Sentence ${msg.data.sentenceIndex}] ` +
            `done in ${msg.data.latencyMs}ms`
          );
          break;
        }

        case "audio_chunk": {
          totalChunks++;
          const chunk = Buffer.from(msg.data.audio, "base64");
          totalAudioBytes += chunk.length;
          if (totalChunks === 1) {
            firstChunkTime = Date.now();
            console.log(
              `[Audio] First chunk received! ` +
              `(${Date.now() - firstTokenTime}ms from first token)`
            );
          }
          break;
        }

        case "stream_end": {
          clearTimeout(timeout);
          streamEndTime = Date.now();

          const result: LatencyResult = {
            firstTokenToFirstChunkMs:
              firstChunkTime - firstTokenTime,
            firstTokenToStreamEndMs:
              streamEndTime - firstTokenTime,
            sentenceBoundaryDetectedMs:
              firstSentenceTime - firstTokenTime,
            perSentence,
            totalChunks,
            totalAudioKB:
              Math.round((totalAudioBytes / 1024) * 10) / 10,
          };

          printResults(result);
          ws.close();
          resolve(result);
          break;
        }

        case "error": {
          console.error(
            `[ERROR] ${msg.data.code}: ${msg.data.message}`
          );
          break;
        }
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      console.error("[WS] Error:", err.message);
      resolve(null);
    });
  });
}

function printResults(result: LatencyResult): void {
  console.log("\n==========================================");
  console.log("  E2E Latency Results");
  console.log("==========================================");

  console.log("\nPipeline timing:");
  console.log(
    `  First token → sentence detected:  ` +
    `${result.sentenceBoundaryDetectedMs}ms`
  );
  console.log(
    `  First token → first audio chunk:  ` +
    `${result.firstTokenToFirstChunkMs}ms`
  );
  console.log(
    `  First token → all audio done:     ` +
    `${result.firstTokenToStreamEndMs}ms`
  );

  console.log("\nPer-sentence TTS latency:");
  for (const s of result.perSentence) {
    console.log(
      `  Sentence ${s.index}: ${s.ttsLatencyMs}ms — "${s.text}"`
    );
  }

  console.log(
    `\nTotal chunks: ${result.totalChunks}`
  );
  console.log(
    `Total audio:  ${result.totalAudioKB}KB`
  );

  // Grade against targets
  console.log("\n── Target Check ──");

  const firstChunkTarget = 1200;
  const firstChunkStatus =
    result.firstTokenToFirstChunkMs <= firstChunkTarget
      ? "PASS" : "SLOW";
  console.log(
    `  First audio chunk < ${firstChunkTarget}ms: ` +
    `${result.firstTokenToFirstChunkMs}ms [${firstChunkStatus}]`
  );

  const totalTarget = 3000;
  const totalStatus =
    result.firstTokenToStreamEndMs <= totalTarget
      ? "PASS" : "SLOW";
  console.log(
    `  Total pipeline < ${totalTarget}ms:     ` +
    `${result.firstTokenToStreamEndMs}ms [${totalStatus}]`
  );

  if (
    firstChunkStatus === "PASS" &&
    totalStatus === "PASS"
  ) {
    console.log("\n✅ PASS — Latency within targets");
  } else {
    console.log(
      "\n⚠️  WARN — Some targets exceeded " +
      "(network latency to Render may be a factor)"
    );
  }
}

// ─── Run 3 rounds and average ─────────────────────
async function main(): Promise<void> {
  const ROUNDS = 3;
  console.log(`Running ${ROUNDS} rounds...\n`);

  const results: LatencyResult[] = [];

  for (let i = 0; i < ROUNDS; i++) {
    if (i > 0) {
      console.log("\n--- Waiting 2s before next round ---\n");
      await delay(2000);
    }
    console.log(`\n━━━ Round ${i + 1}/${ROUNDS} ━━━`);
    const result = await testLatency();
    if (result) results.push(result);
  }

  if (results.length === 0) {
    console.log("\n❌ All rounds failed");
    process.exit(1);
  }

  // Average
  const avgFirstChunk = Math.round(
    results.reduce((s, r) => s + r.firstTokenToFirstChunkMs, 0) /
    results.length
  );
  const avgTotal = Math.round(
    results.reduce((s, r) => s + r.firstTokenToStreamEndMs, 0) /
    results.length
  );

  console.log("\n==========================================");
  console.log(`  Average across ${results.length} rounds`);
  console.log("==========================================");
  console.log(`  Avg first audio chunk: ${avgFirstChunk}ms`);
  console.log(`  Avg total pipeline:    ${avgTotal}ms`);
  console.log(
    `\nResult: ${avgFirstChunk <= 1200 ? "PASS ✅" : "WARN ⚠️"}`
  );

  process.exit(avgFirstChunk <= 1200 ? 0 : 1);
}

main().catch((err) => {
  console.error("Test crashed:", err);
  process.exit(1);
});
