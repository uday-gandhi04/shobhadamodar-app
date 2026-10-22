# ShobhaDamodar Petroleum — Android OTA Updates Guide & Operational Runbook

This runbook documents the architecture, configuration, security model, and operational procedures for Over-The-Air (OTA) web bundle updates for the ShobhaDamodar Petroleum Android application (`com.shobhadamodar.app`).

---

## 1. Architecture & The Git-to-Android Flow

The OTA workflow allows shipping bug fixes and UI updates to compatible, installed Android devices without requiring users to download a new APK or reinstall the application.

```
[ Developer / CI ]
       │
       ▼ (1. Push pure web change to master / workflow_dispatch)
[ GitHub Actions (.github/workflows/ota-release.yml) ]
       │  ├─ 1. Native change compatibility guard (blocks release if Android/plugins changed)
       │  ├─ 2. Runs Backend Tests (node --test)
       │  ├─ 3. Runs Frontend Lint & Regression Tests (routing + OTA tests)
       │  ├─ 4. Builds Production Bundle (Vite with VITE_API_URL verified)
       │  ├─ 5. Verifies absence of localhost or staging URLs in dist
       │  ├─ 6. Bundles Zip: com.shobhadamodar.app_<version>.zip via @capgo/cli
       │  ├─ 7. Computes SHA-256 Checksum (& optional RSA publisher signing)
       │  ├─ 8. Publishes GitHub Release under dedicated tag (ota-v<version>)
       │  └─ 9. Atomically updates & commits ota/latest.json
       ▼
[ GitHub Repository / Raw Asset Host ]
       │  ├─ Manifest: https://raw.githubusercontent.com/uday-gandhi04/shobhadamodar-app/master/ota/latest.json
       │  └─ Bundle: https://github.com/uday-gandhi04/shobhadamodar-app/releases/download/ota-v<version>/com.shobhadamodar.app_<version>.zip
       ▼
[ Android Device (com.shobhadamodar.app) ]
       │  ├─ Checks ota/latest.json unauthenticated over HTTPS
       │  ├─ Compares manifest version with current active bundle version (handles builtin baseline)
       │  ├─ Downloads ZIP in background (without freezing UI or blocking user operations)
       │  ├─ Verifies SHA-256 checksum (& RSA sessionKey if configured)
       │  ├─ Verifies safe application timing (prevents reload during active shifts or uncommitted forms)
       │  ├─ Stages bundle as 'next' for clean activation on next app restart
       │  ├─ On restart: Native runtime boots into new bundle
       │  ├─ main.jsx calls initializeOtaUpdater() -> notifyAppReady()
       │  └─ If JavaScript crashes or hangs, 10s watchdog rolls back to previous working bundle
```

---

## 2. Tag & Versioning Conventions (Dedicated `ota-v*` Namespace)

To completely decouple Over-The-Air releases from native Android APK/AAB releases and general git tags:
- **Dedicated OTA Tag Namespace:** All OTA releases and tags strictly use the prefix `ota-v*` (e.g. `ota-v1.0.0`, `ota-v1.0.1`).
- **Native Android Tags:** Reserved for standard semantic release tags (e.g. `v1.0.0`, `android-1.0.0`).
- **Release Assets:** Named using the Capacitor application ID and semantic version: `com.shobhadamodar.app_<version>.zip`.
- **Release Asset Download URLs:**
  `https://github.com/<owner>/<repo>/releases/download/ota-v<version>/com.shobhadamodar.app_<version>.zip`
- **Native Android Version:** `versionCode` and `versionName` in `build.gradle` are **never touched** for OTA releases.

---

## 3. Native Change Protection & CI Guard

OTA updates replace **only the web assets** (`frontend/dist/` HTML, JavaScript, CSS, and web fonts). An OTA update **cannot** update native Java/Kotlin code, Android permissions, or new Capacitor native plugins.

### Multi-Layered Protection
1. **Trigger Path Filters:**
   - `.github/workflows/ota-release.yml` triggers on pushes modifying web assets: `frontend/src/**`, `frontend/public/**`, `frontend/index.html`, `frontend/vite.config.*`, etc.
   - `frontend/capacitor.config.*` is **excluded** from trigger paths because configuration changes alter native plugin behaviors.
   - `frontend/android/**` and `android/**` are in `paths-ignore`.
2. **Commit Compatibility Guard (Step 2 in CI):**
   - For every push event, GitHub Actions inspects the commit diff against the previous commit.
   - If any modified file falls under `frontend/android/**`, `android/**`, or `frontend/capacitor.config.*`, the workflow fails immediately with a clear error:
     > *"BLOCKED: Native Android code or Capacitor configuration was changed in this commit. An OTA release cannot deliver native changes."*
   - If `frontend/package.json` adds or changes any native plugins (matching `@capacitor/*` or `@capgo/*`), the workflow immediately blocks the release.
