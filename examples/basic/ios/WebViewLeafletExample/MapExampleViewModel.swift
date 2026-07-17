import Foundation
import MapConductorCore
import MapConductorForWebViewLeaflet

/// `mapViewState` is owned by the view (`@StateObject` in `ContentView`), so it's passed into
/// each action rather than stored here — same reason the Android example's
/// `MapExampleViewModel` takes `mapViewState` as a parameter too, instead of holding onto it.
@MainActor
final class MapExampleViewModel: ObservableObject {
    static let tokyo = GeoPoint(latitude: 35.681236, longitude: 139.767125)
    static let sanFrancisco = GeoPoint(latitude: 37.7749, longitude: -122.4194)
    static let initialCameraPosition = MapCameraPosition(position: tokyo, zoom: 12)

    func moveToTokyo(_ mapViewState: MapConductorWebViewState) {
        mapViewState.moveCameraTo(
            cameraPosition: MapCameraPosition(position: Self.tokyo, zoom: 12),
            durationMillis: 0
        )
    }

    func animateToSanFrancisco(_ mapViewState: MapConductorWebViewState) {
        mapViewState.moveCameraTo(
            cameraPosition: MapCameraPosition(position: Self.sanFrancisco, zoom: 13),
            durationMillis: 1200
        )
    }

    func addMarkers(_ mapViewState: MapConductorWebViewState) {
        Task {
            await mapViewState.markerController?.add(data: [
                MarkerState(
                    position: Self.tokyo,
                    icon: WebViewColorIcon(fillColor: .red, label: "A")
                ),
                MarkerState(
                    position: GeoPoint(latitude: 35.6895, longitude: 139.6917),
                    icon: WebViewColorIcon(fillColor: .blue, label: "B")
                ),
            ])
        }
    }

    func clearOverlays(_ mapViewState: MapConductorWebViewState) {
        Task { await mapViewState.clearOverlays() }
    }

    func startPulseExtension(_ mapViewState: MapConductorWebViewState) {
        mapViewState.mapExtensions?.upsert(
            id: "demo-pulse",
            type: "pulseCircle",
            payload: [
                "latitude": Self.tokyo.latitude,
                "longitude": Self.tokyo.longitude,
                "color": "#8e24aa",
                "maxRadiusMeters": 800,
            ]
        )
    }
}
