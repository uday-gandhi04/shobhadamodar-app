import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";
import {
  validateOtaManifest,
  isValidV2SessionKey,
  hasConfiguredPublicKey,
  EMBEDDED_PUBLIC_KEY,
  compareSemver,
  isNewerVersion,
  isBuiltinVersion,
  isSafeToRestart,
  DEFAULT_PROD_MANIFEST_URL,
  getOtaManifestUrl,
  checkForUpdate,
  downloadUpdate,
  applyUpdateIfSafe,
  initializeOtaUpdater,
  getUpdaterState,
  _resetUpdaterStateForTesting,
} from "./otaUpdateService.js";

const VALID_CHECKSUM = "83a24fbed291aa474ed57fc63e2bc7feba5ce49c341d8464bbd58ad327f1c32e";
const VALID_URL = "https://github.com/uday-gandhi04/shobhadamodar-app/releases/download/ota-v1.0.1/com.shobhadamodar.app_1.0.1.zip";

// Capgo Encryption V2 valid fixtures: 16-byte IV (24 base64 chars) + 256-byte RSA sessionKey (344 base64 chars)
const VALID_V2_IV_B64 = Buffer.alloc(16, 0x42).toString("base64");
const VALID_V2_KEY_B64 = Buffer.alloc(256, 0x77).toString("base64");
const VALID_V2_SESSION_KEY = `${VALID_V2_IV_B64}:${VALID_V2_KEY_B64}`;
const VALID_ENCRYPTED_CHECKSUM = "a1b2c3d4".repeat(64); // Exactly 512 hexadecimal characters

/* =====================================================================
   1. CAPGO ENCRYPTION V2 SESSION KEY VALIDATION TESTS
   ===================================================================== */
test("isValidV2SessionKey: accepts well-formed V2 IV:SESSION_KEY structure", () => {
  assert.equal(isValidV2SessionKey(VALID_V2_SESSION_KEY), true);
});

test("isValidV2SessionKey: rejects invalid formats, bad lengths, and non-base64 input", () => {
  assert.equal(isValidV2SessionKey(null), false);
  assert.equal(isValidV2SessionKey(undefined), false);
  assert.equal(isValidV2SessionKey(""), false);
  assert.equal(isValidV2SessionKey("single-part-key"), false);
  assert.equal(isValidV2SessionKey(":"), false);
  assert.equal(isValidV2SessionKey(`:${VALID_V2_KEY_B64}`), false);
  assert.equal(isValidV2SessionKey(`${VALID_V2_IV_B64}:`), false);
  assert.equal(isValidV2SessionKey("part1:part2:part3"), false);

  // Invalid base64 characters
  assert.equal(isValidV2SessionKey(`invalid@iv==:${VALID_V2_KEY_B64}`), false);

  // Invalid IV length (8 bytes instead of 16 bytes)
  const shortIvB64 = Buffer.alloc(8, 0x01).toString("base64");
  assert.equal(isValidV2SessionKey(`${shortIvB64}:${VALID_V2_KEY_B64}`), false);

  // Invalid RSA key length (32 bytes instead of 256 bytes)
  const shortKeyB64 = Buffer.alloc(32, 0x01).toString("base64");
  assert.equal(isValidV2SessionKey(`${VALID_V2_IV_B64}:${shortKeyB64}`), false);
});

test("hasConfiguredPublicKey: confirms embedded RSA public key is configured", () => {
  assert.equal(hasConfiguredPublicKey(), true);
  assert.ok(EMBEDDED_PUBLIC_KEY.includes("BEGIN RSA PUBLIC KEY"));
});

/* =====================================================================
   2. MANIFEST VALIDATION TESTS (WITH ENCRYPTION V2 AND REJECTION RULES)
   ===================================================================== */
test("validateOtaManifest: accepts a well-formed unencrypted manifest when encryption not enforced", () => {
  const manifest = {
    version: "1.0.1",
    url: VALID_URL,
    checksum: VALID_CHECKSUM,
    releaseDate: "2026-10-22T16:00:00Z",
  };

  const result = validateOtaManifest(manifest, { requireEncryption: false });
  assert.equal(result.valid, true);
  assert.equal(result.manifest.version, "1.0.1");
  assert.equal(result.manifest.url, VALID_URL);
  assert.equal(result.manifest.checksum, VALID_CHECKSUM.toLowerCase());
  assert.equal(result.manifest.releaseDate, "2026-10-22T16:00:00Z");
  assert.equal(result.manifest.sessionKey, undefined);
});

