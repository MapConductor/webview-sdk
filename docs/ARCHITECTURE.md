# webview-sdk 設計メモ

## 背景・目的

Android/iOSのネイティブ地図SDKでは実現しづらい機能（deck.glのような大量データ表示、
Leaflet専用プラグインなど）を使いたい場合に、WebView上でLeafletを動かし、
Jetpack Compose / SwiftUI側からは既存の宣言的マーカーAPIと同じ感覚で
それを操作できるようにする。JS側からネイティブへの一方的な制御ではなく、
「ネイティブが宣言し、JSがLeafletに適用する」形にすることで、
WebViewを使わない他プロバイダ（GoogleMaps/MapLibre等）とアプリ開発者向けのAPIを揃える。

## 全体構成

```
Compose / SwiftUI（MapConductorWebView(state = MapConductorWebViewState)）
        │  android-for-webview-leaflet / ios-for-webview-leaflet
        │  （android-for-mapbox 等と並ぶ provider module。実装済み）
        ▼
   postMessage ブリッジ（native側）
        │  CommandEnvelope / EventEnvelope（詳細は PROTOCOL.md）
        ▼
@mapconductor/webview-bridge（本リポジトリ packages/bridge。provider非依存）
        │  new MapConductorWebViewState({ mapDesignType, ... })
        │  <GoogleMapView state={jsState} />  ← react-sdkの各providerコンポーネントに
        │  そのまま state として渡すだけ（後述）
        ▼
   アプリが選んだ任意のWeb provider実装
   （react-for-leaflet / react-for-maplibre / react-for-googlemaps / 自作ページ）
```

**一番重要な設計判断**: `packages/bridge` の `MapConductorWebViewState` は
react-sdk（`js-sdk-core`）の `MapViewStateInterface<TDesign>` をそのまま実装した
クラスであり、`LeafletMapViewState`/`GoogleMapViewState`/`MapLibreViewState` と
まったく同じ契約を満たす。そのため `<LeafletMapView>`/`<GoogleMapView>`/
`<MapLibreView>` のどれに対しても、それぞれの `useXxxMapViewState()` の代わりに
`state` propとしてそのまま渡せる — 各providerコンポーネントは内部で
`state.setController(ctrl)`/`state.updateCameraPosition(camera)` を呼ぶだけで、
渡された `state` が自分専用の具象クラスかどうかを一切気にしない。ブリッジ配線
（`ExtensionRegistry`の生成、`CommandRouter`、`ready`ハンドシェイク送信）は
`MapConductorWebViewState.setController()` の中で行われる（旧`attach()`は廃止）。
`packages/runtime` はこの上に乗った「バッテリー同梱のLeafletリファレンス実装」
（`<LeafletMapView state={jsState} />` を描画するだけの小さなReactアプリ、
`src/App.tsx`参照）にすぎず、native側（`android-for-webview-leaflet`/
`ios-for-webview-leaflet`）がデフォルトで同梱するアセットもこれだが、必須ではない。
アプリが自分のWebバンドルを`packages/bridge`単体に対して書けば、Leaflet以外の
任意のprovider、あるいは完全に独自のページ（deck.glだけを使うページ等）でも
同じブリッジプロトコルに載せられる。

これを成立させるため、react-sdk側にも最小限の追加的変更を行っている
（`js-sdk-core`/`react-for-leaflet`/`react-for-googlemaps`/`react-for-maplibre`。
詳細は次節）。webview-sdk固有の変更ではないが、この設計の前提になっている。

これにより：

- Compose/SwiftUI側の宣言的APIは変更不要（`MapConductorWebViewState`/`MapConductorWebView`
  という汎用名になっており、Leaflet固有のブランディングを持たない）
- 各Web providerの実装差分（マーカーの間引き・アイコン描画・カメラ計算等）は
  react-sdk側の各providerパッケージで保守され続ける。webview-sdk側で重複実装しない
- `src`（Android: asset相対パス、iOS: 解決済みURL）がnative側で設定可能なので、
  アプリは自分のバンドルしたページを指定できる（`assets/mappage/index.html` 等）
