package com.mapconductor.webviewleaflet.example

import androidx.compose.ui.graphics.Color
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mapconductor.core.features.GeoPoint
import com.mapconductor.core.map.MapCameraPosition
import com.mapconductor.core.marker.MarkerState
import com.mapconductor.webviewleaflet.MapConductorWebViewState
import com.mapconductor.webviewleaflet.marker.WebViewColorIcon
import kotlinx.coroutines.launch
import org.json.JSONObject

// mapViewState is tied to the Composition (created via rememberMapConductorWebViewState), so
// it's passed into each action rather than stashed in the ViewModel — same reason
// android-for-mapbox's sample never stores its MapboxViewState in a ViewModel either.
class MapExampleViewModel : ViewModel() {
    fun moveToTokyo(mapViewState: MapConductorWebViewState) {
        mapViewState.moveCameraTo(MapCameraPosition(position = TOKYO, zoom = 12.0))
    }

    fun animateToSanFrancisco(mapViewState: MapConductorWebViewState) {
        mapViewState.moveCameraTo(
            MapCameraPosition(position = SAN_FRANCISCO, zoom = 13.0),
            durationMillis = 1200,
        )
    }

    fun addMarkers(
        mapViewState: MapConductorWebViewState,
        onMarkerClick: (MarkerState) -> Unit = {},
    ) {
        val markerController = mapViewState.markerController ?: return
        viewModelScope.launch {
            markerController.compositionMarkers(
                listOf(
                    MarkerState(
                        position = TOKYO,
                        icon = WebViewColorIcon(fillColor = Color.Red, label = "A"),
                        onClick = onMarkerClick,
                    ),
                    MarkerState(
                        position = GeoPoint(35.6895, 139.6917),
                        icon = WebViewColorIcon(fillColor = Color.Blue, label = "B"),
                        onClick = onMarkerClick,
                    ),
                ),
            )
        }
    }

    fun clearOverlays(mapViewState: MapConductorWebViewState) {
        viewModelScope.launch { mapViewState.clearOverlays() }
    }

    fun startPulseExtension(mapViewState: MapConductorWebViewState) {
        mapViewState.extensions?.upsert(
            id = "demo-pulse",
            type = "pulseCircle",
            payload = JSONObject().apply {
                put("latitude", TOKYO.latitude)
                put("longitude", TOKYO.longitude)
                put("color", "#8e24aa")
                put("maxRadiusMeters", 800)
            },
        )
    }

    companion object {
        private val TOKYO = GeoPoint(latitude = 35.681236, longitude = 139.767125)
        private val SAN_FRANCISCO = GeoPoint(latitude = 37.7749, longitude = -122.4194)
        val INITIAL_CAMERA_POSITION = MapCameraPosition(position = TOKYO, zoom = 12.0)
    }
}
