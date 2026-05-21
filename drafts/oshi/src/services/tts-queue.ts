/**
 * TTSQueue — Sequential TTS processing for sentence streams
 *
 * Receives complete sentences from the SentenceChunker and processes
 * them one at a time through ElevenLabs TTSStreamingService. While
 * sentence 1 is being synthesized, sentence 2+ wait in the queue.
 *
 * Events flow: SentenceChunker → TTSQueue → Frontend WebSocket
 *
 * Supports cancel (barge-in) and backpressure warnings when the
 * queue grows too deep (LLM faster than TTS).
 */

import { EventEmitter } from "events";
import { TTSStreamingService } from "./tts-streaming";

/** Configuration needed to create TTS instances */
export interface TTSQueueConfig {
  apiKey: string;
  voiceId: string;
  modelId: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
}

/** Item waiting in the sentence queue */
interface QueueItem {
  text: string;
  sentenceIndex: number;
}

/** Payload for sentenceStart / sentenceEnd events */
export interface SentenceProgressPayload {
  sentenceIndex: number;
  text: string;
  latencyMs?: number;
}

// Emit a warning if the queue exceeds this depth
const QUEUE_WARNING_THRESHOLD = 5;

export class TTSQueue extends EventEmitter {
  private readonly config: TTSQueueConfig;
  private queue: QueueItem[] = [];
  private isProcessing: boolean = false;
  private activeTTS: TTSStreamingService | null = null;
  private isCancelled: boolean = false;

  // When true, no more sentences are coming — process remaining then emit streamEnd
  private flushed: boolean = false;

  constructor(config: TTSQueueConfig) {
    super();
    this.config = config;
  }

  /**
   * Adds a sentence to the queue for TTS processing.
   * If nothing is currently processing, starts immediately.
   */
  enqueueSentence(text: string, sentenceIndex: number): void {
    if (this.isCancelled) return;

    this.queue.push({ text, sentenceIndex });
    console.log(
      `[TTSQueue] Enqueued sentence ${sentenceIndex} ` +
      `(queue depth: ${this.queue.length})`
    );

    // Backpressure warning if LLM is outpacing TTS
    if (this.queue.length > QUEUE_WARNING_THRESHOLD) {
      console.warn(
        `[TTSQueue] Queue depth ${this.queue.length} ` +
        `exceeds threshold ${QUEUE_WARNING_THRESHOLD}`
      );
      this.emit("queueWarning", {
        depth: this.queue.length,
        threshold: QUEUE_WARNING_THRESHOLD,
      });
    }

    // Start processing if idle
    if (!this.isProcessing) {
      this.processNext();
    }
  }

  /**
   * Signals that no more sentences will be enqueued.
   * Once the queue drains, emits streamEnd.
   */
  flush(): void {
    this.flushed = true;
    console.log("[TTSQueue] Flush called — no more sentences incoming");

    // If queue is already empty and not processing, we're done
    if (!this.isProcessing && this.queue.length === 0) {
      this.emitStreamEnd();
    }
  }

  /**
   * Cancels all TTS processing — disconnects active stream,
   * clears the queue. Used for barge-in interruption.
   *
   * Fire-and-forget disconnect for speed — user should hear
   * nothing after cancel is called. Returns immediately,
   * disconnect happens in background.
   */
  cancel(): void {
    const cancelStart = Date.now();
    console.log("[TTSQueue] Cancel requested");
    this.isCancelled = true;
    this.queue = [];
    this.flushed = false;
    this.isProcessing = false;

    // Fire-and-forget disconnect — don't await for speed
    if (this.activeTTS) {
      const ttsRef = this.activeTTS;
      ttsRef.removeAllListeners();
      this.activeTTS = null;
      // Disconnect in background — don't block the cancel
      ttsRef.disconnect().catch((err: Error) => {
        console.error("[TTSQueue] Disconnect error:", err.message);
      });
    }

    const cancelLatencyMs = Date.now() - cancelStart;
    console.log(`[TTSQueue] Cancelled in ${cancelLatencyMs}ms`);
    this.emit("cancelled", { cancelLatencyMs });
  }

