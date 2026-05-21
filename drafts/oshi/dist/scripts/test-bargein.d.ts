/**
 * Barge-In Test — Verifies interrupt stops audio immediately
 *
 * Simulates: VTuber is speaking (TTS streaming) → user starts talking
 * → frontend sends "interrupt" → backend kills audio → no more chunks
 *
 * Tests:
 * 1. Start a TTS stream via llm_tokens pipeline
 * 2. Wait for first audio chunks to confirm stream is active
 * 3. Send "interrupt" message (barge-in)
 * 4. Verify: stop_audio received, no more audio chunks after interrupt
 * 5. Measure cancel latency (time from interrupt to stop_audio)
 *
 * Usage: npm run test:bargein
 * Target: wss://oshi-ai-vtuber-backend.onrender.com/api/tts/stream
 */
export {};
//# sourceMappingURL=test-bargein.d.ts.map