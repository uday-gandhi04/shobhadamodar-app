// src/services/api.regression.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiBaseUrl, getApiConfigInfo, logApiStartupConfig } from './api.js';

test('API URL Resolution: test environment resolves to dedicated HTTPS staging/test endpoint', () => {
  const env = { MODE: 'test', DEV: false, PROD: true };
  const windowObj = { location: { protocol: 'https:', origin: 'https://localhost' } };

  const url = resolveApiBaseUrl(env, windowObj);

  assert.equal(url, 'https://shobhadamodar-api-test.onrender.com/api');
  assert.notEqual(url, 'https://shobhadamodar-api.onrender.com/api', 'Test build must not point to live production URL');
  assert.ok(url.startsWith('https://'), 'Test build API URL must use HTTPS to avoid WebView mixed content');
  assert.ok(!url.includes('10.0.2.2:5000'), 'Test build must not use insecure cleartext emulator loopback');
});

test('API URL Resolution: production environment resolves explicitly to production HTTPS API', () => {
  const env = { MODE: 'production', DEV: false, PROD: true };
  const windowObj = { location: { protocol: 'https:', origin: 'https://localhost' } };

  const url = resolveApiBaseUrl(env, windowObj);

  assert.equal(url, 'https://shobhadamodar-api.onrender.com/api');
  assert.ok(url.startsWith('https://'), 'Production API must use HTTPS');
});

test('API URL Resolution: local browser development resolves to local HTTP dev URL', () => {
  const env = { MODE: 'development', DEV: true, PROD: false };
  const windowObj = { location: { protocol: 'http:', origin: 'http://localhost:5173' } };

  const url = resolveApiBaseUrl(env, windowObj);

  assert.equal(url, 'http://localhost:5000/api');
});

test('API URL Resolution: development inside HTTPS WebView avoids cleartext and defaults to secure test endpoint', () => {
  const env = { MODE: 'development', DEV: true, PROD: false };
  const windowObj = { location: { protocol: 'https:', origin: 'https://localhost' } };

  const url = resolveApiBaseUrl(env, windowObj);

  assert.equal(url, 'https://shobhadamodar-api-test.onrender.com/api');
  assert.ok(url.startsWith('https://'), 'Must not default to insecure http:// when origin is https://');
});

test('API URL Resolution: explicit VITE_API_URL takes precedence without silent modification', () => {
  const customTunnel = 'https://custom-tunnel.ngrok-free.app/api';
  const env = { VITE_API_URL: customTunnel, MODE: 'test' };
  const windowObj = { location: { protocol: 'https:', origin: 'https://localhost' } };

  const url = resolveApiBaseUrl(env, windowObj);

  assert.equal(url, customTunnel);
});

test('API Mixed Content Detection: getApiConfigInfo flags insecure HTTP target under HTTPS origin', () => {
  const insecureUrl = 'http://10.0.2.2:5000/api';
  const env = { MODE: 'test' };
  const windowObj = { location: { protocol: 'https:', origin: 'https://localhost' } };

  const info = getApiConfigInfo(insecureUrl, env, windowObj);

  assert.equal(info.baseUrl, insecureUrl);
  assert.equal(info.isHttpsOrigin, true);
  assert.equal(info.isMixedContentRisk, true, 'Must detect mixed content risk for http:// target on https:// origin');
});

test('API Mixed Content Detection: getApiConfigInfo confirms no mixed content risk when target is HTTPS', () => {
  const secureUrl = 'https://shobhadamodar-api-test.onrender.com/api';
  const env = { MODE: 'test' };
  const windowObj = { location: { protocol: 'https:', origin: 'https://localhost' } };

  const info = getApiConfigInfo(secureUrl, env, windowObj);

  assert.equal(info.baseUrl, secureUrl);
  assert.equal(info.isHttpsOrigin, true);
  assert.equal(info.isMixedContentRisk, false, 'HTTPS target under HTTPS origin must not have mixed content risk');
});

test('API Safe Startup Check: logApiStartupConfig exposes configuration without sensitive data', () => {
  const secureUrl = 'https://shobhadamodar-api-test.onrender.com/api';
  const env = { MODE: 'test' };
  const windowObj = { location: { protocol: 'https:', origin: 'https://localhost' } };

  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  try {
    const info = logApiStartupConfig(secureUrl, env, windowObj);
    assert.equal(info.baseUrl, secureUrl);
    assert.equal(info.mode, 'test');
    assert.equal(info.origin, 'https://localhost');

    const combinedLog = logs.join('\n');
    assert.ok(combinedLog.includes('[API Startup]'), 'Startup log must contain prefix');
    assert.ok(combinedLog.includes(secureUrl), 'Startup log must identify target base URL');

    // Security assertions: Never leak credentials or sensitive tokens
    assert.ok(!combinedLog.includes('password'), 'Startup log must never include password');
    assert.ok(!combinedLog.includes('token'), 'Startup log must never include token');
    assert.ok(!combinedLog.includes('Authorization'), 'Startup log must never include Authorization header');
  } finally {
    console.log = originalLog;
  }
});