  /**
   * Resets the queue to accept new sentences after a cancel.
   * Must be called before enqueueing after a cancel().
   */
  reset(): void {
    this.isCancelled = false;
    this.flushed = false;
    this.queue = [];
    this.isProcessing = false;
    this.activeTTS = null;
  }

  /** Returns current queue depth */
  getQueueDepth(): number {
    return this.queue.length;
  }

  /** Returns whether the queue is currently processing a sentence */
  getIsProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Processes the next sentence in the queue through ElevenLabs.
   * Creates a fresh TTS connection per sentence (ElevenLabs WS
   * is designed for single-text lifecycle).
   */
  private async processNext(): Promise<void> {
    // Nothing left to process
    if (this.queue.length === 0) {
      this.isProcessing = false;

      // If flush was called and queue is empty, we're done
      if (this.flushed) {
        this.emitStreamEnd();
      }
      return;
    }

    if (this.isCancelled) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const item = this.queue.shift()!;
    const startTime = Date.now();

    console.log(
      `[TTSQueue] Processing sentence ${item.sentenceIndex}: ` +
      `"${item.text.substring(0, 50)}${item.text.length > 50 ? "..." : ""}"`
    );

    // Notify listeners that a sentence is starting TTS
    this.emit("sentenceStart", {
      sentenceIndex: item.sentenceIndex,
      text: item.text,
    } as SentenceProgressPayload);

    // Create fresh TTS service for this sentence
    const ttsService = new TTSStreamingService({
      apiKey: this.config.apiKey,
      voiceId: this.config.voiceId,
      modelId: this.config.modelId,
      stability: this.config.stability,
      similarityBoost: this.config.similarityBoost,
      style: this.config.style,
    });
    this.activeTTS = ttsService;

    try {
      // Forward audio chunks to listeners (the WS route)
      ttsService.on("audioChunk", (chunk: Buffer) => {
        if (!this.isCancelled) {
          this.emit("audioChunk", chunk);
        }
      });

      // Forward stream start (first chunk of this sentence)
      ttsService.on("streamStart", () => {
        if (!this.isCancelled) {
          this.emit("streamStart");
        }
      });

      // Forward errors
      ttsService.on("error", (error: Error) => {
        console.error(
          `[TTSQueue] TTS error on sentence ${item.sentenceIndex}:`,
          error.message
        );
        if (!this.isCancelled) {
          this.emit("error", error);
        }
      });

      // Connect → send text → flush → wait for completion
      await ttsService.connect();
      ttsService.sendText(item.text);
      ttsService.flush();

      // Wait for the TTS stream to finish
      await new Promise<void>((resolve, reject) => {
        ttsService.on("streamEnd", () => resolve());
        ttsService.on("error", () => resolve());

        // Safety timeout per sentence
        setTimeout(() => {
          reject(new Error(
            `TTS timed out on sentence ${item.sentenceIndex}`
          ));
        }, 30000);
      });

      // Emit sentence completion with latency
      const latencyMs = Date.now() - startTime;
      console.log(
        `[TTSQueue] Sentence ${item.sentenceIndex} done in ${latencyMs}ms`
      );
      this.emit("sentenceEnd", {
        sentenceIndex: item.sentenceIndex,
        text: item.text,
        latencyMs,
      } as SentenceProgressPayload);

    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Unknown TTS queue error";
      console.error(
        `[TTSQueue] Failed on sentence ${item.sentenceIndex}:`,
        errorMessage
      );
      if (!this.isCancelled) {
        this.emit("error", new Error(errorMessage));
      }
    } finally {
      // Clean up this sentence's TTS connection
      ttsService.removeAllListeners();
      await ttsService.disconnect();

      if (this.activeTTS === ttsService) {
        this.activeTTS = null;
      }

      // Process next sentence in queue
      if (!this.isCancelled) {
        this.processNext();
      } else {
        this.isProcessing = false;
      }
    }
  }

  /**
   * Emits the final streamEnd event indicating all
   * sentences have been processed and audio is complete.
   */
  private emitStreamEnd(): void {
    console.log("[TTSQueue] All sentences processed — stream complete");
    this.emit("streamEnd");
  }
}
