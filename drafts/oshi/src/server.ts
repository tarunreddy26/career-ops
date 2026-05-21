/**
 * Oshi AI VTuber Backend — Main Server Entry Point
 *
 * Standalone microservice for the TTS streaming pipeline.
 * Uses Fastify for low overhead and native streaming support.
 * All API keys are server-side only — never exposed to clients.
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import dotenv from "dotenv";
import { ttsTestRoutes } from "./routes/tts-test.route";
import { ttsStreamRoutes } from "./routes/tts-stream.route";
import { genkiRoutes } from "./routes/genki.route";

// Load environment variables from .env file
dotenv.config();

const PORT = parseInt(process.env.PORT || "3001", 10);

async function startServer(): Promise<void> {
  const isProduction = process.env.NODE_ENV === "production";

  const server = Fastify({
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

  await server.register(cors, {
    origin: (origin, callback) => {
      // Dev mode (no ALLOWED_ORIGINS set) — allow everything
      if (allowedOrigins.length === 0) {
        callback(null, true);
        return;
      }
      // Allow requests with no origin (health checks, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS: origin not allowed"), false);
      }
    },
    methods: ["GET", "POST"],
  });

  // ─── Rate Limiting ───────────────────────────────────
  // Prevents abuse of ElevenLabs API key on HTTP endpoints.
  // Does NOT affect WebSocket message frequency.
  await server.register(rateLimit, {
    max: 30,
    timeWindow: "1 minute",
    allowList: (request) => request.url === "/health",
  });

  // Register WebSocket plugin — MUST come before any WebSocket routes
  await server.register(websocket);

  // Register routes (HTTP + WebSocket)
  await server.register(ttsTestRoutes);
  await server.register(ttsStreamRoutes);
  await server.register(genkiRoutes);

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
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

startServer();
