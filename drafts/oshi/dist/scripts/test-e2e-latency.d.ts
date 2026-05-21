/**
 * E2E Latency Test — Measures full pipeline latency
 *
 * Simulates the real flow: LLM tokens → sentence chunker → TTS → audio
 * Measures time from first token sent to first audio chunk received.
 *
 * Target latencies (per brief):
 * - First audio chunk from ElevenLabs: < 200ms
 * - Total e2e (text to audio): < 1.2s
 *
 * Usage: npm run test:e2e
 * Target: wss://oshi-ai-vtuber-backend.onrender.com/api/tts/stream
 */
export {};
//# sourceMappingURL=test-e2e-latency.d.ts.map