- 新しいWeb providerが増えても`packages/bridge`は無変更で済む（そのproviderが
  既存の`MapViewStateInterface`/`MapViewControllerInterface`パターンに従っている
  限り、`MapConductorWebViewState`をそのまま渡せる）

### react-sdk側の変更（前提条件）

`<GoogleMapView state={jsState} />`のような直接代入を型として成立させるため、
react-sdk本体に以下の追加的変更（既存コードへの影響なし・後方互換）を行った:

- `js-sdk-core/src/map/MapViewState.ts`: `MapViewStateInterface<T>`に
  `setController`/`updateCameraPosition`/`setCameraPositionChangeListener`
  を追加（各providerの具象state classは元々すべて実装済みだったが、
  共通interfaceには宣言されていなかった）
- `react-for-leaflet`/`react-for-googlemaps`/`react-for-maplibre`:
  各コンポーネントの`state` propの型を、具象class（`LeafletMapViewState`等）
  ではなく、既存の（空の）`XxxMapViewStateInterface`（`MapViewStateInterface`を
  extendするだけ）に変更。これにより、そのinterfaceさえ満たせば具象classでない
  オブジェクト（`MapConductorWebViewState`）も`state`として受け付けられる

**既知の制約**: `MapViewControllerInterface`のリスナー系メソッド
（`setCameraMoveListener`等）は単一枠（1つしか登録できない）で、各providerの
コンポーネントは内部で自分のブックキーピング（オーバーレイ描画・カメラtick等）
のために既にそれらを使い切っている。そのため`packages/bridge`は
`mapClick`/`mapLongClick`/`cameraMoveStart`/`cameraMoveEnd`イベントの転送に
コントローラの生リスナーを使えず（登録しても直後にコンポーネント自身の
リスナーに上書きされる）、代わりに`MapViewStateInterface`が要求する
`updateCameraPosition()`（コンポーネントがカメラ変化のたびに呼ぶ）経由で
`cameraMove`イベントだけを転送している。`mapClick`/`mapLongClick`の転送は
現状スコープ外（後述の現状の制限を参照）。マーカーのclick/drag-endは
`MarkerCapable.setOnMarkerClickListener`/`setOnMarkerDragEnd`が
コンポーネント側で使われていないため、この制約を受けず従来通り動作する。

## プロトコル

`packages/bridge/src/protocol.ts` 参照。詳細は [PROTOCOL.md](./PROTOCOL.md)。

要点だけ:

- コマンド（native→JS）/ イベント（JS→native）ともに `{kind, id?, name, payload}` の
  単純なJSONエンベロープ
- コマンドは必ず `result` イベントで応答される（相関IDで対応付け）
- `compositionMarkers` は差分ではなく現在の全マーカー集合を毎回渡す
  （diffは `LeafletMarkerController` が内部で行う）
- 起動時に `ready` ハンドシェイクを行い、native側はそれまでコマンドをキューイングする

## エスケープハッチ（deck.gl等のカスタムJS）

`js-sdk-react/src/native-extension/NativeMapExtension.ts` の
`{id, type, payload}` 記述子パターンをそのまま逆方向に使う
（`packages/bridge/src/ExtensionRegistry.ts`）。native が `upsertExtension` で
`{id, type, payload}` を送ると、JS側で `type` に対応する登録済みハンドラが
`controller.holder.map`（実体はprovider依存 — Leafletの`L.Map`、Google Mapsの
`google.maps.Map`等）に対して自由に処理を行う。`ExtensionRegistry<TMap>`は
provider非依存にするためmap型をジェネリックにしてある。

```ts
// アプリ固有のJSバンドル側で、runtimeコアとは独立に登録する
extensions.register('deckgl-heatmap', (map, payload, emit) => {
  // ここで deck.gl などお好きなライブラリを map に対して自由に使ってよい
  return () => { /* cleanup */ };
});
```

