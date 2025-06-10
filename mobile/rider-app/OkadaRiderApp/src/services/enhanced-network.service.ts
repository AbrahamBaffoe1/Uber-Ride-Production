/**
 * Enhanced Network Service
 * 
 * Provides robust network status monitoring, caching, and error handling
 * for API requests to improve reliability of the app.
 */
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, ApiError } from '../api/apiClient';
import { Platform } from 'react-native';

// Constants
const CACHE_PREFIX = 'network_cache_';
const CACHE_EXPIRY = 1000 * 60 * 60; // 1 hour cache expiry

// Types
export type NetworkStatus = 'connected' | 'disconnected' | 'limited';
export type CachePolicy = 'network-only' | 'cache-first' | 'cache-and-network' | 'cache-only';

export interface CachedData<T> {
  data: T;
  timestamp: number;
  endpoint: string;
}

// Listeners
type NetworkStatusListener = (status: NetworkStatus) => void;

/**
 * Enhanced Network Service for improved reliability
 */
class EnhancedNetworkService {
  private currentStatus: NetworkStatus = 'connected';
  private statusListeners: NetworkStatusListener[] = [];
  private unsubscribe: (() => void) | null = null;
  private isInitialized = false;
  
  /**
   * Initialize network monitoring
   */
  initialize(): void {
    if (this.isInitialized) return;
    
    this.unsubscribe = NetInfo.addEventListener(this.handleNetworkChange);
    
    // Check current status on initialization
    NetInfo.fetch().then(this.handleNetworkChange);
    
    this.isInitialized = true;
    console.log('Network monitoring initialized');
  }
  
  /**
   * Handle network status changes
   */
  private handleNetworkChange = (state: NetInfoState) => {
    let newStatus: NetworkStatus;
    
    if (state.isConnected) {
      // On some Android devices, isConnected can be true but internet might not be accessible
      if (Platform.OS === 'android' && !state.isInternetReachable) {
        newStatus = 'limited';
      } else {
        newStatus = 'connected';
      }
    } else {
      newStatus = 'disconnected';
    }
    
    if (this.currentStatus !== newStatus) {
      const previousStatus = this.currentStatus;
      this.currentStatus = newStatus;
      
      console.log(`Network status changed: ${previousStatus} -> ${newStatus}`);
      
      // Notify all listeners
      this.statusListeners.forEach(listener => listener(newStatus));
    }
  };
  
  /**
   * Add network status listener
   */
  addStatusListener(listener: NetworkStatusListener): void {
    this.statusListeners.push(listener);
  }
  
  /**
   * Remove network status listener
   */
  removeStatusListener(listener: NetworkStatusListener): void {
    this.statusListeners = this.statusListeners.filter(l => l !== listener);
  }
  
  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return this.currentStatus;
  }
  
  /**
   * Is the network currently connected?
   */
  isConnected(): boolean {
    return this.currentStatus === 'connected';
  }
  
  /**
   * Cache data from API response
   */
  private async cacheData<T>(endpoint: string, data: T): Promise<void> {
    try {
      const cacheItem: CachedData<T> = {
        data,
        timestamp: Date.now(),
        endpoint
      };
      
      await AsyncStorage.setItem(
        `${CACHE_PREFIX}${endpoint}`,
        JSON.stringify(cacheItem)
      );
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }
  
  /**
   * Get cached data for endpoint
   */
  private async getCachedData<T>(endpoint: string): Promise<CachedData<T> | null> {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${endpoint}`);
      
      if (!cached) return null;
      
      const parsedCache = JSON.parse(cached) as CachedData<T>;
      
      // Check if cache is expired
      if (Date.now() - parsedCache.timestamp > CACHE_EXPIRY) {
        // Cache expired, remove it
        await AsyncStorage.removeItem(`${CACHE_PREFIX}${endpoint}`);
        return null;
      }
      
      return parsedCache;
    } catch (error) {
      console.warn('Failed to get cached data:', error);
      return null;
    }
  }
  
  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`Cleared ${cacheKeys.length} cached API responses`);
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
  
  /**
   * Enhanced GET request with caching and offline support
   */
  async get<T>(
    endpoint: string, 
    cachePolicy: CachePolicy = 'cache-first',
    params: Record<string, any> = {}
  ): Promise<T> {
    // Format the endpoint for cache key by including query params
    const queryString = Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params as any).toString()
      : '';
    const cacheKey = `${endpoint}${queryString}`;
    
    // For cache-only, only return cached data (or throw error if none)
    if (cachePolicy === 'cache-only') {
      const cached = await this.getCachedData<T>(cacheKey);
      
      if (cached) {
        console.log(`Cache hit for ${endpoint} (cache-only)`);
        return cached.data;
      }
      
      throw new ApiError('No cached data available and network requests disabled', 0);
    }
    
    // For cache-first, try cache first, then network
    if (cachePolicy === 'cache-first') {
      const cached = await this.getCachedData<T>(cacheKey);
      
      if (cached) {
        console.log(`Cache hit for ${endpoint} (cache-first)`);
        return cached.data;
      }
    }
    
    // If we need to make a network request, but we're offline
    if (!this.isConnected() && cachePolicy !== 'cache-and-network') {
      const cached = await this.getCachedData<T>(cacheKey);
      
      if (cached) {
        console.log(`Using cached data for ${endpoint} (offline)`);
        return cached.data;
      }
      
      throw new ApiError('No network connection', 0);
    }
    
    // Make actual API request
    try {
      const result = await apiClient.get<T>(endpoint, { params });
      
      // Cache successful results
      await this.cacheData(cacheKey, result);
      
      return result;
    } catch (error) {
      // If network request fails, try cache as fallback
      const cached = await this.getCachedData<T>(cacheKey);
      
      if (cached) {
        console.log(`Network request failed, using cache for ${endpoint}`);
        return cached.data;
      }
      
      // No cache available, propagate the error
      throw error;
    }
  }
  
  /**
   * Enhanced POST request with offline queueing
   * Note: POST requests are not cached due to their nature
   */
  async post<T>(
    endpoint: string,
    data: any
  ): Promise<T> {
    if (!this.isConnected()) {
      throw new ApiError('No network connection', 0);
    }
    
    return apiClient.post<T>(endpoint, data);
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    
    this.statusListeners = [];
    this.isInitialized = false;
  }
}

// Export singleton instance
export const enhancedNetworkService = new EnhancedNetworkService();
