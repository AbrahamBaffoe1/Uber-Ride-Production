import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

// Configure axios with authentication token
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add a request interceptor to include auth token in all requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Analytics Service - Provides methods to interact with the analytics endpoints
 */
const AnalyticsService = {
  /**
   * Get performance metrics data
   * @param {string} timeframe - 'day', 'week', 'month', or 'year'
   * @returns {Promise} - Promise with the performance metrics data
   */
  getPerformanceMetrics: async (timeframe = 'month') => {
    try {
      const response = await axiosInstance.get(`/analytics/performance-metrics?timeframe=${timeframe}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      throw error;
    }
  },

  /**
   * Get revenue trend data
   * @param {string} timeframe - 'day', 'week', 'month', or 'year'
   * @returns {Promise} - Promise with the revenue trend data
   */
  getRevenueTrend: async (timeframe = 'month') => {
    try {
      const response = await axiosInstance.get(`/analytics/revenue-trend?timeframe=${timeframe}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching revenue trend:', error);
      throw error;
    }
  },

  /**
   * Get rides completed data
   * @param {string} timeframe - 'day', 'week', 'month', or 'year'
   * @returns {Promise} - Promise with the rides completed data
   */
  getRidesCompleted: async (timeframe = 'month') => {
    try {
      const response = await axiosInstance.get(`/analytics/rides-completed?timeframe=${timeframe}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching rides completed:', error);
      throw error;
    }
  },

  /**
   * Get payment methods distribution
   * @param {string} timeframe - 'day', 'week', 'month', or 'year'
   * @returns {Promise} - Promise with the payment methods data
   */
  getPaymentMethods: async (timeframe = 'month') => {
    try {
      const response = await axiosInstance.get(`/analytics/payment-methods?timeframe=${timeframe}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  },

  /**
   * Get user acquisition data
   * @param {string} timeframe - 'day', 'week', 'month', or 'year'
   * @returns {Promise} - Promise with the user acquisition data
   */
  getUserAcquisition: async (timeframe = 'month') => {
    try {
      const response = await axiosInstance.get(`/analytics/user-acquisition?timeframe=${timeframe}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user acquisition:', error);
      throw error;
    }
  },

  /**
   * Get document analytics data
   * @param {string} timeframe - 'day', 'week', 'month', or 'year'
   * @returns {Promise} - Promise with the document analytics data
   */
  getDocumentAnalytics: async (timeframe = 'month') => {
    try {
      const response = await axiosInstance.get(`/analytics/document-analytics?timeframe=${timeframe}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching document analytics:', error);
      throw error;
    }
  },

  /**
   * Get user behavior analytics data
   * @param {string} timeframe - 'day', 'week', 'month', or 'year'
   * @param {string} userSegment - 'all', 'rider', or 'passenger'
   * @returns {Promise} - Promise with the user behavior data
   */
  getUserBehaviorAnalytics: async (timeframe = 'month', userSegment = 'all') => {
    try {
      const response = await axiosInstance.get(`/analytics/user-behavior?timeframe=${timeframe}&userSegment=${userSegment}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user behavior analytics:', error);
      throw error;
    }
  },
};

export default AnalyticsService;
