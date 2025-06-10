import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, DEFAULT_HEADERS, REQUEST_TIMEOUT } from './config';

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

  constructor() {
    // Create axios instance
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: REQUEST_TIMEOUT,
      headers: DEFAULT_HEADERS,
    });

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
        // You might want to add logic to refresh token or redirect to login
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
      return await this.instance.request<any, T>(config);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
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
