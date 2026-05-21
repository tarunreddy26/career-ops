"use strict";
/**
 * Oshi AI VTuber Backend — Main Server Entry Point
 *
 * Standalone microservice for the TTS streaming pipeline.
 * Uses Fastify for low overhead and native streaming support.
 * All API keys are server-side only — never exposed to clients.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const dotenv_1 = __importDefault(require("dotenv"));
const tts_test_route_1 = require("./routes/tts-test.route");
const tts_stream_route_1 = require("./routes/tts-stream.route");
const genki_route_1 = require("./routes/genki.route");
// Load environment variables from .env file
dotenv_1.default.config();
const PORT = parseInt(process.env.PORT || "3001", 10);
async function startServer() {
    const isProduction = process.env.NODE_ENV === "production";
    const server = (0, fastify_1.default)({
        logger: {
            level: isProduction ? "info" : "debug",
        },
    });
    // ─── CORS ────────────────────────────────────────────
    // In production: restrict to ALLOWED_ORIGINS env var (comma-separated)
    // In development: allow all origins for local testing
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
        : [];
    await server.register(cors_1.default, {
        origin: (origin, callback) => {
            // Dev mode (no ALLOWED_ORIGINS set) — allow everything
            if (allowedOrigins.length === 0) {
                callback(null, true);
                return;
            }
            // Allow requests with no origin (health checks, server-to-server)
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error("CORS: origin not allowed"), false);
            }
        },
        methods: ["GET", "POST"],
    });
    // ─── Rate Limiting ───────────────────────────────────
    // Prevents abuse of ElevenLabs API key on HTTP endpoints.
    // Does NOT affect WebSocket message frequency.
    await server.register(rate_limit_1.default, {
        max: 30,
        timeWindow: "1 minute",
        allowList: (request) => request.url === "/health",
    });
    // Register WebSocket plugin — MUST come before any WebSocket routes
    await server.register(websocket_1.default);
    // Register routes (HTTP + WebSocket)
    await server.register(tts_test_route_1.ttsTestRoutes);
    await server.register(tts_stream_route_1.ttsStreamRoutes);
    await server.register(genki_route_1.genkiRoutes);
    // Health check endpoint for deployment monitoring
    server.get("/health", async () => {
        return {
            status: "ok",
            service: "oshi-ai-vtuber-tts",
            timestamp: new Date().toISOString(),
            nodeEnv: process.env.NODE_ENV || "development",
            env: {
                hasElevenLabsKey: !!process.env.ELEVENLABS_API_KEY,
                voiceId: process.env.ELEVENLABS_VOICE_ID || "not set",
                modelId: process.env.ELEVENLABS_MODEL_ID || "not set",
            },
        };
    });
    try {
        await server.listen({ port: PORT, host: "0.0.0.0" });
        console.log(`
=========================================
  Oshi AI VTuber — TTS Streaming Service
  Running on http://localhost:${PORT}

  Endpoints:
    GET  /health              — Service status
    POST /api/tts/test        — Test TTS synthesis (HTTP)
    WS   /api/tts/stream      — Real-time TTS streaming
    POST /api/genki/session-open — Genki decay + restore
    POST /api/genki/message      — Message bonus (+2)
    GET  /api/genki/:user_id     — Current genki state
=========================================
    `);
    }
    catch (error) {
        server.log.error(error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map