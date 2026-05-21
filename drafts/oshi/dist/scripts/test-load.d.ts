/**
 * Load Test — Concurrent WebSocket TTS Sessions
 *
 * Verifies the backend handles 20+ concurrent WebSocket sessions
 * without connection leaks, interference, or crashes. Each session
 * sends a unique TTS request and collects audio independently.
 *
 * Tests:
 * 1. 20 concurrent WebSocket connections
 * 2. Each sends a tts_request simultaneously
 * 3. Verify all get valid audio back with no cross-talk
 * 4. Verify all connections close cleanly (no leaks)
 * 5. Report per-session and aggregate latency
 *
 * Usage: npm run test:load
 * Requires: Server running (local or Render)
 */
export {};
//# sourceMappingURL=test-load.d.ts.map