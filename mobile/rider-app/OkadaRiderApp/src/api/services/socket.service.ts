import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL } from '../config';
import { Platform } from 'react-native';

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
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
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
          platform: Platform.OS,
          role: 'rider' // Identify as rider
        }
      });
      
      this.setupEventHandlers();
      this.isInitialized = true;
      console.log('Socket initialized successfully');
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      throw error;
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
    this.socket.on('ride:request', (data) => {
      console.log('New ride request received:', data);
      this.triggerListeners('ride:request', data);
    });
    
    this.socket.on('ride:cancelled', (data) => {
      console.log('Ride cancelled by passenger:', data);
      this.triggerListeners('ride:cancelled', data);
    });
    
    this.socket.on('ride:status_updated', (data) => {
      console.log('Ride status updated:', data);
      this.triggerListeners('ride:status_updated', data);
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
        lat: latitude,
        lng: longitude,
        heading,
        speed,
        accuracy
      },
      timestamp: new Date().toISOString()
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
    
    this.socket.emit('availability:update', {
      status: isAvailable ? 'online' : 'offline',
      timestamp: new Date().toISOString()
    });
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
    
    this.socket.emit('ride:accept', {
      rideId,
      timestamp: new Date().toISOString()
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
   * Mark rider as arrived at pickup location
   * @param rideId Ride ID
   */
  arrivedAtPickup(rideId: string): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot update ride status: Socket not connected');
      return;
    }
    
    this.socket.emit('ride:arrived', {
      rideId,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Start a ride
   * @param rideId Ride ID to start
   */
  startRide(rideId: string): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot start ride: Socket not connected');
      return;
    }
    
    this.socket.emit('ride:start', {
      rideId,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Complete a ride
   * @param rideId Ride ID to complete
   */
  completeRide(rideId: string): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot complete ride: Socket not connected');
      return;
    }
    
    this.socket.emit('ride:complete', {
      rideId,
      timestamp: new Date().toISOString()
    });
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
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isInitialized = false;
      this.eventListeners.clear();
    }
  }
}

export const socketService = new SocketService();