test("validateOtaManifest: accepts manifest with Capgo Encryption V2 metadata", () => {
  const manifest = {
    version: "1.0.2",
    url: VALID_URL,
    checksum: VALID_ENCRYPTED_CHECKSUM,
    sessionKey: VALID_V2_SESSION_KEY,
    releaseDate: "2026-10-22T16:00:00Z",
  };

  const result = validateOtaManifest(manifest);
  assert.equal(result.valid, true);
  assert.equal(result.manifest.sessionKey, VALID_V2_SESSION_KEY);
  assert.equal(result.manifest.checksum, VALID_ENCRYPTED_CHECKSUM.toLowerCase());
});

test("validateOtaManifest: rejects encrypted bundle with 64-char plain checksum", () => {
  // If sessionKey is present, native Android requires the 512-hex RSA encrypted checksum
  const manifest = {
    version: "1.0.2",
    url: VALID_URL,
    checksum: VALID_CHECKSUM, // 64 hex characters (plain SHA-256)
    sessionKey: VALID_V2_SESSION_KEY,
  };

  const result = validateOtaManifest(manifest);
  assert.equal(result.valid, false);
  assert.match(result.error, /512-char hexadecimal RSA-encrypted hash/);
});

test("validateOtaManifest: rejects unencrypted manifest when requireEncryption is true", () => {
  const unencryptedManifest = {
    version: "1.0.2",
    url: VALID_URL,
    checksum: VALID_CHECKSUM,
  };

  const result = validateOtaManifest(unencryptedManifest, { requireEncryption: true });
  assert.equal(result.valid, false);
  assert.match(result.error, /Encrypted bundle required/);
});

test("validateOtaManifest: rejects manifest with sessionKey: null when requireEncryption is true", () => {
  const nullKeyManifest = {
    version: "1.0.2",
    url: VALID_URL,
    checksum: VALID_CHECKSUM,
    sessionKey: null,
  };

  const result = validateOtaManifest(nullKeyManifest, { requireEncryption: true });
  assert.equal(result.valid, false);
  assert.match(result.error, /Encrypted bundle required/);
});

test("validateOtaManifest: rejects invalid sessionKey format", () => {
  assert.equal(
    validateOtaManifest({ version: "1.0.2", url: VALID_URL, checksum: VALID_ENCRYPTED_CHECKSUM, sessionKey: "" }).valid,
    false
  );
  assert.equal(
    validateOtaManifest({ version: "1.0.2", url: VALID_URL, checksum: VALID_ENCRYPTED_CHECKSUM, sessionKey: "invalid:format" }).valid,
    false
  );
  assert.equal(
    validateOtaManifest({ version: "1.0.2", url: VALID_URL, checksum: VALID_ENCRYPTED_CHECKSUM, sessionKey: 12345 }).valid,
    false
  );
});

test("validateOtaManifest: rejects null or non-object input", () => {
  assert.equal(validateOtaManifest(null).valid, false);
  assert.equal(validateOtaManifest(undefined).valid, false);
  assert.equal(validateOtaManifest("invalid").valid, false);
  assert.equal(validateOtaManifest(123).valid, false);
});

test("validateOtaManifest: rejects missing or invalid semantic version", () => {
  assert.equal(validateOtaManifest({ url: VALID_URL, checksum: VALID_CHECKSUM }).valid, false);
  assert.equal(validateOtaManifest({ version: "", url: VALID_URL, checksum: VALID_CHECKSUM }).valid, false);
  assert.equal(validateOtaManifest({ version: "abc", url: VALID_URL, checksum: VALID_CHECKSUM }).valid, false);
  assert.equal(validateOtaManifest({ version: "1.0", url: VALID_URL, checksum: VALID_CHECKSUM }).valid, false);
});

test("validateOtaManifest: rejects insecure HTTP download URLs unless explicitly allowed", () => {
  const httpManifest = {
    version: "1.0.1",
    url: "http://example.com/bundle.zip",
    checksum: VALID_CHECKSUM,
  };

  const defaultResult = validateOtaManifest(httpManifest);
  assert.equal(defaultResult.valid, false);
  assert.match(defaultResult.error, /HTTPS/);

  const allowedResult = validateOtaManifest(httpManifest, { allowInsecureHttp: true });
  assert.equal(allowedResult.valid, true);
});

