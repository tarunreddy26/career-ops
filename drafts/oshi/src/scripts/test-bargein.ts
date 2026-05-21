/**
 * Barge-In Test — Verifies interrupt stops audio immediately
 *
 * Simulates: VTuber is speaking (TTS streaming) → user starts talking
 * → frontend sends "interrupt" → backend kills audio → no more chunks
 *
 * Tests:
 * 1. Start a TTS stream via llm_tokens pipeline
 * 2. Wait for first audio chunks to confirm stream is active
 * 3. Send "interrupt" message (barge-in)
 * 4. Verify: stop_audio received, no more audio chunks after interrupt
 * 5. Measure cancel latency (time from interrupt to stop_audio)
 *
 * Usage: npm run test:bargein
 * Target: wss://oshi-ai-vtuber-backend.onrender.com/api/tts/stream
 */

import WebSocket from "ws";

const SERVER_URL =
  process.env.SERVER_URL ||
  "wss://oshi-ai-vtuber-backend.onrender.com/api/tts/stream";

const TIMEOUT_MS = 30000;

// Tokens that produce a long enough sentence for interruption
const LLM_TOKENS = [
  "This ",
  "is ",
  "a ",
  "really ",
  "long ",
  "sentence ",
  "that ",
  "should ",
  "give ",
  "us ",
  "enough ",
  "time ",
  "to ",
  "test ",
  "the ",
  "barge-in ",
  "interruption ",
  "mechanism. ",
  "And ",
  "here ",
  "is ",
  "another ",
  "sentence ",
  "that ",
  "should ",
  "never ",
  "be ",
  "spoken ",
  "because ",
  "we ",
  "will ",
  "interrupt ",
  "before ",
  "it ",
  "finishes!",
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testBargeIn(): Promise<boolean> {
  console.log("==========================================");
  console.log("  Barge-In (Interrupt) Test");
  console.log("==========================================");
  console.log(`Server: ${SERVER_URL}\n`);

  return new Promise<boolean>((resolve) => {
    let chunksBeforeInterrupt = 0;
    let chunksAfterInterrupt = 0;
    let interrupted = false;
    let interruptSentTime = 0;
    let stopAudioReceived = false;
    let stopAudioLatencyMs = 0;
    let cancelledReceived = false;

    const timeout = setTimeout(() => {
      console.error("\n[FAIL] Test timed out");
      ws.close();
      resolve(false);
    }, TIMEOUT_MS);

    const ws = new WebSocket(SERVER_URL);

    ws.on("open", async () => {
      console.log("[WS] Connected\n");

      // Stream tokens to start TTS pipeline
      console.log("[1] Streaming tokens to start TTS...");
      for (let i = 0; i < LLM_TOKENS.length; i++) {
        const token = LLM_TOKENS[i]!;
        const isLast = i === LLM_TOKENS.length - 1;
        ws.send(JSON.stringify({
          type: "llm_tokens",
          data: { tokens: [token], flush: isLast },
        }));
        await delay(30);
      }
      console.log("[1] All tokens sent\n");
    });

    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case "stream_start": {
          console.log("[2] Audio stream started");
          break;
        }

        case "audio_chunk": {
          if (!interrupted) {
            chunksBeforeInterrupt++;
            console.log(
              `[2] Audio chunk ${chunksBeforeInterrupt} received`
            );

            // After receiving 2 chunks, send interrupt (barge-in)
            if (chunksBeforeInterrupt === 2) {
              console.log(
                "\n[3] Sending INTERRUPT (simulating user speaking)..."
              );
              interruptSentTime = Date.now();
              interrupted = true;
              ws.send(JSON.stringify({
                type: "interrupt",
                data: {},
              }));
            }
          } else {
            // Any chunks after interrupt = bad
            chunksAfterInterrupt++;
            console.warn(
              `[WARN] Audio chunk received AFTER interrupt!`
            );
          }
          break;
        }

        case "stop_audio": {
          stopAudioReceived = true;
          stopAudioLatencyMs = Date.now() - interruptSentTime;
          console.log(
            `[4] stop_audio received in ${stopAudioLatencyMs}ms ` +
            `(reason: ${msg.data.reason})`
          );
          break;
        }

        case "cancelled": {
          cancelledReceived = true;
          console.log(
            `[4] cancelled received — requestId: ${msg.data.requestId}`
          );

          // Wait a moment to see if any more chunks arrive
          setTimeout(() => {
            clearTimeout(timeout);
            printResults();
            ws.close();
          }, 2000);
          break;
        }

        case "sentence_start": {
          console.log(
            `[Sentence ${msg.data.sentenceIndex}] TTS started: ` +
            `"${msg.data.text.substring(0, 40)}..."`
          );
          break;
        }

        case "sentence_end": {
          console.log(
            `[Sentence ${msg.data.sentenceIndex}] done in ` +
            `${msg.data.latencyMs}ms`
          );
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

    function printResults(): void {
      console.log("\n==========================================");
      console.log("  Barge-In Test Results");
      console.log("==========================================");
      console.log(
        `Chunks before interrupt: ${chunksBeforeInterrupt}`
      );
      console.log(
        `Chunks after interrupt:  ${chunksAfterInterrupt}`
      );
      console.log(
        `stop_audio received:     ${stopAudioReceived ? "yes" : "NO"}`
      );
      console.log(
        `cancelled received:      ${cancelledReceived ? "yes" : "NO"}`
      );
      console.log(
        `Cancel latency:          ${stopAudioLatencyMs}ms`
      );

      const passed =
        stopAudioReceived &&
        cancelledReceived &&
        chunksAfterInterrupt === 0;

      if (passed) {
        console.log("\n✅ PASS — Barge-in works correctly");
        console.log(
          "   Audio stopped immediately, no chunks leaked"
        );
      } else {
        console.log("\n❌ FAIL");
        if (!stopAudioReceived) {
          console.log("   → stop_audio not received");
        }
        if (!cancelledReceived) {
          console.log("   → cancelled not received");
        }
        if (chunksAfterInterrupt > 0) {
          console.log(
            `   → ${chunksAfterInterrupt} chunks leaked after interrupt`
          );
        }
      }

      resolve(passed);
    }

    ws.on("error", (err) => {
      clearTimeout(timeout);
      console.error("[WS] Error:", err.message);
      resolve(false);
    });
  });
}

async function main(): Promise<void> {
  const passed = await testBargeIn();
  console.log(
    `\nResult: ${passed ? "PASS ✅" : "FAIL ❌"}`
  );
  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error("Test crashed:", err);
  process.exit(1);
});
