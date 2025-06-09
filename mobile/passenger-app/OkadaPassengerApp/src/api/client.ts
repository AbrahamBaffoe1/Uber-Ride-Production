import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, DEFAULT_HEADERS, REQUEST_TIMEOUT } from './config';

// Type definitions for API responses
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  code?: number;
}

// Create a custom error class for API errors
export class ApiError extends Error {
  code: number;
  response?: any;

  constructor(message: string, code = 500, response?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.response = response;
  }
}

class ApiClient {
  private instance: AxiosInstance;
  private token: string | null = null;

  constructor() {
    // Create axios instance
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: REQUEST_TIMEOUT,
      headers: DEFAULT_HEADERS,
    });
    
    // Check if we need to add /mongo prefix to each request
    const needsMongoPrefixing = API_BASE_URL ? !API_BASE_URL.endsWith('/mongo') : true;
    
    // Add request transformer to handle MongoDB prefixing
    this.instance.interceptors.request.use(
      (config) => {
        // Add /mongo prefix if needed
        if (needsMongoPrefixing && config.url && !config.url.startsWith('/mongo')) {
          config.url = `/mongo${config.url}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add request interceptor for authentication
    this.instance.interceptors.request.use(
      async (config) => {
        // Get token if not already loaded
        if (!this.token) {
          this.token = await AsyncStorage.getItem('authToken');
        }

        // If token exists, add it to the headers
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.instance.interceptors.response.use(
      this.handleResponse,
      this.handleError
    );
  }

  // Set auth token
  public setToken(token: string): void {
    this.token = token;
    AsyncStorage.setItem('authToken', token);
  }

  // Clear auth token
  public clearToken(): void {
    this.token = null;
    AsyncStorage.removeItem('authToken');
  }

  // Handle successful responses
  private handleResponse = (response: AxiosResponse): any => {
    return response.data;
  };

  // Handle errors
  private handleError = async (error: AxiosError) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status } = error.response;
      const responseData = error.response.data as any;

      // If unauthorized and token exists, token might be expired
      if (status === 401 && this.token) {
        // Clear token
        this.clearToken();
        
        // Try to get a refresh token and reauthenticate
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            // Attempt to refresh token - this endpoint should return a new auth token
            const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
              refreshToken
            }, {
              headers: DEFAULT_HEADERS
            });
            
            // Check for nested data structure in MongoDB responses
            const newToken = refreshResponse.data?.data?.token || refreshResponse.data?.token;
            const newRefreshToken = refreshResponse.data?.data?.refreshToken || refreshResponse.data?.refreshToken;
            
            if (newToken) {
              // Set the new token
              this.setToken(newToken);
              
              // If we also got a new refresh token, save it
              if (newRefreshToken) {
                AsyncStorage.setItem('refreshToken', newRefreshToken);
              }
              
              // Retry the original request with the new token
              const originalRequest = error.config;
              if (originalRequest && originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return this.instance.request(originalRequest);
              }
            }
          } catch (refreshError) {
            console.error('Failed to refresh token:', refreshError);
            // Let the user know they need to login again
            AsyncStorage.removeItem('refreshToken');
          }
        }
      }

      // Map MongoDB/API error formats to ApiError format
      // Improved error handling for different API response formats
      // MongoDB-specific format with 'success: false'
      if (responseData.success === false) {
        throw new ApiError(
          responseData.message || 'API request failed',
          status,
          responseData
        );
      }
      // Standard error object format
      else if (responseData.error && typeof responseData.error === 'object') {
        throw new ApiError(
          responseData.error.message || 'An error occurred',
          responseData.error.code || status,
          responseData
        );
      }
      // Standard status:'error' format from our MongoDB API
      else if (responseData.status === 'error') {
        throw new ApiError(
          responseData.message || 'An error occurred',
          responseData.code || status,
          responseData
        );
      }
      // Fall back to a simple message
      else {
        throw new ApiError(
          responseData.message || 'An error occurred',
          status,
          responseData
        );
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Network error: No response received', error);
      if (error.code === 'ECONNABORTED') {
        throw new ApiError('Request timed out. The server is taking too long to respond.', 408);
      } else {
        throw new ApiError('Network error. Please check your connection and try again.', 500);
      }
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request setup error:', error);
      throw new ApiError(error.message || 'Unknown error occurred while connecting to server', 500);
    }
  };

  // Generic request method
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      return await this.instance.request<any, T>(config);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError((error as Error).message || 'Unknown error', 500);
    }
  }

  // GET request
  public async get<T = any>(url: string, params = {}): Promise<T> {
    return this.request<T>({
      method: 'get',
      url,
      params,
    });
  }

  // POST request
  public async post<T = any>(url: string, data = {}, config = {}): Promise<T> {
    return this.request<T>({
      method: 'post',
      url,
      data,
      ...config,
    });
  }

  // PUT request
  public async put<T = any>(url: string, data = {}): Promise<T> {
    return this.request<T>({
      method: 'put',
      url,
      data,
    });
  }

  // PATCH request
  public async patch<T = any>(url: string, data = {}): Promise<T> {
    return this.request<T>({
      method: 'patch',
      url,
      data,
    });
  }

  // DELETE request
  public async delete<T = any>(url: string, params = {}): Promise<T> {
    return this.request<T>({
      method: 'delete',
      url,
      params,
    });
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();