3. **Manual Dispatch Confirmation:**
   - For `workflow_dispatch`, operators must acknowledge that the release is verified as an OTA-compatible web build.

---

## 4. OTA Bundle Security: Capgo Encryption V2 (Publisher Authentication)

Capgo Encryption V2 combines **RSA-2048 asymmetric encryption** with **AES-128-CBC symmetric encryption** to guarantee end-to-end publisher authenticity and confidentiality:

| Mechanism | Implementation in ShobhaDamodar Petroleum |
|---|---|
| **Symmetric Encryption** | AES-128-CBC with a randomly generated 16-byte session key and 16-byte IV per bundle release. |
| **Publisher Authenticity (RSA-2048)** | The AES session key and bundle SHA-256 checksum are encrypted with the publisher's RSA-2048 private key. |
| **Session Key Format (V2)** | `IV_BASE64:SESSION_KEY_BASE64` (24 base64 characters for the 16-byte IV + 344 base64 characters for the 256-byte RSA-encrypted key, separated by a colon `:`). |
| **Encrypted Checksum** | 512 hexadecimal characters (256-byte RSA-encrypted SHA-256 hash). The native updater decrypts this back to the 64-character SHA-256 hash using the embedded public key before comparison. |

### Configured Keys & Android Sync
1. **Public Key (Embedded in Mobile App):**
   The RSA public key is configured in `frontend/capacitor.config.json` under `plugins.CapacitorUpdater.publicKey` and copied directly into Android assets via `npx cap sync android`:
   ```json
   "plugins": {
     "CapacitorUpdater": {
       "publicKey": "-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEAtjQWrCfeOK7VySnXya69hIELt+sILesqYQ9wMOuT2+fMRa0GG54u\n...\n-----END RSA PUBLIC KEY-----\n"
     }
   }
   ```
   - Android Asset Location: `frontend/android/app/src/main/assets/capacitor.config.json`.
   - Native Enforcement: `CryptoCipher.java` and `CapgoUpdater.java` enforce that when `publicKey` is present, `requireSessionKeyForEncryptedUpdate` will reject any unencrypted bundle (`Session key required when public key is present`).
2. **Private Key (GitHub Repository Secret):**
   - The RSA private key (`.capgo_key_v2`) is saved as the GitHub Actions secret `CAPGO_PRIVATE_KEY` under **Settings > Secrets and variables > Actions**.
   - **SECURITY RULE:** Neither `.capgo_key_v2` nor any `.capgo_key*` file is ever committed to git. Both root and frontend `.gitignore` contain `.capgo_key*`.
3. **Release Workflow Encryption:**
   - `.github/workflows/ota-release.yml` encrypts the production bundle using `npx @capgo/cli bundle encrypt <zipPath> <checksum> --key <keyFile> --json`.
   - The encrypted ZIP replaces the plain ZIP as the published release asset.
   - The 512-hex encrypted checksum and V2 `ivSessionKey` are published to `ota/latest.json`.
4. **Client-Side Manifest Validation:**
   - In `otaUpdateService.js`, `validateOtaManifest` verifies that the `sessionKey` matches `IV_BASE64:SESSION_KEY_BASE64` with a valid 16-byte IV and 256-byte key, and that the `checksum` is 512 hex characters.
   - If the application has a configured public key, unencrypted manifests (`sessionKey: null` or omitted) are rejected before downloading.

---

## 5. First OTA Version & Builtin Bundle Handling

When a user installs the base APK, Capacitor runs the web bundle baked into the APK assets. In `@capgo/capacitor-updater`, this baseline is identified as `builtin`.

