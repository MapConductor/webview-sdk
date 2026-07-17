# webview-sdk

A provider-agnostic native↔JS bridge that lets native map SDKs (Android/iOS)
declaratively drive a web map inside a WebView — for the cases where native
map SDKs can't cover what's needed (deck.gl-style large-data overlays,
web-only plugins, etc.) but WebViews are otherwise awkward to control safely
from native code.

The bridge itself (`packages/bridge`) doesn't know or care which web map
library renders the map — Leaflet, MapLibre GL JS, the Google Maps
JavaScript API, or a custom page entirely — it only needs a
`MapViewControllerInterface` (the same interface every MapConductor web
provider already implements). `packages/runtime` is one concrete, ready-to-use
implementation of that (Leaflet), bundled by the native modules as their
default; apps that want a different provider, or their own custom page, build
their own bundle against `packages/bridge` directly instead.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the design rationale
and [`docs/PROTOCOL.md`](docs/PROTOCOL.md) for the wire protocol.

## Packages

- **`packages/bridge`** (`@mapconductor/webview-bridge`) — the reusable,
  provider-agnostic half: `MapConductorWebViewState` (a
  `MapViewStateInterface` implementation, usable as the `state` prop of any
  MapConductor web provider component), the command router/event forwarder,
  the marker/geo JSON codecs, and the extension escape hatch
  (`ExtensionRegistry`). Depends only on `@mapconductor/js-sdk-core` — no
  Leaflet, no React.
- **`packages/runtime`** (`@mapconductor/webview-runtime`) — the "batteries
  included" reference implementation: a small React app that renders
  `@mapconductor/react-for-leaflet`'s own `<LeafletMapView>` with a
  `@mapconductor/webview-bridge` `MapConductorWebViewState` as its `state`
  prop (see `src/App.tsx`). This is what `android-for-webview-leaflet`/
  `ios-for-webview-leaflet` bundle by default (`assets/webview-leaflet/index.html`
  / an SPM resource) — but it's just one possible bundle, not a hardcoded
  requirement.
- **`packages/dev-harness`** (`@mapconductor/webview-dev-harness`) — plays
  the role of native in a plain browser tab: hosts the runtime in an
  iframe and drives it with the same envelopes a real WebView bridge would
  send, with a control panel and event log. Lets the whole thing be
  exercised without an Android/iOS build.

## Building your own page instead of the bundled Leaflet one

`MapConductorWebViewState` (the JS one, from `@mapconductor/webview-bridge` —
not to be confused with the native `MapConductorWebViewState` classes) is a
`MapViewStateInterface` implementation, so it's a drop-in `state` prop for
*any* MapConductor web provider's own view component — the exact same way
you'd use that provider's own `useXxxMapViewState()`:

```tsx
import { MapConductorWebViewState } from '@mapconductor/webview-bridge';
import { GoogleMapView, GoogleMapDesign } from '@mapconductor/react-for-googlemaps'; // or MapLibre, Leaflet, ...

function App() {
  const [jsState] = useState(() => new MapConductorWebViewState({
    mapDesignType: GoogleMapDesign.Normal,
  }));

  return (
    <GoogleMapView
      state={jsState}
      onMapLoaded={() => {
        // jsState.extensions is non-null once the component has attached its controller
        jsState.extensions?.register('deckgl-heatmap', (map, payload, emit) => {
          // map is whatever your provider's holder.map exposes (a google.maps.Map here)
        });
      }}
    />
  );
}
```

`GoogleMapView`/`LeafletMapView`/`MapLibreView` call `setController()`/
`updateCameraPosition()` on whatever `state` they're given internally —
they don't know or care that `jsState` isn't their own concrete state class.
That's the whole integration; no separate `attach()` step. See
`packages/runtime/src/App.tsx` for the reference implementation this
pattern is based on.

Bundle that page yourself (Vite, webpack, whatever), place it at
`assets/mappage/index.html` in your Android app or as an SPM resource in your
iOS app, and pass that path to `rememberMapConductorWebViewState(src = ...)`
/ `MapConductorWebViewState(src:)` on the native side instead of the default.

## Try the bundled Leaflet reference runtime + dev-harness

```bash
npm install    # pulls @mapconductor/js-sdk-core and @mapconductor/react-for-leaflet
               # from ../react-sdk via file: deps — build those first if dist/ is stale
               # (npm run build in react-sdk)

npm run dev:runtime   # terminal 1 — http://localhost:5173
npm run dev:harness   # terminal 2 — http://localhost:5174
```

Open `http://localhost:5174`. Click through the buttons — moveCamera,
compositionMarkers, extension: start pulseCircle — and watch both the map
and the event log on the left.

## Status

`packages/bridge` + `packages/runtime`: manually verified (camera moves,
marker add/click, extension escape hatch all round-trip correctly with no
console errors) via the dev-harness. `android-for-webview-leaflet` and
`ios-for-webview-leaflet` are real, verified native modules (see their own
READMEs) — this is no longer just a description of a plan.

Security-reviewed: no `dangerouslySetInnerHTML`/`innerHTML`/`eval`, marker
labels render via canvas (not HTML strings), `CommandRouter.ts`'s handler
lookup is guarded against prototype pollution, dev-only code paths
(dev-harness transport, WebView debug inspection) are excluded from
production builds/gated on the app's debuggable flag, and all three
`index.html` files carry a CSP. See `docs/ARCHITECTURE.md`'s "セキュリティ"
section and `android-for-webview-leaflet`'s README ("Build status", `0.6.2`)
for the full list of what was found and fixed.

Not yet implemented: image marker icons, circle/polygon/polyline/rasterLayer
commands (the underlying controller already supports them — just needs
`CommandRouter.ts` entries).
