/**
 * Pipeline Test — Simulated LLM Token Stream → Sentence Chunker → TTS Queue
 *
 * Simulates an LLM streaming tokens one at a time with 50ms delays,
 * feeding them through the sentence chunker + TTS queue pipeline via
 * the WebSocket llm_tokens message type.
 *
 * Verifies:
 * 1. Sentence chunker correctly splits tokens into 2 sentences
 * 2. Each sentence produces separate TTS audio chunks
 * 3. Audio output is valid and playable
 * 4. Per-sentence and total latency are reported
 *
 * Usage: npm run test:pipeline
 * Requires: Server running on localhost:3001 (npm run dev)
 */
export {};
//# sourceMappingURL=test-pipeline.d.ts.map