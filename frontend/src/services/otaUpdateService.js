import { Capacitor } from "@capacitor/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { readShiftWorkflowState } from "../utils/shiftWorkflow.js";

export const DEFAULT_PROD_MANIFEST_URL =
  "https://raw.githubusercontent.com/uday-gandhi04/shobhadamodar-app/master/ota/latest.json";

// Default embedded version fallback when running in non-native / initial state
export const DEFAULT_FALLBACK_VERSION = "1.0.0";

// Embedded RSA-2048 public key from capacitor.config.json for Capgo Encryption V2
export const EMBEDDED_PUBLIC_KEY =
  "-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEAtjQWrCfeOK7VySnXya69hIELt+sILesqYQ9wMOuT2+fMRa0GG54u\n17dTfMnmGgc0Dxyz2sBZwMhpSjS/5oPwksSV8CwNY0zBjrrArIxFmeYs6RqsH/JI\nolk3PRTpBGje+CFRebId/mFXegkNGs7ot8yOJr3jsQ6100iJ6aBb7wIweCe5sY5v\n8fr/MQc2TA7ujg7dIt8D+CZoANBp4Cn99YXXMKNCX9AOaQPToGpsXIxbxnPXuRzm\nEg7SU7kncEwYX8cEJvMxIK2OAZXBwr/EzPFJdD6mrk87aGYtbdZ4Pm2d2+n1MEHZ\nEFltamrBy5lcK2RfO+VMdQbcWUlySJBGmQIDAQAB\n-----END RSA PUBLIC KEY-----\n";

/**
 * Checks if the mobile application has a configured RSA public key for encrypted updates.
 *
 * @returns {boolean}
 */
export function hasConfiguredPublicKey() {
  return Boolean(EMBEDDED_PUBLIC_KEY && EMBEDDED_PUBLIC_KEY.trim());
}

/**
 * Validates whether a sessionKey string complies with Capgo Encryption V2 format:
 * 'IV_BASE64:SESSION_KEY_BASE64', where IV is 16 bytes base64 (24 chars) and
 * SESSION_KEY is the RSA-2048 encrypted AES-128 session key (256 bytes base64).
 *
 * @param {unknown} sessionKey
 * @returns {boolean}
 */
