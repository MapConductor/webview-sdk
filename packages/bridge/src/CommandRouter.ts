import type { CommandEnvelope, CommandResultPayload } from './protocol';
import type { NativeTransport } from './NativeTransport';
import type { ExtensionRegistry, MapExtensionDescriptor } from './ExtensionRegistry';
import type { InfoBubbleContent, InfoBubbleController } from './InfoBubbleController';
import type { BridgeableController } from './types';
import { decodeMarkers, type MarkerPayload } from './MarkerCodec';
import {
  decodeBounds,
  decodeCameraOptions,
  decodeCameraPosition,
  type CameraOptionsPayload,
  type CameraPositionPayload,
  type GeoRectBoundsPayload,
} from './geo';

/**
 * One command per native call would be fine for occasional camera moves, but
 * marker sets are commonly in the thousands (see js-sdk-react's
 * NativeMarkerBatch.ts) — so `compositionMarkers` always takes the *whole*
 * current marker set in one envelope rather than per-marker add/remove
 * commands. The provider's own marker controller already diffs against the
 * previous set internally, so this stays cheap even at scale.
 */
type CommandHandlers = {
  moveCamera(payload: CameraPositionPayload): Promise<unknown>;
  animateCamera(payload: { position: CameraPositionPayload; options?: CameraOptionsPayload }): Promise<unknown>;
  fitBounds(payload: { bounds: GeoRectBoundsPayload; options?: CameraOptionsPayload }): Promise<unknown>;
  compositionMarkers(payload: { markers: MarkerPayload[] }): Promise<unknown>;
  clearOverlays(payload: unknown): Promise<unknown>;
  upsertExtension(payload: MapExtensionDescriptor): Promise<unknown>;
  removeExtension(payload: { id: string }): Promise<unknown>;
  showInfoBubble(payload: InfoBubbleContent): Promise<unknown>;
  hideInfoBubble(payload: unknown): Promise<unknown>;
};

function createHandlers<TMap>(
  controller: BridgeableController,
  extensions: ExtensionRegistry<TMap>,
  infoBubble: InfoBubbleController,
  transport: NativeTransport,
): CommandHandlers {
  return {
    async moveCamera(payload) {
      return controller.moveCamera(decodeCameraPosition(payload));
    },
    async animateCamera(payload) {
      return controller.animateCamera(decodeCameraPosition(payload.position), decodeCameraOptions(payload.options));
    },
    async fitBounds(payload) {
      return controller.fitBounds(decodeBounds(payload.bounds), decodeCameraOptions(payload.options));
    },
    async compositionMarkers(payload) {
      const markers = decodeMarkers(payload.markers);
      infoBubble.setMarkers(markers);
      await controller.compositionMarkers(markers);
      return null;
    },
    async clearOverlays() {
      await controller.clearOverlays();
      return null;
    },
    async upsertExtension(payload) {
      extensions.upsert(payload, (eventName, eventPayload) => {
        transport.postEvent({
          kind: 'event',
          name: 'extensionEvent',
          payload: { extensionId: payload.id, eventName, payload: eventPayload },
        });
      });
      return null;
    },
    async removeExtension(payload) {
      extensions.remove(payload.id);
      return null;
    },
    async showInfoBubble(payload) {
      infoBubble.show(payload);
      return null;
    },
    async hideInfoBubble() {
      infoBubble.hide();
      return null;
    },
  };
}

export function createCommandRouter<TMap>(
  controller: BridgeableController,
  extensions: ExtensionRegistry<TMap>,
  infoBubble: InfoBubbleController,
  transport: NativeTransport,
): void {
  const handlers = createHandlers(controller, extensions, infoBubble, transport);

  transport.onCommand(async (command: CommandEnvelope) => {
    // Object.prototype.hasOwnProperty guard, not a plain `handlers[command.name]` lookup —
    // command.name comes straight off the wire, and a bare index lookup would resolve
    // "constructor"/"toString"/etc. to Object.prototype members instead of failing closed.
    const isOwnHandler = Object.prototype.hasOwnProperty.call(handlers, command.name);
    const handler = isOwnHandler
      ? (handlers as Record<string, (payload: unknown) => Promise<unknown>>)[command.name]
      : undefined;
    const result: CommandResultPayload = handler
      ? await handler(command.payload)
          .then((value) => ({ ok: true, value }))
          .catch((error: unknown) => ({ ok: false, error: String(error) }))
      : { ok: false, error: `Unknown command: ${command.name}` };

    transport.postEvent({ kind: 'event', id: command.id, name: 'result', payload: result });
  });
}
