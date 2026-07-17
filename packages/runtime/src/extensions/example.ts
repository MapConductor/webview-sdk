import { circle, type Map as LeafletMap } from 'leaflet';
import type { ExtensionRegistry } from '@mapconductor/webview-bridge';

/**
 * Stand-in for "a real Leaflet plugin native can't replicate" (deck.gl,
 * a clustering library, whatever) — proves the escape hatch end to end
 * without pulling in a heavy dependency just for the prototype. A real
 * integration would ship this kind of registration in the app's own JS
 * bundle, not in webview-runtime itself; the bridge core never needs to
 * know what a "pulseCircle" is.
 */
export function registerExampleExtensions(extensions: ExtensionRegistry<LeafletMap>): void {
  extensions.register('pulseCircle', (map, payload, emit) => {
    const { latitude, longitude, color = '#3388ff', maxRadiusMeters = 500 } = payload as {
      latitude: number;
      longitude: number;
      color?: string;
      maxRadiusMeters?: number;
    };

    const marker = circle([latitude, longitude], { radius: 0, color, fillColor: color, fillOpacity: 0.3 }).addTo(map);

    let radius = 0;
    let growing = true;
    const interval = setInterval(() => {
      radius += growing ? maxRadiusMeters / 30 : -(maxRadiusMeters / 30);
      if (radius >= maxRadiusMeters) growing = false;
      if (radius <= 0) growing = true;
      marker.setRadius(Math.max(0, radius));
    }, 50);

    emit('started', { maxRadiusMeters });

    return () => {
      clearInterval(interval);
      marker.remove();
    };
  });
}