export function isValidV2SessionKey(sessionKey) {
  if (typeof sessionKey !== "string" || !sessionKey.trim()) {
    return false;
  }
  const trimmed = sessionKey.trim();
  const parts = trimmed.split(":");
  if (parts.length !== 2) {
    return false;
  }
  const [ivB64, keyB64] = parts;
  if (!ivB64 || !keyB64) {
    return false;
  }

  // Base64 character check
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
  if (!base64Regex.test(ivB64) || !base64Regex.test(keyB64)) {
    return false;
  }

  // Verify decoded IV is exactly 16 bytes (AES-128-CBC block size)
  try {
    let ivLength = 0;
    if (typeof globalThis !== "undefined" && typeof globalThis.Buffer !== "undefined") {
      ivLength = globalThis.Buffer.from(ivB64, "base64").length;
    } else if (typeof atob === "function") {
      ivLength = atob(ivB64).length;
    } else {
      ivLength = ivB64.length === 24 && ivB64.endsWith("==") ? 16 : 0;
    }
    if (ivLength !== 16) {
      return false;
    }
  } catch {
    return false;
  }

  // Verify decoded session key is 256 bytes (RSA-2048 encrypted AES key)
  try {
    let keyLength = 0;
    if (typeof globalThis !== "undefined" && typeof globalThis.Buffer !== "undefined") {
      keyLength = globalThis.Buffer.from(keyB64, "base64").length;
    } else if (typeof atob === "function") {
      keyLength = atob(keyB64).length;
    } else {
      keyLength = keyB64.length >= 340 ? 256 : 0;
    }
    if (keyLength !== 256) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

/**
 * Validates the structure and constraints of an OTA manifest.
 *
 * @param {unknown} manifest
 * @param {object} [options]
 * @param {boolean} [options.allowInsecureHttp=false]
 * @param {boolean} [options.requireEncryption=false]
 * @returns {{ valid: boolean, manifest?: object, error?: string }}
 */
export function validateOtaManifest(manifest, options = {}) {
  const { allowInsecureHttp = false, requireEncryption = false } = options;

  if (!manifest || typeof manifest !== "object") {
    return { valid: false, error: "Manifest must be a non-null object" };
  }

  const { version, url, checksum, releaseDate, sessionKey } = manifest;

  if (typeof version !== "string" || !version.trim()) {
    return { valid: false, error: "Manifest version must be a non-empty string" };
  }

  // Semantic version format check (e.g. 1.0.0, 1.2.3-alpha.1)
  const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;
  if (!semverRegex.test(version.trim())) {
    return { valid: false, error: `Manifest version "${version}" is not a valid semantic version` };
  }

  if (typeof url !== "string" || !url.trim()) {
    return { valid: false, error: "Manifest url must be a non-empty string" };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url.trim());
  } catch {
    return { valid: false, error: `Manifest url "${url}" is not a valid URL` };
  }

  if (!allowInsecureHttp && parsedUrl.protocol !== "https:") {
    return { valid: false, error: `Manifest url must use HTTPS protocol, received "${parsedUrl.protocol}"` };
  }

  // Must point to a .zip bundle
  if (!parsedUrl.pathname.toLowerCase().endsWith(".zip")) {
    return { valid: false, error: `Manifest download URL must point to a .zip archive, received "${parsedUrl.pathname}"` };
  }

  if (typeof checksum !== "string" || !checksum.trim()) {
    return { valid: false, error: "Manifest checksum must be a non-empty string" };
  }

  const hasSessionKey = sessionKey !== undefined && sessionKey !== null;

  if (requireEncryption && !hasSessionKey) {
    return {
      valid: false,
      error: "Encrypted bundle required: mobile application enforces Capgo Encryption V2 but manifest is missing sessionKey",
    };
  }

  if (hasSessionKey) {
    // Encrypted bundle: sessionKey must be valid Capgo V2 format (IV:SESSION_KEY)
    if (!isValidV2SessionKey(sessionKey)) {
      return {
        valid: false,
        error:
          "Manifest sessionKey must be in Capgo V2 format ('IV_BASE64:SESSION_KEY_BASE64' with 16-byte IV and 256-byte RSA session key)",
      };
    }

    // Encrypted checksum: 512 hexadecimal characters (256-byte RSA-encrypted SHA-256)
    const encryptedChecksumRegex = /^[a-fA-F0-9]{512}$/;
    if (!encryptedChecksumRegex.test(checksum.trim())) {
      return {
        valid: false,
        error: `Encrypted manifest checksum must be a 512-char hexadecimal RSA-encrypted hash, received "${checksum}" (${checksum.trim().length} chars)`,
      };
    }
  } else {
    // Unencrypted bundle checksum: standard 64-char hexadecimal SHA-256 hash
    const plainChecksumRegex = /^[a-fA-F0-9]{64}$/;
    if (!plainChecksumRegex.test(checksum.trim())) {
      return {
        valid: false,
        error: `Manifest checksum must be a 64-char hexadecimal SHA-256 hash, received "${checksum}"`,
      };
    }
  }

  return {
    valid: true,
    manifest: {
      version: version.trim(),
      url: url.trim(),
      checksum: checksum.trim().toLowerCase(),
      sessionKey: typeof sessionKey === "string" ? sessionKey.trim() : undefined,
      releaseDate: typeof releaseDate === "string" ? releaseDate : undefined,
    },
  };
}

/**
 * Checks if a version identifier represents the base native APK embedded assets ("builtin").
 *
 * @param {string|null|undefined} v
 * @returns {boolean}
 */
export function isBuiltinVersion(v) {
  if (!v) return true;
  const normalized = String(v).trim().toLowerCase();
  return normalized === "builtin" || normalized === "default" || normalized === "0.0.0";
}

/**
 * Compares two semantic version strings with robust handling for native "builtin" bundles.
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 *
 * Any valid published semantic version is considered newer than "builtin".
 *
 * @param {string} v1
 * @param {string} v2
 * @returns {number}
 */
export function compareSemver(v1, v2) {
  if (v1 === v2) return 0;

  const v1IsBuiltin = isBuiltinVersion(v1);
  const v2IsBuiltin = isBuiltinVersion(v2);

  if (v1IsBuiltin && v2IsBuiltin) return 0;
  if (v1IsBuiltin) return -1; // builtin is older than any semver release
  if (v2IsBuiltin) return 1;  // any semver release is newer than builtin

  const clean = (v) => v.replace(/^ota-v|^v/, "").trim();
  const [v1Main, v1Pre] = clean(v1).split("-");
  const [v2Main, v2Pre] = clean(v2).split("-");

  const v1Parts = v1Main.split(".").map(Number);
  const v2Parts = v2Main.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const p1 = Number.isNaN(v1Parts[i]) ? 0 : v1Parts[i] || 0;
    const p2 = Number.isNaN(v2Parts[i]) ? 0 : v2Parts[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  // Handle prereleases: non-prerelease > prerelease
  if (!v1Pre && v2Pre) return 1;
  if (v1Pre && !v2Pre) return -1;
  if (v1Pre && v2Pre) {
    return v1Pre.localeCompare(v2Pre, undefined, { numeric: true });
  }

  return 0;
}

/**
 * Returns true if remoteVersion is strictly newer than currentVersion.
 *
 * @param {string} remoteVersion
 * @param {string} currentVersion
 * @returns {boolean}
 */
export function isNewerVersion(remoteVersion, currentVersion) {
  return compareSemver(remoteVersion, currentVersion) > 0;
}

/**
 * Determines whether the app is currently in a safe state to restart or apply updates immediately.
 * In ShobhaDamodar Petroleum, active shift operations, nozzle collection entries, and
 * end-shift reconciliation must never be interrupted.
 *
 * @param {string} [currentPath]
 * @param {object} [workflowState]
 * @returns {boolean}
 */
export function isSafeToRestart(currentPath = null, workflowState = null) {
  const path = currentPath || (typeof window !== "undefined" ? window.location?.pathname : "") || "";
  const workflow = workflowState !== undefined ? workflowState : readShiftWorkflowState();

  // If there is an active shift workflow session cached, restart is unsafe
  if (workflow && typeof workflow === "object") {
    if (
      workflow.step ||
      workflow.shiftId ||
      workflow.selectedMpd ||
      (Array.isArray(workflow.readings) && workflow.readings.length > 0) ||
      (Array.isArray(workflow.collections) && workflow.collections.length > 0)
    ) {
      return false;
    }
  }

  // Critical routes where employees or managers enter financial/shift records
  const criticalPrefixes = [
    "/shift",
    "/collections",
    "/expenses",
    "/end-shift",
    "/review",
    "/udhari",
  ];

  for (const prefix of criticalPrefixes) {
    if (path.startsWith(prefix)) {
      return false;
    }
  }

  return true;
}

/**
 * Resolves the configured OTA manifest URL from Vite env or fallback.
 *
 * @returns {string}
 */
export function getOtaManifestUrl() {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_OTA_MANIFEST_URL) {
    return import.meta.env.VITE_OTA_MANIFEST_URL;
  }
  return DEFAULT_PROD_MANIFEST_URL;
}

// Internal singleton state
let updaterState = {
  status: "idle", // 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'up-to-date'
  currentVersion: DEFAULT_FALLBACK_VERSION,
  nativeVersion: "1.0",
  availableManifest: null,
  pendingUpdate: null,
  lastError: null,
  lastCheckedAt: null,
  lastDownloadedVersion: null,
};

const listeners = new Set();

export function getUpdaterState() {
  return { ...updaterState };
}

export function _resetUpdaterStateForTesting(initialVersion = DEFAULT_FALLBACK_VERSION) {
  updaterState = {
    status: "idle",
    currentVersion: initialVersion,
    nativeVersion: "1.0",
    availableManifest: null,
    pendingUpdate: null,
    lastError: null,
    lastCheckedAt: null,
    lastDownloadedVersion: null,
  };
}

export function subscribeToUpdaterState(listener) {
  listeners.add(listener);
  listener(getUpdaterState());
  return () => listeners.delete(listener);
}

function updateState(patch) {
  updaterState = { ...updaterState, ...patch };
  listeners.forEach((listener) => {
    try {
      listener(getUpdaterState());
    } catch (err) {
      console.warn("[OTA] Listener error:", err);
    }
  });
}

/**
 * Checks GitHub Releases for a newer versioned OTA manifest.
 *
 * @param {object} [options]
 * @param {string} [options.manifestUrl]
 * @param {number} [options.timeoutMs=10000]
 * @param {boolean} [options.force=false]
 * @param {boolean} [options.allowInsecureHttp=false]
 * @param {object} [options.nativeUpdater] Mock native updater for testing
 * @returns {Promise<{ updateAvailable: boolean, manifest?: object, reason?: string }>}
 */
export async function checkForUpdate(options = {}) {
  const {
    manifestUrl = getOtaManifestUrl(),
    timeoutMs = 10000,
    force = false,
    allowInsecureHttp = false,
    requireEncryption = hasConfiguredPublicKey() && !manifestUrl.includes("test-latest.json"),
    nativeUpdater = CapacitorUpdater,
  } = options;

  if (updaterState.status === "checking" || updaterState.status === "downloading") {
    return { updateAvailable: false, reason: "operation_in_progress" };
  }

  updateState({ status: "checking", lastError: null });

  try {
    // 1. Fetch current bundle info from native plugin if on native platform
    let currentVersion = updaterState.currentVersion;
    let nativeVersion = updaterState.nativeVersion;

    if (Capacitor.isNativePlatform() || options.nativeUpdater) {
      try {
        const currentInfo = await nativeUpdater.current();
        if (currentInfo?.bundle?.version) {
          currentVersion = currentInfo.bundle.version;
        }
        if (currentInfo?.native) {
          nativeVersion = currentInfo.native;
        }
      } catch (err) {
        console.warn("[OTA] Could not read current bundle info:", err);
      }
    }

    updateState({ currentVersion, nativeVersion });

    // 2. Fetch manifest with timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(manifestUrl, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const err = `Failed to fetch manifest (HTTP ${response.status})`;
      updateState({ status: "error", lastError: err });
      return { updateAvailable: false, reason: err };
    }

    const rawData = await response.json();
    const validation = validateOtaManifest(rawData, { allowInsecureHttp, requireEncryption });

    if (!validation.valid) {
      const err = `Invalid manifest: ${validation.error}`;
      updateState({ status: "error", lastError: err });
      return { updateAvailable: false, reason: err };
    }

    const manifest = validation.manifest;
    const newer = isNewerVersion(manifest.version, currentVersion);

    updateState({ lastCheckedAt: new Date().toISOString() });

    if (!newer && !force) {
      updateState({ status: "up-to-date", availableManifest: null });
      return { updateAvailable: false, reason: "already_up_to_date" };
    }

    // Check if the bundle is already staged for next restart
    if (
      (updaterState.lastDownloadedVersion === manifest.version && updaterState.status === "ready") ||
      updaterState.pendingUpdate?.version === manifest.version
    ) {
      updateState({
        status: "ready",
        availableManifest: manifest,
      });
      return { updateAvailable: true, manifest, alreadyQueued: true };
    }

    if (Capacitor.isNativePlatform() || options.nativeUpdater) {
      try {
        const nextBundle = await nativeUpdater.getNextBundle();
        if (nextBundle && nextBundle.version === manifest.version) {
          updateState({
            status: "ready",
            availableManifest: manifest,
            pendingUpdate: { ...manifest, bundleId: nextBundle.id },
            lastDownloadedVersion: manifest.version,
          });
          return { updateAvailable: true, manifest, alreadyQueued: true };
        }
      } catch (err) {
        console.warn("[OTA] Error checking pending bundle:", err);
      }
    }

    updateState({ status: "available", availableManifest: manifest });
    return { updateAvailable: true, manifest };
  } catch (err) {
    const errorMsg = err.name === "AbortError" ? "Network timeout while checking for update" : err.message;
    updateState({ status: "error", lastError: errorMsg });
    return { updateAvailable: false, reason: errorMsg };
  }
}

