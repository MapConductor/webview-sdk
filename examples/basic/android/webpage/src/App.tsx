import { useState } from 'react';
import { LeafletMapView, LeafletDesign } from '@mapconductor/react-for-leaflet';
import { createMapCameraPosition, createGeoPoint } from '@mapconductor/js-sdk-core';
import {
  MapConductorWebViewState,
  createDevHarnessTransport,
  type InfoBubbleContent,
  type NativeTransport,
} from '@mapconductor/webview-bridge';
import { InfoBubble } from '@mapconductor/js-sdk-react';
import type { Map as LeafletMap } from 'leaflet';
import { registerPulseExtension } from './extensions/pulse';
import { StoreInfoView } from './StoreInfoView';

/**
 * Opt-in only, gated on Vite's own dev-only flag — see
 * packages/runtime/src/App.tsx's copy of this helper for why
 * MapConductorWebViewState's own default transport never does this itself.
 */
function resolveDevTransport(): NativeTransport | undefined {
  if (!import.meta.env.DEV) return undefined;
  const params = new URLSearchParams(window.location.search);
  if (params.get('transport') !== 'devHarness') return undefined;
  const parentOrigin = params.get('parentOrigin');
  return parentOrigin ? createDevHarnessTransport(parentOrigin) : undefined;
}

/**
 * This is the app's OWN page — built independently of webview-sdk's
 * packages/runtime, bundled into app/src/main/assets/leaflet, and pointed to
 * from Kotlin via rememberMapConductorWebViewState(src = "leaflet/index.html").
 * Same integration shape as packages/runtime/src/App.tsx: render
 * react-for-leaflet's own <LeafletMapView>, with a MapConductorWebViewState
 * (not a LeafletMapViewState) as its `state` prop — that's the whole bridge.
 *
 * The info bubble uses the exact same <InfoBubble> chrome
 * (`@mapconductor/js-sdk-react`) every non-WebView sample uses — only its
 * *content* (title/subtitle/badges/actionLabel) and *when to show/hide it*
 * come from native (`jsState.infoBubble`, populated by the `showInfoBubble`/
 * `hideInfoBubble` commands android-for-webview-leaflet's
 * `MapConductorWebViewState.infoBubble` sends). `StoreInfoView` here only
 * knows how to lay out that content, not what a "store" is — see
 * StoreMapPageViewModel.kt for where the actual store data and "Get
 * Directions" logic live.
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
  const [bubbleContent, setBubbleContent] = useState<InfoBubbleContent | null>(null);

  const marker = bubbleContent ? jsState.infoBubble?.findMarker(bubbleContent.markerId) : undefined;

  return (
    <LeafletMapView
      state={jsState}
      containerStyle={{ width: '100%', height: '100%' }}
      onMapLoaded={() => {
        if (jsState.extensions) registerPulseExtension(jsState.extensions);
        jsState.infoBubble?.setContentListener(setBubbleContent);
      }}
    >
      {bubbleContent && marker && (
        <InfoBubble marker={marker} bubbleColor="#ffffff">
          <StoreInfoView
            content={bubbleContent}
            onAction={() => jsState.notifyInfoBubbleAction(bubbleContent.markerId)}
          />
        </InfoBubble>
      )}
    </LeafletMapView>
  );
}
