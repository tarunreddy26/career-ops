"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ttsStreamRoutes = ttsStreamRoutes;
const crypto_1 = require("crypto");
const ws_1 = require("ws");
const tts_streaming_1 = require("../services/tts-streaming");
const sentence_chunker_1 = require("../services/sentence-chunker");
const tts_queue_1 = require("../services/tts-queue");
const ws_messages_types_1 = require("../types/ws-messages.types");
async function ttsStreamRoutes(fastify) {
    fastify.get("/api/tts/stream", { websocket: true }, (socket, request) => {
        request.log.info("[WS] Client connected");
        // ─── Per-connection state ──────────────────────────
        // Tracks the active TTS service, current request,
        // and a single pending request for queue support.
        let activeTTSService = null;
        let activeRequestId = null;
        let isProcessing = false;
        let pendingRequest = null;
        let chunkIndex = 0;
        let isCancelling = false;
        // ─── Sentence chunker + TTS queue state ────────────
        // Used by the llm_tokens pipeline. Separate from the
        // direct tts_request flow above.
        let sentenceChunker = null;
        let ttsQueue = null;
        let pipelineRequestId = null;
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
        function initPipeline() {
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
            const voiceId = process.env.ELEVENLABS_VOICE_ID ||
                "9BWtsMINqrJLrRacOk9x";
            const modelId = process.env.ELEVENLABS_MODEL_ID ||
                "eleven_flash_v2_5";
            pipelineRequestId = (0, crypto_1.randomUUID)();
            pipelineChunkIndex = 0;
            // Create chunker — buffers tokens, emits sentences
            sentenceChunker = new sentence_chunker_1.SentenceChunker();
            // Create TTS queue — processes sentences sequentially
            ttsQueue = new tts_queue_1.TTSQueue({ apiKey, voiceId, modelId });
            // Wire chunker sentences into the TTS queue
            sentenceChunker.on("sentence", (payload) => {
                ttsQueue.enqueueSentence(payload.text, payload.index);
            });
            // Forward TTS queue events to the frontend WebSocket
            ttsQueue.on("streamStart", () => {
                sendMessage({
                    type: "stream_start",
                    data: { requestId: pipelineRequestId },
                });
            });
            ttsQueue.on("audioChunk", (chunk) => {
                const audioBase64 = chunk.toString("base64");
                sendMessage({
                    type: "audio_chunk",
                    data: {
                        audio: audioBase64,
                        chunkIndex: pipelineChunkIndex++,
                    },
                });
            });
            ttsQueue.on("sentenceStart", (payload) => {
                sendMessage({
                    type: "sentence_start",
                    data: {
                        sentenceIndex: payload.sentenceIndex,
                        text: payload.text,
                    },
                });
            });
            ttsQueue.on("sentenceEnd", (payload) => {
                sendMessage({
                    type: "sentence_end",
                    data: {
                        sentenceIndex: payload.sentenceIndex,
                        text: payload.text,
                        latencyMs: payload.latencyMs ?? 0,
                    },
                });
            });
            ttsQueue.on("streamEnd", () => {
                // Structured latency log for pipeline monitoring
                request.log.info({
                    msg: "pipeline_latency",
                    requestId: pipelineRequestId,
                    totalChunks: pipelineChunkIndex,
                });
                sendMessage({
                    type: "stream_end",
                    data: {
                        requestId: pipelineRequestId,
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
            ttsQueue.on("error", (error) => {
                sendMessage({
                    type: "error",
                    data: {
                        message: error.message,
                        code: "TTS_QUEUE_ERROR",
                    },
                });
            });
            ttsQueue.on("queueWarning", (info) => {
                console.warn(`[WS] TTS queue backpressure: depth=${info.depth}`);
            });
            console.log(`[WS] Pipeline initialized — requestId: ${pipelineRequestId}`);
        }
        /**
         * Tears down the chunker + queue pipeline after
         * completion or cancellation.
         */
        function cleanupPipeline() {
            if (sentenceChunker) {
                sentenceChunker.removeAllListeners();
                sentenceChunker.reset();
                sentenceChunker = null;
            }
            if (ttsQueue) {
                ttsQueue.removeAllListeners();
                ttsQueue = null;
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
        function cancelAllAudio(reason) {
            const cancelStart = Date.now();
            console.log(`[WS] ${reason === "interrupt" ? "Barge-in interrupt" : "Cancel"} requested`);
            // Block any further llm_tokens from re-creating pipeline
            pipelineInterrupted = true;
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
                ttsRef.disconnect().catch((err) => {
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
            console.log(`[WS] Cancel complete in ${cancelLatencyMs}ms ` +
                `(reason: ${reason})`);
        }
        /**
         * Sends a typed JSON message to the frontend client.
         * Guards against sending on a closed socket.
         */
        function sendMessage(message) {
            if (socket.readyState === ws_1.WebSocket.OPEN) {
                socket.send(JSON.stringify(message));
            }
        }
        /**
         * Core TTS processing flow for a single text request.
         * Creates a fresh ElevenLabs connection, streams audio
         * chunks to the frontend as they arrive, then cleans up.
         * After completion, checks for a queued pending request.
         */
        async function processRequest(text) {
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
            const voiceId = process.env.ELEVENLABS_VOICE_ID ||
                "9BWtsMINqrJLrRacOk9x";
            const modelId = process.env.ELEVENLABS_MODEL_ID ||
                "eleven_flash_v2_5";
            // Generate a unique ID for this request so the
            // frontend can correlate audio chunks to requests
            const requestId = (0, crypto_1.randomUUID)();
            activeRequestId = requestId;
            isProcessing = true;
            chunkIndex = 0;
            isCancelling = false;
            // Create a fresh TTS service for this request
            // (ElevenLabs WS is designed for single text lifecycle)
            const ttsService = new tts_streaming_1.TTSStreamingService({
                apiKey,
                voiceId,
                modelId,
            });
            activeTTSService = ttsService;
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
                ttsService.on("audioChunk", (chunk) => {
                    // Forward each chunk immediately — no buffering
                    if (!isCancelling) {
                        const audioBase64 = chunk.toString("base64");
                        sendMessage({
                            type: "audio_chunk",
                            data: {
                                audio: audioBase64,
                                chunkIndex: chunkIndex++,
                            },
                        });
                    }
                });
                ttsService.on("latencyReport", (metrics) => {
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
                });
                ttsService.on("error", (error) => {
                    console.error(`[WS] TTS error for ${requestId}:`, error.message);
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
                await new Promise((resolve, reject) => {
                    ttsService.on("streamEnd", () => resolve());
                    ttsService.on("error", () => resolve());
                    // Safety timeout — don't hang forever
                    setTimeout(() => {
                        reject(new Error("TTS stream timed out after 30s"));
                    }, 30000);
                });
            }
            catch (error) {
                const errorMessage = error instanceof Error
                    ? error.message
                    : "Unknown TTS error";
                console.error(`[WS] processRequest failed for ${requestId}:`, errorMessage);
                if (!isCancelling) {
                    sendMessage({
                        type: "error",
                        data: {
                            message: errorMessage,
                            code: "TTS_ERROR",
                        },
                    });
                }
            }
            finally {
                // Always clean up the TTS connection
                ttsService.removeAllListeners();
                await ttsService.disconnect();
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
                    console.log("[WS] Processing queued request");
                    processRequest(nextText);
                }
            }
        }
        // ─── Handle incoming messages from frontend ────────
        socket.on("message", (rawData) => {
            const rawString = rawData.toString();
            let message;
            try {
                message = (0, ws_messages_types_1.parseClientMessage)(rawString);
            }
            catch (parseError) {
                const errorMessage = parseError instanceof Error
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
                    request.log.info(`[WS] TTS request: "${text.substring(0, 50)}..."` +
                        ` (processing: ${isProcessing})`);
                    if (!isProcessing) {
                        // No active stream — process immediately
                        processRequest(text);
                    }
                    else {
                        // Active stream — queue this request
                        // (latest wins, discard any older queued one)
                        console.log("[WS] Queuing request (active stream in progress)");
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
                            console.log("[WS] Ignored stale tokens (interrupted), " +
                                "ready for next response");
                        }
                        break;
                    }
                    console.log(`[WS] LLM tokens: ${tokens.length} tokens, ` +
                        `flush: ${flush}`);
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
            console.log(`[WS] Client disconnected — code: ${code}, ` +
                `reason: ${reason?.toString() || "none"}`);
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
            console.error("[WS] Socket error:", error.message);
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
    });
}
//# sourceMappingURL=tts-stream.route.js.map