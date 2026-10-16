# ShobhaDamodar Petroleum — Capacitor Android Native App & Release Guide

This document describes the native Capacitor Android setup, application identity, asset pipeline, environment configuration, build steps, and production release signing procedures for **ShobhaDamodar Petroleum**.

---

## 1. Application Identity & Branding

| Attribute | Value | Description |
| :--- | :--- | :--- |
| **Full Application Name** | `ShobhaDamodarPetroleum` | Configured in `capacitor.config.json` (`appName`) and Android `strings.xml` (`app_full_name`). |
| **Short Name / Launcher Label** | `SDP` | Configured in `strings.xml` (`app_name`, `title_activity_main`). Displayed on device home screen and launcher. |
| **Android Application ID** | `com.shobhadamodar.app` | Established stable application ID across Gradle, Java package, and Capacitor configuration. |
| **Min Android SDK** | `24` (Android 7.0 Nougat) | Supported across modern Android devices. |
| **Target & Compile SDK** | `36` (Android 15 / 16 Preview) | Fully compatible with modern Android requirements. |

---

## 2. Branding Assets & Asset Generation

- **Source Asset Folder**: `D:\Downloads\favicon (5)` (mirrored into `frontend/assets/branding/`).
- **Primary Source Artwork**: `web-app-manifest-512x512.png` and `favicon.svg`.
- **Generation Script**: `frontend/scripts/generate_android_assets.py` (built with Pillow).

### Generated Native Resources

1. **Android Adaptive Launcher Icons** (`mipmap-anydpi-v26/`):
   - Background: Solid white (`@color/ic_launcher_background`, `#FFFFFF`).
   - Foreground: Centered logo respecting the 66% diameter adaptive safe zone (`ic_launcher_foreground.png`).
   - Monochrome: Android 13+ themed icon support (`ic_launcher.xml` and `ic_launcher_round.xml`).
2. **Legacy Launcher Icons** (`mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/`):
   - `ic_launcher.png` (Rounded square)
   - `ic_launcher_round.png` (Circular)
3. **Branded Splash Screens** (`drawable/`, `drawable-port-*/`, `drawable-land-*/`):
   - Centered crisp emblem with proportional 40% scale on clean brand white background.
   - Clean native Android 12+ `Theme.SplashScreen` transition without artificial delay.
4. **Web & PWA Icons** (`frontend/public/`):
   - `apple-touch-icon.png`, `favicon-96x96.png`, `favicon.ico`.

To regenerate native assets anytime:
```bash
cd frontend
npm run generate:assets
```

---

## 3. Required Build Tools & Environment

- **Node.js**: `v24.x` (or `>= 20.x`)
- **npm**: `11.x` (or `>= 10.x`)
- **Java / JDK**: Java 21+ required by Capacitor 8 / Android Gradle Plugin 8.13.
  - Tracked project configuration `frontend/android/gradle.properties` remains strictly portable across operating systems.
  - If the workstation's default system `JAVA_HOME` points to an older JDK, configure `org.gradle.java.home` in your local, untracked user properties file (`~/.gradle/gradle.properties`) or set `JAVA_HOME` in your environment (e.g. pointing to Android Studio's bundled JetBrains Runtime `C:/Program Files/Android/Android Studio/jbr`).
- **Android SDK**: `C:\Users\udayg\AppData\Local\Android\Sdk` (configured in local untracked `frontend/android/local.properties`).
- **Gradle Wrapper**: `8.14.3` (invoked via `gradlew.bat`).

---

## 4. API Connectivity & Environment Configuration

### Production HTTPS API (Default for Release)
- Defined in `frontend/.env.production`:
  ```env
  VITE_API_URL=https://shobhadamodar-api.onrender.com/api
  ```
- Bundled when running `npm run build` or `npm run build:android`.
- Points to the live production database. Kept strictly separate from test configurations.

### Dedicated Test API (Connected to Isolated Test Database)
- Defined in `frontend/.env.test`:
  ```env
  # Default for Android Emulator loopback to host PC:
  VITE_API_URL=http://10.0.2.2:5000/api
  # For physical Android devices on local Wi-Fi / LAN:
  # VITE_API_URL=http://10.169.155.226:5000/api
  ```
- Bundled when running `npm run build:test` or `npm run build:android:test`.
- Targets the backend instance operating in test mode (`USE_TEST_DB=true`), connected to the isolated September 2026 test database (`shobhadamodar_test_sep2026`).

### Development & Physical Device Networking
- **Preferred Approach**: Secure HTTPS connections (via a deployed cloud staging service or HTTPS tunnel such as ngrok/Cloudflare Tunnel) are strongly recommended for device testing.
- **Local HTTP Development**:
  - Android Emulator: Connects via `http://10.0.2.2:5000/api` (aliasing host `localhost`).
  - Physical Android Device (USB): Use ADB reverse forwarding (`adb reverse tcp:5000 tcp:5000`) and connect via `http://localhost:5000/api`.
  - Physical Android Device (LAN): Connect via workstation Wi-Fi IP `http://<HOST_IP>:5000/api`. Device and computer must be on the same local network subnet.

