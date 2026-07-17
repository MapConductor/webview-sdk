import {
  MapCameraPosition as MapCameraPositionNS,
  createRandomId,
  type GeoPoint,
  type MapCameraPosition,
  type MapDesignTypeInterface,
  type MapViewControllerInterface,
  type MapViewHolder,
  type MapViewStateInterface,
} from '@mapconductor/js-sdk-core';
import { PROTOCOL_VERSION } from './protocol';
import { createWebViewTransport, type NativeTransport } from './NativeTransport';
import { createCommandRouter } from './CommandRouter';
import { wireEvents, cameraPayload } from './EventForwarder';
import { ExtensionRegistry } from './ExtensionRegistry';
import { InfoBubbleController } from './InfoBubbleController';
import type { BridgeableController } from './types';

export interface MapConductorWebViewStateParams<TDesign extends MapDesignTypeInterface<unknown>> {
  id?: string;
  mapDesignType: TDesign;
  cameraPosition?: MapCameraPosition;
  transport?: NativeTransport;
}

/**
 * A MapViewStateInterface implementation, usable as the `state` prop of ANY
 * MapConductor web provider component (`<LeafletMapView>`, `<GoogleMapView>`,
 * `<MapLibreView>`, ...) exactly the same way that provider's own
 * `useXxxMapViewState()` would be:
 *
 * ```tsx
 * const jsState = new MapConductorWebViewState({ mapDesignType: GoogleMapDesign.Normal });
 * <GoogleMapView state={jsState} />
 * ```
 *
 * The provider component calls `setController()`/`updateCameraPosition()` on
 * it internally, exactly as it does for its own concrete state class — this
 * is where the postMessage bridge wiring (command router, extension
 * registry, ready handshake) happens instead of a separate `attach()` call.
 * `TDesign` is whichever provider's own design-type you're rendering with
 * (`GoogleMapDesignType`, `LeafletMapDesignType`, ...); this package never
 * imports any of them itself.
 */
export class MapConductorWebViewState<TDesign extends MapDesignTypeInterface<unknown>, TMap = unknown>
  implements MapViewStateInterface<TDesign>
{
  readonly id: string;
  private readonly transport: NativeTransport;
  private _cameraPosition: MapCameraPosition;
  private _mapDesignType: TDesign;
  private _controller: BridgeableController | null = null;
  private _cameraPositionChangeListener: ((camera: MapCameraPosition) => void) | null = null;
  private _extensions: ExtensionRegistry<TMap> | null = null;
  private _infoBubble: InfoBubbleController | null = null;

  constructor({
    id = createRandomId(),
    mapDesignType,
    cameraPosition = MapCameraPositionNS.Default,
    // Always the real WebView transport unless the caller passes something
    // else explicitly — this class has no reliable way to tell "am I
    // running inside a real WebView or a dev tool" from a URL query param
    // alone, so it never guesses. Dev-only tooling (packages/runtime,
    // examples/*/webpage) opts into `createDevHarnessTransport(...)`
    // themselves, gated on their own bundler's dev-only flag.
    transport = createWebViewTransport(),
  }: MapConductorWebViewStateParams<TDesign>) {
    this.id = id;
    this._mapDesignType = mapDesignType;
    this._cameraPosition = cameraPosition;
    this.transport = transport;
  }

  get cameraPosition(): MapCameraPosition {
    return this._cameraPosition;
  }

  get mapDesignType(): TDesign {
    return this._mapDesignType;
  }

  set mapDesignType(value: TDesign) {
    this._mapDesignType = value;
  }

  /** Null until the provider component has actually attached a controller. */
  get extensions(): ExtensionRegistry<TMap> | null {
    return this._extensions;
  }

  /**
   * The info-bubble escape hatch (see InfoBubbleController): native decides
   * what content to show/hide and when, this app's own page renders it (e.g.
   * via `@mapconductor/js-sdk-react`'s `<InfoBubble>`). Null until the
   * provider component has actually attached a controller.
   */
  get infoBubble(): InfoBubbleController | null {
    return this._infoBubble;
  }

  moveCameraTo(position: GeoPoint, durationMillis?: number): void;
  moveCameraTo(cameraPosition: MapCameraPosition, durationMillis?: number): void;
  moveCameraTo(positionOrCamera: GeoPoint | MapCameraPosition, durationMillis?: number): void {
    const next = 'zoom' in positionOrCamera
      ? this.resolveCameraPosition(positionOrCamera as MapCameraPosition)
      : this._cameraPosition.copy({ position: positionOrCamera as GeoPoint });

    if (!this._controller) {
      this._cameraPosition = next;
      return;
    }

    if (!durationMillis) {
      void this._controller.moveCamera(next);
    } else {
      void this._controller.animateCamera(next, { duration: durationMillis });
    }
    this._cameraPosition = next;
    this._cameraPositionChangeListener?.(next);
  }

  getMapViewHolder(): MapViewHolder<unknown, unknown> | null {
    return this._controller?.holder ?? null;
  }

  /**
   * Called by the provider's own view component once its controller is
   * ready (and with `null` on unmount) — the shared attach point every
   * MapConductor React component already uses internally.
   */
  setController(controller: MapViewControllerInterface | null): void {
    if (!controller) {
      this._extensions?.destroy();
      this._extensions = null;
      this._infoBubble = null;
      this._controller = null;
      return;
    }

    const bridgeable = controller as BridgeableController;
    this._controller = bridgeable;
    this._extensions = new ExtensionRegistry<TMap>(bridgeable.holder.map as TMap);
    this._infoBubble = new InfoBubbleController();
    wireEvents(bridgeable, this.transport);
    createCommandRouter(bridgeable, this._extensions, this._infoBubble, this.transport);
    this.transport.postEvent({ kind: 'event', name: 'ready', payload: { protocolVersion: PROTOCOL_VERSION } });
  }

  /**
   * Called by the app's own JS-rendered info bubble content when its action
   * button (if any) is tapped — native receives this as the `infoBubbleAction`
   * event and decides what to do (matching who decided to show the bubble in
   * the first place).
   */
  notifyInfoBubbleAction(markerId: string): void {
    this.transport.postEvent({ kind: 'event', name: 'infoBubbleAction', payload: { markerId } });
  }

  /** Called by the provider's own view component on every camera move/start/end. */
  updateCameraPosition(camera: MapCameraPosition): void {
    this._cameraPosition = camera;
    this._cameraPositionChangeListener?.(camera);
    this.transport.postEvent({ kind: 'event', name: 'cameraMove', payload: cameraPayload(camera) });
  }

  setCameraPositionChangeListener(listener: ((camera: MapCameraPosition) => void) | null): void {
    this._cameraPositionChangeListener = listener;
  }

  private resolveCameraPosition(target: MapCameraPosition): MapCameraPosition {
    const isUnspecified = target.zoom === 0 && target.bearing === 0 && target.tilt === 0;
    return isUnspecified
      ? this._cameraPosition.copy({ position: target.position })
      : target.copy({ bearing: 0, tilt: 0 });
  }
}
