package com.mapconductor.webviewleaflet.example.pages.storemap

import androidx.compose.ui.graphics.Color
import com.mapconductor.core.features.GeoPoint
import com.mapconductor.core.marker.MarkerState
import java.io.Serializable

/**
 * Same dataset as android-sdk's example-app pages/map/basic/DemoData.kt (publicly available
 * business addresses, geocoded via the U.S. Census Bureau Geocoding API — no PII), reused here
 * to demonstrate the equivalent sample against the WebView bridge. `store` maps to a marker
 * color below instead of a drawable resource, since android-for-webview-leaflet's bridge doesn't
 * decode image icons yet (see its README) — WebViewColorIcon is the one marker icon type that
 * round-trips today.
 */
data class StoreInfo(
    val name: String,
    val address: String,
    val instore: Boolean,
    val driveThrough: Boolean,
    val store: String,
) : Serializable

val StoreColors: Map<String, Color> =
    mapOf(
        "coffee_bean" to Color(0xFF6D4C41),
        "honolulu_coffee" to Color(0xFF8D6E63),
        "coffee_extra" to Color(0xFFA1887F),
        "starbucks" to Color(0xFF00704A),
    )

val StarbucksHiList =
    listOf(
        MarkerState(
            position = GeoPoint(latitude = 21.647441446388, longitude = -158.062544988096),
            extra = StoreInfo("Pupukea (North Shore)", "59-720 Kamehameha Highway, Haleiwa, HI 96712", true, false, "coffee_bean"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.33310051533, longitude = -157.922371535818),
            extra = StoreInfo("Honolulu Airport (HNL) – Main", "300 Rogers Blvd, Honolulu, HI 96820", true, false, "coffee_bean"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.378981027427, longitude = -157.930536387573),
            extra = StoreInfo("Aiea Shopping Center", "99-115 Aiea Heights Drive #125, Aiea, HI 96701", true, false, "starbucks"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.38441101519, longitude = -157.944839558127),
            extra = StoreInfo("Pearlridge Center", "98-125 Kaonohi Street, Aiea, HI 96701", true, false, "starbucks"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.363785189939, longitude = -157.928412704343),
            extra = StoreInfo("Stadium Marketplace", "4561 Salt Lake Boulevard, Aiea, HI 96818", true, false, "starbucks"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.386340299119, longitude = -157.941897795274),
            extra = StoreInfo("Pearlridge Mall", "98-1005 Moanalua Road, Aiea, HI 96701", true, false, "coffee_extra"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 19.69971686484, longitude = -155.067322812851),
            extra = StoreInfo("Waiakea Center (Hilo)", "315-325 Makaala Street, Hilo, HI 96720", true, false, "starbucks"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 19.695097953188, longitude = -155.06690203818),
            extra = StoreInfo("Prince Kuhio Plaza (Hilo)", "111 East Puainako Street, Hilo, HI 96720", true, false, "starbucks"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 19.719877684807, longitude = -155.082770375139),
            extra = StoreInfo("Downtown Hilo (Kilauea Ave)", "438 Kilauea Ave, Hilo, HI 96720", true, true, "starbucks"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.33593, longitude = -157.91581),
            extra = StoreInfo("Airport Trade Center", "Airport Trade Center, 550 Paiea St, Honolulu, HI 96819", true, false, "starbucks"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.307358712377, longitude = -157.865194116049),
            extra = StoreInfo("Aloha Tower", "1 Aloha Tower Drive, Honolulu, HI 96813", true, false, "coffee_extra"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.30846253, longitude = -157.8614898),
            extra = StoreInfo("Bishop (Downtown)", "1000 Bishop Street #104, Honolulu, HI 96813", true, false, "coffee_extra"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.307604966533, longitude = -157.860743724617),
            extra = StoreInfo("Pickup – King & Alakea", "220 South King Street, Honolulu, HI 96813", false, false, "honolulu_coffee"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.285300825278, longitude = -157.83841421971),
            extra = StoreInfo("Discovery Bay Center", "1778 Ala Moana Boulevard, Honolulu, HI 96815", true, false, "coffee_extra"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.334058693598, longitude = -158.023228524098),
            extra = StoreInfo("Ewa Beach – Laulani Village", "91-1401 Fort Weaver Road, Ewa Beach, HI 96706", true, true, "coffee_bean"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.280578442859, longitude = -157.828071689214),
            extra = StoreInfo("DFS (Duty Free) Waikiki", "330 Royal Hawaiian Avenue, Honolulu, HI 96815", true, false, "coffee_extra"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.308557010703, longitude = -157.862582769768),
            extra = StoreInfo("Financial Plaza (Downtown)", "130 Merchant Street #111, Honolulu, HI 96813", true, false, "honolulu_coffee"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.282048, longitude = -157.713041),
            extra = StoreInfo("Hawaii Kai Town Center", "6700 Kalanianaole Highway, Honolulu, HI 96825", true, false, "starbucks"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.291792650634, longitude = -157.849735879475),
            extra = StoreInfo("Hokua (Ala Moana)", "1288 Ala Moana Blvd, Honolulu, HI 96814", true, false, "coffee_bean"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.335246981366, longitude = -157.868748238078),
            extra = StoreInfo("Kamehameha Shopping Center", "1620 North School Street, Honolulu, HI 96817", true, false, "starbucks"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.27852422, longitude = -157.7875773),
            extra = StoreInfo("Kahala Mall", "4211 Waialae Avenue, Honolulu, HI 96816", true, false, "starbucks"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.279056707748, longitude = -157.813890137018),
            extra = StoreInfo("Kapahulu Avenue", "625 Kapahulu Avenue, Honolulu, HI 96815", true, false, "coffee_extra"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.276148191143, longitude = -157.704922547261),
            extra = StoreInfo("Koko Marina Center", "7192 Kalanianaole Highway, Honolulu, HI 96825", true, false, "starbucks"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.30985278855, longitude = -157.810260198584),
            extra = StoreInfo("Manoa Valley", "2902 East Manoa Road, Honolulu, HI 96822", true, false, "starbucks"),
        ),
        MarkerState(
            position = GeoPoint(latitude = 21.289750395336, longitude = -157.843910788044),
            extra = StoreInfo("Macy's Ala Moana Center", "1450 Ala Moana Boulevard, Honolulu, HI 96814", true, false, "honolulu_coffee"),
        ),
    )
