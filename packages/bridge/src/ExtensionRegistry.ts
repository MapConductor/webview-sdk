/**
 * Escape hatch for anything outside the common MapViewControllerInterface
 * surface (deck.gl overlays, a bespoke Leaflet/MapLibre/Google Maps plugin,
 * ...). Mirrors js-sdk-react's NativeMapExtension pattern (upsert/remove by
 * id + {type, payload} descriptor), just running in the opposite direction:
 * native declares the extension, this registry looks up a handler that an
 * app-specific JS bundle registered ahead of time and applies it to the real
 * map instance.
 *
 * `TMap` is whichever concrete map object the app's chosen provider exposes
 * (a Leaflet `Map`, a `google.maps.Map`, a `maplibregl.Map`, ...) — this
 * package never needs to know about any of them itself, only the app's own
 * registered handlers do.
 */
export interface MapExtensionDescriptor {
  readonly id: string;
  readonly type: string;
  readonly payload: Record<string, unknown>;
}

export type EmitExtensionEvent = (eventName: string, payload: unknown) => void;

/** Returns an optional cleanup, called when the extension is removed or replaced. */
export type MapExtensionHandler<TMap = unknown> = (
  map: TMap,
  payload: Record<string, unknown>,
  emit: EmitExtensionEvent,
) => void | (() => void);

export class ExtensionRegistry<TMap = unknown> {
  private readonly handlers = new Map<string, MapExtensionHandler<TMap>>();
  private readonly active = new Map<string, () => void>();

  constructor(private readonly map: TMap) {}

  register(type: string, handler: MapExtensionHandler<TMap>): void {
    this.handlers.set(type, handler);
  }

  upsert(descriptor: MapExtensionDescriptor, emit: EmitExtensionEvent): void {
    this.active.get(descriptor.id)?.();
    this.active.delete(descriptor.id);

    const handler = this.handlers.get(descriptor.type);
    if (!handler) {
      console.warn(`[mapconductor] no extension handler registered for type "${descriptor.type}"`);
      return;
    }
    const cleanup = handler(this.map, descriptor.payload, (eventName, payload) =>
      emit(eventName, payload),
    );
    if (cleanup) this.active.set(descriptor.id, cleanup);
  }

  remove(id: string): void {
    this.active.get(id)?.();
    this.active.delete(id);
  }

  destroy(): void {
    for (const cleanup of this.active.values()) cleanup();
    this.active.clear();
  }
}
