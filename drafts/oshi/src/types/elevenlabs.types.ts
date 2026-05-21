/**
 * Type definitions for ElevenLabs WebSocket Streaming API.
 * Based on: wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input
 */

/** Initial config message sent when opening the WebSocket connection */
export interface ElevenLabsStreamConfig {
  text: " ";  // Space signals stream start — required by ElevenLabs
  voice_settings: {
    stability: number;       // 0.0-1.0 — lower = more expressive
    similarity_boost: number; // 0.0-1.0 — higher = closer to original voice
    style: number;           // 0.0-1.0 — emotional expressiveness
  };
  generation_config: {
    chunk_length_schedule: number[]; // Controls chunking behavior
  };
  xi_api_key: string;
  model_id: string;  // e.g., "eleven_flash_v2_5"
}

/** Text chunk message sent during streaming */
export interface ElevenLabsTextChunk {
  text: string;       // The sentence/text to synthesize
  try_trigger_generation?: boolean; // Force generation even for short text
}

/** End-of-stream signal — tells ElevenLabs no more text is coming */
export interface ElevenLabsFlushMessage {
  text: "";  // Empty string signals end of input
}

/** Audio chunk received back from ElevenLabs */
export interface ElevenLabsAudioResponse {
  audio: string | null;        // Base64-encoded audio chunk (MP3)
  isFinal: boolean | null;     // True when this is the last chunk
  normalizedAlignment: object | null;  // Phoneme alignment data
}

/** Events emitted by the TTS streaming service */
export interface TTSStreamEvents {
  audioChunk: (chunk: Buffer) => void;    // Raw audio data ready for playback
  streamStart: () => void;                // First audio chunk received
  streamEnd: () => void;                  // All audio chunks received
  error: (error: Error) => void;          // Connection or processing error
  latencyReport: (metrics: LatencyMetrics) => void;
}

/** Latency tracking for performance monitoring */
export interface LatencyMetrics {
  textSentTimestamp: number;       // When text was sent to ElevenLabs
  firstChunkTimestamp: number;     // When first audio chunk arrived
  firstChunkLatencyMs: number;     // Difference (the key metric)
  totalChunks: number;             // Total audio chunks received
  totalDurationMs: number;         // Time from text sent to final chunk
}
