"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentenceChunker = void 0;
const events_1 = require("events");
// Minimum character count before a sentence boundary triggers emission.
// Prevents tiny fragments like "Oh." or "Hi!" from being sent alone.
const MIN_SENTENCE_LENGTH = 15;
// Patterns that mark the END of a sentence.
// Each pattern is checked at the end of the current buffer.
const SENTENCE_BOUNDARIES = [
    ". ",
    "! ",
    "? ",
    "...",
    ".\n",
    "!\n",
    "?\n",
];
class SentenceChunker extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.buffer = "";
        this.sentenceIndex = 0;
    }
    /**
     * Appends a single LLM token to the buffer, then checks
     * if a sentence boundary has been reached. If so, emits
     * the complete sentence (provided it meets min length).
     */
    addToken(token) {
        this.buffer += token;
        this.checkForBoundary();
    }
    /**
     * Forces emission of whatever remains in the buffer,
     * regardless of length. Called at end of LLM response
     * so the last sentence isn't stuck in the buffer.
     */
    flush() {
        const trimmed = this.buffer.trim();
        if (trimmed.length > 0) {
            this.emitSentence(trimmed);
        }
        this.buffer = "";
    }
    /**
     * Resets the chunker state. Useful when cancelling
     * a stream mid-generation.
     */
    reset() {
        this.buffer = "";
        this.sentenceIndex = 0;
    }
    /** Returns current buffer contents (for debugging) */
    getBuffer() {
        return this.buffer;
    }
    /** Returns the next sentence index that will be emitted */
    getSentenceIndex() {
        return this.sentenceIndex;
    }
    /**
     * Scans the buffer for sentence boundary patterns.
     * If found AND the sentence meets minimum length,
     * splits it out and emits. Short fragments stay in
     * the buffer to merge with the next sentence.
     */
    checkForBoundary() {
        for (const boundary of SENTENCE_BOUNDARIES) {
            const boundaryIndex = this.buffer.lastIndexOf(boundary);
            if (boundaryIndex === -1)
                continue;
            // Include the punctuation but not the trailing space/newline
            // e.g., for ". " → include the "." in the sentence
            const splitPoint = boundaryIndex + boundary.length - 1;
            const sentence = this.buffer.substring(0, splitPoint).trim();
            const remainder = this.buffer.substring(splitPoint).trimStart();
            // Only emit if the sentence meets minimum length.
            // Short fragments merge with the next sentence.
            if (sentence.length >= MIN_SENTENCE_LENGTH) {
                this.emitSentence(sentence);
                this.buffer = remainder;
                return; // Process one boundary at a time
            }
        }
    }
    /**
     * Emits a sentence event with the text and current index,
     * then increments the index counter.
     */
    emitSentence(text) {
        const payload = {
            text,
            index: this.sentenceIndex,
        };
        this.sentenceIndex++;
        console.log(`[Chunker] Sentence ${payload.index}: "${text.substring(0, 60)}${text.length > 60 ? "..." : ""}"`);
        this.emit("sentence", payload);
    }
}
exports.SentenceChunker = SentenceChunker;
//# sourceMappingURL=sentence-chunker.js.map