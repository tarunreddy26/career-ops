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

// Sensible defaults — 32KB batches or 100ms max wait
const DEFAULT_SIZE_THRESHOLD = 32 * 1024; // 32KB
const DEFAULT_MAX_HOLD_TIME = 100; // 100ms

export class AudioChunkBuffer extends EventEmitter {
  private readonly sizeThreshold: number;
  private readonly maxHoldTime: number;

  /** Accumulated chunks waiting to be flushed */
  private pendingChunks: Buffer[] = [];
  /** Total bytes currently in the pending buffer */
  private pendingBytes: number = 0;
  /** Timer that forces a flush after maxHoldTime */
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  /** Whether the very first chunk has been sent yet */
  private firstChunkSent: boolean = false;

  constructor(config?: AudioChunkBufferConfig) {
    super();
    this.sizeThreshold =
      config?.sizeThresholdBytes ?? DEFAULT_SIZE_THRESHOLD;
    this.maxHoldTime =
      config?.maxHoldTimeMs ?? DEFAULT_MAX_HOLD_TIME;
  }

  /**
   * Adds an audio chunk to the buffer. First chunk is always
   * emitted immediately to keep first-audio latency low.
   * Subsequent chunks accumulate until a threshold is met.
   */
  addChunk(chunk: Buffer): void {
    // First chunk goes out immediately — no buffering
    // This preserves the ~200ms first-audio latency target
    if (!this.firstChunkSent) {
      this.firstChunkSent = true;
      this.emit("chunk", chunk);
      return;
    }

    // Accumulate subsequent chunks in the buffer
    this.pendingChunks.push(chunk);
    this.pendingBytes += chunk.length;

    // If we hit the size threshold, flush now
    if (this.pendingBytes >= this.sizeThreshold) {
      this.flushPending();
      return;
    }

    // Start a hold timer if not already running — ensures
    // chunks don't sit in the buffer forever on slow streams
    if (!this.holdTimer) {
      this.holdTimer = setTimeout(() => {
        this.flushPending();
      }, this.maxHoldTime);
    }
  }

  /**
   * Forces all pending chunks to be emitted immediately.
   * Called on stream end or cancel to ensure no audio is lost.
   */
  flush(): void {
    this.flushPending();
  }

  /**
   * Resets the buffer to initial state. Call when starting
   * a new TTS request or after cancel/interrupt.
   */
  reset(): void {
    this.clearTimer();
    this.pendingChunks = [];
    this.pendingBytes = 0;
    this.firstChunkSent = false;
  }

  /** Returns the number of chunks currently waiting in the buffer */
  getPendingCount(): number {
    return this.pendingChunks.length;
  }

  /**
   * Concatenates all pending chunks into one Buffer and emits it.
   * Clears the hold timer and resets pending state.
   */
  private flushPending(): void {
    this.clearTimer();

    // Nothing to flush
    if (this.pendingChunks.length === 0) {
      return;
    }

    // Merge all pending chunks into a single buffer
    const mergedChunk = Buffer.concat(this.pendingChunks);

    // Reset pending state before emitting (in case listener
    // calls addChunk synchronously)
    this.pendingChunks = [];
    this.pendingBytes = 0;

    this.emit("chunk", mergedChunk);
  }

  /** Clears the hold timer if active */
  private clearTimer(): void {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }
}
