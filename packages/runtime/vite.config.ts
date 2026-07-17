import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite emits `crossorigin` on the module <script>/<link> tags by default (useful for
// CDN-hosted deploys). Loaded over a real WKWebView `file://` URL (iOS's loadFileURL, no
// virtual-origin trick like Android's WebViewAssetLoader), that turns the asset fetch into
// a cross-origin request with no CORS headers to satisfy it, and the JS/CSS silently fail to
// load — the map stays blank with no console error. Strip it since everything here is always
// same-origin (bundled locally, never fetched cross-origin).
function stripCrossorigin(): Plugin {
  return {
    name: 'strip-crossorigin',
    transformIndexHtml(html) {
      return html.replace(/\s+crossorigin(="[^"]*")?/g, '');
    },
  };
}

// Built as a single self-contained bundle: Android/iOS load this as a local
// asset (no dev server, no CDN), so everything — JS, CSS, Leaflet images —
// must be inlined or emitted as relative-path files under dist/.
export default defineConfig({
  base: './',
  plugins: [react(), stripCrossorigin()],
  server: {
    port: 5173,
  },
  build: {
    assetsInlineLimit: 100_000,
    sourcemap: true,
  },
});
