/**
 * TTSStreamingService — ElevenLabs WebSocket Streaming TTS
 *
 * Connects to ElevenLabs' WebSocket streaming endpoint for low-latency
 * text-to-speech. Sends sentence chunks, receives audio chunks in real-time.
 *
 * CRITICAL: Uses WebSocket endpoint (not REST) to achieve ~200ms first-chunk
 * latency instead of ~2s with the standard REST API.
 */

import WebSocket from "ws";
import { EventEmitter } from "events";
import type {
  ElevenLabsStreamConfig,
  ElevenLabsTextChunk,
  ElevenLabsFlushMessage,
  ElevenLabsAudioResponse,
  LatencyMetrics,
} from "../types/elevenlabs.types";

/** Configuration for initializing the TTS service */
interface TTSServiceConfig {
  apiKey: string;
  voiceId: string;
  modelId: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
}

export class TTSStreamingService extends EventEmitter {
  private websocket: WebSocket | null = null;
  private readonly config: Required<TTSServiceConfig>;
  private isConnected: boolean = false;

  // Latency tracking — measures time from text sent to first audio chunk
  private textSentTimestamp: number = 0;
  private firstChunkReceived: boolean = false;
  private totalChunks: number = 0;

  constructor(config: TTSServiceConfig) {
    super();
    // Apply defaults from the brief: stability 0.4, similarity 0.75, style 0.35
    this.config = {
      apiKey: config.apiKey,
      voiceId: config.voiceId,
      modelId: config.modelId,
      stability: config.stability ?? 0.4,
      similarityBoost: config.similarityBoost ?? 0.75,
      style: config.style ?? 0.35,
    };
  }

  /**
   * Opens a WebSocket connection to ElevenLabs streaming endpoint.
   * Sends the initial config message to set voice parameters.
   * Returns a promise that resolves when the connection is ready.
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const websocketUrl =
        `wss://api.elevenlabs.io/v1/text-to-speech/` +
        `${this.config.voiceId}/stream-input` +
        `?model_id=${this.config.modelId}`;

      console.log(
        `[TTS] Connecting to ElevenLabs WebSocket...`
      );

      this.websocket = new WebSocket(websocketUrl);

      this.websocket.on("open", () => {
        console.log("[TTS] WebSocket connected");
        this.isConnected = true;

        // Send initial config — required before any text
        const initMessage: ElevenLabsStreamConfig = {
          text: " ",
          voice_settings: {
            stability: this.config.stability,
            similarity_boost: this.config.similarityBoost,
            style: this.config.style,
          },
          generation_config: {
            chunk_length_schedule: [120, 160, 250, 290],
          },
          xi_api_key: this.config.apiKey,
          model_id: this.config.modelId,
        };

        this.websocket!.send(JSON.stringify(initMessage));
        console.log("[TTS] Init config sent");
        resolve();
      });

      this.websocket.on("message", (data: WebSocket.Data) => {
        this.handleAudioResponse(data);
      });

      this.websocket.on("error", (error: Error) => {
        console.error("[TTS] WebSocket error:", error.message);
        this.isConnected = false;
        this.emit("error", error);

        // Reject only if we haven't connected yet
        if (!this.isConnected) {
          reject(error);
        }
      });

      this.websocket.on("close", (code: number, reason: Buffer) => {
        console.log(
          `[TTS] WebSocket closed — code: ${code}, ` +
          `reason: ${reason.toString()}`
        );
        this.isConnected = false;
        this.emit("streamEnd");
      });
    });
  }

  /**
   * Sends a sentence chunk to ElevenLabs for synthesis.
   * Each chunk should be a complete sentence for best results.
   *
   * Per the brief: use sentence boundary detection, send each
   * sentence as soon as it's complete from the LLM stream.
   */
  sendText(text: string): void {
    if (!this.websocket || !this.isConnected) {
      throw new Error(
        "[TTS] Cannot send text — WebSocket not connected"
      );
    }

    // Track when we sent this text for latency measurement
    this.textSentTimestamp = Date.now();
    this.firstChunkReceived = false;
    this.totalChunks = 0;

    const textMessage: ElevenLabsTextChunk = {
      text: text,
      try_trigger_generation: true,
    };

    this.websocket.send(JSON.stringify(textMessage));
    console.log(
      `[TTS] Sent text (${text.length} chars): "${text.substring(0, 50)}..."`
    );
  }

  /**
   * Signals end of text input — tells ElevenLabs to flush
   * any remaining audio and close the generation.
   */
  flush(): void {
    if (!this.websocket || !this.isConnected) {
      return;
    }

    const flushMessage: ElevenLabsFlushMessage = { text: "" };
    this.websocket.send(JSON.stringify(flushMessage));
    console.log("[TTS] Flush signal sent");
  }

  /**
   * Processes incoming audio chunks from ElevenLabs.
   * Decodes base64 audio, tracks latency, emits events.
   */
  private handleAudioResponse(rawData: WebSocket.Data): void {
    try {
      const response: ElevenLabsAudioResponse = JSON.parse(
        rawData.toString()
      );

      // ElevenLabs sends audio as base64-encoded MP3 chunks
      if (response.audio) {
        const audioBuffer = Buffer.from(response.audio, "base64");
        this.totalChunks++;

        // Log latency on the FIRST audio chunk — this is the key metric
        if (!this.firstChunkReceived) {
          this.firstChunkReceived = true;
          const firstChunkLatencyMs =
            Date.now() - this.textSentTimestamp;

          console.log(
            `[TTS] First audio chunk received in ` +
            `${firstChunkLatencyMs}ms`
          );
          this.emit("streamStart");
        }

        this.emit("audioChunk", audioBuffer);
      }

      // Final chunk — report full latency metrics
      if (response.isFinal) {
        const totalDurationMs =
          Date.now() - this.textSentTimestamp;
        const firstChunkLatencyMs =
          this.firstChunkReceived
            ? totalDurationMs - (totalDurationMs - (Date.now() - this.textSentTimestamp))
            : 0;

        const metrics: LatencyMetrics = {
          textSentTimestamp: this.textSentTimestamp,
          firstChunkTimestamp:
            this.textSentTimestamp + firstChunkLatencyMs,
          firstChunkLatencyMs,
          totalChunks: this.totalChunks,
          totalDurationMs,
        };

        console.log(
          `[TTS] Stream complete — ${this.totalChunks} chunks, ` +
          `${totalDurationMs}ms total`
        );
        this.emit("latencyReport", metrics);
        this.emit("streamEnd");
      }
    } catch (parseError) {
      console.error(
        "[TTS] Failed to parse response:",
        parseError
      );
    }
  }

  /**
   * Gracefully closes the WebSocket connection.
   * Sends flush first to get any remaining audio.
   */
  async disconnect(): Promise<void> {
    if (this.websocket) {
      this.flush();
      this.websocket.close();
      this.websocket = null;
      this.isConnected = false;
      console.log("[TTS] Disconnected");
    }
  }

  /** Check if the WebSocket is currently connected */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
