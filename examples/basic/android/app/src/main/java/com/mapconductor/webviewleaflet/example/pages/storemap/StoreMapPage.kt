package com.mapconductor.webviewleaflet.example.pages.storemap

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.mapconductor.webviewleaflet.MapConductorWebView
import com.mapconductor.webviewleaflet.rememberMapConductorWebViewState

/**
 * Same sample as react-sdk's/android-sdk's `pages/map/basic` (a store locator: markers +
 * click-to-open info bubble + "Get Directions"), built against the WebView bridge instead of a
 * native map SDK. Markers are supplied entirely from here (StoreMapPageViewModel.addMarkers),
 * and so is the info bubble shown on marker click — the JS side (webpage/src/App.tsx) only
 * renders whatever content mapViewState.infoBubble tells it to, it never decides what a store is.
 */
@Composable
fun StoreMapPage() {
    val viewModel = remember { StoreMapPageViewModel() }
    val context = LocalContext.current
    val mapViewState =
        rememberMapConductorWebViewState(
            cameraPosition = viewModel.initCameraPosition,
            src = "leaflet/index.html",
        )

    MapConductorWebView(
        state = mapViewState,
        modifier = Modifier.fillMaxSize(),
        onMapClick = { viewModel.onMapClick(mapViewState) },
        onMapInitialized = {
            mapViewState.infoBubble?.actionListener = { markerId ->
                context.startActivity(viewModel.onDirectionButtonClick(markerId))
            }
            viewModel.addMarkers(mapViewState)
        },
    )
}
