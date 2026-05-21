"use strict";
/**
 * WebSocket Message Protocol — Frontend <-> Backend
 *
 * Defines all JSON message types exchanged over the WebSocket
 * connection between the frontend client and the TTS streaming
 * backend. Every message follows { type, data } structure.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseClientMessage = parseClientMessage;
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
function parseClientMessage(raw) {
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        throw new Error("Invalid JSON in WebSocket message");
    }
    // Validate top-level structure
    if (typeof parsed !== "object" ||
        parsed === null ||
        !("type" in parsed) ||
        !("data" in parsed)) {
        throw new Error("Message must have { type, data } structure");
    }
    const message = parsed;
    // Validate message type is recognized
    if (!VALID_CLIENT_TYPES.has(message.type)) {
        throw new Error(`Unknown message type: "${message.type}"`);
    }
    // Validate tts_request has non-empty text
    if (message.type === "tts_request") {
        const data = message.data;
        if (typeof data?.text !== "string" ||
            data.text.trim().length === 0) {
            throw new Error("tts_request requires non-empty text string");
        }
    }
    // Validate llm_tokens has a tokens array and flush boolean
    if (message.type === "llm_tokens") {
        const data = message.data;
        if (!Array.isArray(data?.tokens)) {
            throw new Error("llm_tokens requires tokens array");
        }
        if (typeof data?.flush !== "boolean") {
            throw new Error("llm_tokens requires flush boolean");
        }
    }
    return message;
}
//# sourceMappingURL=ws-messages.types.js.map