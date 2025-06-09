import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventEmitter } from 'eventemitter3';
import { SOCKET_URL } from '../config';

// Event types
export type SocketEvent =
  // Ride events
  | 'ride:requested'
  | 'ride:no_riders_available'
  | 'ride:accepted'
  | 'ride:status_updated'
  | 'ride:cancelled'
  | 'ride:cancellation_confirmed'
  | 'rider:location_update'
  // Payment events
  | 'payment:successful'
  | 'payment:failed'
  // Notification events
  | 'notification:new'
  | 'notification:read_confirmed'
  // Error events
  | 'error'
  // Connection events
  | 'connect'
  | 'disconnect';

// Socket event payload types
export interface RideRequestedPayload {
  rideId: string;
  status: string;
  estimatedFare: number;
  estimatedDistance: number;
  estimatedDuration: number;
  message: string;
}

export interface RideAcceptedPayload {
  rideId: string;
  rider: {
    id: string;
    name: string;
    phone: string;
    photo: string | null;
    vehicle: {
      type: string;
      model: string;
      plate: string;
    };
  };
  riderLocation: {
    latitude: number;
    longitude: number;
  } | null;
  estimatedArrival: string;
}

export interface RideStatusUpdatePayload {
  rideId: string;
  status: 'accepted' | 'arrived' | 'started' | 'completed';
  timestamp: string;
  fare?: number;
  distance?: number;
  duration?: number;
}

export interface RiderLocationUpdatePayload {
  rideId: string;
  location: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
  };
  rideStatus: string;
  timestamp: string;
}

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
}

interface OfflineQueueItem {
  id: string;
  eventName: string;
  payload: any;
  priority: number;
  timestamp: number;
  attempts: number;
}

// Socket service class
class SocketService {
  private socket: Socket | null = null;
  private events: EventEmitter;
  private connected: boolean = false;
  private connecting: boolean = false;
  private offlineQueue: OfflineQueueItem[] = [];
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 10;
  private networkListenerActive: boolean = false;

  constructor() {
    this.events = new EventEmitter();
    this.setupNetworkListener();
  }

  /**
   * Set up network state listener to handle reconnection
   */
  private setupNetworkListener(): void {
    if (this.networkListenerActive) return;
    
    try {
      // Note: In a real implementation, we would use NetInfo to monitor network state
      // NetInfo.addEventListener(state => {
      //   if (state.isConnected && !this.connected && !this.connecting) {
      //     this.initialize().catch(error => {
      //       console.error('Failed to initialize socket after network reconnection:', error);
      //     });
      //   }
      // });
      
      this.networkListenerActive = true;
    } catch (error) {
      console.error('Failed to set up network listener:', error);
    }
  }

  /**
   * Initialize and connect the socket
   */
  async initialize(): Promise<void> {
    if (this.socket || this.connecting) {
      return;
    }

    this.connecting = true;

    try {
      // Get authentication token
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Initialize socket connection
      this.socket = io(SOCKET_URL, {
        auth: { token },
        query: {
          device: 'mobile-passenger',
          deviceType: 'Passenger App',
          appVersion: '1.0.0',
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      // Set up event listeners
      this.setupEventListeners();
      
      // Process offline queue when connected
      this.processOfflineQueue();
      
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      this.connecting = false;
      throw error;
    }
  }

  /**
   * Set up socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.connected = true;
      this.connecting = false;
      this.emitEvent('connect', { connected: true });
      this.processOfflineQueue();
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
      this.connected = false;
      this.emitEvent('disconnect', { reason });
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      this.connecting = false;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Maximum reconnection attempts reached, giving up');
        this.disconnect();
      }
    });

    // Ride events
    this.socket.on('ride:requested', (payload: RideRequestedPayload) => {
      this.emitEvent('ride:requested', payload);
    });

    this.socket.on('ride:no_riders_available', (data: { rideId: string; message: string }) => {
      this.emitEvent('ride:no_riders_available', data);
    });

    this.socket.on('ride:accepted', (data: RideAcceptedPayload) => {
      this.emitEvent('ride:accepted', data);
    });

    this.socket.on('ride:status_updated', (data: RideStatusUpdatePayload) => {
      this.emitEvent('ride:status_updated', data);
    });

    this.socket.on('ride:cancellation_confirmed', (data: { rideId: string; status: string; timestamp: string }) => {
      this.emitEvent('ride:cancellation_confirmed', data);
    });

    // Rider location updates
    this.socket.on('rider:location_update', (data: RiderLocationUpdatePayload) => {
      this.emitEvent('rider:location_update', data);
    });

    // Notification events
    this.socket.on('notification:new', (notification: NotificationPayload) => {
      this.emitEvent('notification:new', notification);
    });

    this.socket.on('notification:read_confirmed', (data: { notificationId: string }) => {
      this.emitEvent('notification:read_confirmed', data);
    });

    // Error events
    this.socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error);
      this.emitEvent('error', error);
    });
  }

  /**
   * Disconnect the socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  /**
   * Process the offline queue once connected
   */
  private async processOfflineQueue(): Promise<void> {
    if (!this.connected || !this.socket || this.offlineQueue.length === 0) {
      return;
    }

    // Sort queue by priority (higher first) and timestamp (older first)
    this.offlineQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.timestamp - b.timestamp; // Older items first
    });

    // Process queue
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const queueItem of queue) {
      try {
        if (!this.socket) {
          // Put items back in queue if socket disconnected during processing
          this.offlineQueue.push(queueItem);
          break;
        }

        await new Promise<void>((resolve, reject) => {
          if (!this.socket) {
            reject(new Error('Socket not available'));
            return;
          }

          // Set up response event name
          const responseEvent = `${queueItem.eventName.split(':')[0]}:${queueItem.eventName.split(':')[1]}_confirmed`;

          // Set up a timeout for the operation
          const timeout = setTimeout(() => {
            this.socket?.off(responseEvent, handleResponse);
            this.socket?.off('error', handleError);
            reject(new Error('Socket operation timed out'));
          }, 10000);

          // Set up response and error handlers
          const handleResponse = (data: any) => {
            clearTimeout(timeout);
            this.socket?.off(responseEvent, handleResponse);
            this.socket?.off('error', handleError);
            resolve();
          };

          const handleError = (error: any) => {
            clearTimeout(timeout);
            this.socket?.off(responseEvent, handleResponse);
            this.socket?.off('error', handleError);
            reject(error);
          };

          // Register event listeners
          this.socket.once(responseEvent, handleResponse);
          this.socket.once('error', handleError);

          // Emit the event
          this.socket.emit(queueItem.eventName, queueItem.payload);
        });
      } catch (error) {
        console.error(`Failed to process offline queue item ${queueItem.eventName}:`, error);
        
        // Add back to queue with increased attempts if within limits
        if (queueItem.attempts < 3) {
          this.offlineQueue.push({
            ...queueItem,
            attempts: queueItem.attempts + 1,
          });
        }
      }
    }
  }

