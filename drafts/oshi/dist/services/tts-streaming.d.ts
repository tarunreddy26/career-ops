/**
 * TTSStreamingService — ElevenLabs WebSocket Streaming TTS
 *
 * Connects to ElevenLabs' WebSocket streaming endpoint for low-latency
 * text-to-speech. Sends sentence chunks, receives audio chunks in real-time.
 *
 * CRITICAL: Uses WebSocket endpoint (not REST) to achieve ~200ms first-chunk
 * latency instead of ~2s with the standard REST API.
 */
import { EventEmitter } from "events";
/** Configuration for initializing the TTS service */
interface TTSServiceConfig {
    apiKey: string;
    voiceId: string;
    modelId: string;
    stability?: number;
    similarityBoost?: number;
    style?: number;
}
export declare class TTSStreamingService extends EventEmitter {
    private websocket;
    private readonly config;
    private isConnected;
    private textSentTimestamp;
    private firstChunkReceived;
    private totalChunks;
    constructor(config: TTSServiceConfig);
    /**
     * Opens a WebSocket connection to ElevenLabs streaming endpoint.
     * Sends the initial config message to set voice parameters.
     * Returns a promise that resolves when the connection is ready.
     */
    connect(): Promise<void>;
    /**
     * Sends a sentence chunk to ElevenLabs for synthesis.
     * Each chunk should be a complete sentence for best results.
     *
     * Per the brief: use sentence boundary detection, send each
     * sentence as soon as it's complete from the LLM stream.
     */
    sendText(text: string): void;
    /**
     * Signals end of text input — tells ElevenLabs to flush
     * any remaining audio and close the generation.
     */
    flush(): void;
    /**
     * Processes incoming audio chunks from ElevenLabs.
     * Decodes base64 audio, tracks latency, emits events.
     */
    private handleAudioResponse;
    /**
     * Gracefully closes the WebSocket connection.
     * Sends flush first to get any remaining audio.
     */
    disconnect(): Promise<void>;
    /** Check if the WebSocket is currently connected */
    getConnectionStatus(): boolean;
}
export {};
//# sourceMappingURL=tts-streaming.d.ts.map