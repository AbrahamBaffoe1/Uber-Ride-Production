/**
 * Analytics Service
 * 
 * Provides methods to interact with the analytics API endpoints
 * for both Payment and OTP analytics data
 */
import axios from 'axios';

// Base API URL - from environment variables with fallback
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';

// Create axios instance with common config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Add auth token to requests - this would be enhanced in a real app
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

// Analytics service methods
const analyticsService = {
  /**
   * Get payment analytics data
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} - Payment analytics data
   */
  getPaymentAnalytics: async (params = {}) => {
    try {
      const response = await apiClient.get('/analytics/payments', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching payment analytics:', error);
      throw error;
    }
  },
  
  /**
   * Get payment analytics summary
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} - Summary metrics
   */
  getPaymentSummary: async (params = {}) => {
    try {
      const response = await apiClient.get('/analytics/payments/summary', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching payment summary:', error);
      throw error;
    }
  },

  /**
   * Generate payment analytics report
   * @param {Object} params - Report parameters
   * @returns {Promise<Object>} - Report data
   */
  generatePaymentReport: async (params = {}) => {
    try {
      const response = await apiClient.get('/analytics/payments/report', { params });
      return response.data;
    } catch (error) {
      console.error('Error generating payment report:', error);
      throw error;
    }
  },

  /**
   * Get OTP analytics data
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} - OTP analytics data
   */
  getOtpAnalytics: async (params = {}) => {
    try {
      const response = await apiClient.get('/analytics/otp', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching OTP analytics:', error);
      throw error;
    }
  },
  
  /**
   * Get OTP analytics summary
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} - Summary metrics
   */
  getOtpSummary: async (params = {}) => {
    try {
      const response = await apiClient.get('/analytics/otp/summary', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching OTP summary:', error);
      throw error;
    }
  },

  /**
   * Get OTP delivery methods breakdown
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} - Delivery methods data
   */
  getOtpDeliveryMethods: async (params = {}) => {
    try {
      const response = await apiClient.get('/analytics/otp/delivery-methods', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching OTP delivery methods:', error);
      throw error;
    }
  },

  /**
   * Get OTP user segments breakdown
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} - User segments data
   */
  getOtpUserSegments: async (params = {}) => {
    try {
      const response = await apiClient.get('/analytics/otp/user-segments', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching OTP user segments:', error);
      throw error;
    }
  },

  /**
   * Generate OTP analytics report
   * @param {Object} params - Report parameters
   * @returns {Promise<Object>} - Report data
   */
  generateOtpReport: async (params = {}) => {
    try {
      const response = await apiClient.get('/analytics/otp/report', { params });
      return response.data;
    } catch (error) {
      console.error('Error generating OTP report:', error);
      throw error;
    }
  }
};

export default analyticsService;
