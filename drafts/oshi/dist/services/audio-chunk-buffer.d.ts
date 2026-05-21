/**
 * AudioChunkBuffer — Batches small ElevenLabs audio chunks
 * into fewer, larger chunks before sending to the frontend.
 *
 * WHY: ElevenLabs streams many small MP3 chunks (~2-5KB each).
 * Each chunk requires a separate decodeAudioData() call on the
 * frontend, which creates playback gaps and overhead. By batching
 * chunks, Dev A gets fewer but larger audio payloads to decode.
 *
 * STRATEGY:
 * - First chunk always fires immediately (preserve fast first-audio)
 * - Subsequent chunks accumulate until a size or time threshold
 * - On flush (stream end), emit whatever remains in the buffer
 *
 * Events:
 *   "chunk" (buffer: Buffer) — a batched audio chunk ready to send
 */
import { EventEmitter } from "events";
/** Configuration for the chunk buffer */
interface AudioChunkBufferConfig {
    /** Byte threshold to trigger a flush (default: 32KB) */
    sizeThresholdBytes?: number;
    /** Max time (ms) to hold chunks before flushing (default: 100ms) */
    maxHoldTimeMs?: number;
}
export declare class AudioChunkBuffer extends EventEmitter {
    private readonly sizeThreshold;
    private readonly maxHoldTime;
    /** Accumulated chunks waiting to be flushed */
    private pendingChunks;
    /** Total bytes currently in the pending buffer */
    private pendingBytes;
    /** Timer that forces a flush after maxHoldTime */
    private holdTimer;
    /** Whether the very first chunk has been sent yet */
    private firstChunkSent;
    constructor(config?: AudioChunkBufferConfig);
    /**
     * Adds an audio chunk to the buffer. First chunk is always
     * emitted immediately to keep first-audio latency low.
     * Subsequent chunks accumulate until a threshold is met.
     */
    addChunk(chunk: Buffer): void;
    /**
     * Forces all pending chunks to be emitted immediately.
     * Called on stream end or cancel to ensure no audio is lost.
     */
    flush(): void;
    /**
     * Resets the buffer to initial state. Call when starting
     * a new TTS request or after cancel/interrupt.
     */
    reset(): void;
    /** Returns the number of chunks currently waiting in the buffer */
    getPendingCount(): number;
    /**
     * Concatenates all pending chunks into one Buffer and emits it.
     * Clears the hold timer and resets pending state.
     */
    private flushPending;
    /** Clears the hold timer if active */
    private clearTimer;
}
export {};
//# sourceMappingURL=audio-chunk-buffer.d.ts.map