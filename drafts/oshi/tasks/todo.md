# Dev C — Task Tracker (Audio Pipeline + DevOps)

## Phase 1: ElevenLabs TTS Foundation (Days 1-2)

- [x] **1.1 — ElevenLabs WebSocket client**
  - File: `src/services/tts-streaming.ts`
  - WebSocket connection to `wss://api.elevenlabs.io/v1/text-to-speech/{voiceId}/stream-input`
  - Voice settings tuned per brief: stability 0.4, similarity 0.75, style 0.35
  - Model: `eleven_flash_v2_5` (optimized for streaming latency)

- [x] **1.2 — Audio chunk handling + latency tracking**
  - File: `src/services/tts-streaming.ts`
  - Base64 decode of MP3 audio chunks from ElevenLabs
  - First-chunk latency measurement (target: < 200ms)
  - Event emitter pattern: `streamStart`, `audioChunk`, `streamEnd`, `error`, `latencyReport`

- [x] **1.3 — TTS test endpoint (HTTP)**
  - File: `src/routes/tts-test.route.ts`
  - `POST /api/tts/test` — accepts text, returns full MP3 audio
  - Latency headers: `X-TTS-Latency-Ms`, `X-TTS-Chunks`
  - 15s timeout safety net

- [x] **1.4 — CLI test script**
  - File: `src/scripts/test-tts.ts`
  - `npm run test:tts` — end-to-end TTS test without HTTP
  - Saves output to `test-output.mp3`, reports latency benchmarks

- [x] **1.5 — Type definitions**
  - File: `src/types/elevenlabs.types.ts`
  - Full types: `ElevenLabsStreamConfig`, `ElevenLabsTextChunk`, `ElevenLabsFlushMessage`, `ElevenLabsAudioResponse`, `LatencyMetrics`