test("validateOtaManifest: rejects non-zip download URLs", () => {
  const nonZip = {
    version: "1.0.1",
    url: "https://github.com/uday-gandhi04/shobhadamodar-app/releases/download/ota-v1.0.1/app.apk",
    checksum: VALID_CHECKSUM,
  };
  const result = validateOtaManifest(nonZip);
  assert.equal(result.valid, false);
  assert.match(result.error, /\.zip/);
});

test("validateOtaManifest: rejects invalid SHA-256 checksums", () => {
  assert.equal(
    validateOtaManifest({ version: "1.0.1", url: VALID_URL, checksum: "" }).valid,
    false
  );
  assert.equal(
    validateOtaManifest({ version: "1.0.1", url: VALID_URL, checksum: "83a24fbed291aa474ed57fc63e2bc7fe" }).valid,
    false
  );
  assert.equal(
    validateOtaManifest({
      version: "1.0.1",
      url: VALID_URL,
      checksum: "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
    }).valid,
    false
  );
});

/* =====================================================================
   2. SEMVER COMPARISON & BUILTIN VERSION HANDLING TESTS
   ===================================================================== */
test("compareSemver & isNewerVersion: accurately order semantic versions and handle builtin", () => {
  // Standard semver comparisons
  assert.equal(compareSemver("1.0.0", "1.0.0"), 0);
  assert.equal(compareSemver("1.0.1", "1.0.0"), 1);
  assert.equal(compareSemver("1.0.0", "1.0.1"), -1);
  assert.equal(compareSemver("1.1.0", "1.0.9"), 1);
  assert.equal(compareSemver("2.0.0", "1.99.99"), 1);

  // ota-v* and v* prefix stripping
  assert.equal(compareSemver("ota-v1.0.2", "1.0.1"), 1);
  assert.equal(compareSemver("v1.0.2", "1.0.1"), 1);

  // Native "builtin" bundle handling on fresh APK install
  assert.equal(isBuiltinVersion("builtin"), true);
  assert.equal(isBuiltinVersion("default"), true);
  assert.equal(isBuiltinVersion(null), true);
  assert.equal(isBuiltinVersion("1.0.0"), false);

  // First OTA release 1.0.0 must be recognized as newer than the native builtin baseline
  assert.equal(compareSemver("1.0.0", "builtin"), 1);
  assert.equal(compareSemver("builtin", "1.0.0"), -1);
  assert.equal(compareSemver("builtin", "builtin"), 0);
  assert.equal(isNewerVersion("1.0.0", "builtin"), true);

  // Subsequent releases
  assert.equal(isNewerVersion("1.0.1", "1.0.0"), true);
  assert.equal(isNewerVersion("1.0.0", "1.0.0"), false);
  assert.equal(isNewerVersion("1.0.0", "1.0.1"), false);
  assert.equal(isNewerVersion("0.9.9", "1.0.0"), false);
});

/* =====================================================================
   3. SAFE RESTART TIMING TESTS
   ===================================================================== */
test("isSafeToRestart: protects active shifts and uncommitted record entry", () => {
  // Safe on login and manager landing when no workflow in session
  assert.equal(isSafeToRestart("/login", null), true);
  assert.equal(isSafeToRestart("/manager", null), true);
  assert.equal(isSafeToRestart("/select-mpd", null), true);

  // Unsafe when employee is actively entering meter readings on an MPD
  assert.equal(isSafeToRestart("/shift/66d8e1234567890abcdef123", null), false);

  // Unsafe during cash, UPI, card, or udhari collection recording
  assert.equal(isSafeToRestart("/collections/cash", null), false);
  assert.equal(isSafeToRestart("/collections/upi", null), false);
  assert.equal(isSafeToRestart("/collections/card", null), false);
  assert.equal(isSafeToRestart("/collections/udhari", null), false);

  // Unsafe during end-shift reconciliation or expense logging
  assert.equal(isSafeToRestart("/end-shift", null), false);
  assert.equal(isSafeToRestart("/review", null), false);
  assert.equal(isSafeToRestart("/expenses", null), false);
  assert.equal(isSafeToRestart("/udhari", null), false);

  // Unsafe if workflowState contains an in-progress shift session, even on another route
  const activeWorkflow = {
    shiftId: "shift-123",
    selectedMpd: "MPD-1",
    readings: [{ opening: 100, closing: 150 }],
  };
  assert.equal(isSafeToRestart("/manager", activeWorkflow), false);
});

