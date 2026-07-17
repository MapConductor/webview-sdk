# webpage

The Android example app's **own** custom page — proof that `src` really is
swappable, not just documentation. Built independently of webview-sdk's
`packages/runtime` (the module's default bundled Leaflet runtime), using
`@mapconductor/react-for-leaflet` + `@mapconductor/webview-bridge` directly
(see webview-sdk's README, "Building your own page instead of the bundled
Leaflet one").

`src/App.tsx` mounts react-for-leaflet's own `<LeafletMapView>` with a
`MapConductorWebViewState` (from `@mapconductor/webview-bridge`) as its
`state` prop — the same shape as `packages/runtime/src/App.tsx`. It registers
the same `pulseCircle` extension type `MapExampleViewModel.kt`'s "Start pulse
extension" button already sends, so all five existing buttons keep working
unchanged; only the JS bundle backing the map is different.

It also renders `@mapconductor/js-sdk-react`'s `<InfoBubble>` whenever
`jsState.infoBubble`'s content listener fires — that's the JS half of the
info-bubble escape hatch native's `StoreMapPage`/`StoreMapPageViewModel.kt`
sample uses (see `android-for-webview-leaflet`'s README, "Info bubble"
section). `src/StoreInfoView.tsx` is the *only* place that knows how to lay
out `{ title, subtitle, badges, actionLabel }` — it has no idea what a
"store" is; that data and the "Get Directions" behavior both live in
Kotlin. This is why `@mapconductor/js-sdk-react` (not just
`@mapconductor/react-for-leaflet`) is a dependency here.

## This directory is the source. `app/src/main/assets/leaflet/` is generated — don't edit it directly

`../app/build.gradle.kts` defines `installWebpageDependencies` →
`buildWebpage` → `copyWebpageAssets`, wired into `:app`'s `preBuild`. Building
the app (`./gradlew :app:assembleDebug`, or just opening the project in
Android Studio and hitting Run) automatically runs `npm install` and
`npm run build` here and copies `dist/` into `app/src/main/assets/leaflet/`
— there's no manual copy step, and no compiled JS to read to understand how
this works. Edit `src/App.tsx` (or anything else in here) and rebuild the
Android app; the next build picks it up.

Gradle's normal up-to-date checking applies: `installWebpageDependencies`
only re-runs `npm install` if `package.json`/`package-lock.json` changed,
`buildWebpage` only re-runs `npm run build` if anything under `src/`,
`index.html`, `vite.config.ts`, or `tsconfig.json` changed, and
`copyWebpageAssets` only re-copies if `dist/` changed — so a normal Kotlin
edit-and-rebuild loop doesn't pay the npm cost at all.

If you just want to iterate on the page itself without a full Android
rebuild each time, `npm run dev` (this directory) still works standalone —
`webpage/README`'s scripts are unchanged, only the app-side integration is
new.

(The `.js.map` sourcemap is deliberately excluded from the copy — same as
`android-for-webview-leaflet`'s own bundled runtime — to keep the APK
smaller; see `copyWebpageAssets`'s `exclude("**/*.map")`.)

## Prerequisites

`@mapconductor/js-sdk-core`/`@mapconductor/react-for-leaflet` (from
`../../../../../react-sdk`) and `@mapconductor/webview-bridge` (from
`../../../../packages/bridge`) are `file:` deps resolved by path, not
published packages — their own `dist/` must already be built (`npm run
build` in each) before `npm install`/`buildWebpage` here can succeed. This
mirrors the same prerequisite `packages/runtime` has.

## Status

Builds cleanly standalone (`npx tsc --noEmit`, `npm run build`). The Gradle
integration (`installWebpageDependencies`/`buildWebpage`/`copyWebpageAssets`)
was verified end to end: a clean `:app:assembleDebug` from a repo with no
`app/src/main/assets/leaflet/` present ran all three tasks and produced it,
a second `:app:assembleDebug` with nothing changed showed all three as
`UP-TO-DATE`, and the built APK was confirmed (via `unzip -l`) to contain
both `assets/leaflet/` (this page) and `assets/webview-leaflet/` (the
module's own default runtime, bundled via `android-for-webview-leaflet`'s
AAR) side by side — proving the two are genuinely independent bundles, not
the same asset under two names. **Not yet run on an emulator/device** — no
AVD/emulator binary was available in this environment (see the parent
example's README for the same limitation).
