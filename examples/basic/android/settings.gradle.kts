pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        // android-for-webview-leaflet (and the android-sdk-core/android-sdk-compose it depends
        // on) aren't published to a public registry yet — see android-for-webview-leaflet's
        // README. Until then, publish them locally and resolve from here:
        //   cd android-sdk && ./gradlew :android-sdk-core:publishToMavenLocal \
        //     :android-sdk-compose:publishToMavenLocal :android-for-webview-leaflet:publishToMavenLocal
        // (with android-for-webview-leaflet temporarily added to projects.properties so it
        // resolves :android-sdk-compose as a sibling project instead of over the network).
        mavenLocal()
        google()
        mavenCentral()
    }
}

rootProject.name = "webview-leaflet-example"
include(":app")
