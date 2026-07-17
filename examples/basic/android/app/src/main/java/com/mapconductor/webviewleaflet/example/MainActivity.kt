package com.mapconductor.webviewleaflet.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import android.widget.Toast
import com.mapconductor.webviewleaflet.MapConductorWebView
import com.mapconductor.webviewleaflet.example.pages.storemap.StoreMapPage
import com.mapconductor.webviewleaflet.marker.WebViewColorIcon
import com.mapconductor.webviewleaflet.rememberMapConductorWebViewState

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MaterialTheme {
                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                ) { paddingValues ->
                    ExampleApp(
                        modifier = Modifier.padding(paddingValues),
                    )
                }
            }
        }
    }
}

/**
 * Just a screen switch — not real navigation — so both the raw bridge-command
 * demo (BasicBridgeDemo, below) and the more realistic StoreMapPage sample
 * (markers + InfoBubble, both driven from Compose) stay available side by side.
 */
@Composable
fun ExampleApp(modifier: Modifier = Modifier) {
    var showStoreMap by remember { mutableStateOf(false) }

    if (showStoreMap) {
        Column(
            modifier = modifier.fillMaxSize()
        ) {
            Button(modifier = Modifier.fillMaxWidth(), onClick = { showStoreMap = false }) {
                Text("← Back to bridge-command demo")
            }
            Box(Modifier.weight(1f).fillMaxWidth()) {
                StoreMapPage()
            }
        }
    } else {
        Column(
            modifier = modifier.fillMaxSize(),
        ) {
            Button(modifier = Modifier.fillMaxWidth(), onClick = { showStoreMap = true }) {
                Text("Store map + InfoBubble sample →")
            }
            Box(Modifier.weight(1f).fillMaxWidth()) {
                BasicBridgeDemo()
            }
        }
    }
}

@Composable
fun BasicBridgeDemo(viewModel: MapExampleViewModel = viewModel()) {
    val context = LocalContext.current
    val mapViewState = rememberMapConductorWebViewState(
        cameraPosition = MapExampleViewModel.INITIAL_CAMERA_POSITION,
        // This app's own page (webpage/ built independently, bundled into
        // app/src/main/assets/leaflet) instead of the module's default
        // bundled Leaflet runtime — see webpage/README.md.
        src = "leaflet/index.html",
    )

    Scaffold { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Box(Modifier.weight(1f).fillMaxWidth()) {
                MapConductorWebView(state = mapViewState, modifier = Modifier.fillMaxSize())
            }
            Column(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Button(modifier = Modifier.fillMaxWidth(), onClick = { viewModel.moveToTokyo(mapViewState) }) {
                    Text("Move to Tokyo")
                }
                Button(modifier = Modifier.fillMaxWidth(), onClick = { viewModel.animateToSanFrancisco(mapViewState) }) {
                    Text("Animate to San Francisco")
                }
                Button(
                    modifier = Modifier.fillMaxWidth(),
                    onClick = {
                        viewModel.addMarkers(mapViewState) { marker ->
                            val label = (marker.icon as? WebViewColorIcon)?.label ?: marker.id
                            Toast.makeText(context, "Marker $label clicked", Toast.LENGTH_SHORT).show()
                        }
                    },
                ) {
                    Text("Add markers")
                }
                Button(modifier = Modifier.fillMaxWidth(), onClick = { viewModel.clearOverlays(mapViewState) }) {
                    Text("Clear overlays")
                }
                Button(modifier = Modifier.fillMaxWidth(), onClick = { viewModel.startPulseExtension(mapViewState) }) {
                    Text("Start pulse extension")
                }
            }
        }
    }
}
