import axios from 'axios';

/**
 * Resolves API Base URL dynamically:
 * 1. Checks VITE_API_URL or VITE_API_BASE_URL from build environment.
 * 2. In browser environments:
 *    - On localhost / 127.0.0.1: defaults to http://localhost:5000/api/v1
 *    - On production domains (e.g. *.onrender.com / https): defaults to https://trustgraph-api.onrender.com/api/v1
 */
function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    let clean = envUrl.trim().replace(/\/+$/, '');
    if (!clean.endsWith('/api/v1') && !clean.endsWith('/api')) {
      clean = `${clean}/api/v1`;
    }
    return clean;
  }

  // Smart browser runtime fallback
  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000/api/v1';
    }
    if (hostname.includes('onrender.com') || protocol === 'https:') {
      return 'https://trustgraph-api.onrender.com/api/v1';
    }
  }

  return 'http://localhost:5000/api/v1';
}

const API_BASE_URL = getApiBaseUrl();

// Create Axios Instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Event subscriber callback for global error logging
let errorLoggerCallback = null;

export const setErrorLogger = (callback) => {
  errorLoggerCallback = callback;
};

// 1. Request Interceptor: Automatically attach JWT Token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('trustgraph_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.metadata = { startTime: new Date() };

    // When sending FormData, delete Content-Type so Axios / browser automatically
    // calculates the multipart/form-data header with the correct boundary parameter.
    if (config.data instanceof FormData) {
      if (
        !config.headers['Content-Type'] ||
        config.headers['Content-Type'] === 'multipart/form-data' ||
        config.headers['Content-Type'] === 'application/json'
      ) {
        delete config.headers['Content-Type'];
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 2. Response Interceptor: Handle status codes, calculate latency, log errors
api.interceptors.response.use(
  (response) => {
    const duration = new Date() - response.config.metadata.startTime;
    response.durationMs = duration;
    return response;
  },
  (error) => {
    const duration = error.config?.metadata?.startTime
      ? new Date() - error.config.metadata.startTime
      : 0;

    const status = error.response
      ? error.response.status
      : error.code === 'ECONNABORTED'
      ? 'TIMEOUT'
      : 'NETWORK_ERROR';

    let userFriendlyMessage = 'Unable to connect to TrustGraph server. Please verify backend URL & network status.';

    if (error.response?.data?.message) {
      userFriendlyMessage = error.response.data.message;
    } else if (status === 401) {
      userFriendlyMessage = 'Invalid email address or password.';
    } else if (status === 403) {
      userFriendlyMessage = 'Access denied. Account may be suspended or unauthorized.';
    } else if (status === 404) {
      userFriendlyMessage = 'Authentication service endpoint was not found (404).';
    } else if (status === 500) {
      userFriendlyMessage = 'TrustGraph server encountered an internal error. Please try again later.';
    } else if (status === 'TIMEOUT') {
      userFriendlyMessage = 'TrustGraph server did not respond in time (timeout).';
    } else if (status === 'NETWORK_ERROR') {
      userFriendlyMessage = 'Unable to connect to TrustGraph server. Please verify backend URL & network status.';
    } else if (error.message) {
      userFriendlyMessage = error.message;
    }

    const errorDetail = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      url: error.config?.url || 'Unknown URL',
      method: (error.config?.method || 'GET').toUpperCase(),
      status: status,
      message: userFriendlyMessage,
      durationMs: duration,
      data: error.response?.data || null,
    };

    if (errorLoggerCallback) {
      errorLoggerCallback(errorDetail);
    }

    if (error.response?.status === 401) {
      console.warn('[API Interceptor] 401 Unauthorized encountered. Invalid credentials or expired session.');
    }

    return Promise.reject(errorDetail);
  }
);

export default api;
