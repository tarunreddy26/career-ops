/**
 * WebSocket Message Protocol — Frontend <-> Backend
 *
 * Defines all JSON message types exchanged over the WebSocket
 * connection between the frontend client and the TTS streaming
 * backend. Every message follows { type, data } structure.
 */

import type { LatencyMetrics } from "./elevenlabs.types";

// ─── Client → Server Messages ─────────────────────────────

/** Client requests TTS synthesis for given text */
export interface ClientTTSRequest {
  type: "tts_request";
  data: { text: string };
}

/** Client requests cancellation of current TTS stream */
export interface ClientCancel {
  type: "cancel";
  data: Record<string, never>;
}

/**
 * Client signals barge-in — user started speaking while VTuber
 * is talking. Functionally same as cancel but semantically distinct
 * for logging and analytics. Frontend sends this when VAD detects speech.
 */
export interface ClientInterrupt {
  type: "interrupt";
  data: Record<string, never>;
}

/** Client sends LLM tokens for sentence chunking pipeline */
export interface ClientLLMTokens {
  type: "llm_tokens";
  data: {
    tokens: string[];  // Array of LLM tokens to feed into chunker
    flush: boolean;    // True = end of LLM response, flush remaining buffer
  };
}

/** Client keepalive ping */
export interface ClientPing {
  type: "ping";
  data: Record<string, never>;
}

/** Union of all valid client message types */
export type ClientMessage =
  | ClientTTSRequest
  | ClientCancel
  | ClientInterrupt
  | ClientLLMTokens
  | ClientPing;

// ─── Server → Client Messages ─────────────────────────────

/** First audio chunk arrived from ElevenLabs — stream has begun */
export interface ServerStreamStart {
  type: "stream_start";
  data: { requestId: string };
}

/** Base64-encoded MP3 audio chunk from ElevenLabs */
export interface ServerAudioChunk {
  type: "audio_chunk";
  data: {
    audio: string;
    chunkIndex: number;
  };
}

/** All audio chunks delivered — stream is complete */
export interface ServerStreamEnd {
  type: "stream_end";
  data: {
    requestId: string;
    latency: LatencyMetrics;
  };
}

/** Confirm that the current stream was cancelled */
export interface ServerCancelled {
  type: "cancelled";
  data: { requestId: string };
}

/**
 * Tells frontend to immediately stop audio playback and clear
 * its audio buffer. Sent on barge-in so user hears silence ASAP.
 * Frontend should: stop AudioContext, discard queued chunks.
 */
export interface ServerStopAudio {
  type: "stop_audio";
  data: {
    reason: "interrupt" | "cancel";
    cancelLatencyMs: number;
  };
}

/** Error occurred during TTS processing */
export interface ServerError {
  type: "error";
  data: {
    message: string;
    code: string;
  };
}

/** A sentence began TTS processing (from chunker pipeline) */
export interface ServerSentenceStart {
  type: "sentence_start";
  data: {
    sentenceIndex: number;
    text: string;
  };
}

/** A sentence finished TTS processing */
export interface ServerSentenceEnd {
  type: "sentence_end";
  data: {
    sentenceIndex: number;
    text: string;
    latencyMs: number;
  };
}

/** Server keepalive pong response */
export interface ServerPong {
  type: "pong";
  data: Record<string, never>;
}

/** Union of all valid server message types */
export type ServerMessage =
  | ServerStreamStart
  | ServerAudioChunk
  | ServerStreamEnd
  | ServerSentenceStart
  | ServerSentenceEnd
  | ServerCancelled
  | ServerStopAudio
  | ServerError
  | ServerPong;

// ─── Message Parsing ───────────────────────────────────────

/** Valid client message type strings for validation */
const VALID_CLIENT_TYPES = new Set([
  "tts_request",
  "cancel",
  "interrupt",
  "llm_tokens",
  "ping",
]);

/**
 * Parses and validates a raw WebSocket message string into
 * a typed ClientMessage. Throws on invalid JSON, missing
 * fields, or unknown message types.
 */
export function parseClientMessage(raw: string): ClientMessage {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON in WebSocket message");
  }

  // Validate top-level structure
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("type" in parsed) ||
    !("data" in parsed)
  ) {
    throw new Error(
      "Message must have { type, data } structure"
    );
  }

  const message = parsed as { type: string; data: unknown };

  // Validate message type is recognized
  if (!VALID_CLIENT_TYPES.has(message.type)) {
    throw new Error(
      `Unknown message type: "${message.type}"`
    );
  }

  // Validate tts_request has non-empty text
  if (message.type === "tts_request") {
    const data = message.data as { text?: unknown };
    if (
      typeof data?.text !== "string" ||
      data.text.trim().length === 0
    ) {
      throw new Error(
        "tts_request requires non-empty text string"
      );
    }
  }

  // Validate llm_tokens has a tokens array and flush boolean
  if (message.type === "llm_tokens") {
    const data = message.data as {
      tokens?: unknown;
      flush?: unknown;
    };
    if (!Array.isArray(data?.tokens)) {
      throw new Error(
        "llm_tokens requires tokens array"
      );
    }
    if (typeof data?.flush !== "boolean") {
      throw new Error(
        "llm_tokens requires flush boolean"
      );
    }
  }

  return message as ClientMessage;
}
