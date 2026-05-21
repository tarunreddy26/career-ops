/**
 * SentenceChunker — Buffers LLM tokens and emits complete sentences
 *
 * Sits between the LLM token stream (Dev B) and the TTS queue.
 * Accepts individual tokens, buffers them, detects sentence boundaries,
 * and emits complete sentences ready for TTS synthesis.
 *
 * Boundary detection: `. `, `! `, `? `, `...`, `.\n`, `!\n`, `?\n`
 * Minimum buffer: 15 chars (avoids tiny fragments like "Oh.")
 */
import { EventEmitter } from "events";
/** Payload emitted with each detected sentence */
export interface SentencePayload {
    text: string;
    index: number;
}
/** Events emitted by SentenceChunker */
export interface SentenceChunkerEvents {
    sentence: (payload: SentencePayload) => void;
}
export declare class SentenceChunker extends EventEmitter {
    private buffer;
    private sentenceIndex;
    /**
     * Appends a single LLM token to the buffer, then checks
     * if a sentence boundary has been reached. If so, emits
     * the complete sentence (provided it meets min length).
     */
    addToken(token: string): void;
    /**
     * Forces emission of whatever remains in the buffer,
     * regardless of length. Called at end of LLM response
     * so the last sentence isn't stuck in the buffer.
     */
    flush(): void;
    /**
     * Resets the chunker state. Useful when cancelling
     * a stream mid-generation.
     */
    reset(): void;
    /** Returns current buffer contents (for debugging) */
    getBuffer(): string;
    /** Returns the next sentence index that will be emitted */
    getSentenceIndex(): number;
    /**
     * Scans the buffer for sentence boundary patterns.
     * If found AND the sentence meets minimum length,
     * splits it out and emits. Short fragments stay in
     * the buffer to merge with the next sentence.
     */
    private checkForBoundary;
    /**
     * Emits a sentence event with the text and current index,
     * then increments the index counter.
     */
    private emitSentence;
}
//# sourceMappingURL=sentence-chunker.d.ts.map