- [x] **1.6 — Environment config**
  - Files: `.env`, `.env.example`
  - Variables: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` (Aria), `ELEVENLABS_MODEL_ID`, `PORT`

- [x] **1.7 — Fastify server setup**
  - File: `src/server.ts`
  - Fastify with CORS, health check at `GET /health`
  - `@fastify/websocket` registered and ready

---

## Phase 2: WebSocket Server for Frontend (Days 3-4) — COMPLETE

- [x] **2.1 — Register @fastify/websocket on server**
  - Registered in `src/server.ts` before all routes
  - WebSocket upgrade support active

- [x] **2.2 — Define WebSocket message protocol**
  - File: `src/types/ws-messages.types.ts`
  - Client messages: `tts_request`, `cancel`, `ping`
  - Server messages: `stream_start`, `audio_chunk`, `stream_end`, `cancelled`, `error`, `pong`
  - `parseClientMessage()` validator with error handling

- [x] **2.3 — Build WebSocket TTS streaming route**
  - File: `src/routes/tts-stream.route.ts`
  - Route: `WS /api/tts/stream`
  - Real-time audio chunk forwarding (no buffering)
  - Queue support (max 1 pending request)
  - Cancel/interrupt support for barge-in
  - Per-request UUID tracking (requestId)

- [x] **2.4 — Connection lifecycle management**
  - Client disconnect cleanup (ElevenLabs connection closed)
  - ElevenLabs error forwarding to frontend
  - Ping/pong keepalive
  - 30s safety timeout per request
  - removeAllListeners() to prevent memory leaks

- [x] **2.5 — WebSocket test client**
  - File: `src/scripts/test-ws.ts`
  - `npm run test:ws` — 3 tests: streaming, cancel, ping/pong
  - All tests passing (verified 2026-03-17)
  - Test results: 381ms first chunk, 595ms total, 5 chunks, 76KB audio

---

## Phase 3: Audio Queue + Sentence Pipeline (Days 3-4)

- [x] **3.1 — Sentence chunking service**
  - File: `src/services/sentence-chunker.ts`
  - EventEmitter: accepts tokens via `addToken()`, emits `sentence` events
  - Boundary detection: `. `, `! `, `? `, `...`, `.\n`, `!\n`, `?\n`
  - Minimum 15-char buffer to avoid tiny fragments
  - `flush()` emits remaining buffer at end of LLM response
  - Tracks sentence index (0, 1, 2...) for ordering

- [x] **3.2 — Multi-sentence TTS queue**
  - File: `src/services/tts-queue.ts`
  - Sequential processing: one sentence through ElevenLabs at a time
  - Events: `sentenceStart`, `sentenceEnd`, `audioChunk`, `streamEnd`, `error`
  - Per-sentence latency tracking
  - `cancel()` for barge-in (disconnects active TTS, clears queue)
  - `flush()` signals no more sentences, emits streamEnd when queue drains

- [x] **3.3 — Backpressure handling**
  - Queue depth warning at threshold of 5 sentences
  - `queueWarning` event emitted when exceeded
  - Cancel clears entire queue immediately

- [x] **3.4 — WebSocket protocol update**
  - File: `src/types/ws-messages.types.ts`
  - New client message: `llm_tokens` with `{ tokens: string[], flush: boolean }`
  - New server messages: `sentence_start`, `sentence_end`
  - Validation in `parseClientMessage()` for new type

- [x] **3.5 — Route wiring**
  - File: `src/routes/tts-stream.route.ts`
  - `llm_tokens` handler: feeds tokens → SentenceChunker → TTSQueue → WebSocket
  - Pipeline lifecycle: init on first llm_tokens, cleanup on streamEnd
  - Cancel now tears down pipeline + direct TTS flow
  - Existing `tts_request` handler unchanged (no regression)

- [x] **3.6 — Pipeline test script**
  - File: `src/scripts/test-pipeline.ts`
  - `npm run test:pipeline` — simulates LLM streaming 11 tokens at 50ms intervals
  - Verifies 2 sentences detected, 2 TTS streams, audio output saved
  - Reports per-sentence and total latency

---

## Phase 4: Barge-In + Interruption (Day 5)

- [x] **4.1 — Cancel/interrupt mechanism**
  - `cancel` and `interrupt` message types both tear down all active audio
  - `interrupt` = barge-in (user speaking), `cancel` = manual stop — logged separately
  - Fire-and-forget TTS disconnect for speed (~0ms cancel latency)
  - Chunker buffer reset on cancel (no stale tokens leak)
  - `stop_audio` server message tells frontend to clear its audio buffer immediately
  - Tested: no regression on existing WS + pipeline tests

- [ ] **4.2 — VAD silence threshold coordination** *(BLOCKED on Dev B)*
  - Need Dev B to send `speech_final` events from Deepgram STT
  - Backend expects: `{ type: "interrupt", data: {} }` from frontend on barge-in
  - Agreed thresholds: 600ms silence (Deepgram), 200ms debounce (Dev B side)
  - Prevent false interruptions from brief pauses

---

## Phase 5: Lip Sync Calibration (Day 6)

- [x] **5.1 — Audio format optimization for lip sync**
  - Confirmed: base64 MP3 chunks work for Dev A's Web Audio AnalyserNode
  - No format change needed — ElevenLabs sends self-contained MP3 frames
  - Dev A's flow: base64 → ArrayBuffer → decodeAudioData → AnalyserNode
  - Live endpoint shared with Dev A for integration

- [ ] **5.2 — Amplitude mapping tuning**
  - Work with Dev A on frontend: test lip sync with real TTS output
  - Tune the frequency range (200Hz-3kHz) and smoothing factor (lerp 0.3)
  - Test with different speech patterns: fast talking, whispers, exclamations
  - This is mostly frontend work (Dev A) but needs backend audio format coordination

---

## Phase 6: DevOps + Deployment (Day 6-7)

- [x] ~~**6.1 — Dockerize the backend**~~ — SKIPPED (deploying as Node.js service on Render)

- [x] **6.2 — Deploy to Render**
  - `render.yaml` blueprint created: Node.js runtime, ohio region, health check
  - Build: `npm install && npm run build`, Start: `npm start`
  - Env vars marked as secrets (set manually in Render dashboard)
  - Manual steps: push to company repo → Render reads blueprint → set secrets

- [x] **6.3 — Production hardening**
  - CORS: env-based `ALLOWED_ORIGINS` whitelist (comma-separated, allow-all in dev)
  - Rate limiting: `@fastify/rate-limit` — 30 req/min per IP, `/health` exempt
  - Input validation: 500-char max on `tts_request` text and `/api/tts/test`
  - API keys never exposed — health check only returns boolean `hasElevenLabsKey`

- [x] **6.4 — Structured latency logging**
  - Pino JSON logger configured (info level in prod, debug in dev)
  - `tts_latency` log: requestId, firstChunkMs, totalMs, totalChunks
  - `pipeline_latency` log: requestId, totalChunks
  - `tts_test_latency` log: latencyMs, totalChunks, audioBytes
  - All logs are structured JSON — queryable in Render log viewer

---

## Phase 6.5: Audio Chunk Buffering (Optimization)

- [x] **6.5.1 — AudioChunkBuffer service**
  - File: `src/services/audio-chunk-buffer.ts`
  - Batches small ElevenLabs audio chunks (~2-5KB) into fewer, larger payloads
  - First chunk always sent immediately (preserves ~200ms first-audio latency)
  - Subsequent chunks accumulate until 32KB size threshold or 100ms time limit
  - Flush on stream end ensures no audio is lost
  - Reset on cancel/interrupt discards pending chunks immediately

- [x] **6.5.2 — Integrated into both TTS flows**
  - File: `src/routes/tts-stream.route.ts`
  - Direct `tts_request` flow: buffer between ElevenLabs chunks and frontend WS
  - Pipeline `llm_tokens` flow: buffer between TTSQueue audio and frontend WS
  - Cancel/interrupt cleans up buffer (no stale audio leaks)
  - Reduces frontend `decodeAudioData()` calls by ~60-80%

---

## Phase 7: Testing + QA (Day 7)

- [ ] **7.1 — Cross-browser WebSocket testing** *(needs manual testing)*
  - Frontend: `https://oshiweb.vercel.app/vtuber`
  - Backend: `wss://oshi-ai-vtuber-backend.onrender.com/api/tts/stream`
  - TODO: Open in Chrome, Safari, Firefox — verify WebSocket + audio playback
  - TODO: iOS Safari — verify `AudioContext.resume()` on user gesture

