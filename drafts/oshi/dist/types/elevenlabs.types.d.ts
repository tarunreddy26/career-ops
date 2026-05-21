/**
 * Type definitions for ElevenLabs WebSocket Streaming API.
 * Based on: wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input
 */
/** Initial config message sent when opening the WebSocket connection */
export interface ElevenLabsStreamConfig {
    text: " ";
    voice_settings: {
        stability: number;
        similarity_boost: number;
        style: number;
    };
    generation_config: {
        chunk_length_schedule: number[];
    };
    xi_api_key: string;
    model_id: string;
}
/** Text chunk message sent during streaming */
export interface ElevenLabsTextChunk {
    text: string;
    try_trigger_generation?: boolean;
}
/** End-of-stream signal — tells ElevenLabs no more text is coming */
export interface ElevenLabsFlushMessage {
    text: "";
}
/** Audio chunk received back from ElevenLabs */
export interface ElevenLabsAudioResponse {
    audio: string | null;
    isFinal: boolean | null;
    normalizedAlignment: object | null;
}
/** Events emitted by the TTS streaming service */
export interface TTSStreamEvents {
    audioChunk: (chunk: Buffer) => void;
    streamStart: () => void;
    streamEnd: () => void;
    error: (error: Error) => void;
    latencyReport: (metrics: LatencyMetrics) => void;
}
/** Latency tracking for performance monitoring */
export interface LatencyMetrics {
    textSentTimestamp: number;
    firstChunkTimestamp: number;
    firstChunkLatencyMs: number;
    totalChunks: number;
    totalDurationMs: number;
}
//# sourceMappingURL=elevenlabs.types.d.ts.map