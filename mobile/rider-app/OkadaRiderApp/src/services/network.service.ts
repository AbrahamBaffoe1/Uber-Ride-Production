import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Network status types
 */
export enum NetworkStatus {
  UNKNOWN = 'unknown',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
}

/**
 * Queue item for offline operations
 */
export interface QueuedOperation {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Event listener types for network changes
 */
export type NetworkListener = (status: NetworkStatus) => void;

/**
 * Network service for handling connectivity and offline operations
 */
class NetworkService {
  private currentStatus: NetworkStatus = NetworkStatus.UNKNOWN;
  private listeners: NetworkListener[] = [];
  private netInfoSubscription: NetInfoSubscription | null = null;
  private operationQueue: QueuedOperation[] = [];
  private processingQueue: boolean = false;
  private offlineDataCache: Record<string, { data: any; timestamp: number }> = {};
  private readonly QUEUE_STORAGE_KEY = '@okada_rider_operation_queue';
  private readonly CACHE_STORAGE_KEY = '@okada_rider_offline_cache';
  private readonly MAX_RETRY_COUNT = 3;
  private readonly CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.initNetworkMonitoring();
    this.loadPersistedData();
  }

  /**
   * Initialize network monitoring
   */
  private initNetworkMonitoring(): void {
    if (this.netInfoSubscription) {
      this.netInfoSubscription();
    }

    this.netInfoSubscription = NetInfo.addEventListener(this.handleNetworkChange);
    
    // Get initial state
    NetInfo.fetch().then(this.handleNetworkChange);
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange = (state: NetInfoState): void => {
    const previousStatus = this.currentStatus;
    
    if (state.isConnected && state.isInternetReachable) {
      this.currentStatus = NetworkStatus.CONNECTED;
    } else {
      this.currentStatus = NetworkStatus.DISCONNECTED;
    }

    // Only notify if status has changed
    if (previousStatus !== this.currentStatus) {
      console.log(`Network status changed: ${this.currentStatus}`);
      
      this.notifyListeners();
      
      // Process queue if we're back online
      if (this.currentStatus === NetworkStatus.CONNECTED) {
        this.processOperationQueue();
      }
    }
  };

  /**
   * Notify all registered listeners of the current network status
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentStatus);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }

  /**
   * Load persisted queue and cache from storage
   */
  private async loadPersistedData(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(this.QUEUE_STORAGE_KEY);
      if (queueData) {
        this.operationQueue = JSON.parse(queueData);
      }

      const cacheData = await AsyncStorage.getItem(this.CACHE_STORAGE_KEY);
      if (cacheData) {
        this.offlineDataCache = JSON.parse(cacheData);
        this.cleanExpiredCache();
      }
    } catch (error) {
      console.error('Error loading persisted network data:', error);
    }
  }

