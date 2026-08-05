import axios from 'axios';

// Get base URL from Vite environment variable or default to localhost:5000
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

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
    // Track request start timestamp for precise latency measurement
    config.metadata = { startTime: new Date() };
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 2. Response Interceptor: Handle status codes, calculate latency, log errors
api.interceptors.response.use(
  (response) => {
    // Compute request duration in milliseconds
    const duration = new Date() - response.config.metadata.startTime;
    response.durationMs = duration;
    return response;
  },
  (error) => {
    const duration = error.config?.metadata?.startTime
      ? new Date() - error.config.metadata.startTime
      : 0;

    let errorDetail = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      url: error.config?.url || 'Unknown URL',
      method: (error.config?.method || 'GET').toUpperCase(),
      status: error.response?.status || 'NETWORK_ERROR',
      message: error.response?.data?.message || error.message || 'An unexpected network error occurred.',
      durationMs: duration,
      data: error.response?.data || null,
    };

    // Global Error Logger Notification
    if (errorLoggerCallback) {
      errorLoggerCallback(errorDetail);
    }

    // Handle 401 Unauthorized globally
    if (error.response?.status === 401) {
      console.warn('[API Interceptor] 401 Unauthorized encountered. Token may be expired.');
    }

    return Promise.reject(errorDetail);
  }
);

export default api;
