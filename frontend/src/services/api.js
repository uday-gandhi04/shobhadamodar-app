// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
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
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
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