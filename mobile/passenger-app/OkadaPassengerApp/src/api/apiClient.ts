import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, REQUEST_TIMEOUT, DEFAULT_HEADERS } from './config';

// Log API connection info for debugging
console.log(`Connecting to API at: ${API_BASE_URL || 'undefined'}`);

// Check if we need to add /mongo prefix to each request
const needsMongoPrefixing = API_BASE_URL ? !API_BASE_URL.endsWith('/mongo') : true;

class ApiClient {
  private instance: AxiosInstance;
  
  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: REQUEST_TIMEOUT,
      headers: DEFAULT_HEADERS
    });
    
    // Log configuration for debugging
    console.log('API Client Configuration:', {
      baseURL: API_BASE_URL,
      timeout: REQUEST_TIMEOUT
    });
    
    this.setupInterceptors();
  }
  
  private setupInterceptors() {
    // Add authentication token to requests
    this.instance.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Handle token refresh on 401 errors
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // Get refresh token and request new tokens
            const refreshToken = await AsyncStorage.getItem('refreshToken');
            
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }
            
            const refreshEndpoint = this.formatEndpoint('/auth/refresh-token');
            const response = await axios.post(`${API_BASE_URL || ''}${refreshEndpoint}`, {
              refreshToken
            }, {
              headers: DEFAULT_HEADERS
            });
            
            // Properly extract tokens from response structure
            // Backend returns { status: 'success', data: { token, refreshToken } }
            const token = response.data?.data?.token || response.data?.token;
            const newRefreshToken = response.data?.data?.refreshToken || response.data?.refreshToken;
            
            if (!token) {
              throw new Error('No token received from refresh');
            }
            
            // Save new tokens
            await AsyncStorage.multiSet([
              ['authToken', token],
              ['refreshToken', newRefreshToken]
            ]);
            
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return this.instance(originalRequest);
          } catch (refreshError) {
            // Clear tokens on refresh failure
            await AsyncStorage.multiRemove(['authToken', 'refreshToken']);
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  // Helper to ensure endpoint has correct prefixing
  private formatEndpoint(endpoint: string): string {
    // If the base URL already includes /mongo, or if the endpoint already starts with /mongo,
    // don't add the prefix
    if (needsMongoPrefixing && !endpoint.startsWith('/mongo')) {
      return `/mongo${endpoint}`;
    }
    return endpoint;
  }

  // HTTP request methods with improved error handling for MongoDB API
  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const formattedEndpoint = this.formatEndpoint(endpoint);
      const response = await this.instance.get<T>(formattedEndpoint, config);
      return response.data;
    } catch (error: any) {
      // Enhanced error logging with details
      console.error(`GET ${endpoint} failed:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // MongoDB-specific error handling
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      
      throw error;
    }
  }
  
  async post<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const formattedEndpoint = this.formatEndpoint(endpoint);
      // Log the request payload for debugging
      console.debug(`POST request to ${formattedEndpoint}:`, data);
      
      const response = await this.instance.post<T>(formattedEndpoint, data, config);
      return response.data;
    } catch (error: any) {
      // Enhanced error logging with details
      console.error(`POST ${endpoint} failed:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // MongoDB-specific error handling
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      
      throw error;
    }
  }
  
  async put<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const formattedEndpoint = this.formatEndpoint(endpoint);
      const response = await this.instance.put<T>(formattedEndpoint, data, config);
      return response.data;
    } catch (error: any) {
      // Enhanced error logging with details
      console.error(`PUT ${endpoint} failed:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // MongoDB-specific error handling
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      
      throw error;
    }
  }
  
  async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const formattedEndpoint = this.formatEndpoint(endpoint);
      const response = await this.instance.delete<T>(formattedEndpoint, config);
      return response.data;
    } catch (error: any) {
      // Enhanced error logging with details
      console.error(`DELETE ${endpoint} failed:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // MongoDB-specific error handling
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      
      throw error;
    }
  }
  
  async patch<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const formattedEndpoint = this.formatEndpoint(endpoint);
      const response = await this.instance.patch<T>(formattedEndpoint, data, config);
      return response.data;
    } catch (error: any) {
      // Enhanced error logging with details
      console.error(`PATCH ${endpoint} failed:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // MongoDB-specific error handling
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      
      throw error;
    }
  }
}

export const apiClient = new ApiClient();