  /**
   * Save queue to persistent storage
   */
  private async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.QUEUE_STORAGE_KEY,
        JSON.stringify(this.operationQueue)
      );
    } catch (error) {
      console.error('Error persisting operation queue:', error);
    }
  }

  /**
   * Save cache to persistent storage
   */
  private async persistCache(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.CACHE_STORAGE_KEY,
        JSON.stringify(this.offlineDataCache)
      );
    } catch (error) {
      console.error('Error persisting offline cache:', error);
    }
  }

  /**
   * Remove expired items from the cache
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    let cacheChanged = false;

    Object.keys(this.offlineDataCache).forEach(key => {
      const item = this.offlineDataCache[key];
      if (now - item.timestamp > this.CACHE_EXPIRY_TIME) {
        delete this.offlineDataCache[key];
        cacheChanged = true;
      }
    });

    if (cacheChanged) {
      this.persistCache();
    }
  }

  /**
   * Process the operation queue when online
   */
  private async processOperationQueue(): Promise<void> {
    if (
      this.processingQueue ||
      this.currentStatus !== NetworkStatus.CONNECTED ||
      this.operationQueue.length === 0
    ) {
      return;
    }

    this.processingQueue = true;

    try {
      // Sort queue by priority (high first) and timestamp (older first)
      const sortedQueue = [...this.operationQueue].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.timestamp - b.timestamp;
      });

      const processedIds: string[] = [];
      
      for (const operation of sortedQueue) {
        try {
          // Here we would normally use apiClient to execute the operation
          // For demonstration, we'll just log it
          console.log(`Processing queued operation: ${operation.method} ${operation.endpoint}`);
          
          // In a real implementation, we would:
          // const response = await apiClient[operation.method.toLowerCase()](
          //   operation.endpoint,
          //   operation.data,
          //   { headers: operation.headers }
          // );
          
          // Mark as processed
          processedIds.push(operation.id);
          
        } catch (error) {
          console.error(`Error processing operation ${operation.id}:`, error);
          
          // Increment retry count
          operation.retryCount++;
          
          // Remove from processed list if max retries exceeded
          if (operation.retryCount > this.MAX_RETRY_COUNT) {
            processedIds.push(operation.id);
            console.log(`Operation ${operation.id} exceeded max retry count, removing from queue`);
          }
        }
      }

      // Remove processed operations from queue
      if (processedIds.length > 0) {
        this.operationQueue = this.operationQueue.filter(
          op => !processedIds.includes(op.id)
        );
        await this.persistQueue();
      }
    } catch (error) {
      console.error('Error processing operation queue:', error);
    } finally {
      this.processingQueue = false;
      
      // If there are still items in the queue, try again later
      if (this.operationQueue.length > 0) {
        setTimeout(() => this.processOperationQueue(), 30000); // Try again in 30 seconds
      }
    }
  }

  /**
   * Add a listener for network status changes
   * @param listener Function to call when network status changes
   * @returns Function to remove the listener
   */
  public addListener(listener: NetworkListener): () => void {
    this.listeners.push(listener);
    
    // Immediately notify with current status
    try {
      listener(this.currentStatus);
    } catch (error) {
      console.error('Error in network listener:', error);
    }
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Get current network status
   * @returns Current network status
   */
  public getNetworkStatus(): NetworkStatus {
    return this.currentStatus;
  }

  /**
   * Check if device is currently online
   * @returns True if online, false otherwise
   */
  public isOnline(): boolean {
    return this.currentStatus === NetworkStatus.CONNECTED;
  }

  /**
   * Queue an operation to be executed when online
   * @param operation Operation to queue
   * @returns Operation ID
   */
  public async queueOperation(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queueItem: QueuedOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    this.operationQueue.push(queueItem);
    await this.persistQueue();
    
    // If we're online, try to process the queue immediately
    if (this.currentStatus === NetworkStatus.CONNECTED) {
      this.processOperationQueue();
    }
    
    return id;
  }

  /**
   * Cache data for offline use
   * @param key Cache key
   * @param data Data to cache
   */
  public async cacheData(key: string, data: any): Promise<void> {
    this.offlineDataCache[key] = {
      data,
      timestamp: Date.now(),
    };
    
    await this.persistCache();
  }

  /**
   * Get cached data
   * @param key Cache key
   * @returns Cached data or null if not found
   */
  public getCachedData(key: string): any {
    const item = this.offlineDataCache[key];
    
    if (!item) {
      return null;
    }
    
    // Check if expired
    if (Date.now() - item.timestamp > this.CACHE_EXPIRY_TIME) {
      delete this.offlineDataCache[key];
      this.persistCache();
      return null;
    }
    
    return item.data;
  }

  /**
   * Get all pending operations
   * @returns Array of pending operations
   */
  public getPendingOperations(): QueuedOperation[] {
    return [...this.operationQueue];
  }

  /**
   * Clear all pending operations
   */
  public async clearPendingOperations(): Promise<void> {
    this.operationQueue = [];
    await this.persistQueue();
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    if (this.netInfoSubscription) {
      this.netInfoSubscription();
      this.netInfoSubscription = null;
    }
    
    this.listeners = [];
  }
}

// Export as singleton
export const networkService = new NetworkService();
export default networkService;
