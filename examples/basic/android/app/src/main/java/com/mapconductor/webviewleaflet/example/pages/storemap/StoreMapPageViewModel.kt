package com.mapconductor.webviewleaflet.example.pages.storemap

import android.content.Intent
import android.net.Uri
import androidx.compose.ui.graphics.Color
import androidx.core.net.toUri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mapconductor.core.features.GeoPoint
import com.mapconductor.core.map.MapCameraPosition
import com.mapconductor.core.marker.MarkerState
import com.mapconductor.webviewleaflet.MapConductorWebViewState
import com.mapconductor.webviewleaflet.marker.WebViewColorIcon
import kotlinx.coroutines.launch

// mapViewState is tied to the Composition (created via rememberMapConductorWebViewState), so
// it's passed into each action rather than stashed in the ViewModel — same reason
// android-for-mapbox's sample never stores its MapboxViewState in a ViewModel either.
class StoreMapPageViewModel : ViewModel() {
    val initCameraPosition =
        MapCameraPosition(
            position = GeoPoint(latitude = 21.382314, longitude = -157.933097),
            zoom = 10.0,
        )

    // Marker ids are stable across .copy() (only icon/onClick change below), so this map built
    // from the original list keeps working once the actual markers are sent to the bridge.
    private val storeInfoByMarkerId: Map<String, StoreInfo> =
        StarbucksHiList.associate { it.id to (it.extra as StoreInfo) }

    /**
     * Called once the WebView reports its `ready` handshake (see
     * MapConductorWebView's onMapInitialized) — sending compositionMarkers any earlier
     * would race the bridge's readiness.
     */
    fun addMarkers(mapViewState: MapConductorWebViewState) {
        val markers =
            StarbucksHiList.map { marker ->
                val info = marker.extra as StoreInfo
                marker.copy(
                    icon =
                        WebViewColorIcon(
                            fillColor = StoreColors[info.store] ?: Color.Gray,
                            label = info.name.take(1),
                        ),
                    onClick = { clicked -> onMarkerClick(clicked, mapViewState) },
                )
            }
        viewModelScope.launch {
            mapViewState.markerController?.compositionMarkers(markers)
        }
    }

    /**
     * The InfoBubble's *content* (what to show) and *when* (this callback) are defined here,
     * in Compose — the JS side only knows how to lay that content out (see webpage/src/App.tsx
     * and StoreInfoView.tsx), same split as the escape-hatch extension mechanism.
     */
    fun onMarkerClick(
        marker: MarkerState,
        mapViewState: MapConductorWebViewState,
    ) {
        val info = marker.extra as? StoreInfo ?: return
        mapViewState.infoBubble?.show(
            markerId = marker.id,
            title = info.name,
            subtitle = info.address,
            badges =
                listOfNotNull(
                    "In store eating".takeIf { info.instore },
                    "Drive Through".takeIf { info.driveThrough },
                ),
            actionLabel = "Get Directions",
        )
    }

    fun onMapClick(mapViewState: MapConductorWebViewState) {
        mapViewState.infoBubble?.hide()
    }

    /** Called via mapViewState.infoBubble's actionListener when the JS-rendered
     * "Get Directions" button is tapped — the bubble only round-trips a markerId,
     * so the address lookup (and everything about what tapping the button does)
     * happens here, not in the JS bundle. */
    fun onDirectionButtonClick(markerId: String): Intent {
        val query = storeInfoByMarkerId[markerId]?.address?.let { Uri.encode(it) } ?: ""
        val gmmIntentUri = "google.navigation:q=$query".toUri()
        return Intent(Intent.ACTION_VIEW, gmmIntentUri).apply {
            setPackage("com.google.android.apps.maps")
        }
    }
}