runtimeコア自体は個々のライブラリを一切知らない。プロトタイプでは
`packages/runtime/src/extensions/example.ts` に `pulseCircle` という
最小の例（deck.glの代わりに単純な脈動する円）を用意し、動作確認済み。

## InfoBubble（native定義・JS描画のポップアップ）

エスケープハッチの一種だが、`{id, type, payload}` が任意のpayloadを受け付ける
拡張機構とは違い、あえて中身の形を固定した狭いバリエーション:
`showInfoBubble`/`hideInfoBubble`（native→JS）は
`{ markerId, title, subtitle?, badges?, actionLabel? }` という決まった形の
コンテンツだけを運び、JS側の`InfoBubbleController`（`packages/bridge`）が
`compositionMarkers`で最後に渡された`MarkerState`をmarkerId経由で引き当てて
`@mapconductor/js-sdk-react`の`<InfoBubble>`（非WebViewの他サンプルと全く同じ
見た目）に渡す。中身のレイアウトを決める小さなコンポーネント
（`examples/basic/android/webpage/src/StoreInfoView.tsx`参照）はJSバンドル側に
必要だが、「何を表示するか」「いつ表示/非表示にするか」はすべてnative
（Compose/SwiftUI）側が決める。`actionLabel`のボタンをタップすると
`infoBubbleAction`イベントで`markerId`だけがnativeに返り、実際に何をするか
（例: Google Mapsでの経路案内Intent起動）はnative側のロジックのまま。

native側は`android-for-webview-leaflet`の`MapConductorWebViewState.infoBubble`
（`WebViewInfoBubble`）から使う。`examples/basic/android`の
`StoreMapPage.kt`/`StoreMapPageViewModel.kt`が、react-sdk/android-sdkの
`pages/map/basic`サンプル（店舗一覧+情報ウィンドウ）と同じ体験をこの仕組みで
再現した完全な実装例。

## セキュリティ

WebViewブリッジは実装を誤るとRCE等の重大な脆弱性になりやすいので、
本番実装（`android-for-webview-leaflet` / `ios-for-webview-leaflet`）では
以下を必須とする。

1. **JSバンドルはローカルアセットとして同梱し、リモートURLから読み込まない。**
   Android は `WebViewAssetLoader` で仮想オリジン配信、iOSは
   `WKURLSchemeHandler` によるカスタムスキーム配信。origin を固定できるので
   MITM / 差し替えリスクを排除できる。

   これは単なるセキュリティ上の選択ではなく、実際に動作要件でもあった。
   iOS実装の初期版では `WKWebView.loadFileURL` で `file://` から直接読み込んで
   いたが、地図が真っ白のまま何も表示されず、コンソールにもエラーが出ない
   という状態になった。原因はVite出力の `<script type="module">` タグ —
   ES moduleはHTML仕様上 `crossorigin` 属性の有無に関わらず常にCORSモードで
   fetchされる仕様で、`file://` にはCORSを満たすoriginが存在しないため
   サイレントに読み込み失敗する（`log show` でしか見えない
   `didFailResourceLoad` としてのみ現れる）。カスタムスキームハンドラに
   切り替えてページに実オリジンを与えることで解決した（Androidの
   `WebViewAssetLoader` 仮想originと同じ発想）。詳細は
   `ios-for-webview-leaflet` のREADMEを参照。
2. **Android で `addJavascriptInterface` は使わない。** Reflection経由のRCEの
   歴史がある。`WebViewCompat.addWebMessageListener` によるpostMessageベースの
   通信のみで双方向は完結する（本プロトタイプの `NativeTransport.ts` の
   Android向け実装もこの前提）。
3. **コマンドは必ずJSONシリアライズしてから `evaluateJavascript` に渡す。**
   `"javascript:addMarker('" + id + "')"` のような文字列結合は絶対にしない
   （JSインジェクション）。`window.__mcDispatch(json)` という単一のエントリ
   ポイントにJSON文字列だけを渡す設計はこれが理由。
4. **ナビゲーションを自バンドルのoriginに限定する。**
   `WKNavigationDelegate` / `shouldOverrideUrlLoading` で、Leafletの
   popup内リンク等からWebViewが外部ドメインへ遷移しないようにする。
