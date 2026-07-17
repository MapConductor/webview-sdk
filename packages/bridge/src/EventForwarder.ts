import type { GeoPoint, MapCameraPosition, MarkerState } from '@mapconductor/js-sdk-core';
import type { NativeTransport } from './NativeTransport';
import type { BridgeableController } from './types';

export function pointPayload(point: GeoPoint) {
  return { latitude: point.latitude, longitude: point.longitude, altitude: point.altitude ?? 0 };
}

export function cameraPayload(camera: MapCameraPosition) {
  return {
    position: pointPayload(camera.position),
    zoom: camera.zoom,
    bearing: camera.bearing,
    tilt: camera.tilt,
  };
}

function markerPayload(marker: MarkerState) {
  return { id: marker.id, position: pointPayload(marker.position) };
}

/**
 * Wires marker click/drag-end to outbound event envelopes.
 *
 * Deliberately does *not* touch setMapClickListener/setMapLongClickListener/
 * setCameraMove{Start,,End}Listener/setMapInitializedListener: those are
 * single-slot on MapViewControllerInterface, and the provider's own view
 * component (LeafletMapView, GoogleMapView, ...) already claims them for its
 * own bookkeeping (camera tick, overlays) once `state.setController()`
 * returns — registering here would just get clobbered. Camera position
 * still reaches native via MapConductorWebViewState.updateCameraPosition(),
 * which the component already calls on every camera event. mapClick/
 * mapLongClick forwarding is out of scope for now (see ARCHITECTURE.md).
 */
export function wireEvents(controller: BridgeableController, transport: NativeTransport): void {
  controller.setOnMarkerClickListener((marker) => {
    transport.postEvent({ kind: 'event', name: 'markerClick', payload: markerPayload(marker) });
  });
  controller.setOnMarkerDragEnd((marker) => {
    transport.postEvent({ kind: 'event', name: 'markerDragEnd', payload: markerPayload(marker) });
  });
}