/**
 * Downloads a validated bundle from GitHub Releases and stages it for activation.
 *
 * @param {object} manifest
 * @param {object} [options]
 * @param {object} [options.nativeUpdater]
 * @param {boolean} [options.allowInsecureHttp=false]
 * @param {boolean} [options.requireEncryption]
 * @returns {Promise<{ success: boolean, bundleId?: string, error?: string }>}
 */
export async function downloadUpdate(manifest, options = {}) {
  const {
    nativeUpdater = CapacitorUpdater,
    allowInsecureHttp = false,
    requireEncryption = hasConfiguredPublicKey() && !manifest?.url?.includes("test"),
  } = options;

  const validation = validateOtaManifest(manifest, { allowInsecureHttp, requireEncryption });
  if (!validation.valid) {
    updateState({ status: "error", lastError: validation.error });
    return { success: false, error: validation.error };
  }

  const validManifest = validation.manifest;

  // Prevent duplicate concurrent downloads
  if (updaterState.status === "downloading") {
    return { success: false, error: "download_already_in_progress" };
  }

  // Prevent downloading the exact same bundle if already queued
  if (
    updaterState.lastDownloadedVersion === validManifest.version &&
    updaterState.status === "ready"
  ) {
    return { success: true, bundleId: updaterState.pendingUpdate?.bundleId };
  }

  updateState({ status: "downloading", lastError: null });

  try {
    if (!Capacitor.isNativePlatform() && !options.nativeUpdater) {
      // In web/desktop preview environment, simulate staging
      updateState({
        status: "ready",
        pendingUpdate: { ...validManifest, bundleId: "simulated-bundle-id" },
        lastDownloadedVersion: validManifest.version,
      });
      return { success: true, bundleId: "simulated-bundle-id" };
    }

    // Call native updater to download, checksum-verify, and unpack bundle
    const downloadParams = {
      url: validManifest.url,
      version: validManifest.version,
      checksum: validManifest.checksum,
    };
    if (validManifest.sessionKey) {
      downloadParams.sessionKey = validManifest.sessionKey;
    }

    const bundle = await nativeUpdater.download(downloadParams);

    if (!bundle || !bundle.id) {
      throw new Error("Native updater did not return a valid bundle identifier");
    }

    // Stage bundle to activate on next background / restart
    await nativeUpdater.next({ id: bundle.id });

    updateState({
      status: "ready",
      pendingUpdate: { ...validManifest, bundleId: bundle.id },
      lastDownloadedVersion: validManifest.version,
    });

    return { success: true, bundleId: bundle.id };
  } catch (err) {
    const errorMsg = err.message || "Failed to download update bundle";
    updateState({ status: "error", lastError: errorMsg });
    return { success: false, error: errorMsg };
  }
}

