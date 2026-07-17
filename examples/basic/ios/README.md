# iOS basic example

A minimal SwiftUI app demonstrating `ios-for-webview-leaflet`:
`MapConductorWebView` filling the screen, with buttons to move/animate the
camera, add markers (`WebViewColorIcon`), clear overlays, and trigger
the `pulseCircle` extension escape hatch — the same commands the
`webview-sdk` dev-harness exercises against the JS runtime directly, now
driven from real SwiftUI code.

`WebViewLeafletExample.xcodeproj` depends on `ios-for-webview-leaflet` via a
local Swift package reference (`../../../../ios-for-webview-leaflet`).

Same structure as the Android example: `ContentView` owns a
`MapConductorWebViewState` (`@StateObject`, created directly — SwiftUI has no
`remember`-with-Saver equivalent bound into this yet) and a
`MapExampleViewModel` (`ObservableObject`). Each button calls a view model
method, passing `mapViewState` in as a parameter — the view model doesn't
hold onto it, since it belongs to the view's lifecycle, not the model's. By
default the map loads `MapConductorWebViewState.defaultSrc` (this module's
bundled Leaflet reference runtime) — pass a resolved `URL` via `src:` instead
to point it at your own bundled page.

## Status: verified on the iOS Simulator

Built with:

```
xcodebuild -scheme WebViewLeafletExample -destination "platform=iOS Simulator,name=iPhone 17" build
```

then installed and launched with `xcrun simctl install`/`launch`, and
screenshotted with `xcrun simctl io screenshot`. The Leaflet map renders real
OpenStreetMap tiles centered on Tokyo with working zoom controls — the first
attempt rendered a blank white view due to a `file://` + `<script
type="module">` interaction (fixed in `ios-for-webview-leaflet` via a custom
`WKURLSchemeHandler` — see that repo's README for the full explanation).

**Not verified**: tapping the buttons on-device. This sandbox's Simulator
automation is screenshot-only (no accessibility/UI-scripting access), so
"Add markers" / "Animate to San Francisco" / "Start pulse extension" are
confirmed by code review and by the equivalent webview-sdk dev-harness flow,
not by an on-device tap.

Re-verified (build + simulator screenshot) after the `WebViewLeaflet*` →
`MapConductorWebView*`/`WebViewColorIcon` rename and the `src`
configurability addition — see `ios-for-webview-leaflet`'s README.

## project.pbxproj note

This project file was hand-written (no Xcode GUI, no XcodeGen available in
this environment) using the classic explicit-file-reference pbxproj format.
It's a minimal single-target app: `GENERATE_INFOPLIST_FILE = YES` so there's
no physical Info.plist, no asset catalog/app icon. If you add files in
Xcode normally afterwards, Xcode will happily rewrite this into its usual
format — nothing here depends on it staying hand-authored.

Because it's the explicit-reference format, Xcode won't auto-discover new
`.swift` files dropped into the `WebViewLeafletExample/` folder outside of
Xcode — adding `MapExampleViewModel.swift` this way required a
`PBXFileReference` + `PBXBuildFile` entry and adding it to the group and
`PBXSourcesBuildPhase` by hand. Adding files through Xcode itself doesn't
have this problem.
