# Bridge protocol (v1)

Transport-agnostic JSON envelopes exchanged between native and the JS runtime.
Two directions, two envelope shapes:

```ts
// native -> JS
interface CommandEnvelope {
  kind: 'command';
  id: string;      // correlation id, fresh per call
  name: string;
  payload: unknown;
}

// JS -> native
interface EventEnvelope {
  kind: 'event';
  id?: string;     // only on 'result', echoes the CommandEnvelope.id
  name: string;
  payload: unknown;
}
```

Every command gets exactly one `result` event back, `{ ok, value }` on
success or `{ ok, error }` on failure. Native should treat an unanswered
command as failed after a timeout — the JS side never silently drops one.

## Handshake

1. Runtime boots a Leaflet map at a neutral default position.
2. The provider's own view component (`<LeafletMapView>` here) attaches its
   controller by calling `MapConductorWebViewState.setController(ctrl)`
   internally — this is where the runtime emits `ready` (`{ protocolVersion: 1 }`).
3. Native should queue any commands sent before `ready` and flush them once
   it arrives, rather than assuming the map exists at page-load time.
   (`android-for-webview-leaflet`'s `MapConductorWebView`'s `onMapInitialized`
   callback fires on this same `ready` event — there's no separate
   `mapInitialized` wire event, see "Not implemented" below.)

## Commands (native → JS)

| name | payload | result value |
|---|---|---|
| `moveCamera` | `{ position: {latitude, longitude, altitude?}, zoom?, bearing?, tilt? }` | `boolean` |
| `animateCamera` | `{ position: <same as moveCamera>, options?: { durationMs?, padding? } }` | `boolean` |
| `fitBounds` | `{ bounds: { southWest, northEast }, options?: { durationMs?, padding? } }` | `boolean` |
| `compositionMarkers` | `{ markers: MarkerPayload[] }` | `null` |
| `clearOverlays` | `{}` | `null` |
| `upsertExtension` | `{ id, type, payload }` | `null` |
| `removeExtension` | `{ id }` | `null` |
| `showInfoBubble` | `{ markerId, title, subtitle?, badges?: string[], actionLabel? }` | `null` |
| `hideInfoBubble` | `{}` | `null` |

`compositionMarkers` always carries the **whole current marker set**, not a
diff — `LeafletMarkerController` (from `@mapconductor/react-for-leaflet`)
does the add/update/remove diffing internally. This matches how the
declarative Compose/SwiftUI side already thinks about markers (a list that
changes), and avoids a second, bridge-specific diffing protocol.

```ts
interface MarkerPayload {
  id: string;
  position: { latitude: number; longitude: number; altitude?: number };
  icon?: { type: 'colorDefault'; fillColor?: string; strokeColor?: string; label?: string };
  clickable?: boolean;
  draggable?: boolean;
  zIndex?: number;
}
```

Only `colorDefault` icons are decoded today (see `MarkerCodec.ts`). Image
icons (`data:image` / bundled file URIs) decode the same way the existing
React Native bridge does it in
`js-sdk-react/ios/NativeMapCodec.swift::NativeMarkerIconPayload` — left out
of the prototype to keep it focused, not a protocol limitation.

At marker-set sizes in the thousands, consider switching
`compositionMarkers`'s wire format to the structure-of-arrays batch encoding
`js-sdk-react/src/marker/NativeMarkerBatch.ts` already uses for the RN
bridge (ids/positions/icon-index arrays + a deduplicated icon dictionary) —
same idea, same win, just not needed until a real workload calls for it.

## Events (JS → native)

| name | payload |
|---|---|
| `ready` | `{ protocolVersion }` |
| `cameraMove` | `{ position, zoom, bearing, tilt }` |
| `markerClick` / `markerDragEnd` | `{ id, position }` |
| `extensionEvent` | `{ extensionId, eventName, payload }` |
| `infoBubbleAction` | `{ markerId }` |
| `result` | `{ ok, value? , error? }`, always carries the originating command's `id` |

`cameraMove` fires on every animation frame while panning/zooming (it's
emitted by `MapConductorWebViewState.updateCameraPosition()`, which the
provider's own view component calls on every camera move/start/end — so
it doesn't distinguish start/move/end the way the underlying controller
listeners do). It's one-way and fire-and-forget here; a production build
likely wants to throttle it before crossing the bridge (native rarely needs
more than ~30Hz).

**Not implemented**: `mapInitialized`, `mapClick`/`mapLongClick`,
`cameraMoveStart`/`cameraMoveEnd`. `MapViewControllerInterface`'s listener
setters (`setMapClickListener`, etc.) are single-slot, and the provider's own
view component already claims them internally for its own bookkeeping once
`setController()` returns — registering a second listener there would just
get overwritten. See `docs/ARCHITECTURE.md`'s "現状の制限" for the full
explanation and a possible path forward (a thin `notifyMapClick()`-style
method the app calls from the component's `onMapClick` prop).

## Extension descriptor (the escape hatch)

`upsertExtension` / `removeExtension` mirror the existing
`NativeMapExtension` pattern from `js-sdk-react/src/native-extension/` (used
today for the *React → native SDK* direction) — same `{id, type, payload}`
shape, running the other way. The runtime core has no idea what any given
`type` means; an app-specific JS bundle calls
`extensions.register(type, handler)` before/after bootstrap, and the handler
gets the raw `leaflet.Map` instance plus an `emit()` for pushing arbitrary
events back through `extensionEvent`. This is the plug point for
deck.gl-style overlays or any other Leaflet-only plugin — see
`packages/runtime/src/extensions/example.ts` (`pulseCircle`) for a minimal
worked example, and `docs/ARCHITECTURE.md` for how it's meant to be used.

## Info bubble (native-defined content, JS-rendered chrome)

`showInfoBubble`/`hideInfoBubble` let native show a small speech-bubble
popup anchored to a marker — same visual chrome
(`@mapconductor/js-sdk-react`'s `<InfoBubble>`) every non-WebView sample
uses — while keeping *what* to show and *when* entirely native's decision.
Native only sends a `markerId` plus a small, fixed content shape
(`title`/`subtitle`/`badges`/`actionLabel`); the JS side (`InfoBubbleController`
in `packages/bridge`) looks up the actual `MarkerState` for that id from the
last `compositionMarkers` call (so `<InfoBubble marker={...}>` can anchor
itself), and the app's own page supplies a small presentational component
that lays the content out (see
`webview-sdk/examples/basic/android/webpage/src/StoreInfoView.tsx` for a
worked example). Tapping `actionLabel`'s button sends `infoBubbleAction`
back with just the `markerId` — native resolves what that button should
actually do (see `StoreMapPageViewModel.kt`'s `onDirectionButtonClick`).

This is a narrower, more opinionated sibling of the extension escape hatch
below: extensions hand native an arbitrary `{id, type, payload}` and trust
an app-registered handler to interpret it however it wants; the info bubble
protocol fixes the content shape (so the JS side never needs Kotlin/Swift-
specific rendering logic) at the cost of not supporting arbitrary custom UI.

## Extension descriptor (the escape hatch)

`ready`'s `protocolVersion` lets native detect a runtime bundle it doesn't
speak to and fail loudly (e.g. show a fallback UI) instead of silently
sending commands that error out one at a time. Bump `PROTOCOL_VERSION` in
`protocol.ts` on any breaking change to envelope shape or command semantics;
additive changes (new command/event names) don't need a bump since both
sides already treat unknown names as errors/no-ops rather than crashing.