  /**
   * Add an item to the offline queue
   * @param eventName Event name
   * @param payload Event payload
   * @param priority Priority (higher is more important)
   * @returns Generated queue item ID
   */
  private addToOfflineQueue(eventName: string, payload: any, priority: number = 1): string {
    const id = Math.random().toString(36).substring(2, 15);
    this.offlineQueue.push({
      id,
      eventName,
      payload,
      priority,
      timestamp: Date.now(),
      attempts: 0,
    });
    return id;
  }

  /**
   * Request a ride
   * @param rideData Ride request data
   * @returns Queue item ID if queued, null if sent immediately
   */
  requestRide(rideData: {
    pickupLocation: {
      latitude: number;
      longitude: number;
      address: string;
    };
    dropoffLocation: {
      latitude: number;
      longitude: number;
      address: string;
    };
    estimatedFare?: number;
    estimatedDistance?: number;
    estimatedDuration?: number;
    paymentMethodId?: string;
  }): string | null {
    if (!this.socket || !this.connected) {
      // Add to offline queue if not connected
      return this.addToOfflineQueue('ride:request', rideData, 3); // High priority
    }

    this.socket.emit('ride:request', rideData);
    return null;
  }

  /**
   * Cancel a ride
   * @param rideId Ride ID
   * @param reason Cancellation reason
   * @returns Queue item ID if queued, null if sent immediately
   */
  cancelRide(rideId: string, reason?: string): string | null {
    if (!this.socket || !this.connected) {
      // Add to offline queue if not connected
      return this.addToOfflineQueue('ride:cancel', { rideId, reason }, 2);
    }

    this.socket.emit('ride:cancel', { rideId, reason });
    return null;
  }

  /**
   * Mark a notification as read
   * @param notificationId Notification ID
   * @returns Queue item ID if queued, null if sent immediately
   */
  markNotificationAsRead(notificationId: string): string | null {
    if (!this.socket || !this.connected) {
      // Add to offline queue
      return this.addToOfflineQueue('notification:read', { notificationId }, 1);
    }

    this.socket.emit('notification:read', { notificationId });
    return null;
  }

  /**
   * Subscribe to a socket event
   * @param event Event name to subscribe to
   * @param callback Callback function to be called when the event is emitted
   */
  on(event: SocketEvent, callback: (data: any) => void): void {
    this.events.on(event, callback);
  }

  /**
   * Unsubscribe from a socket event
   * @param event Event name to unsubscribe from
   * @param callback Callback function to remove
   */
  off(event: SocketEvent, callback: (data: any) => void): void {
    this.events.off(event, callback);
  }

  /**
   * Emit a custom event
   * @param event Event name
   * @param data Event data
   * @returns Queue item ID if queued, null if sent immediately
   */
  emit(event: string, data: any): string | null {
    if (!this.socket || !this.connected) {
      // Add to offline queue if not connected
      return this.addToOfflineQueue(event, data, 1);
    }

    this.socket.emit(event, data);
    return null;
  }

  /**
   * Emit an event to the local event emitter
   * @param event Event name
   * @param data Event data
   */
  private emitEvent(event: SocketEvent, data: any): void {
    this.events.emit(event, data);
  }

  /**
   * Check if socket is connected
   * @returns Whether the socket is connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}

// Export a singleton instance
export const socketService = new SocketService();
