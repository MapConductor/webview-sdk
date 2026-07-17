import { type CommandEnvelope, type EventEnvelope, isCommandEnvelope } from './protocol';

/**
 * Everything the bridge needs from "however commands/events actually cross the
 * native/JS boundary". Swapping this is the only thing that changes between a
 * real WebView and the dev-harness (or a future test double).
 */
export interface NativeTransport {
  onCommand(handler: (command: CommandEnvelope) => void): void;
  postEvent(event: EventEnvelope): void;
}

/**
 * Real WebView transport.
 *
 * Native -> JS: native calls `window.__mcDispatch(json)` via evaluateJavascript
 * (Android) / evaluateJavaScript (iOS). One global entry point, never
 * string-interpolated JS — native only ever passes a JSON string literal.
 *
 * JS -> native: posts a JSON string to whichever bridge object the host
 * injected. Android's WebViewCompat.addWebMessageListener("mapconductor", ...)
 * installs `window.mapconductor.postMessage`; iOS's WKScriptMessageHandler
 * with name "mapconductor" is called via
 * `window.webkit.messageHandlers.mapconductor.postMessage`. Both are
 * feature-detected so the same bundle runs on either platform.
 */
export function createWebViewTransport(): NativeTransport {
  let handler: ((command: CommandEnvelope) => void) | null = null;

  (window as unknown as { __mcDispatch: (json: string) => void }).__mcDispatch = (json: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      return;
    }
    if (isCommandEnvelope(parsed)) handler?.(parsed);
  };

  return {
    onCommand(next) {
      handler = next;
    },
    postEvent(event) {
      const json = JSON.stringify(event);
      const androidBridge = (window as unknown as { mapconductor?: { postMessage(json: string): void } }).mapconductor;
      const iosBridge = (window as unknown as {
        webkit?: { messageHandlers?: { mapconductor?: { postMessage(json: string): void } } };
      }).webkit?.messageHandlers?.mapconductor;

      if (androidBridge) androidBridge.postMessage(json);
      else if (iosBridge) iosBridge.postMessage(json);
      else console.warn('[mapconductor] no native bridge object found; event dropped', event);
    },
  };
}

const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/**
 * Dev-harness transport: same envelopes, but carried over window.postMessage
 * between this iframe and its parent instead of a real WebView bridge. Lets
 * the whole command/event/extension flow be exercised in a plain browser tab.
 *
 * Deliberately restricted to a localhost parent: `event.source !== window.parent`
 * only proves the message came from *whatever* embeds this page, not that the
 * embedder is actually webview-sdk's own dev-harness — any origin could iframe
 * this bundle and drive it with `?transport=devHarness` otherwise. Callers are
 * expected to only ever construct this from a build-time dev-only code path
 * (e.g. gated on `import.meta.env.DEV`) — this function has no way to verify
 * that itself, so the origin check here is the only runtime backstop.
 */
export function createDevHarnessTransport(targetOrigin: string): NativeTransport {
  let handler: ((command: CommandEnvelope) => void) | null = null;

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    if (!LOCALHOST_ORIGIN.test(event.origin)) return;
    if (isCommandEnvelope(event.data)) handler?.(event.data);
  });

  return {
    onCommand(next) {
      handler = next;
    },
    postEvent(event) {
      window.parent.postMessage(event, targetOrigin);
    },
  };
}