5. **JS側もコマンドのshapeを検証してから実行する。** `eval` 的な自由実行はせず、
   `CommandRouter.ts` のように固定されたコマンド語彙だけを解釈する。
   `handlers[command.name]` のような素の添字アクセスはNG —
   `"constructor"`/`"toString"` 等でObject.prototypeのメンバーに到達しうるので、
   `Object.prototype.hasOwnProperty.call(handlers, command.name)` で
   ガードしてから呼ぶ（`CommandRouter.ts`参照）。
6. **開発専用の抜け道は本番ビルドから物理的に消す。**
   `packages/bridge`自体はURLクエリパラメータから「dev-harness用トランスポートに
   切り替える」ような自己判定をしない — `?transport=devHarness`だけで
   本番バンドルの通信経路が変わってしまうのは、それ自体が任意originからの
   コマンド注入経路になる。`packages/runtime`/`webpage`側の`App.tsx`で
   `import.meta.env.DEV`（本番ビルドでは静的に`false`になりViteがdead-code-eliminate
   する）にガードした上で明示的に`createDevHarnessTransport`を選ぶ形にしている。
   `createDevHarnessTransport`自体も`event.origin`を`localhost`/`127.0.0.1`に
   限定するランタイムチェックを持つ（`event.source !== window.parent`だけでは
   「本物の親」であることしか確認できず、その親がdev-harnessかどうかは
   分からないため）。
7. **`index.html`にCSPを設定する。** `script-src 'self'`（リモート/インライン
   スクリプトの実行を禁止）、`object-src 'none'`、`base-uri 'none'`、
   `form-action 'none'` は必須。`img-src`/`connect-src`は基本方針
   （タイル提供元がprovider次第で変わるため）広め（`https:`）に許可してよい。

## ネイティブ側（実装済み）

`android-for-webview-leaflet` / `ios-for-webview-leaflet` は
`android-sdk` / `ios-sdk` の他のprovider module（`android-for-mapbox` 等）と
並ぶ独立リポジトリとして実装済み。`MapViewControllerInterface`を実装し、
`MapConductorWebViewState`/`MapConductorWebView`という汎用名のAPIを公開する
（詳細は各リポジトリのREADME参照）。`NativeTransport.ts` が期待するグローバルの
用意はどちらも同じ形:

- Android: `WebViewCompat.addWebMessageListener(webView, "mapconductor", origins, listener)`
  を張ると `window.mapconductor.postMessage(json)` が自動的に注入される。
  native→JSは `webView.evaluateJavascript("window.__mcDispatch(${JSONObject.quote(json)})", null)`。
- iOS: `WKUserContentController.add(handler, name: "mapconductor")` で
  `window.webkit.messageHandlers.mapconductor.postMessage(json)` が使える。
  native→JSは `webView.evaluateJavaScript("window.__mcDispatch(\(json.jsStringLiteral))")`
  （文字列リテラル化は必ず `JSONSerialization`/`String(data:encoding:)` 経由で行い、素の文字列結合はしない）。

両モジュールとも `src`（Android: asset相対パス、iOS: 解決済みURL）を
`MapConductorWebViewState`のプロパティとして公開しており、デフォルトは
`packages/runtime`のビルド済みLeafletリファレンス実装だが、アプリが
`@mapconductor/webview-bridge`で自作したページに差し替えられる。

## 実機で見つかったバグ: `height: 100%`/`100vh` が実AndroidのWebViewで0pxになる

standaloneビルド確認だけでは検出できなかった、実機でしか見えないバグ。
`packages/runtime/index.html`の`html, body, #root { height: 100%; ... }`が、
実際のAndroid端末（2機種、異なるAndroidバージョンで再現— 特定端末の
不具合ではない）上では地図が完全に真っ白のまま表示されなかった。

`WebChromeClient`/`WebView.setWebContentsDebuggingEnabled`が
実装側に存在しなかったため、まずこれをコンソール出力・診断用JS実行の
ために追加（`android-for-webview-leaflet`の`0.6.0`で正式に追加済み）。
`evaluateJavascript`で診断した結果:

