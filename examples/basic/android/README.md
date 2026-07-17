# Android basic example

A standalone Gradle project (root + `:app`) demonstrating
`android-for-webview-leaflet`, with two screens toggled from `MainActivity`
(just a `showStoreMap` boolean, not real navigation — see `ExampleApp`):

- **Bridge-command demo** (`BasicBridgeDemo`): buttons to move/animate the
  camera, add markers (`WebViewColorIcon`), clear overlays, and trigger the
  `pulseCircle` extension escape hatch — the same commands the `webview-sdk`
  dev-harness exercises against the JS runtime directly, now driven from
  real Compose code. `MapExampleViewModel` holds the button actions; each
  one takes `mapViewState` as a parameter and calls
  `mapViewState.moveCameraTo(...)` / `.markerController` / `.extensions`
  rather than reaching for a controller directly. Tapping marker A or B
  shows a native `Toast` (`onClick` set per-marker in
  `MapExampleViewModel.addMarkers`, the label read back off
  `WebViewColorIcon` — `MainActivity.kt` supplies the actual
  `Toast.makeText(...)` call so the ViewModel never needs a `Context`).
- **Store map + info bubble sample** (`pages/storemap/StoreMapPage.kt`): the
  same sample as react-sdk's/android-sdk's `pages/map/basic` (a Hawaii
  Starbucks/coffee-shop locator) — markers supplied entirely from Compose
  (`StoreMapPageViewModel.addMarkers`), clicking one shows an info bubble
  (`mapViewState.infoBubble`) whose content and "Get Directions" behavior are
  defined here in Kotlin, not in the JS bundle. See
  `android-for-webview-leaflet`'s README ("Info bubble" section) for how that
  escape hatch works, and `webpage/src/StoreInfoView.tsx` for the JS side
  that only knows how to lay the content out.

Both screens create their `MapConductorWebViewState` via
`rememberMapConductorWebViewState()` (the same pattern every other provider
uses — `rememberMapboxMapViewState()`, etc.) and pass it to
`MapConductorWebView(state = ...)`.

Rather than the module's default bundled Leaflet runtime
(`MapConductorWebViewState.DEFAULT_SRC`), this example points `src` at its
**own** page instead — `src = "leaflet/index.html"`, built by the
[`webpage/`](webpage/) project (react-for-leaflet + `@mapconductor/webview-bridge`,
see that folder's README). It's functionally identical to the default
runtime (same buttons all keep working), which is the point: it demonstrates
that `src` is genuinely swappable, not just documented as such.

`app/src/main/assets/leaflet/` is **generated, not source** —
`app/build.gradle.kts` wires an `npm install` → `npm run build` →
copy pipeline into `:app`'s `preBuild`, so building this app (Gradle CLI or
Android Studio) automatically rebuilds `webpage/`'s output into that
directory; there's no manual copy step, and no compiled JS to read to
understand how it works. Edit `webpage/src/App.tsx` and rebuild — see
`webpage/README.md`.

Open this directory directly in Android Studio, or from the command line:

```bash
./gradlew :app:assembleDebug
```

## One-time setup: publish the dependencies to mavenLocal

`android-for-webview-leaflet` (and the `android-sdk-core`/`android-sdk-compose`
it depends on) aren't published to a public Maven registry yet — see
`android-for-webview-leaflet`'s README. This project resolves them from
`mavenLocal()` instead, so publish them there once before building:

```bash
# From a checkout of android-sdk, with android-for-webview-leaflet temporarily
# copied in and added to projects.properties' modules= list (so it resolves
# :android-sdk-compose as a sibling project instead of over the network):
cd android-sdk
./gradlew :android-sdk-core:publishToMavenLocal \
  :android-sdk-compose:publishToMavenLocal \
  :android-for-webview-leaflet:publishToMavenLocal
```

That publishes `com.mapconductor:core:1.2.0`, `com.mapconductor:compose:1.2.0`,
and `com.mapconductor:for-webview-leaflet:0.6.2` to `~/.m2/repository`, which
is exactly what this project's `settings.gradle.kts` looks in. Once
published, this project needs nothing else from `android-sdk` — it builds
standalone from here.

## Status

Verified with a real, standalone build using this project's own Gradle
wrapper (not nested inside `android-sdk`): `./gradlew :app:assembleDebug`
succeeds and `:app:dependencies` confirms `com.mapconductor:for-webview-leaflet:0.6.2`
resolves from `mavenLocal()` rather than a project path.

**Verified installed and running on two real Android devices** (not an
emulator — none was available in this environment). This actually caught a
real bug: both devices initially showed a completely blank white WebView
for both screens, despite the page/JS/tiles all loading correctly — root
cause was `height: 100%`/`100vh` resolving to `0px` against the document
root on real Android WebView (see `android-for-webview-leaflet`'s README,
"Gotcha" section, for the full diagnosis). Fixed in
`packages/runtime/index.html`; after the fix, both screens render correctly
on-device: the bridge-command demo shows real OpenStreetMap tiles centered
on Tokyo with working zoom controls, and the store map sample shows all
its markers with a working InfoBubble (tapping a marker shows the
name/address/badge/"Get Directions" popup, confirmed on-device).

`webpage/`'s custom page (including the `<InfoBubble>`/`StoreInfoView`
wiring) builds cleanly (`npx tsc --noEmit`, `npm run build`), and the Gradle
automation was verified end to end: a clean `:app:assembleDebug` with no
`app/src/main/assets/leaflet/` present ran
`installWebpageDependencies`/`buildWebpage`/`copyWebpageAssets` and produced
it (a `Copy` task bug that left stale content-hashed JS files from previous
builds sitting alongside the current one was caught and fixed —
`copyWebpageAssets` now deletes the destination before copying), a second
build with nothing changed showed all three `UP-TO-DATE`, and the built APK
was confirmed (via `unzip -l`) to bundle both `assets/leaflet/` (this page)
and `assets/webview-leaflet/` (the module's own default runtime) side by
side, each with exactly one hashed JS/CSS pair.

**`0.6.2`**: a security review of webview-sdk found and fixed four issues
(see `android-for-webview-leaflet`'s README, "Build status" `0.6.2` entry,
for the full list — dev-only WebView debugging left enabled in release
builds, a dev-harness transport reachable from production bundles with an
unvalidated origin, missing CSP, and a prototype-pollution-prone command
lookup). Re-verified on a real Android device after this change: both
screens still render correctly, "Add markers" → tapping marker A/B still
shows the `Toast`, and the store map sample's markers/InfoBubble
("Get Directions" popup) still work.
