// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Attach JWT to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

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
  (error) => {
    // Backend responded with an error
    if (error.response) {
      const { status, data } = error.response;

      // Token is missing/expired/invalid
      if (status === 401) {
        localStorage.removeItem('token');

        // Only redirect if we're not already on login
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