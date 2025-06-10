import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, DEFAULT_HEADERS, REQUEST_TIMEOUT } from './config';
import networkService, { NetworkStatus } from '../services/network.service';

// Type definitions for API responses
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  code?: number;
  pagination?: {
    total: number;
    pages: number;
    page: number;
    limit: number;
  };
}

// Custom error class for API errors
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
  private networkStatusListener: (() => void) | null = null;

  constructor() {
    // Create axios instance
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: REQUEST_TIMEOUT,
      headers: DEFAULT_HEADERS,
    });
    
    // Set up network status listener
    this.setupNetworkListener();

    // Add request interceptor for authentication
    this.instance.interceptors.request.use(
      async (config) => {
        try {
          // Get token if not already loaded
          if (!this.token) {
            this.token = await AsyncStorage.getItem('authToken');
          }

          // If token exists, add it to the headers
          if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
          } else {
            // Log missing token but proceed with request
            console.warn('Authentication token not found. Making unauthenticated request.');
          }
        } catch (error) {
          console.error('Error retrieving auth token:', error);
          // Continue without token rather than failing the request
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
  
  /**
   * Set up network status listener to process queue when connection is restored
   */
  private setupNetworkListener(): void {
    // Remove any existing listener
    if (this.networkStatusListener) {
      this.networkStatusListener();
    }
    
    // Add new listener
    this.networkStatusListener = networkService.addListener((status) => {
      if (status === NetworkStatus.CONNECTED) {
        console.log('Connection restored. Processing queued requests...');
        // Network service will automatically process the queue
      }
    });
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
  
  /**
   * Clean up resources
   */
  public cleanup(): void {
    if (this.networkStatusListener) {
      this.networkStatusListener();
      this.networkStatusListener = null;
    }
  }

  // Handle successful responses
  private handleResponse = (response: AxiosResponse): any => {
    // Cache successful GET responses for offline use
    if (response.config.method?.toLowerCase() === 'get' && response.config.url) {
      try {
        const cacheKey = `api_cache_${response.config.url}_${JSON.stringify(response.config.params || {})}`;
        networkService.cacheData(cacheKey, response.data);
      } catch (error) {
        console.error('Failed to cache API response:', error);
      }
    }
    
    return response.data;
  };

  // Handle errors
  private handleError = async (error: AxiosError) => {
    // Check if error is due to network connectivity
    if (error.message === 'Network Error' || !networkService.isOnline()) {
      console.log('Network error detected. Attempting offline handling...');
      
      // For GET requests, try to get cached data
      if (error.config?.method?.toLowerCase() === 'get' && error.config.url) {
        const cacheKey = `api_cache_${error.config.url}_${JSON.stringify(error.config.params || {})}`;
        const cachedData = networkService.getCachedData(cacheKey);
        
        if (cachedData) {
          console.log(`Using cached data for ${error.config.url}`);
          return cachedData;
        }
      }
      
      // For non-GET requests, queue them for later
      if (error.config && error.config.method && error.config.method.toLowerCase() !== 'get') {
        try {
          const { url, method, data, headers } = error.config;
          
          if (url) {
            // Queue the operation
            await networkService.queueOperation({
              endpoint: url.replace(API_BASE_URL, ''), // Store relative URL
              method: method.toUpperCase() as any,
              data: data ? JSON.parse(data) : undefined,
              headers,
              priority: 'medium' // Default priority
            });
            
            console.log(`Request queued for later execution: ${method} ${url}`);
            return { status: 'queued', message: 'Request queued for execution when online' };
          }
        } catch (queueError) {
          console.error('Failed to queue operation:', queueError);
        }
      }
    }
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status } = error.response;
      const responseData = error.response.data as any;

      // If unauthorized and token exists, token might be expired
      if (status === 401) {
        if (this.token) {
          console.error('Authentication error: Token invalid or expired');
          // Clear token
          this.clearToken();
          // You might want to add logic to refresh token or redirect to login
        } else {
          console.error('Authentication error: No token provided for authenticated endpoint');
        }
      }
      
      // For 404 errors, create a specific ApiError with a "not found" message
      // This makes it easier for services to handle non-existent resources
      if (status === 404) {
        console.log(`Resource not found: ${error.config?.url}`);
        const message = responseData?.message || 'Resource not found';
        throw new ApiError(message, 404, responseData);
      }

      throw new ApiError(
        responseData.message || 'An error occurred',
        status,
        responseData
      );
    } else if (error.request) {
      // The request was made but no response was received
      throw new ApiError('No response from server', 500);
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new ApiError(error.message, 500);
    }
  };

  // Generic request method
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      // If offline and it's a GET request, try to get from cache
      if (!networkService.isOnline() && config.method?.toLowerCase() === 'get' && config.url) {
        const cacheKey = `api_cache_${config.url}_${JSON.stringify(config.params || {})}`;
        const cachedData = networkService.getCachedData(cacheKey);
        
        if (cachedData) {
          console.log(`Using cached data for ${config.url}`);
          return cachedData as T;
        } else {
          console.log(`No cached data available for ${config.url}`);
        }
      }
      
      // Make the request if online or if we don't have cached data
      return await this.instance.request<any, T>(config);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // If it's a network error, try to handle offline
      if (
        (error as any).message === 'Network Error' || 
        !networkService.isOnline()
      ) {
        // For GET requests, see if we have cached data
        if (config.method?.toLowerCase() === 'get' && config.url) {
          const cacheKey = `api_cache_${config.url}_${JSON.stringify(config.params || {})}`;
          const cachedData = networkService.getCachedData(cacheKey);
          
          if (cachedData) {
            console.log(`Using cached data for ${config.url} after error`);
            return cachedData as T;
          }
        }
        
        // For non-GET requests, queue them for later
        if (config.method && config.method.toLowerCase() !== 'get' && config.url) {
          try {
            await networkService.queueOperation({
              endpoint: config.url.replace(API_BASE_URL, ''), // Store relative URL
              method: config.method.toUpperCase() as any,
              data: config.data,
              headers: config.headers as Record<string, string>,
              priority: 'medium' // Default priority
            });
            
            console.log(`Request queued for later execution: ${config.method} ${config.url}`);
            return { status: 'queued', message: 'Request queued for execution when online' } as any;
          } catch (queueError) {
            console.error('Failed to queue operation:', queueError);
          }
        }
        
        // If we can't handle offline, throw a more specific error
        throw new ApiError('Network unavailable. Please check your connection and try again.', 0);
      }
      
      throw new ApiError((error as Error).message, 500);
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
