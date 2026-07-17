import type { MapViewControllerInterface, MarkerCapable } from '@mapconductor/js-sdk-core';

/**
 * What a web map provider's controller needs to implement to be drivable over this bridge:
 * the shared camera/listener contract every MapConductor provider implements
 * (MapViewControllerInterface), plus marker composition (MarkerCapable). Every existing web
 * provider (react-for-leaflet, react-for-maplibre, react-for-googlemaps, ...) already
 * implements both, so this bridge works with whichever one an app chooses — it was only ever
 * accidentally Leaflet-specific because the original prototype imported LeafletMapViewController
 * by name instead of this intersection.
 */
export type BridgeableController = MapViewControllerInterface & MarkerCapable;