- [x] **7.2 — Load testing**
  - File: `src/scripts/test-load.ts`
  - `npm run test:load` — 20 concurrent WebSocket sessions against Render
  - Result: 20/20 passed, 62 total chunks, 780KB total audio
  - No crashes, no connection leaks, no cross-talk between sessions
  - High latency under load (~22s) due to ElevenLabs queuing — expected for concurrent burst
  - Single-user latency remains ~300-400ms (verified in earlier tests)

- [ ] **7.3 — End-to-end latency validation** *(BLOCKED on Dev A + Dev B)*
  - Full pipeline: text → ElevenLabs → audio chunk → WebSocket → frontend
  - Target: < 200ms first audio chunk from ElevenLabs
  - Target: < 1.2s total end-to-end (STT → LLM → TTS → playback)

---

## Phase 8: Genki Meter — Workstream A (Backend)

- [x] **8.1 — Type definitions**
  - File: `src/types/genki.types.ts`
  - Types: `GenkiTier`, `ReturnDialogueTier`, `GenkiUserState`, `DecayResult`, `RestoreResult`, `MessageRestoreResult`, `SessionOpenResponse`
  - Constants: `GENKI_TIER_THRESHOLDS`, `RETURN_DIALOGUE_PROMPTS`

- [x] **8.2 — Decay function**
  - File: `src/services/genki-meter.ts`
  - Formula: −10 per 24h, max decay 70, floor 0
  - Pure function: `calculateDecay(currentGenki, lastActiveAt, now)`
  - Injectable `now` parameter for deterministic testing

- [x] **8.3 — Restore logic**
  - File: `src/services/genki-meter.ts`
  - Daily check-in: `applyDailyCheckin()` — +20 on first open of new UTC day
  - Message bonus: `applyMessageBonus()` — +2 per msg, capped at +10/session
  - Both cap at genki 100

