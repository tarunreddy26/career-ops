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
/** Configuration needed to create TTS instances */
export interface TTSQueueConfig {
    apiKey: string;
    voiceId: string;
    modelId: string;
    stability?: number;
    similarityBoost?: number;
    style?: number;
}
/** Payload for sentenceStart / sentenceEnd events */
export interface SentenceProgressPayload {
    sentenceIndex: number;
    text: string;
    latencyMs?: number;
}
export declare class TTSQueue extends EventEmitter {
    private readonly config;
    private queue;
    private isProcessing;
    private activeTTS;
    private isCancelled;
    private flushed;
    constructor(config: TTSQueueConfig);
    /**
     * Adds a sentence to the queue for TTS processing.
     * If nothing is currently processing, starts immediately.
     */
    enqueueSentence(text: string, sentenceIndex: number): void;
    /**
     * Signals that no more sentences will be enqueued.
     * Once the queue drains, emits streamEnd.
     */
    flush(): void;
    /**
     * Cancels all TTS processing — disconnects active stream,
     * clears the queue. Used for barge-in interruption.
     *
     * Fire-and-forget disconnect for speed — user should hear
     * nothing after cancel is called. Returns immediately,
     * disconnect happens in background.
     */
    cancel(): void;
    /**
     * Resets the queue to accept new sentences after a cancel.
     * Must be called before enqueueing after a cancel().
     */
    reset(): void;
    /** Returns current queue depth */
    getQueueDepth(): number;
    /** Returns whether the queue is currently processing a sentence */
    getIsProcessing(): boolean;
    /**
     * Processes the next sentence in the queue through ElevenLabs.
     * Creates a fresh TTS connection per sentence (ElevenLabs WS
     * is designed for single-text lifecycle).
     */
    private processNext;
    /**
     * Emits the final streamEnd event indicating all
     * sentences have been processed and audio is complete.
     */
    private emitStreamEnd;
}
//# sourceMappingURL=tts-queue.d.ts.map