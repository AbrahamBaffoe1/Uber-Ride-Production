import axios from 'axios';
import axiosRetry from 'axios-retry';

// Base API URL - from environment variables with fallback
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';

// Create axios instance with common configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 300000, // 5 minute timeout to account for potential MongoDB delays
});

// Configure retry behavior
axiosRetry(apiClient, {
  retries: 5, // Increased number of retry attempts
  retryDelay: (retryCount) => {
    return retryCount * 2000; // More aggressive exponential backoff
  },
  retryCondition: (error) => {
    // Retry on network errors, timeouts, 5xx errors, and MongoDB buffering errors
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           error.code === 'ECONNABORTED' || // Timeout errors
           (error.response && error.response.status >= 500 && error.response.status < 600) ||
           (error.message && error.message.includes('buffering timed out'));
  },
});

// Handle request interceptor to add authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response interceptor for 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear invalid token and refresh token
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      
      // If not on login page already, redirect to login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const authService = {
  /**
   * Login with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Login result
   */
  login: async (email, password) => {
    try {
      const response = await apiClient.post('/admin/login', { email, password });
      
      // Store tokens in localStorage (for a real app, consider using httpOnly cookies)
      if (response.data.success && response.data.data?.token) {
        localStorage.setItem('auth_token', response.data.data.token);
        if (response.data.data.refreshToken) {
          localStorage.setItem('refresh_token', response.data.data.refreshToken);
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      
      // Better error handling for different error types
      if (error.code === 'ERR_NETWORK') {
        return {
          success: false,
          message: 'Network error. Please check your internet connection or contact support.'
        };
      } else if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          message: 'Request timed out. Please try again or contact support.'
        };
      } else if (error.response) {
        // Server returned an error response (4xx, 5xx)
        return {
          success: false,
          message: error.response.data?.message || `Error: ${error.response.status} - ${error.response.statusText}`
        };
      } else {
        // Something else happened
        return {
          success: false,
          message: error.message || 'An unknown error occurred. Please try again.'
        };
      }
    }
  },
  
  /**
   * Logout user
   * @returns {Promise<Object>} Logout result
   */
  logout: async () => {
    try {
      await apiClient.post('/admin/logout');
      
      // Always clear tokens regardless of API response
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      
      // Clear tokens even if API fails
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      
      return {
        success: false,
        message: error.response?.data?.message || 'Error during logout'
      };
    }
  },
  
  /**
   * Refresh token
   * @returns {Promise<Object>} Refresh result
   */
  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await apiClient.post('/admin/refresh-token', { refreshToken });
      
      if (response.data.success && response.data.data?.token) {
        localStorage.setItem('auth_token', response.data.data.token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Token refresh error:', error);
      
      // Clear tokens if refresh fails
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to refresh token'
      };
    }
  },
  
  /**
   * Get current authenticated user
   * @returns {Promise<Object>} Current user data
   */
  getCurrentUser: async () => {
    try {
      const response = await apiClient.get('/admin/me');
      return response.data;
    } catch (error) {
      console.error('Error getting current user:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get user data'
      };
    }
  },
  
  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated: () => {
    return localStorage.getItem('auth_token') !== null;
  },
  
  /**
   * Check if user has required role
   * @param {string|Array} requiredRoles - Required role(s)
   * @returns {Promise<boolean>} Whether user has required role
   */
  hasRole: async (requiredRoles) => {
    try {
      const response = await authService.getCurrentUser();
      
      if (!response.success || !response.data) {
        return false;
      }
      
      const userRole = response.data.role;
      
      if (Array.isArray(requiredRoles)) {
        return requiredRoles.includes(userRole);
      }
      
      return userRole === requiredRoles;
    } catch (error) {
      console.error('Error checking role:', error);
      return false;
    }
  }
};

export default authService;