- [x] **8.4 — Tier + dialogue helpers**
  - File: `src/services/genki-meter.ts`
  - `getGenkiTier()` — maps 0–100 to four animation states
  - `getReturnDialogueTier()` — maps days elapsed to dialogue prompts
  - `processSessionOpen()` — composes decay → restore → tier in one call

- [x] **8.5 — Session-open API route**
  - File: `src/routes/genki.route.ts`
  - `POST /api/genki/session-open` — full decay + restore + response
  - `POST /api/genki/message` — per-message bonus
  - `GET /api/genki/:user_id` — current state (read-only)

- [x] **8.6 — Unit tests (74 passing)**
  - File: `src/scripts/test-genki.ts`
  - `npm run test:genki` — covers all acceptance criteria
  - Tests: decay, restore, tier mapping, dialogue tiers, full session open, edge cases

- [x] **8.7 — Supabase integration (Postgres)**
  - File: `src/services/supabase.ts` — client + DB helpers
  - Migration: `supabase/migrations/001_create_users_genki.sql`
  - Users table: `user_id`, `genki_value`, `last_active_at`, `last_checkin_at`
  - RLS enabled with anon policy, auto `updated_at` trigger
  - Replaced in-memory store in genki.route.ts with Supabase calls
  - All 3 endpoints tested against live Supabase — working correctly

---

## Dependencies on Other Devs

| Need | From | Blocking |
|---|---|---|
| LLM streaming tokens to feed into sentence chunker | Dev B | Phase 3.1 |
| Deepgram STT integration (speech_final events) | Dev B | Phase 4.2 |
| Frontend WebSocket client to test against | Dev A | Phase 2.3 |
| LipSyncProcessor to test audio format | Dev A | Phase 5 |
| VTuber system prompt (personality design) | Will | Not blocking Dev C |

---

## Phase 9: Gift Shop — Intern C Research/QA (week of 2026-04-06)

- [x] **9.1 — Platform research report**
  - File: `tasks/platform-research-report.md`
  - Deep dive: SHOWROOM, Pococha, TikTok LIVE, Hololive/Nijisanji
  - Covers: currency systems, gift tiers, engagement mechanics, revenue splits
  - Cross-platform comparison table + recommendations for Oshi

- [x] **9.2 — Gift catalogue expansion**
  - File: `tasks/gift-catalogue-expansion.md`
  - 15 new gift ideas across 5 categories (including new "Fan Items" category)
  - Culturally authentic: konpeito, bento box, daruma, senbazuru, oshi mark, etc.
  - Price curve: 5–1000 coins spanning daily habits to whale gifts
  - Seasonal rotation calendar included

- [x] **9.3 — VRM reaction mapping**
  - File: `tasks/vrm-reaction-mapping.md`
  - 4 shared V1 animations: react_eat, react_equip, react_blush, react_happy
  - Full mapping: every V1 gift → reaction ID, blend shapes, voice line, Genki effect
  - VRM blend shape reference table
  - Animation priority rules (queue, don't skip; Genki tier transition after reaction)

- [x] **9.4 — V2 recommendations**
  - File: `tasks/v2-recommendations.md`
  - 10 feature proposals: fan rank, combo system, seasonal drops, leaderboard, gift goals, free daily gift, gacha, group gifting, Genki-aware reactions
  - Prioritized by impact vs effort (P1–P4)
  - Suggested build order with rough scope

- [x] **9.5 — Full QA pass — happy path**
  - File: `tasks/qa-report.md`
  - Tested all 6 endpoints: health, catalogue, balance, checkout, gift send
  - 12 pass / 2 fail + 3 data bugs documented
  - Stripe checkout returning live session IDs (needs verification)

- [x] **9.6 — Edge case QA**
  - Invalid bundle/gift IDs, missing fields, empty strings, malformed bodies
  - SQL injection blocked by Cloudflare WAF
  - Double send with zero balance — no negative balance (correct)
  - Wrong HTTP method returns HTML instead of JSON (low priority bug)

- [ ] **9.7 — End-to-end purchase flow** *(BLOCKED — needs Stripe test mode confirmation)*
  - Complete test card purchase → verify balance update → send gift → verify deduction
  - Webhook idempotency test (replay same webhook)
  - Waiting on Intern A to confirm test vs live keys + fix missing bundles