> [!NOTE]
> MongoDB connection strings, JWT secrets, and server environment variables are strictly kept on the server and are never bundled into the APK or client bundle.

---

## 5. Offline vs Online Connectivity Behavior

The application architecture is **online-first with offline SQLite reference data caching**:

### Features Requiring Live Backend Connection:
- Manager & Employee authentication (`/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`).
- Shift creation, mid-shift collection submission, and shift finalization (`/api/shifts/*`).
- Stock register updates, meter readings corrections, and receipts entry (`/api/manager/*`).
- Udhari account transactions and Customer ledger reconciliations.
- Tank calibration chart management and daily density logs.
- Excel register export download.

### Offline Resilience:
- Reference data (active rates, MPDs, nozzles, customers) is cached locally in SQLite via `/api/sync/bootstrap`.
- Network failure or timeout triggers friendly in-app toasts/alerts (`"Unable to connect to the server"`).
- Destructive actions or incomplete shift submissions are never faked as saved when offline.

---

## 6. Permissions & Security Review

- **Permissions Requested**: Only `android.permission.INTERNET` is declared in `AndroidManifest.xml`.
- **Excluded Permissions**: No contacts, SMS, phone, camera, microphone, or external storage broad access.
- **Cleartext Traffic Policy**:
  - **Production / Release Builds**: Cleartext HTTP is strictly disabled (`usesCleartextTraffic=false`). All production API calls require HTTPS.
  - **Debug Builds**: Cleartext traffic is enabled strictly for debug development via the isolated build-variant manifest `frontend/android/app/src/debug/AndroidManifest.xml`. The Android Gradle Plugin merges this manifest *only* during debug builds (`assembleDebug`). It is completely excluded from release builds (`assembleRelease` / `bundleRelease`), ensuring zero cleartext leakage into production.
- **WebView Security Boundary**: Capacitor serves from local packaged assets via secure scheme `https://localhost`.
- **System Back Button**: Managed by `@capacitor/app` and `NativeBackButtonHandler`:
  - Closes open modal dialogs / menus first.
  - Navigates back within sub-routes.
  - Prevents accidental exit during unfinalized shift workflows.
  - Exits / minimizes the app cleanly from root entry points (`/login`, `/dashboard`, `/manager`).

---

## 7. How to Build & Install the Debug APK

### Building Dedicated Test APK (Connected to Isolated Test DB)
```powershell
cd frontend
npm run build:android:test
```
This builds the frontend in test mode (`--mode test`), syncs Capacitor, and assembles the debug APK.

### Building Production Release APK / AAB
```powershell
cd frontend
npm run build
npx cap sync android
```
```powershell
cd frontend
npm run build
npx cap sync android
```

### Step 2 — Build Debug APK with Gradle
```powershell
cd android
.\gradlew.bat assembleDebug
```
Or run the all-in-one command from `frontend/`:
```powershell
npm run build:android
```

### Step 3 — Locate the Output APK
The generated debug APK is located at:
```
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

### Step 4 — Install on Device or Emulator via ADB
Ensure your Android device has Developer Options and USB Debugging enabled:
```powershell
adb devices
adb install -r frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 8. Release Signing & Production Distribution (AAB / APK)

To create a release build for Google Play Console or private enterprise distribution:

### 1. Generate a Safe Production Keystore (One-Time)
Run keytool outside version control (e.g. in your secure credentials folder):
```powershell
keytool -genkeypair -v -keystore sdp-release-key.jks -alias sdp-key -keyalg RSA -keysize 2048 -validity 10000
```
> [!WARNING]
> Keep `sdp-release-key.jks` and its passwords safe. Never commit keystores or passwords to git!

### 2. Configure Release Signing in `android/app/build.gradle`
Reference environment variables or a local untracked `keystore.properties`:
```groovy
signingConfigs {
    release {
        storeFile file(System.getenv("SDP_KEYSTORE_PATH") ?: "sdp-release-key.jks")
        storePassword System.getenv("SDP_KEYSTORE_PASSWORD")
        keyAlias System.getenv("SDP_KEY_ALIAS") ?: "sdp-key"
        keyPassword System.getenv("SDP_KEY_PASSWORD")
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### 3. Generate Android App Bundle (.aab) for Google Play
```powershell
cd frontend/android
.\gradlew.bat bundleRelease
```
Output location:
```
frontend/android/app/build/outputs/bundle/release/app-release.aab
```

---

## 9. Remaining Checklist Before Official Release

1. **Production Backend Validation**: Ensure the production Render or custom domain backend (`https://shobhadamodar-api.onrender.com/api`) is running with proper MongoDB Atlas backups and production CORS.
2. **Release Keystore Setup**: Create and store the production signing key securely in CI/CD secrets or local release workstation.
3. **Google Play Console Listing**: Prepare privacy policy URL, Play Store screenshots (phone + tablet), and target audience declaration (internal enterprise / retail petrol pump application).