### How Version Comparison Works
- In [otaUpdateService.js](file:///c:/Users/udayg/OneDrive/Desktop/shobhadamodar-app/frontend/src/services/otaUpdateService.js), `isBuiltinVersion(v)` identifies `"builtin"`, `"default"`, or null versions.
- `compareSemver("1.0.0", "builtin")` returns `1`.
- Any valid published semantic version (`1.0.0`, `1.0.1`, etc.) is recognized as newer than `builtin`, allowing the first OTA release to apply smoothly.
- Once updated, subsequent releases compare numerically (`1.0.1` > `1.0.0`).
- If the app is already on `1.0.1` and the manifest publishes `1.0.1`, `checkForUpdate` returns `updateAvailable: false, reason: "already_up_to_date"` and prevents redundant downloads.
- If a download is already staged for the manifest version, `checkForUpdate` flags `alreadyQueued: true` to prevent concurrent duplicate transfers.

---

## 6. Manifest & API Compatibility

- **Production Manifest URL:**
  `https://raw.githubusercontent.com/uday-gandhi04/shobhadamodar-app/master/ota/latest.json`
- **Staging Manifest URL:**
  `https://raw.githubusercontent.com/uday-gandhi04/shobhadamodar-app/master/ota/test-latest.json`
- **Public Unauthenticated Access:**
  For public GitHub repositories, both the raw manifest URL and the release asset download URL are accessible via HTTPS GET without requiring GitHub Personal Access Tokens or API headers.
- **Production Manifest Schema (Capgo Encryption V2):**
  ```json
  {
    "version": "1.0.0",
    "url": "https://github.com/uday-gandhi04/shobhadamodar-app/releases/download/ota-v1.0.0/com.shobhadamodar.app_1.0.0.zip",
    "checksum": "<512-hexadecimal-RSA-encrypted-checksum>",
    "sessionKey": "<16-byte-IV-base64>:<256-byte-RSA-encrypted-session-key-base64>",
    "releaseDate": "2026-10-22T16:00:00Z"
  }
  ```
- **Environment Isolation:**
  - Production builds (`npm run build`) bake in `VITE_API_URL=https://shobhadamodar-api.onrender.com/api` from `frontend/.env.production`.
  - Test/staging builds (`npm run build:test`) bake in `VITE_API_URL` from `frontend/.env.test` for the isolated September 2026 test database.
  - CI verification explicitly checks that neither bundle leaks the other's endpoints.

---

## 7. Android Compilation & JDK Requirements

### Gradle & AGP Compatibility Matrix
- **Android Gradle Plugin (AGP):** `8.13.0`
- **Gradle Version:** `8.14.3` (from `frontend/android/gradle/wrapper/gradle-wrapper.properties`)
- **JDK Requirement:** AGP 8.13.0 requires **Java 21 or higher**.
- **System JDK Detected:**
  - `C:\Program Files\Android\Android Studio\jbr` (OpenJDK 25.0.2) is configured via `org.gradle.java.home` and provides a compatible build environment.
  - In GitHub Actions Ubuntu runners, `actions/setup-java@v4` with `java-version: '21'` satisfies all build requirements.

### Build Verification Results
- **`assembleDebug`:** Executed successfully (`BUILD SUCCESSFUL in 57s`). Generates `frontend/android/app/build/outputs/apk/debug/app-debug.apk` signed with the standard Android debug key.
- **`assembleRelease`:** Executed successfully (`BUILD SUCCESSFUL in 1m 55s`). Generates `frontend/android/app/build/outputs/apk/release/app-release-unsigned.apk`.
- **Release Signing Status:** A production-signed release APK requires configuring the private keystore (keystore file, alias, and passwords) via local environment variables or CI secrets. Unsigned APKs cannot be installed directly on standard Android devices without signing.

---

## 8. Rollback and Recovery Watchdog

1. **Watchdog Timer (`appReadyTimeout: 10000`):**
   - Configured in `frontend/capacitor.config.json`.
   - On native startup, a 10-second timer begins.
   - `frontend/src/main.jsx` calls `initializeOtaUpdater()` immediately before rendering React, which disarms the timer via `CapacitorUpdater.notifyAppReady()`.
   - If a new web bundle contains a fatal syntax error, broken import, or crashes before calling `notifyAppReady()`, native Android reverts to the previous working bundle (or builtin bundle) within 10 seconds.
2. **Corrupted Download Protection:**
   - Downloads that fail SHA-256 verification or RSA decryption are discarded immediately and never staged.
3. **Shift Protection:**
   - Updates are staged in the background and applied safely on the next app restart or via explicit Manager action in **Settings > Live System Updates**. Active shifts and unsaved transactions are never interrupted.

---

## 9. Changes Requiring a New Signed APK

An OTA update applies **exclusively to web assets**. A new signed APK must be built and manually installed when any of the following occur:
1. Adding or updating Capacitor native plugins (e.g. `@capacitor/camera`, `@capacitor/filesystem`).
2. Modifying `AndroidManifest.xml` (permissions, intent filters).
3. Modifying native Java/Kotlin source code (`frontend/android/app/src/main/java/**`).
4. Modifying Gradle dependencies or Android build configurations.
5. Updating `@capgo/capacitor-updater` major versions.
6. Changing application ID (`com.shobhadamodar.app`) or native application signing certificates.
