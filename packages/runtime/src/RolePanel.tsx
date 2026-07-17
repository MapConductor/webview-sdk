/**
 * Explains what this page is to anyone who opens it directly (npm run dev,
 * or the bundled asset inside android-for-webview-leaflet/ios-for-webview-leaflet)
 * — this is the "batteries-included" reference runtime, not something a real
 * app is expected to ship as-is. See webview-sdk's README, "Building your
 * own page instead of the bundled Leaflet one".
 */
export function RolePanel() {
  return (
    <div
      style={{
        flexShrink: 0,
        padding: '8px 12px',
        background: '#1e293b',
        color: '#e2e8f0',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      <strong>MapConductor reference runtime</strong> — the default Leaflet
      page <code>android-for-webview-leaflet</code>/<code>ios-for-webview-leaflet</code> bundle
      out of the box (<code>MapConductorWebViewState.DEFAULT_SRC</code>).
      Real apps should build and bundle their own page against{' '}
      <code>@mapconductor/webview-bridge</code> instead — see webview-sdk's
      README, "Building your own page instead of the bundled Leaflet one".
    </div>
  );
}
