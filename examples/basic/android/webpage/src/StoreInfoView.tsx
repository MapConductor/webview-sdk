import type { InfoBubbleContent } from '@mapconductor/webview-bridge';

/**
 * Purely presentational — title/subtitle/badges/actionLabel all come from
 * native (see MapConductorWebViewState.infoBubble on the Android side,
 * StoreMapPageViewModel.kt's onMarkerClick). This component only knows how
 * to lay the content out, not what a "store" is.
 */
export function StoreInfoView({
  content,
  onAction,
}: {
  content: InfoBubbleContent;
  onAction: () => void;
}) {
  return (
    <div style={{ minWidth: 220, maxWidth: 280, color: '#111827' }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{content.title}</div>
      {content.subtitle && (
        <div style={{ fontSize: 13, lineHeight: 1.35, marginBottom: 8 }}>{content.subtitle}</div>
      )}
      {content.badges && content.badges.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, marginBottom: 8 }}>
          {content.badges.map(badge => (
            <span key={badge}>● {badge}</span>
          ))}
        </div>
      )}
      {content.actionLabel && (
        <button
          type="button"
          onClick={onAction}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: 0,
            borderRadius: 16,
            padding: '8px 12px',
            background: '#f5f5f5',
            color: '#111827',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#111827', display: 'inline-block' }} />
          {content.actionLabel}
        </button>
      )}
    </div>
  );
}