- `window.innerHeight`/`document.documentElement.clientHeight`/
  `window.visualViewport.height`はすべて実際のビューポート高さを正しく報告
- しかし`getComputedStyle(document.documentElement).height`と
  `getComputedStyle(document.body).height`はどちらも`"0px"`
  — `style.height = '100vh'`を明示的に設定した後でも同じ（`%`だけでなく
  `vh`単位も失敗。`vh`は祖先要素の高さに依存しないので、通常の
  「パーセント高さは祖先が確定高さを持たないと解決できない」というCSSの
  仕様とは別の問題）
- 固定px（`600px`）を設定すると正しく計算される
- `position: fixed; top/right/bottom/left: 0;`も正しくビューポートに
  対して解決される（`window.innerHeight`と一致）

つまりこのWebViewでは、ドキュメントルートに対する`%`/ビューポート単位の
高さ解決だけが特異的に壊れており、固定長や`position: fixed`のinset計算は
正しく動く。修正は`#root`を`height: 100%`ではなく
`position: fixed; inset: 0;`にすること（`packages/runtime/index.html`
参照）。この内側（`<LeafletMapView>`自身の`height: 100%`ラッパーや
`.leaflet-container`）は通常のパーセント高さのままで問題なく動作する —
バグはあくまで「ビューポート/初期包含ブロックに対する解決」の話であり、
チェーンのどこか一箇所が確定サイズを持てば、そこから下は通常通り
カスケードする。

自前ページ（`src`）を使う場合も、ルートコンテナに`height: 100%`/`100vh`を
使っていると同じ問題を踏む可能性が高い — 同様に`position: fixed; inset: 0;`
に置き換えることを推奨する。

## 現状の制限

- マーカーアイコンは `colorDefault` のみ対応（画像アイコン未対応）
- `compositionMarkers` は単純なJSON配列。マーカー数が数千規模になったら
  `NativeMarkerBatch.ts` と同じSoAバッチ形式への切り替えを検討
- `cameraMove` イベントは未スロットリング
- `mapClick`/`mapLongClick`イベントの native への転送は未対応
  （上述のリスナー単一枠の制約により、コンポーネント自身が使う
  `setMapClickListener`等を`packages/bridge`側から横取りできないため）。
  `state.notifyMapClick(point)`のような薄いメソッドをアプリ側の
  `onMapClick`/`onMapLongClick` propから呼ぶ形で対応する案はあるが未実装
- `mapInitialized`イベントの転送も未対応（`setController()`実行時に
  送る`ready`ハンドシェイクが実質的に同じ役割を果たすため、優先度低）
- 完全headless（Reactコンポーネントを一切マウントせず`provider.initialize()`を
  直接呼んで`state.setController(controller)`を手動実行する）使い方の場合、
  `updateCameraPosition()`を呼ぶ主体がいなくなるため`cameraMove`イベントが
  転送されない。この使い方をする場合は`wireEvents`にカメラリスナー登録を
  追加する対応が別途必要
- `@mapconductor/js-sdk-core` / `@mapconductor/react-for-leaflet` への依存は
  `file:../../../react-sdk/...` のローカル参照。実運用では両パッケージを
  private registry に publish して通常のバージョン依存にする必要がある
- circle/polygon/polyline/rasterLayer/groundImage 用のコマンドは未実装
  （`LeafletMapViewController` 側にはメソッドが揃っているので、
  `CommandRouter.ts` に同じパターンでハンドラを足すだけで対応可能）
- InfoBubbleエスケープハッチ（`showInfoBubble`/`hideInfoBubble`/
  `infoBubbleAction`）はnative側が`android-for-webview-leaflet`のみ実装済み
  （`WebViewInfoBubble`）。`ios-for-webview-leaflet`には対応する
  Swiftクラスがまだない — 追加する場合は同じプロトコルをそのまま使い、
  `WebViewMapExtensions.swift`と同じ形で実装すればよい