/**
 * Attempts to apply a queued update immediately if it is safe to do so.
 * If in an active workflow, the update is safely deferred until the next background/restart.
 *
 * @param {object} [options]
 * @param {boolean} [options.force=false]
 * @param {object} [options.nativeUpdater]
 * @returns {Promise<{ applied: boolean, reason?: string }>}
 */
export async function applyUpdateIfSafe(options = {}) {
  const {
    force = false,
    currentPath = null,
    workflowState = undefined,
    nativeUpdater = CapacitorUpdater,
  } = options;

  if (!updaterState.pendingUpdate) {
    return { applied: false, reason: "no_pending_update" };
  }

  if (!force && !isSafeToRestart(currentPath, workflowState)) {
    return { applied: false, reason: "active_shift_or_record_entry_in_progress" };
  }

  try {
    if (Capacitor.isNativePlatform() || options.nativeUpdater) {
      await nativeUpdater.reload();
    } else {
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }
    return { applied: true };
  } catch (err) {
    updateState({ status: "error", lastError: err.message });
    return { applied: false, reason: err.message };
  }
}

/**
 * Initializes the OTA update system at application startup:
 * 1. Signals notifyAppReady to the native layer to disarm the automatic rollback timer.
 * 2. Checks whether a previous bundle failed and was rolled back.
 * 3. Triggers a background update check without interrupting startup.
 *
 * @param {object} [options]
 * @returns {Promise<void>}
 */
