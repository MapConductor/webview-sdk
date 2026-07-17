/**
 * Wire protocol shared by the JS runtime and the native (Android/iOS) bridge.
 *
 * Transport-agnostic on purpose: the same envelopes cross a real WebView
 * (postMessage / evaluateJavascript) or the dev-harness (window.postMessage
 * between an iframe and its parent). See docs/PROTOCOL.md for the full spec.
 */

export const PROTOCOL_VERSION = 1;

export interface CommandEnvelope<TPayload = unknown> {
  readonly kind: 'command';
  /** Correlation id. Native must generate a fresh one per call and match it against the 'result' event. */
  readonly id: string;
  readonly name: string;
  readonly payload: TPayload;
}

export interface EventEnvelope<TPayload = unknown> {
  readonly kind: 'event';
  /** Present only on 'result' events, echoes the CommandEnvelope.id that triggered it. */
  readonly id?: string;
  readonly name: string;
  readonly payload: TPayload;
}

export type Envelope = CommandEnvelope | EventEnvelope;

export interface CommandResultPayload {
  readonly ok: boolean;
  readonly value?: unknown;
  readonly error?: string;
}

export function isCommandEnvelope(value: unknown): value is CommandEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'command' &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { name?: unknown }).name === 'string'
  );
}

export function isEventEnvelope(value: unknown): value is EventEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'event' &&
    typeof (value as { name?: unknown }).name === 'string'
  );
}
