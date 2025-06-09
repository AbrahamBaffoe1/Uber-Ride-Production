import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL } from '../config';
import { Platform } from 'react-native';

/**
 * Socket events that can be listened for
 */
export type SocketEvent =
  // Ride events
  | 'ride:new_request'
  | 'ride:request'
  | 'ride:acceptance_confirmed'
  | 'ride:status_update_confirmed'
  | 'ride:cancelled'
  | 'ride:taken'
  // Location events
  | 'location:updated'
  // Availability events
  | 'availability:updated'
  // Error events
  | 'error'
  | 'auth_error'
  | 'reconnect_failed'
  // Connection events
  | 'connect'
  | 'disconnect';

/**
 * Socket.IO Service for real-time communication
 * Handles ride requests, location updates, and status changes
 */
class SocketService {
  private socket: Socket | null = null;
  private isInitialized: boolean = false;
  private eventListeners: Map<string, Function[]> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 5000; // 5 seconds
  private currentStatus: 'online' | 'busy' | 'offline' = 'offline';
  private locationUpdateTimer: any = null;
  private locationUpdateInterval: number = 15000; // 15 seconds
  
  /**
   * Initialize the socket connection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Socket is already initialized');
      return;
    }
    
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // Don't connect if no token is available (user not authenticated)
      if (!token) {
        console.log('Socket initialization skipped: No authentication token found');
        return;
      }

      console.log('Initializing rider socket connection to:', SOCKET_URL);
      
      // Generate a simple device identifier if needed
      const deviceId = `rider-${Math.random().toString(36).substring(2, 15)}`;
      
      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        auth: {
          token
        },
        query: {
          device: deviceId,
          platform: Platform.OS,
          appVersion: '1.0.0', // Hardcoded version
          role: 'rider', // Identify as rider
          os: Platform.OS
        }
      });
      
      this.setupEventHandlers();
      this.isInitialized = true;
      console.log('Socket initialized successfully');
    } catch (error) {
      console.error('Failed to initialize socket connection:', error);
      // Don't throw error - just log it
      // This prevents app crashes when backend is not running
    }
  }
  
  /**
   * Set up default event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;
    
    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected successfully, ID:', this.socket?.id);
      this.reconnectAttempts = 0;
      
      // Re-authenticate on reconnect
      this.authenticate();
      
      // Start automatic location updates if online
      if (this.currentStatus === 'online') {
        this.startLocationUpdates();
      }
      
      this.triggerListeners('connect', { connected: true });
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.handleReconnect();
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isInitialized = false;
      
      if (reason === 'io server disconnect') {
        // Server disconnected us, need to reconnect manually
        this.reconnect();
      }
    });
    
    // Rider-specific events
    this.socket.on('ride:new_request', (data) => {
      console.log('New ride request received:', data);
      this.triggerListeners('ride:new_request', data);
    });
    
    // Legacy event name
    this.socket.on('ride:request', (data) => {
      console.log('New ride request received (legacy event):', data);
      this.triggerListeners('ride:request', data);
    });
    
    this.socket.on('ride:cancelled', (data) => {
      console.log('Ride cancelled by passenger:', data);
      this.triggerListeners('ride:cancelled', data);
    });
    
    this.socket.on('ride:status_update_confirmed', (data) => {
      console.log('Ride status update confirmed:', data);
      this.triggerListeners('ride:status_update_confirmed', data);
    });
    
    this.socket.on('ride:acceptance_confirmed', (data) => {
      console.log('Ride acceptance confirmed:', data);
      this.triggerListeners('ride:acceptance_confirmed', data);
      
      // Update status to busy when ride is accepted
      this.currentStatus = 'busy';
    });
    
    this.socket.on('ride:taken', (data) => {
      console.log('Ride taken by another rider:', data);
      this.triggerListeners('ride:taken', data);
    });
    
    // Location events
    this.socket.on('location:updated', (data) => {
      console.log('Location update confirmed');
      this.triggerListeners('location:updated', data);
    });
    
    // Availability events
    this.socket.on('availability:updated', (data) => {
      console.log('Availability update confirmed:', data);
      this.triggerListeners('availability:updated', data);
    });
    
    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.triggerListeners('error', error);
    });
  }
  
  /**
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Maximum reconnection attempts reached');
      this.triggerListeners('reconnect_failed', null);
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.reconnect();
    }, this.reconnectInterval);
  }
  
  /**
   * Reconnect to the socket server
   */
  async reconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.connect();
    } else {
      await this.initialize();
    }
  }
  
  /**
   * Authenticate with the socket server
   */
  private async authenticate(): Promise<void> {
    if (!this.socket) return;
    
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      this.socket.emit('authenticate', { token }, (response: any) => {
        if (response.success) {
          console.log('Socket authentication successful');
        } else {
          console.error('Socket authentication failed:', response.message);
          this.triggerListeners('auth_error', response);
        }
      });
    } catch (error) {
      console.error('Authentication error:', error);
    }
  }
  
  /**
   * Add event listener
   * @param event Event name
   * @param callback Callback function
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    this.eventListeners.get(event)?.push(callback);
  }
  
  /**
   * Remove event listener
   * @param event Event name
   * @param callback Callback function to remove
   */
  off(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) return;
    
    const listeners = this.eventListeners.get(event) || [];
    const filteredListeners = listeners.filter(listener => listener !== callback);
    
    this.eventListeners.set(event, filteredListeners);
  }
  
  /**
   * Trigger event listeners
   * @param event Event name
   * @param data Event data
   */
  private triggerListeners(event: string, data: any): void {
    if (!this.eventListeners.has(event)) return;
    
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }
  
  /**
   * Start automatic location updates
   * @param interval Update interval in milliseconds
   */
  startLocationUpdates(interval: number = this.locationUpdateInterval): void {
    // Clear existing timer if any
    if (this.locationUpdateTimer) {
      clearInterval(this.locationUpdateTimer);
    }
    
    // Set up new timer
    this.locationUpdateTimer = setInterval(() => {
      // Get location from app's location service
      // This is a placeholder - you should implement actual location fetching
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, heading, speed, accuracy } = position.coords;
          this.updateLocation(latitude, longitude, heading || 0, speed || 0, accuracy);
        },
        (error) => {
          console.error('Error getting current position:', error);
        },
        { enableHighAccuracy: true }
      );
    }, interval);
  }
  
  /**
   * Stop automatic location updates
   */
  stopLocationUpdates(): void {
    if (this.locationUpdateTimer) {
      clearInterval(this.locationUpdateTimer);
      this.locationUpdateTimer = null;
    }
  }
  
  /**
   * Update rider's location
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @param heading Heading direction in degrees
   * @param speed Speed in km/h
   * @param accuracy Accuracy in meters
   */
  updateLocation(
    latitude: number, 
    longitude: number, 
    heading: number = 0, 
    speed: number = 0, 
    accuracy: number = 10
  ): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot update location: Socket not connected');
      return;
    }
    
    this.socket.emit('location:update', {
      location: {
        latitude,
        longitude,
        heading,
        speed,
        accuracy
      },
      status: this.currentStatus
    });
  }
  
  /**
   * Set rider availability status
   * @param isAvailable Whether the rider is available for new rides
   */
  setAvailability(isAvailable: boolean): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot update availability: Socket not connected');
      return;
    }
    
    const newStatus = isAvailable ? 'online' : 'offline';
    this.currentStatus = newStatus;
    
    this.socket.emit('availability:update', {
      status: newStatus
    });
    
    // Start or stop location updates based on status
    if (isAvailable) {
      this.startLocationUpdates();
    } else {
      this.stopLocationUpdates();
    }
  }
  
  /**
   * Accept a ride request
   * @param rideId Ride ID to accept
   */
  acceptRide(rideId: string): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot accept ride: Socket not connected');
      return;
    }
    
    // Update status to busy
    this.currentStatus = 'busy';
    
    this.socket.emit('ride:accept', {
      rideId
    });
  }
  
  /**
   * Reject a ride request
   * @param rideId Ride ID to reject
   * @param reason Reason for rejection
   */
  rejectRide(rideId: string, reason: string = 'Rider not available'): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot reject ride: Socket not connected');
      return;
    }
    
    this.socket.emit('ride:reject', {
      rideId,
      reason,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Update ride status
   * @param rideId Ride ID
   * @param status New status ('arrived', 'started', 'completed')
   * @param additionalData Additional data to send with status update
   */
  updateRideStatus(
    rideId: string, 
    status: 'arrived' | 'started' | 'completed',
    additionalData: any = {}
  ): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot update ride status: Socket not connected');
      return;
    }
    
    // Update internal status tracker
    if (status === 'completed') {
      // When ride is completed, rider becomes available again
      this.currentStatus = 'online';
    }
    
    this.socket.emit('ride:update_status', {
      rideId,
      status,
      ...additionalData
    });
  }
  
  /**
   * Mark rider as arrived at pickup location
   * @param rideId Ride ID
   */
  arrivedAtPickup(rideId: string): void {
    this.updateRideStatus(rideId, 'arrived');
  }
  
  /**
   * Start a ride
   * @param rideId Ride ID to start
   */
  startRide(rideId: string): void {
    this.updateRideStatus(rideId, 'started');
  }
  
  /**
   * Complete a ride
   * @param rideId Ride ID to complete
   * @param actualDistance Actual distance traveled in km (optional)
   * @param actualDuration Actual duration in minutes (optional)
   */
  completeRide(
    rideId: string, 
    actualDistance?: number, 
    actualDuration?: number
  ): void {
    const additionalData: any = {};
    
    if (actualDistance) additionalData.actualDistance = actualDistance;
    if (actualDuration) additionalData.actualDuration = actualDuration;
    
    this.updateRideStatus(rideId, 'completed', additionalData);
  }
  
  /**
   * Cancel a ride
   * @param rideId Ride ID to cancel
   * @param reason Reason for cancellation
   */
  cancelRide(rideId: string, reason: string): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot cancel ride: Socket not connected');
      return;
    }
    
    this.socket.emit('ride:cancel', {
      rideId,
      reason,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Emit a custom event
   * @param event Event name
   * @param data Event data
   */
  emit(event: string, data: any): void {
    if (!this.socket || !this.socket.connected) {
      console.warn(`Cannot emit ${event}: Socket not connected`);
      return;
    }
    
    this.socket.emit(event, data);
  }
  
  /**
   * Get current status
   * @returns Current rider status
   */
  getCurrentStatus(): 'online' | 'busy' | 'offline' {
    return this.currentStatus;
  }
  
  /**
   * Check if connected
   * @returns Whether socket is connected
   */
  isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }
  
  /**
   * Disconnect socket
   */
  disconnect(): void {
    this.stopLocationUpdates();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isInitialized = false;
      this.eventListeners.clear();
    }
  }
}

export const socketService = new SocketService();