/* =====================================================================
   4. MANIFEST URL RESOLUTION & PRODUCTION SEPARATION
   ===================================================================== */
test("getOtaManifestUrl: points to established production manifest repository by default", () => {
  const url = getOtaManifestUrl();
  assert.equal(url, DEFAULT_PROD_MANIFEST_URL);
  assert.ok(url.startsWith("https://"));
  assert.ok(url.includes("shobhadamodar-app"));
  assert.ok(url.endsWith("ota/latest.json"));
});

/* =====================================================================
   5. MOCK NATIVE UPDATER LIFECYCLE TESTS
   ===================================================================== */
function createMockUpdater(initialBundleVersion = "1.0.0") {
  let currentVersion = initialBundleVersion;
  let nextBundle = null;
  let notifyAppReadyCalled = false;
  let reloadCalled = false;
  let downloadedBundles = [];
  let failDownloadChecksum = false;

  return {
    get notifyAppReadyCalled() {
      return notifyAppReadyCalled;
    },
    get reloadCalled() {
      return reloadCalled;
    },
    get downloadedBundles() {
      return downloadedBundles;
    },
    setFailDownloadChecksum(val) {
      failDownloadChecksum = val;
    },
    async current() {
      return {
        bundle: { id: "mock-current-id", version: currentVersion },
        native: "1.0",
      };
    },
    async getNextBundle() {
      return nextBundle;
    },
    async getFailedUpdate() {
      return null;
    },
    async notifyAppReady() {
      notifyAppReadyCalled = true;
      return { bundle: { id: "mock-current-id", version: currentVersion } };
    },
    async download(options) {
      if (failDownloadChecksum) {
        throw new Error("Checksum mismatch: verification failed");
      }
      const bundle = {
        id: `bundle-${options.version}`,
        version: options.version,
        checksum: options.checksum,
        sessionKey: options.sessionKey,
        status: "downloaded",
      };
      downloadedBundles.push(bundle);
      return bundle;
    },
    async next(options) {
      const match = downloadedBundles.find((b) => b.id === options.id);
      nextBundle = match || { id: options.id, version: "unknown" };
      return nextBundle;
    },
    async reload() {
      reloadCalled = true;
      if (nextBundle) {
        currentVersion = nextBundle.version;
        nextBundle = null;
      }
    },
  };
}

