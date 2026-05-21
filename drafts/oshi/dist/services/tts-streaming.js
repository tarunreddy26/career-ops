"use strict";
/**
 * TTSStreamingService — ElevenLabs WebSocket Streaming TTS
 *
 * Connects to ElevenLabs' WebSocket streaming endpoint for low-latency
 * text-to-speech. Sends sentence chunks, receives audio chunks in real-time.
 *
 * CRITICAL: Uses WebSocket endpoint (not REST) to achieve ~200ms first-chunk
 * latency instead of ~2s with the standard REST API.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTSStreamingService = void 0;
const ws_1 = __importDefault(require("ws"));
const events_1 = require("events");
class TTSStreamingService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.websocket = null;
        this.isConnected = false;
        // Latency tracking — measures time from text sent to first audio chunk
        this.textSentTimestamp = 0;
        this.firstChunkReceived = false;
        this.totalChunks = 0;
        // Apply defaults from the brief: stability 0.4, similarity 0.75, style 0.35
        this.config = {
            apiKey: config.apiKey,
            voiceId: config.voiceId,
            modelId: config.modelId,
            stability: config.stability ?? 0.4,
            similarityBoost: config.similarityBoost ?? 0.75,
            style: config.style ?? 0.35,
        };
    }
    /**
     * Opens a WebSocket connection to ElevenLabs streaming endpoint.
     * Sends the initial config message to set voice parameters.
     * Returns a promise that resolves when the connection is ready.
     */
    async connect() {
        return new Promise((resolve, reject) => {
            const websocketUrl = `wss://api.elevenlabs.io/v1/text-to-speech/` +
                `${this.config.voiceId}/stream-input` +
                `?model_id=${this.config.modelId}`;
            console.log(`[TTS] Connecting to ElevenLabs WebSocket...`);
            this.websocket = new ws_1.default(websocketUrl);
            this.websocket.on("open", () => {
                console.log("[TTS] WebSocket connected");
                this.isConnected = true;
                // Send initial config — required before any text
                const initMessage = {
                    text: " ",
                    voice_settings: {
                        stability: this.config.stability,
                        similarity_boost: this.config.similarityBoost,
                        style: this.config.style,
                    },
                    generation_config: {
                        chunk_length_schedule: [120, 160, 250, 290],
                    },
                    xi_api_key: this.config.apiKey,
                    model_id: this.config.modelId,
                };
                this.websocket.send(JSON.stringify(initMessage));
                console.log("[TTS] Init config sent");
                resolve();
            });
            this.websocket.on("message", (data) => {
                this.handleAudioResponse(data);
            });
            this.websocket.on("error", (error) => {
                console.error("[TTS] WebSocket error:", error.message);
                this.isConnected = false;
                this.emit("error", error);
                // Reject only if we haven't connected yet
                if (!this.isConnected) {
                    reject(error);
                }
            });
            this.websocket.on("close", (code, reason) => {
                console.log(`[TTS] WebSocket closed — code: ${code}, ` +
                    `reason: ${reason.toString()}`);
                this.isConnected = false;
                this.emit("streamEnd");
            });
        });
    }
    /**
     * Sends a sentence chunk to ElevenLabs for synthesis.
     * Each chunk should be a complete sentence for best results.
     *
     * Per the brief: use sentence boundary detection, send each
     * sentence as soon as it's complete from the LLM stream.
     */
    sendText(text) {
        if (!this.websocket || !this.isConnected) {
            throw new Error("[TTS] Cannot send text — WebSocket not connected");
        }
        // Track when we sent this text for latency measurement
        this.textSentTimestamp = Date.now();
        this.firstChunkReceived = false;
        this.totalChunks = 0;
        const textMessage = {
            text: text,
            try_trigger_generation: true,
        };
        this.websocket.send(JSON.stringify(textMessage));
        console.log(`[TTS] Sent text (${text.length} chars): "${text.substring(0, 50)}..."`);
    }
    /**
     * Signals end of text input — tells ElevenLabs to flush
     * any remaining audio and close the generation.
     */
    flush() {
        if (!this.websocket || !this.isConnected) {
            return;
        }
        const flushMessage = { text: "" };
        this.websocket.send(JSON.stringify(flushMessage));
        console.log("[TTS] Flush signal sent");
    }
    /**
     * Processes incoming audio chunks from ElevenLabs.
     * Decodes base64 audio, tracks latency, emits events.
     */
    handleAudioResponse(rawData) {
        try {
            const response = JSON.parse(rawData.toString());
            // ElevenLabs sends audio as base64-encoded MP3 chunks
            if (response.audio) {
                const audioBuffer = Buffer.from(response.audio, "base64");
                this.totalChunks++;
                // Log latency on the FIRST audio chunk — this is the key metric
                if (!this.firstChunkReceived) {
                    this.firstChunkReceived = true;
                    const firstChunkLatencyMs = Date.now() - this.textSentTimestamp;
                    console.log(`[TTS] First audio chunk received in ` +
                        `${firstChunkLatencyMs}ms`);
                    this.emit("streamStart");
                }
                this.emit("audioChunk", audioBuffer);
            }
            // Final chunk — report full latency metrics
            if (response.isFinal) {
                const totalDurationMs = Date.now() - this.textSentTimestamp;
                const firstChunkLatencyMs = this.firstChunkReceived
                    ? totalDurationMs - (totalDurationMs - (Date.now() - this.textSentTimestamp))
                    : 0;
                const metrics = {
                    textSentTimestamp: this.textSentTimestamp,
                    firstChunkTimestamp: this.textSentTimestamp + firstChunkLatencyMs,
                    firstChunkLatencyMs,
                    totalChunks: this.totalChunks,
                    totalDurationMs,
                };
                console.log(`[TTS] Stream complete — ${this.totalChunks} chunks, ` +
                    `${totalDurationMs}ms total`);
                this.emit("latencyReport", metrics);
                this.emit("streamEnd");
            }
        }
        catch (parseError) {
            console.error("[TTS] Failed to parse response:", parseError);
        }
    }
    /**
     * Gracefully closes the WebSocket connection.
     * Sends flush first to get any remaining audio.
     */
    async disconnect() {
        if (this.websocket) {
            this.flush();
            this.websocket.close();
            this.websocket = null;
            this.isConnected = false;
            console.log("[TTS] Disconnected");
        }
    }
    /** Check if the WebSocket is currently connected */
    getConnectionStatus() {
        return this.isConnected;
    }
}
exports.TTSStreamingService = TTSStreamingService;
//# sourceMappingURL=tts-streaming.js.map