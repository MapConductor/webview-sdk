import { useState } from 'react';
import { LeafletMapView, LeafletDesign } from '@mapconductor/react-for-leaflet';
import { createMapCameraPosition, createGeoPoint } from '@mapconductor/js-sdk-core';
import { MapConductorWebViewState, createDevHarnessTransport, type NativeTransport } from '@mapconductor/webview-bridge';
import type { Map as LeafletMap } from 'leaflet';
import { registerExampleExtensions } from './extensions/example';
import { RolePanel } from './RolePanel';

/**
 * Opt-in only, gated on Vite's own dev-only flag — `import.meta.env.DEV` is
 * statically replaced with `false` in production builds, so this whole
 * branch (and the URL-sniffing it does) is dead-code-eliminated from the
 * asset that actually ships inside android-for-webview-leaflet/
 * ios-for-webview-leaflet. MapConductorWebViewState's own default transport
 * never guesses at this from a URL query param — see its constructor.
 */
function resolveDevTransport(): NativeTransport | undefined {
  if (!import.meta.env.DEV) return undefined;
  const params = new URLSearchParams(window.location.search);
  if (params.get('transport') !== 'devHarness') return undefined;
  const parentOrigin = params.get('parentOrigin');
  return parentOrigin ? createDevHarnessTransport(parentOrigin) : undefined;
}

/**
 * This is the "batteries-included" Leaflet reference implementation: it
 * renders react-for-leaflet's own <LeafletMapView> exactly the way any other
 * app would, just with `jsState` (a MapConductorWebViewState, not a
 * LeafletMapViewState) as its `state` prop — that's the whole integration.
 * An app that wants a different web provider (MapLibre, Google Maps, ...) —
 * or its own custom page — builds its own bundle the same shape as this
 * file, swapping in that provider's own view component. See
 * docs/ARCHITECTURE.md.
 *
 * Starts at a neutral default position rather than waiting for native to
 * inject an initial camera before first paint — native sends a `moveCamera`
 * (or `animateCamera`) command right after the 'ready' event.
 */
export function App() {
  const [jsState] = useState(
    () =>
      new MapConductorWebViewState<typeof LeafletDesign.OpenStreetMap, LeafletMap>({
        mapDesignType: LeafletDesign.OpenStreetMap,
        cameraPosition: createMapCameraPosition({
          position: createGeoPoint({ latitude: 0, longitude: 0 }),
          zoom: 2,
        }),
        transport: resolveDevTransport(),
      }),
  );

  return (
    // #root is already position: fixed; inset: 0 (see index.html — a real
    // viewport-derived box), so this plain flex column just needs to fill it;
    // no need to re-establish sizing here.
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <RolePanel />
      <div style={{ flex: 1, position: 'relative' }}>
        <LeafletMapView
          state={jsState}
          containerStyle={{ width: '100%', height: '100%' }}
          onMapLoaded={() => {
            if (jsState.extensions) registerExampleExtensions(jsState.extensions);
          }}
        />
      </div>
    </div>
  );
}
