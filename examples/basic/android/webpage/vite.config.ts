import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Built as a single self-contained bundle: Android loads this straight out of
// app/src/main/assets/leaflet via WebViewAssetLoader's virtual https:// origin
// (no dev server, no CDN), so everything — JS, CSS, Leaflet images — must be
// inlined or emitted as relative-path files under dist/.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5175,
  },
  build: {
    assetsInlineLimit: 100_000,
    sourcemap: true,
  },
});
