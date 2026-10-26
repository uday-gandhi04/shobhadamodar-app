// src/services/api.js
import axios from 'axios';

export const resolveApiBaseUrl = (
  env = import.meta.env,
  windowObj = typeof window !== 'undefined' ? window : null
) => {
  if (env?.VITE_API_URL) {
    return env.VITE_API_URL;
  }

  const mode = env?.MODE || (env?.DEV ? 'development' : 'production');

  if (mode === 'test') {
    // Dedicated isolated test backend (connected to shobhadamodar_test_sep2026)
    return 'https://shobhadamodar-api-test.onrender.com/api';
  }

  if (mode === 'development' || env?.DEV) {
    // In local browser development (http://localhost:5173), http://localhost:5000/api is appropriate
    const isHttpsOrigin = windowObj?.location?.protocol === 'https:';
    if (isHttpsOrigin) {
      // In a secure origin (e.g. Android WebView on https://localhost), default to HTTPS staging to avoid mixed content
      return 'https://shobhadamodar-api-test.onrender.com/api';
    }
    return 'http://localhost:5000/api';
  }

  // Production release API
  // In Vite test build mode, this static condition allows Rollup DCE to eliminate the production URL
  if (import.meta.env?.MODE === 'test') {
    return 'https://shobhadamodar-api-test.onrender.com/api';
  }

  return 'https://shobhadamodar-api.onrender.com/api';
};

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Returns safe environment and configuration metadata without any sensitive data.
 */
export const getApiConfigInfo = (
  baseUrl = API_BASE_URL,
  env = import.meta.env,
  windowObj = typeof window !== 'undefined' ? window : null
) => {
  const mode = env?.MODE || (env?.DEV ? 'development' : 'production');
  const origin = windowObj?.location?.origin || 'unknown';
  const isHttpsOrigin = windowObj?.location?.protocol === 'https:';
  const isMixedContentRisk = isHttpsOrigin && baseUrl.startsWith('http://');

  return {
    baseUrl,
    mode,
    origin,
    isHttpsOrigin,
    isMixedContentRisk,
  };
};

/**
 * Safe startup configuration check that logs the active base URL and environment
 * without logging tokens, passwords, or sensitive payloads.
 */
export const logApiStartupConfig = (
  baseUrl = API_BASE_URL,
  env = import.meta.env,
  windowObj = typeof window !== 'undefined' ? window : null
) => {
  const info = getApiConfigInfo(baseUrl, env, windowObj);
  console.log(`[API Startup] Mode: "${info.mode}" | API Base URL: ${info.baseUrl} | Origin: ${info.origin}`);
  if (info.isMixedContentRisk) {
    console.warn(
      `[API Startup WARNING] Insecure cleartext API (${info.baseUrl}) requested from secure origin (${info.origin}). Mixed-content requests will be blocked by Android WebView.`
    );
  }
  return info;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000,
});

let refreshPromise = null;

const getStoredValue = (key) =>
  localStorage.getItem(key) || sessionStorage.getItem(key);

const clearStoredSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('user');
};

const storeAccessToken = (token) => {
  const storage = localStorage.getItem('refreshToken') ? localStorage : sessionStorage;
  storage.setItem('token', token);
};

// Attach JWT to every request
api.interceptors.request.use(
  (config) => {
    const token = getStoredValue('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Centralized response error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Backend responded with an error
    if (error.response) {
      const { status, data } = error.response;

      // Token is missing/expired/invalid
      if (status === 401 && !error.config?._retry && !error.config?.url?.includes('/auth/')) {
        const refreshToken = getStoredValue('refreshToken');

        if (refreshToken) {
          if (!refreshPromise) {
            refreshPromise = axios
              .post(
                `${API_BASE_URL}/auth/refresh`,
                { refreshToken },
                { headers: { 'Content-Type': 'application/json' } },
              )
              .then((response) => {
                const newToken = response.data?.token;
                if (!newToken) throw new Error('Refresh response did not include an access token.');
                storeAccessToken(newToken);
                if (response.data?.user) {
                  const storage = localStorage.getItem('refreshToken') ? localStorage : sessionStorage;
                  storage.setItem('user', JSON.stringify(response.data.user));
                }
                return newToken;
              })
              .finally(() => {
                refreshPromise = null;
              });
          }

          try {
            const newToken = await refreshPromise;
            error.config._retry = true;
            error.config.headers = error.config.headers || {};
            error.config.headers.Authorization = `Bearer ${newToken}`;
            return api.request(error.config);
          } catch {
            clearStoredSession();
          }
        } else {
          clearStoredSession();
        }

        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }

      // Normalize the error object so services/components
      // can reliably use error.response.data.message
      error.message =
        data?.message ||
        data?.error ||
        `Request failed with status ${status}`;
    } else if (error.request) {
      error.message = 'Unable to connect to the server.';
    }

    return Promise.reject(error);
  }
);

export default api;