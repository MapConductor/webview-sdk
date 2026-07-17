import type { MarkerState } from '@mapconductor/js-sdk-core';

export interface InfoBubbleContent {
  readonly markerId: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly badges?: readonly string[];
  readonly actionLabel?: string;
}

export type InfoBubbleContentListener = (content: InfoBubbleContent | null) => void;

/**
 * JS-side half of the info-bubble escape hatch: native decides *what* to
 * show and *when* (`showInfoBubble`/`hideInfoBubble` commands, routed here by
 * CommandRouter.ts) — this class only carries that content across the
 * bridge and notifies whichever UI is watching. The app's own page owns
 * *how* it looks (its own React component rendering `content`, wrapped in
 * `@mapconductor/js-sdk-react`'s `<InfoBubble>` for the speech-bubble chrome
 * — same split ExtensionRegistry uses for the deck.gl-style escape hatch,
 * just for a single "current bubble" instead of a registry of named
 * handlers.
 *
 * Marker lookups: `showInfoBubble` only carries a `markerId`, not a full
 * `MarkerState` (position/icon) — `<InfoBubble marker={...}>` needs the
 * latter to anchor itself. CommandRouter.ts calls `setMarkers()` on every
 * `compositionMarkers` command so `findMarker()` stays in sync with
 * whatever native last pushed.
 */
export class InfoBubbleController {
  private _content: InfoBubbleContent | null = null;
  private listener: InfoBubbleContentListener | null = null;
  private readonly markers = new Map<string, MarkerState>();

  get content(): InfoBubbleContent | null {
    return this._content;
  }

  setContentListener(listener: InfoBubbleContentListener | null): void {
    this.listener = listener;
  }

  findMarker(markerId: string): MarkerState | undefined {
    return this.markers.get(markerId);
  }

  setMarkers(markers: readonly MarkerState[]): void {
    this.markers.clear();
    for (const marker of markers) this.markers.set(marker.id, marker);
  }

  show(content: InfoBubbleContent): void {
    this._content = content;
    this.listener?.(content);
  }

  hide(): void {
    this._content = null;
    this.listener?.(null);
  }
}