test("checkForUpdate: detects first OTA version 1.0.0 when app runs fresh builtin bundle", async () => {
  const mockNative = createMockUpdater("builtin");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        version: "1.0.0",
        url: VALID_URL,
        checksum: VALID_ENCRYPTED_CHECKSUM,
        sessionKey: VALID_V2_SESSION_KEY,
      }),
    };
  };

  try {
    const result = await checkForUpdate({
      manifestUrl: "https://example.com/ota/latest.json",
      nativeUpdater: mockNative,
    });

    assert.equal(result.updateAvailable, true);
    assert.equal(result.manifest.version, "1.0.0");
    assert.equal(result.manifest.sessionKey, VALID_V2_SESSION_KEY);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("checkForUpdate: returns false when device is already up to date", async () => {
  const mockNative = createMockUpdater("1.0.1");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        version: "1.0.1",
        url: VALID_URL,
        checksum: VALID_ENCRYPTED_CHECKSUM,
        sessionKey: VALID_V2_SESSION_KEY,
      }),
    };
  };

  try {
    const result = await checkForUpdate({
      manifestUrl: "https://example.com/ota/latest.json",
      nativeUpdater: mockNative,
    });

    assert.equal(result.updateAvailable, false);
    assert.equal(result.reason, "already_up_to_date");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("downloadUpdate: forwards sessionKey to native updater when present", async () => {
  const mockNative = createMockUpdater("1.0.0");

  const manifest = {
    version: "1.0.2",
    url: VALID_URL,
    checksum: VALID_ENCRYPTED_CHECKSUM,
    sessionKey: VALID_V2_SESSION_KEY,
  };

  const successResult = await downloadUpdate(manifest, { nativeUpdater: mockNative });
  assert.equal(successResult.success, true);
  assert.equal(mockNative.downloadedBundles[0].sessionKey, VALID_V2_SESSION_KEY);
});

test("downloadUpdate & checksum verification: stages bundle on success and rejects mismatch", async () => {
  _resetUpdaterStateForTesting("1.0.0");
  const mockNative = createMockUpdater("1.0.0");

  // 1. Successful download and staging
  const manifest = {
    version: "1.0.3",
    url: VALID_URL,
    checksum: VALID_ENCRYPTED_CHECKSUM,
    sessionKey: VALID_V2_SESSION_KEY,
  };

  const successResult = await downloadUpdate(manifest, { nativeUpdater: mockNative });
  assert.equal(successResult.success, true);
  assert.equal(successResult.bundleId, "bundle-1.0.3");

  const nextQueued = await mockNative.getNextBundle();
  assert.equal(nextQueued.version, "1.0.3");

  // 2. Simulated checksum mismatch in native layer
  mockNative.setFailDownloadChecksum(true);
  const failManifest = {
    version: "1.0.4",
    url: VALID_URL,
    checksum: VALID_ENCRYPTED_CHECKSUM,
    sessionKey: VALID_V2_SESSION_KEY,
  };

  const failResult = await downloadUpdate(failManifest, { nativeUpdater: mockNative });
  assert.equal(failResult.success, false);
  assert.match(failResult.error, /Checksum mismatch/);
});

test("initializeOtaUpdater: calls notifyAppReady at startup to disarm rollback timer", async () => {
  const mockNative = createMockUpdater("1.0.0");

  await initializeOtaUpdater({ nativeUpdater: mockNative, autoCheck: false });
  assert.equal(mockNative.notifyAppReadyCalled, true);
});

test("applyUpdateIfSafe: safely defers when active shift is in progress and reloads when safe", async () => {
  const mockNative = createMockUpdater("1.0.0");

  // Download update
  await downloadUpdate(
    { version: "1.0.5", url: VALID_URL, checksum: VALID_CHECKSUM },
    { nativeUpdater: mockNative }
  );

  // In simulated active shift route
  const unsafeResult = await applyUpdateIfSafe({
    nativeUpdater: mockNative,
    currentPath: "/shift/mpd-1",
    force: false,
  });
  assert.equal(unsafeResult.applied, false);
  assert.equal(unsafeResult.reason, "active_shift_or_record_entry_in_progress");

  // Forced apply or apply when safe triggers reload
  const safeResult = await applyUpdateIfSafe({
    nativeUpdater: mockNative,
    force: true,
  });

  assert.equal(safeResult.applied, true);
  assert.equal(mockNative.reloadCalled, true);
});

/* =====================================================================
   5. STARTUP LIFECYCLE & READINESS NOTIFICATION REGRESSION TESTS
   ===================================================================== */
test("initializeOtaUpdater: handles notifyAppReady rejection gracefully without throwing or error loops", async () => {
  const baseMock = createMockUpdater("1.0.0");
  const errorMock = {
    ...baseMock,
    async notifyAppReady() {
      throw new Error("Simulated native watchdog IPC exception");
    },
  };

  // Must not reject or throw unhandled exceptions
  await assert.doesNotReject(async () => {
    await initializeOtaUpdater({ nativeUpdater: errorMock, autoCheck: false });
  });
});

test("initializeOtaUpdater: detects rollback bundle from getFailedUpdate and updates state.lastError", async () => {
  _resetUpdaterStateForTesting("1.0.0");
  const baseMock = createMockUpdater("1.0.0");
  const rollbackMock = {
    ...baseMock,
    async getFailedUpdate() {
      return { bundle: { id: "faulty-bundle-99", version: "1.0.99" } };
    },
  };

  await initializeOtaUpdater({ nativeUpdater: rollbackMock, autoCheck: false });
  const state = getUpdaterState();
  assert.ok(state.lastError);
  assert.match(state.lastError, /1\.0\.99.*failed to initialize and was rolled back/);
});

test("initializeOtaUpdater: safely skips native calls in non-native browser environment", async () => {
  // In web browsers, initializeOtaUpdater should never throw or require native plugins
  await assert.doesNotReject(async () => {
    await initializeOtaUpdater({ autoCheck: false });
  });
});
