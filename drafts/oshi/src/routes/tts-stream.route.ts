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

import { FastifyInstance, FastifyRequest } from "fastify";
import { randomUUID } from "crypto";
import { WebSocket as WsWebSocket } from "ws";
import { TTSStreamingService } from "../services/tts-streaming";
import { SentenceChunker } from "../services/sentence-chunker";
import { TTSQueue } from "../services/tts-queue";
import { AudioChunkBuffer } from "../services/audio-chunk-buffer";
import type {
  ServerMessage,
  ClientMessage,
} from "../types/ws-messages.types";
import { parseClientMessage } from "../types/ws-messages.types";
import type { LatencyMetrics } from "../types/elevenlabs.types";
import type { SentenceProgressPayload } from "../services/tts-queue";

export async function ttsStreamRoutes(
  fastify: FastifyInstance
): Promise<void> {
  fastify.get(
    "/api/tts/stream",
    { websocket: true },
    (socket: WsWebSocket, request: FastifyRequest) => {
      request.log.info("[WS] Client connected");

      // ─── Per-connection state ──────────────────────────
      // Tracks the active TTS service, current request,
      // and a single pending request for queue support.
      let activeTTSService: TTSStreamingService | null = null;
      let activeRequestId: string | null = null;
      let isProcessing = false;
      let pendingRequest: { text: string } | null = null;
      let chunkIndex = 0;
      let isCancelling = false;

      // ─── Audio chunk buffers ─────────────────────────────
      // Reduces the number of audio_chunk messages sent to the
      // frontend by batching small ElevenLabs chunks into larger
      // ones. First chunk always goes out immediately to preserve
      // low first-audio latency (~200ms).
      let directBuffer: AudioChunkBuffer | null = null;
      let pipelineBuffer: AudioChunkBuffer | null = null;

      // ─── Sentence chunker + TTS queue state ────────────
      // Used by the llm_tokens pipeline. Separate from the
      // direct tts_request flow above.
      let sentenceChunker: SentenceChunker | null = null;
      let ttsQueue: TTSQueue | null = null;
      let pipelineRequestId: string | null = null;
      let pipelineChunkIndex = 0;
      // When true, ignore incoming llm_tokens until a new response starts.
      // Set on interrupt/cancel to prevent stale tokens from re-creating
      // the pipeline after it was torn down.
      let pipelineInterrupted = false;

      /**
       * Initializes the sentence chunker + TTS queue pipeline
       * for an llm_tokens session. Creates fresh instances and
       * wires events to the WebSocket.
       */
      function initPipeline(): void {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          sendMessage({
            type: "error",
            data: {
              message: "ELEVENLABS_API_KEY not configured",
              code: "CONFIG_ERROR",
            },
          });
          return;
        }

        const voiceId =
          process.env.ELEVENLABS_VOICE_ID ||
          "9BWtsMINqrJLrRacOk9x";
        const modelId =
          process.env.ELEVENLABS_MODEL_ID ||
          "eleven_flash_v2_5";

        pipelineRequestId = randomUUID();
        pipelineChunkIndex = 0;

        // Create chunker — buffers tokens, emits sentences
        sentenceChunker = new SentenceChunker();

        // Create TTS queue — processes sentences sequentially
        ttsQueue = new TTSQueue({ apiKey, voiceId, modelId });

        // Wire chunker sentences into the TTS queue
        sentenceChunker.on("sentence", (payload) => {
          ttsQueue!.enqueueSentence(payload.text, payload.index);
        });

        // Forward TTS queue events to the frontend WebSocket
        ttsQueue.on("streamStart", () => {
          sendMessage({
            type: "stream_start",
            data: { requestId: pipelineRequestId! },
          });
        });

        // Buffer pipeline audio chunks — batches small ElevenLabs
        // chunks into fewer, larger payloads for the frontend.
        // First chunk still goes out immediately (no latency hit).
        pipelineBuffer = new AudioChunkBuffer();

        pipelineBuffer.on("chunk", (buffered: Buffer) => {
          const audioBase64 = buffered.toString("base64");
          sendMessage({
            type: "audio_chunk",
            data: {
              audio: audioBase64,
              chunkIndex: pipelineChunkIndex++,
            },
          });
        });

        ttsQueue.on("audioChunk", (chunk: Buffer) => {
          pipelineBuffer!.addChunk(chunk);
        });

        ttsQueue.on(
          "sentenceStart",
          (payload: SentenceProgressPayload) => {
            sendMessage({
              type: "sentence_start",
              data: {
                sentenceIndex: payload.sentenceIndex,
                text: payload.text,
              },
            });
          }
        );

        ttsQueue.on(
          "sentenceEnd",
          (payload: SentenceProgressPayload) => {
            sendMessage({
              type: "sentence_end",
              data: {
                sentenceIndex: payload.sentenceIndex,
                text: payload.text,
                latencyMs: payload.latencyMs ?? 0,
              },
            });
          }
        );

        ttsQueue.on("streamEnd", () => {
          // Flush any remaining buffered audio before ending
          if (pipelineBuffer) {
            pipelineBuffer.flush();
          }

          // Structured latency log for pipeline monitoring
          request.log.info({
            msg: "pipeline_latency",
            requestId: pipelineRequestId,
            totalChunks: pipelineChunkIndex,
          });

          sendMessage({
            type: "stream_end",
            data: {
              requestId: pipelineRequestId!,
              latency: {
                textSentTimestamp: 0,
                firstChunkTimestamp: 0,
                firstChunkLatencyMs: 0,
                totalChunks: pipelineChunkIndex,
                totalDurationMs: 0,
              },
            },
          });
          // Clean up pipeline after completion
          cleanupPipeline();
        });

        ttsQueue.on("error", (error: Error) => {
          sendMessage({
            type: "error",
            data: {
              message: error.message,
              code: "TTS_QUEUE_ERROR",
            },
          });
        });

        ttsQueue.on("queueWarning", (info: { depth: number }) => {
          console.warn(
            `[WS] TTS queue backpressure: depth=${info.depth}`
          );
        });

        console.log(
          `[WS] Pipeline initialized — requestId: ${pipelineRequestId}`
        );
      }

      /**
       * Tears down the chunker + queue pipeline after
       * completion or cancellation.
       */
      function cleanupPipeline(): void {
        if (sentenceChunker) {
          sentenceChunker.removeAllListeners();
          sentenceChunker.reset();
          sentenceChunker = null;
        }
        if (ttsQueue) {
          ttsQueue.removeAllListeners();
          ttsQueue = null;
        }
        if (pipelineBuffer) {
          pipelineBuffer.removeAllListeners();
          pipelineBuffer.reset();
          pipelineBuffer = null;
        }
        pipelineRequestId = null;
        pipelineChunkIndex = 0;
      }

      /**
       * Cancels all active audio processing — both pipeline
       * and direct TTS flows. Sends stop_audio to frontend
       * so it immediately clears its audio buffer.
       *
       * @param reason — "interrupt" (barge-in) or "cancel" (manual)
       */
      function cancelAllAudio(
        reason: "interrupt" | "cancel"
      ): void {
        const cancelStart = Date.now();
        console.log(
          `[WS] ${reason === "interrupt" ? "Barge-in interrupt" : "Cancel"} requested`
        );

        // Block any further llm_tokens from re-creating pipeline
        pipelineInterrupted = true;

        // Reset audio buffers — discard any pending chunks
        // so cancelled audio never reaches the frontend
        if (directBuffer) {
          directBuffer.removeAllListeners();
          directBuffer.reset();
          directBuffer = null;
        }
        if (pipelineBuffer) {
          pipelineBuffer.removeAllListeners();
          pipelineBuffer.reset();
          pipelineBuffer = null;
        }

        // Cancel the sentence chunker + TTS queue pipeline
        if (ttsQueue) {
          ttsQueue.cancel();
          sendMessage({
            type: "cancelled",
            data: {
              requestId: pipelineRequestId || "none",
            },
          });
          cleanupPipeline();
        }

        // Cancel direct tts_request flow
        if (isProcessing && activeTTSService) {
          isCancelling = true;
          // Fire-and-forget disconnect for speed
          const ttsRef = activeTTSService;
          ttsRef.removeAllListeners();
          activeTTSService = null;
          ttsRef.disconnect().catch((err: Error) => {
            console.error("[WS] TTS disconnect error:", err.message);
          });
          pendingRequest = null;

          sendMessage({
            type: "cancelled",
            data: {
              requestId: activeRequestId || "none",
            },
          });

          activeRequestId = null;
          isProcessing = false;
          isCancelling = false;
        }

        // Tell frontend to stop playback immediately
        const cancelLatencyMs = Date.now() - cancelStart;
        sendMessage({
          type: "stop_audio",
          data: { reason, cancelLatencyMs },
        });

        console.log(
          `[WS] Cancel complete in ${cancelLatencyMs}ms ` +
          `(reason: ${reason})`
        );
      }

      /**
       * Sends a typed JSON message to the frontend client.
       * Guards against sending on a closed socket.
       */
      function sendMessage(message: ServerMessage): void {
        if (socket.readyState === WsWebSocket.OPEN) {
          socket.send(JSON.stringify(message));
        }
      }

      /**
       * Core TTS processing flow for a single text request.
       * Creates a fresh ElevenLabs connection, streams audio
       * chunks to the frontend as they arrive, then cleans up.
       * After completion, checks for a queued pending request.
       */
      async function processRequest(text: string): Promise<void> {
        // Verify API key is available server-side
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          sendMessage({
            type: "error",
            data: {
              message: "ELEVENLABS_API_KEY not configured",
              code: "CONFIG_ERROR",
            },
          });
          return;
        }

        const voiceId =
          process.env.ELEVENLABS_VOICE_ID ||
          "9BWtsMINqrJLrRacOk9x";
        const modelId =
          process.env.ELEVENLABS_MODEL_ID ||
          "eleven_flash_v2_5";

        // Generate a unique ID for this request so the
        // frontend can correlate audio chunks to requests
        const requestId = randomUUID();
        activeRequestId = requestId;
        isProcessing = true;
        chunkIndex = 0;
        isCancelling = false;

        // Create a fresh TTS service for this request
        // (ElevenLabs WS is designed for single text lifecycle)
        const ttsService = new TTSStreamingService({
          apiKey,
          voiceId,
          modelId,
        });
        activeTTSService = ttsService;

        // Create a buffer for this request — batches small
        // audio chunks into fewer, larger ones for the frontend
        directBuffer = new AudioChunkBuffer();

        directBuffer.on("chunk", (buffered: Buffer) => {
          if (!isCancelling) {
            const audioBase64 = buffered.toString("base64");
            sendMessage({
              type: "audio_chunk",
              data: {
                audio: audioBase64,
                chunkIndex: chunkIndex++,
              },
            });
          }
        });

        try {
          // Attach event listeners BEFORE connecting
          // so we don't miss any early audio chunks

          ttsService.on("streamStart", () => {
            // Only send if this request wasn't cancelled
            if (!isCancelling) {
              sendMessage({
                type: "stream_start",
                data: { requestId },
              });
            }
          });

          ttsService.on(
            "audioChunk",
            (chunk: Buffer) => {
              // Feed chunks through the buffer instead of
              // sending directly — reduces frontend decodeAudioData calls
              if (!isCancelling) {
                directBuffer!.addChunk(chunk);
              }
            }
          );

          ttsService.on(
            "latencyReport",
            (metrics: LatencyMetrics) => {
              // Flush any remaining buffered audio before ending
              if (directBuffer) {
                directBuffer.flush();
              }

              // Structured latency log for production monitoring
              request.log.info({
                msg: "tts_latency",
                requestId,
                firstChunkMs: metrics.firstChunkLatencyMs,
                totalMs: metrics.totalDurationMs,
                totalChunks: metrics.totalChunks,
              });

              // Send latency data with stream_end so
              // frontend can monitor performance
              if (!isCancelling) {
                sendMessage({
                  type: "stream_end",
                  data: { requestId, latency: metrics },
                });
              }
            }
          );

          ttsService.on("error", (error: Error) => {
            console.error(
              `[WS] TTS error for ${requestId}:`,
              error.message
            );
            if (!isCancelling) {
              sendMessage({
                type: "error",
                data: {
                  message: error.message,
                  code: "TTS_ERROR",
                },
              });
            }
          });

          // Connect to ElevenLabs, send text, signal flush
          await ttsService.connect();
          ttsService.sendText(text);
          ttsService.flush();

          // Wait for the stream to complete or error out
          await new Promise<void>((resolve, reject) => {
            ttsService.on("streamEnd", () => resolve());
            ttsService.on("error", () => resolve());

            // Safety timeout — don't hang forever
            setTimeout(() => {
              reject(
                new Error("TTS stream timed out after 30s")
              );
            }, 30000);
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown TTS error";
          console.error(
            `[WS] processRequest failed for ${requestId}:`,
            errorMessage
          );

          if (!isCancelling) {
            sendMessage({
              type: "error",
              data: {
                message: errorMessage,
                code: "TTS_ERROR",
              },
            });
          }
        } finally {
          // Always clean up the TTS connection
          ttsService.removeAllListeners();
          await ttsService.disconnect();

          // Clean up the audio chunk buffer
          if (directBuffer) {
            directBuffer.removeAllListeners();
            directBuffer.reset();
            directBuffer = null;
          }

          // Reset connection state
          if (activeTTSService === ttsService) {
            activeTTSService = null;
          }
          if (activeRequestId === requestId) {
            activeRequestId = null;
          }
          isProcessing = false;
          isCancelling = false;

          // Process next queued request if one exists
          if (pendingRequest) {
            const nextText = pendingRequest.text;
            pendingRequest = null;
            console.log(
              "[WS] Processing queued request"
            );
            processRequest(nextText);
          }
        }
      }

      // ─── Handle incoming messages from frontend ────────
      socket.on("message", (rawData) => {
        const rawString = rawData.toString();

        let message: ClientMessage;
        try {
          message = parseClientMessage(rawString);
        } catch (parseError) {
          const errorMessage =
            parseError instanceof Error
              ? parseError.message
              : "Invalid message format";
          sendMessage({
            type: "error",
            data: {
              message: errorMessage,
              code: "INVALID_MESSAGE",
            },
          });
          return;
        }

        switch (message.type) {
          case "tts_request": {
            const { text } = message.data;

            // Cap input length to prevent abuse
            const MAX_TEXT_LENGTH = 500;
            if (text.length > MAX_TEXT_LENGTH) {
              sendMessage({
                type: "error",
                data: {
                  message: `Text exceeds max length of ${MAX_TEXT_LENGTH}`,
                  code: "VALIDATION_ERROR",
                },
              });
              break;
            }

            request.log.info(
              `[WS] TTS request: "${text.substring(0, 50)}..."` +
              ` (processing: ${isProcessing})`
            );

            if (!isProcessing) {
              // No active stream — process immediately
              processRequest(text);
            } else {
              // Active stream — queue this request
              // (latest wins, discard any older queued one)
              console.log(
                "[WS] Queuing request (active stream in progress)"
              );
              pendingRequest = { text };
            }
            break;
          }

          case "llm_tokens": {
            const { tokens, flush } = message.data;

            // After an interrupt, ignore stale tokens from the
            // previous LLM response. Only accept tokens again
            // when flush=true clears the interrupted state (end
            // of old response) or we can detect a new response.
            if (pipelineInterrupted) {
              if (flush) {
                // End of the interrupted response — reset flag
                // so the next response can start fresh
                pipelineInterrupted = false;
                console.log(
                  "[WS] Ignored stale tokens (interrupted), " +
                  "ready for next response"
                );
              }
              break;
            }

            console.log(
              `[WS] LLM tokens: ${tokens.length} tokens, ` +
              `flush: ${flush}`
            );

            // Initialize pipeline on first llm_tokens message
            if (!sentenceChunker || !ttsQueue) {
              initPipeline();
            }

            // Feed each token into the sentence chunker
            if (sentenceChunker) {
              for (const token of tokens) {
                sentenceChunker.addToken(token);
              }

              // If flush=true, LLM response is done —
              // flush remaining buffer and signal queue
              if (flush) {
                sentenceChunker.flush();
                ttsQueue?.flush();
              }
            }
            break;
          }

          case "cancel": {
            cancelAllAudio("cancel");
            break;
          }

          case "interrupt": {
            // Barge-in: user started speaking while VTuber talks.
            // Same as cancel but logged differently for analytics.
            cancelAllAudio("interrupt");
            break;
          }

          case "ping": {
            sendMessage({
              type: "pong",
              data: {},
            });
            break;
          }
        }
      });

      // ─── Handle client disconnect ─────────────────────
      socket.on("close", (code, reason) => {
        console.log(
          `[WS] Client disconnected — code: ${code}, ` +
          `reason: ${reason?.toString() || "none"}`
        );

        // Clean up active TTS connection if client leaves
        if (activeTTSService) {
          activeTTSService.removeAllListeners();
          activeTTSService.disconnect();
          activeTTSService = null;
        }
        pendingRequest = null;
        activeRequestId = null;
        isProcessing = false;

        // Clean up pipeline if active
        if (ttsQueue) {
          ttsQueue.cancel();
        }
        cleanupPipeline();
      });

      // ─── Handle socket errors ─────────────────────────
      socket.on("error", (error) => {
        console.error(
          "[WS] Socket error:",
          error.message
        );

        // Clean up active TTS connection on error
        if (activeTTSService) {
          activeTTSService.removeAllListeners();
          activeTTSService.disconnect();
          activeTTSService = null;
        }
        pendingRequest = null;
        activeRequestId = null;
        isProcessing = false;

        // Clean up pipeline if active
        if (ttsQueue) {
          ttsQueue.cancel();
        }
        cleanupPipeline();
      });
    }
  );
}
