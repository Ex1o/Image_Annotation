/**
 * Axios interceptors configuration
 * Automatically attaches JWT tokens to requests and handles token refresh
 */
import axios from 'axios';
import { authService } from './auth-service';

axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

// Setup request interceptor to add JWT token to headers
axios.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Setup response interceptor to handle 401 errors and token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = String(originalRequest?.url || '');
    const isRefreshRequest = requestUrl.includes('/auth/refresh');
    const isAuthRequestWithoutRefresh =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/verify-email');

    // Avoid refresh loops by never retrying the refresh endpoint itself.
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshRequest &&
      !isAuthRequestWithoutRefresh
    ) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const refreshed = await authService.refreshToken();
        
        if (refreshed) {
          // Retry the original request with new token
          const newToken = authService.getToken();
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axios(originalRequest);
        }

        authService.logout();
        window.location.href = '/login';
      } catch (refreshError) {
        // If refresh fails, logout user
        authService.logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axios;
