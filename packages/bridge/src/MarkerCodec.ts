import { createMarkerState, DefaultMarkerIcon, type MarkerIcon, type MarkerState } from '@mapconductor/js-sdk-core';
import { decodeGeoPoint, type GeoPointPayload } from './geo';

/**
 * Only the "colorDefault" icon is supported for now (a filled pin + optional
 * label, matching Android/iOS's DefaultMarkerIcon). Image icons would decode
 * the same way the RN bridge does it in js-sdk-react/ios/NativeMapCodec.swift
 * (data:image / file:// URIs) — left out here to keep the prototype focused.
 */
export interface MarkerIconPayload {
  type: 'colorDefault';
  fillColor?: string;
  strokeColor?: string;
  label?: string;
}

export interface MarkerPayload {
  id: string;
  position: GeoPointPayload;
  icon?: MarkerIconPayload;
  clickable?: boolean;
  draggable?: boolean;
  zIndex?: number;
}

function decodeIcon(payload?: MarkerIconPayload): MarkerIcon | null {
  if (!payload || payload.type !== 'colorDefault') return null;
  return new DefaultMarkerIcon(payload.fillColor ?? '#FF0000', {
    strokeColor: payload.strokeColor,
    label: payload.label ?? null,
  });
}

export function decodeMarker(payload: MarkerPayload): MarkerState {
  return createMarkerState({
    id: payload.id,
    position: decodeGeoPoint(payload.position),
    icon: decodeIcon(payload.icon),
    clickable: payload.clickable ?? true,
    draggable: payload.draggable ?? false,
    zIndex: payload.zIndex ?? 0,
  });
}

export function decodeMarkers(payloads: MarkerPayload[]): MarkerState[] {
  return payloads.map(decodeMarker);
}
