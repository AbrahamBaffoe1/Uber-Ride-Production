import axios from 'axios';

// Base API URL should be set based on environment
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';

// Create axios instance with common config
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Add auth token to requests
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

const userService = {
  /**
   * Get a list of users with pagination and filtering
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Users with pagination data
   */
  getUsers: async (params = {}) => {
    try {
      const response = await apiClient.get('/admin/users', {
        params
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get a single user by ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} User object
   */
  getUserById: async (userId) => {
    try {
      const response = await apiClient.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  createUser: async (userData) => {
    try {
      const response = await apiClient.post('/users', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Update a user
   * @param {String} userId - User ID
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object>} Updated user
   */
  updateUser: async (userId, userData) => {
    try {
      const response = await apiClient.put(`/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Delete a user
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Deletion result
   */
  deleteUser: async (userId) => {
    try {
      const response = await apiClient.delete(`/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get user activity
   * @param {String} userId - User ID
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} User activity
   */
  getUserActivity: async (userId, params = {}) => {
    try {
      const response = await apiClient.get(`/users/${userId}/activity`, {
        params
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Update user role
   * @param {String} userId - User ID
   * @param {String} role - Role name
   * @returns {Promise<Object>} Update result
   */
  updateUserRoles: async (userId, role) => {
    try {
      const response = await apiClient.put(`/users/${userId}/roles`, { roles: [role] });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Reset user password
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Reset result
   */
  resetUserPassword: async (userId) => {
    try {
      const response = await apiClient.post(`/users/${userId}/reset-password`, {});
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Lock or unlock user account
   * @param {String} userId - User ID
   * @param {Boolean} locked - Lock status
   * @returns {Promise<Object>} Update result
   */
  setUserLockStatus: async (userId, locked) => {
    try {
      const response = await apiClient.put(`/users/${userId}/lock-status`, { locked });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Toggle user verification status
   * @param {String} userId - User ID
   * @param {Object} verificationData - {verifyEmail: boolean, verifyPhone: boolean}
   * @returns {Promise<Object>} Verification update result
   */
  toggleVerification: async (userId, verificationData) => {
    try {
      const response = await apiClient.put(`/admin/toggle-verification/${userId}`, verificationData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get user statistics
   * @returns {Promise<Object>} User stats
   */
  getUserStats: async () => {
    try {
      const response = await apiClient.get('/users/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default userService;
