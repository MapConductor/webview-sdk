import MapConductorCore
import MapConductorForWebViewLeaflet
import SwiftUI

// This module doesn't yet plug into MapViewContentBuilder's `Marker { }` DSL
// (see ios-for-webview-leaflet's README), so markers/extensions are driven
// through `mapViewState.markerController`/`.mapExtensions` (via
// MapExampleViewModel) instead of a declarative child view.

struct ContentView: View {
    @StateObject private var mapViewState = MapConductorWebViewState(
        cameraPosition: MapExampleViewModel.initialCameraPosition
    )
    @StateObject private var viewModel = MapExampleViewModel()

    var body: some View {
        VStack(spacing: 0) {
            MapConductorWebView(state: mapViewState)
                .frame(maxWidth: .infinity, maxHeight: .infinity)

            VStack(spacing: 8) {
                Button("Move to Tokyo") {
                    viewModel.moveToTokyo(mapViewState)
                }
                Button("Animate to San Francisco") {
                    viewModel.animateToSanFrancisco(mapViewState)
                }
                Button("Add markers") {
                    viewModel.addMarkers(mapViewState)
                }
                Button("Clear overlays") {
                    viewModel.clearOverlays(mapViewState)
                }
                Button("Start pulse extension") {
                    viewModel.startPulseExtension(mapViewState)
                }
            }
            .buttonStyle(.borderedProminent)
            .padding()
        }
    }
}
