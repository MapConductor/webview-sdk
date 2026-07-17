import { circle, type Map as LeafletMap } from 'leaflet';
import type { ExtensionRegistry } from '@mapconductor/webview-bridge';

/**
 * Matches the "Start pulse extension" button already wired up in
 * MapExampleViewModel.kt — this app's own page needs to register the same
 * extension type native sends, or that command is just a silent no-op.
 */
export function registerPulseExtension(extensions: ExtensionRegistry<LeafletMap>): void {
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
