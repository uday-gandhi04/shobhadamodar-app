// src/controllers/update.controller.test.js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkForUpdate,
  getLatestManifest,
  _resetManifestCacheForTesting,
} from './update.controller.js';

describe('Update Controller (MoBoxd Architecture)', () => {
  beforeEach(() => {
    _resetManifestCacheForTesting();
  });

  it('rejects update request for non-Android platforms', async () => {
    let responseData = null;
    const req = {
      body: {
        platform: 'ios',
        app_id: 'com.shobhadamodar.app',
        version_name: '1.0.0',
      },
    };
    const res = {
      json: (data) => {
        responseData = data;
        return res;
      },
      status: () => res,
    };

    await checkForUpdate(req, res);
    assert.deepEqual(responseData, { version: '', url: '' });
  });

  it('rejects update request for different app_id', async () => {
    let responseData = null;
    const req = {
      body: {
        platform: 'android',
        app_id: 'com.other.app',
        version_name: '1.0.0',
      },
    };
    const res = {
      json: (data) => {
        responseData = data;
        return res;
      },
      status: () => res,
    };

    await checkForUpdate(req, res);
    assert.deepEqual(responseData, { version: '', url: '' });
  });

  it('returns empty update when current version is gte latest version', async () => {
    let responseData = null;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        version: '1.0.1',
        url: 'https://github.com/uday-gandhi04/shobhadamodar-app/releases/download/v1.0.1/bundle.zip',
        checksum: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      }),
    });

    try {
      const req = {
        body: {
          platform: 'android',
          app_id: 'com.shobhadamodar.app',
          version_name: '1.0.1',
        },
      };
      const res = {
        json: (data) => {
          responseData = data;
          return res;
        },
        status: () => res,
      };

      await checkForUpdate(req, res);
      assert.deepEqual(responseData, { version: '', url: '' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns version, url, and checksum when an update is available', async () => {
    let responseData = null;
    const originalFetch = globalThis.fetch;
    const mockManifest = {
      version: '1.0.5',
      url: 'https://github.com/uday-gandhi04/shobhadamodar-app/releases/download/v1.0.5/bundle.zip',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    };

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => mockManifest,
    });

    try {
      const req = {
        body: {
          platform: 'android',
          app_id: 'com.shobhadamodar.app',
          version_name: '1.0.0',
        },
      };
      const res = {
        json: (data) => {
          responseData = data;
          return res;
        },
        status: () => res,
      };

      await checkForUpdate(req, res);
      assert.deepEqual(responseData, {
        version: '1.0.5',
        url: mockManifest.url,
        checksum: mockManifest.checksum,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('handles builtin version string cleanly as 1.0.0', async () => {
    let responseData = null;
    const originalFetch = globalThis.fetch;
    const mockManifest = {
      version: '1.0.2',
      url: 'https://github.com/uday-gandhi04/shobhadamodar-app/releases/download/v1.0.2/bundle.zip',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    };

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => mockManifest,
    });

    try {
      const req = {
        body: {
          platform: 'android',
          app_id: 'com.shobhadamodar.app',
          version_name: 'builtin',
        },
      };
      const res = {
        json: (data) => {
          responseData = data;
          return res;
        },
        status: () => res,
      };

      await checkForUpdate(req, res);
      assert.equal(responseData.version, '1.0.2');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
