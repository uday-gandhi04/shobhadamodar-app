// src/controllers/update.controller.js
import semver from 'semver';

const DEFAULT_MANIFEST_URL =
  process.env.OTA_MANIFEST_URL ||
  'https://raw.githubusercontent.com/uday-gandhi04/shobhadamodar-app/master/ota/latest.json';

const TEST_MANIFEST_URL =
  process.env.OTA_TEST_MANIFEST_URL ||
  'https://raw.githubusercontent.com/uday-gandhi04/shobhadamodar-app/master/ota/test-latest.json';

const MANIFEST_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

const manifestCache = new Map();

/**
 * Fetches and caches the OTA manifest for the given channel.
 *
 * @param {string} channel
 * @returns {Promise<{ version: string, url: string, checksum: string }>}
 */
export const getLatestManifest = async (channel = 'production') => {
  const now = Date.now();
  const cached = manifestCache.get(channel);

  if (cached && now - cached.fetchedAt < MANIFEST_CACHE_DURATION) {
    return cached.manifest;
  }

  const manifestUrl =
    channel === 'test' || channel === 'staging'
      ? TEST_MANIFEST_URL
      : DEFAULT_MANIFEST_URL;

  const response = await fetch(`${manifestUrl}?t=${now}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch OTA manifest: ${response.status}`);
  }

  const manifest = await response.json();

  if (!manifest.version || !manifest.url || !manifest.checksum) {
    throw new Error('Invalid OTA manifest structure');
  }

  if (!semver.valid(manifest.version)) {
    throw new Error(`Invalid OTA version: ${manifest.version}`);
  }

  manifestCache.set(channel, {
    manifest,
    fetchedAt: now,
  });

  return manifest;
};

/**
 * Handles update checks from native Capgo updater plugin.
 * Capgo sends a POST request with:
 * { app_id, platform, version_name, version_build, plugin_version, channel }
 */
export const checkForUpdate = async (req, res) => {
  try {
    const {
      app_id,
      platform,
      version_name,
      version_build,
      plugin_version,
      channel = 'production',
    } = req.body || {};

    console.log('📦 OTA update check:', {
      app_id,
      platform,
      version_name,
      version_build,
      plugin_version,
      channel,
    });

    // Only Android platform supported for now
    if (platform && platform !== 'android') {
      return res.json({
        version: '',
        url: '',
      });
    }

    // App ID match check
    if (app_id && app_id !== 'com.shobhadamodar.app') {
      return res.json({
        version: '',
        url: '',
      });
    }

    const currentVersion =
      version_name &&
      version_name !== 'builtin' &&
      semver.valid(version_name)
        ? version_name
        : '1.0.0';

    const latest = await getLatestManifest(channel);

    // If client is already up to date or newer
    if (semver.gte(currentVersion, latest.version)) {
      console.log(`📦 No OTA update needed for ${currentVersion} (latest: ${latest.version})`);
      return res.json({
        version: '',
        url: '',
      });
    }

    console.log(`📦 OTA update available: ${currentVersion} → ${latest.version}`);

    return res.json({
      version: latest.version,
      url: latest.url,
      checksum: latest.checksum,
    });
  } catch (error) {
    console.error('❌ OTA update check failed:', error);
    return res.status(500).json({
      message: 'Failed to check for updates',
    });
  }
};

/**
 * Resets the in-memory manifest cache (useful for testing).
 */
export const _resetManifestCacheForTesting = () => {
  manifestCache.clear();
};
