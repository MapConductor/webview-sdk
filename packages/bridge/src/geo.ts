import {
  createGeoPoint,
  createGeoRectBounds,
  createMapCameraPosition,
  type CameraOptions,
  type GeoPoint,
  type GeoRectBounds,
  type MapCameraPosition,
} from '@mapconductor/js-sdk-core';

export interface GeoPointPayload {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export function decodeGeoPoint(payload: GeoPointPayload): GeoPoint {
  return createGeoPoint({
    latitude: payload.latitude,
    longitude: payload.longitude,
    altitude: payload.altitude ?? 0,
  });
}

export interface CameraPositionPayload {
  position: GeoPointPayload;
  zoom?: number;
  bearing?: number;
  tilt?: number;
}

export function decodeCameraPosition(payload: CameraPositionPayload): MapCameraPosition {
  return createMapCameraPosition({
    position: decodeGeoPoint(payload.position),
    zoom: payload.zoom ?? 0,
    bearing: payload.bearing ?? 0,
    tilt: payload.tilt ?? 0,
  });
}

export interface GeoRectBoundsPayload {
  southWest: GeoPointPayload;
  northEast: GeoPointPayload;
}

export function decodeBounds(payload: GeoRectBoundsPayload): GeoRectBounds {
  const bounds = createGeoRectBounds();
  bounds.extend(decodeGeoPoint(payload.southWest));
  bounds.extend(decodeGeoPoint(payload.northEast));
  return bounds;
}

export interface CameraOptionsPayload {
  durationMs?: number;
  padding?: number;
}

export function decodeCameraOptions(payload?: CameraOptionsPayload): CameraOptions | undefined {
  if (!payload) return undefined;
  return {
    duration: payload.durationMs,
    padding: payload.padding,
  };
}