export async function initializeOtaUpdater(options = {}) {
  const { nativeUpdater = CapacitorUpdater, autoCheck = true } = options;

  // 1. Immediately notify native runtime that JavaScript initialized successfully
  if (Capacitor.isNativePlatform() || options.nativeUpdater) {
    try {
      await nativeUpdater.notifyAppReady();
    } catch (err) {
      console.warn("[OTA] notifyAppReady signal warning:", err);
    }

    // 2. Check for rollback report from previous launch
    try {
      const failed = await nativeUpdater.getFailedUpdate();
      if (failed) {
        console.error("[OTA] Previous live update failed to start and was safely rolled back:", failed);
        updateState({
          lastError: `Previous update ${failed.bundle?.version || ""} failed to initialize and was rolled back`,
        });
      }
    } catch (err) {
      console.warn("[OTA] Failed to check previous update status:", err);
    }

    // 3. Populate current bundle metadata
    try {
      const currentInfo = await nativeUpdater.current();
      if (currentInfo?.bundle?.version) {
        updateState({ currentVersion: currentInfo.bundle.version });
      }
      if (currentInfo?.native) {
        updateState({ nativeVersion: currentInfo.native });
      }
    } catch {
      // Ignore in non-native contexts
    }
  }

  // 4. Trigger non-blocking background check
  if (autoCheck) {
    setTimeout(() => {
      checkForUpdate(options)
        .then((result) => {
          if (result.updateAvailable && !result.alreadyQueued && result.manifest) {
            downloadUpdate(result.manifest, options).catch((err) => {
              console.warn("[OTA] Background download failed:", err);
            });
          }
        })
        .catch((err) => {
          console.warn("[OTA] Background check failed:", err);
        });
    }, 3000); // Wait 3s after startup so critical login/shift bootstrap completes first
  }
}
