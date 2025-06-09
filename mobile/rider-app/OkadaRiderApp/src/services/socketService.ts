import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { SOCKET_URL } from '../api/config';

// Ensure SOCKET_URL is defined
const SOCKET_SERVER_URL = SOCKET_URL || 'http://localhost:3001';

// Log socket connection info for debugging
console.log(`Socket.io server URL configured as: ${SOCKET_SERVER_URL}`);

// Add additional logging for Android emulator users
if (Platform.OS === 'android' && __DEV__ && SOCKET_SERVER_URL.includes('10.0.2.2')) {
  console.log('Using Android emulator special IP (10.0.2.2) to access host machine localhost');
}

export interface LocationUpdate {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  altitude?: number;
  batteryLevel?: number;
  provider?: string;
  mock?: boolean;
}

export interface RideRequest {
  rideId: string;
  pickupLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  destination: {
    lat: number;
    lng: number;
    address: string;
  };
  fare: number;
  distance: number;
  duration: number;
  passengerName: string;
  timestamp: Date;
}

class SocketService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Array<(data: any) => void>>();
  private sessionId: string = '';
  private deviceInfo: {
    deviceId: string;
    appVersion: string;
    os: string;
  } = {
    deviceId: `${Platform.OS}-${Date.now()}`, // Simple unique ID for this session
    appVersion: '1.0.0', // Should be dynamically determined in a real app
    os: Platform.OS
  };

  /**
   * Initialize and connect to the Socket.io server
   * @returns Promise that resolves when connected or rejects on error
   */
  async connect(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      // If already connected, just resolve
      if (this.socket?.connected) {
        console.log('Socket already connected');
        return resolve();
      }
      
      try {
        // Get auth token for authenticated connection
        const token = await AsyncStorage.getItem('authToken');
        
        // In development mode, allow connection without token for testing
        if (!token && !__DEV__) {
          const error = new Error('No auth token available for socket connection');
          console.log(error.message);
          return reject(error);
        }
        
        // Use a dummy token in development mode if none is available
        const authToken = token || (__DEV__ ? 'dev-token-for-testing' : '');
        
        if (__DEV__ && !token) {
          console.warn('Using development token for socket connection. This should only happen in development mode.');
        }
        
        // Generate a session ID for tracking this connection
        this.sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Connection options with improved reliability settings
        const connectionOptions = {
          auth: { token: authToken },
          query: {
            device: this.deviceInfo.deviceId,
            appVersion: this.deviceInfo.appVersion,
            os: this.deviceInfo.os,
            sessionId: this.sessionId,
            connectionType: 'rider-app'
          },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: __DEV__ ? 10 : Infinity, // Unlimited reconnection attempts in production
          randomizationFactor: 0.5,
          timeout: 20000, // Increased timeout for slower connections
          // Always use both websocket and polling for better reliability in production
          transports: __DEV__ ? ['websocket'] : ['websocket', 'polling'],
          forceNew: true,
          // Additional production-specific options
          ...((!__DEV__) && {
            // Longer ping timeout in production for more stable connections
            pingTimeout: 60000,  // 60s timeout
            pingInterval: 25000, // Send ping every 25s
            upgrade: true,       // Allow transport upgrades
            reconnectionAttempts: Infinity, // Unlimited reconnection attempts in production
            reconnectionDelay: 2000, // Longer delay between reconnection attempts
            reconnectionDelayMax: 10000, // Maximum delay between reconnection attempts
            timeout: 30000, // Longer timeout for slower connections in production
          }),
          extraHeaders: {
            'X-Client-Type': 'rider-app',
            'X-Client-Version': this.deviceInfo.appVersion
          }
        };
        
        console.log(`Connecting to socket server at: ${SOCKET_SERVER_URL}`);
        
        // Add additional logging for Android emulator users
        if (Platform.OS === 'android' && __DEV__ && SOCKET_SERVER_URL.includes('localhost')) {
          console.warn(
            'Android emulator detected with localhost URL. ' +
            'If you experience connection issues, try using 10.0.2.2 instead of localhost in the API config.'
          );
        }
        
        // Connect to socket server
        this.socket = io(SOCKET_SERVER_URL, connectionOptions);
        
        // Set up connection event handlers
        this.socket.on('connect', () => {
          console.log(`Socket connected successfully with ID: ${this.socket?.id}`);
          this.setupListeners();
          resolve();
        });
        
        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error.message);
          
          // Only reject if this is the initial connection attempt
          if (!this.socket?.connected) {
            // Try to provide more helpful error information
            let errorMessage = `Connection failed: ${error.message}`;
            
            if (error.message.includes('xhr poll error')) {
              errorMessage += ' - Server may be unreachable or CORS issues';
            } else if (error.message.includes('timeout')) {
              errorMessage += ' - Connection timed out';
            } else if (error.message.includes('auth')) {
              errorMessage += ' - Authentication failed';
            }
            
            reject(new Error(errorMessage));
          }
        });
      } catch (error) {
        console.error('Socket setup error:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the Socket.io server
   */
  disconnect(): void {
    if (this.socket) {
      // Remove all listeners first to prevent memory leaks
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      console.log('Socket disconnected');
    }
    
    // Clear all event listeners
    this.listeners.clear();
  }
  
  /**
   * Check if socket is connected
   * @returns True if connected
   */
  isConnected(): boolean {
    return !!(this.socket && this.socket.connected);
  }
  
  /**
   * Get the socket instance
   * @returns Socket instance or null
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Set up default socket event listeners
   */
  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log(`Socket connected with ID: ${this.socket?.id}`);
      
      // Join the riders room
      this.socket?.emit('join:room', { room: 'riders' });
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      
      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        // Server disconnected us, need to reconnect manually
        console.log('Server disconnected the socket, attempting to reconnect...');
        this.connect().catch(error => {
          console.error('Failed to reconnect after server disconnect:', error);
        });
      }
      // For other reasons, socket.io will try to reconnect automatically
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
    
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
    });
    
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Socket reconnection attempt #${attemptNumber}`);
    });
    
    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
    });
    
    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after all attempts');
    });

    this.socket.on('room:joined', (data) => {
      console.log(`Joined room: ${data.room}`);
    });

    this.socket.on('room:error', (data) => {
      console.error(`Failed to join room: ${data.message}`);
    });

    // Ride-related events
    this.socket.on('ride:new_request', (data) => {
      console.log('New ride request received:', data);
      this.notifyListeners('ride:new_request', data);
    });

    this.socket.on('ride:taken', (data) => {
      console.log('Ride has been taken by another rider:', data);
      this.notifyListeners('ride:taken', data);
    });

    this.socket.on('ride:cancelled', (data) => {
      console.log('Ride cancelled:', data);
      this.notifyListeners('ride:cancelled', data);
    });

    this.socket.on('ride:acceptance_confirmed', (data) => {
      console.log('Ride acceptance confirmed:', data);
      this.notifyListeners('ride:acceptance_confirmed', data);
    });

    this.socket.on('ride:status_update_confirmed', (data) => {
      console.log('Ride status update confirmed:', data);
      this.notifyListeners('ride:status_update_confirmed', data);
    });

    // Location and status confirmations
    this.socket.on('location:updated', (data) => {
      // No need to log every location update
      this.notifyListeners('location:updated', data);
    });

    this.socket.on('status:updated', (data) => {
      console.log('Status updated:', data);
      this.notifyListeners('status:updated', data);
    });

    // Handle errors
    this.socket.on('error', (data) => {
      console.error('Socket error:', data);
      this.notifyListeners('error', data);
    });

    // OTP-related events
    this.socket.on('otp:verified', (data) => {
      console.log('OTP verified:', data);
      this.notifyListeners('otp:verified', data);
    });

    this.socket.on('otp:sent', (data) => {
      console.log('OTP sent:', data);
      this.notifyListeners('otp:sent', data);
    });

    this.socket.on('otp:expired', (data) => {
      console.log('OTP expired:', data);
      this.notifyListeners('otp:expired', data);
    });

    // Notification events
    this.socket.on('notification:received', (data) => {
      console.log('New notification received:', data);
      this.notifyListeners('notification:received', data);
    });

    this.socket.on('notification:read_confirmed', (data) => {
      this.notifyListeners('notification:read_confirmed', data);
    });
  }

  /**
   * Add an event listener
   * @param event Event name to listen for
   * @param callback Callback function when event occurs
   * @returns Function to remove this specific listener
   */
  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event)?.push(callback);
    
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Emit an event to the server
   * @param event Event name to emit
   * @param data Data to send with the event
   * @returns Promise that resolves when the event is emitted or rejects on error
   */
  async emit(event: string, data?: any): Promise<void> {
    if (!this.socket?.connected) {
      console.warn(`Socket not connected, attempting to connect before emitting ${event}`);
      try {
        await this.connect();
        
        if (!this.socket?.connected) {
          throw new Error('Socket connection failed, unable to emit event');
        }
      } catch (error) {
        console.error(`Failed to connect socket for event ${event}:`, error);
        throw error;
      }
    }
    
    try {
      this.socket.emit(event, data);
      return Promise.resolve();
    } catch (error) {
      console.error(`Error emitting ${event}:`, error);
      return Promise.reject(error);
    }
  }

  /**
   * Notify all listeners for a specific event
   * @param event Event name
   * @param data Data received from the server
   */
  private notifyListeners(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in socket event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Join an OTP verification room to receive real-time updates
   * @param userId User ID
   * @param otpType OTP type (verification, passwordReset, login)
   */
  joinOtpRoom(userId: string, otpType: string): void {
    this.emit('otp:join', { userId, type: otpType });
  }

  /**
   * Leave an OTP verification room
   * @param userId User ID
   * @param otpType OTP type (verification, passwordReset, login)
   */
  leaveOtpRoom(userId: string, otpType: string): void {
    this.emit('otp:leave', { userId, type: otpType });
  }

  /**
   * Update rider's location
   * @param location Location data
   */
  updateLocation(location: LocationUpdate): void {
    this.emit('location:update', {
      ...location,
      deviceId: this.deviceInfo.deviceId,
      appVersion: this.deviceInfo.appVersion,
      sessionId: this.sessionId
    });
  }

  /**
   * Update rider's availability status
   * @param status Status ('online', 'offline', 'busy')
   */
  updateAvailability(status: 'online' | 'offline' | 'busy'): void {
    this.emit('availability:update', {
      status,
      deviceId: this.deviceInfo.deviceId,
      appVersion: this.deviceInfo.appVersion,
      sessionId: this.sessionId
    });
  }

  /**
   * Accept a ride request
   * @param rideId ID of the ride to accept
   */
  acceptRide(rideId: string): void {
    this.emit('ride:accept', { rideId });
  }

  /**
   * Update ride status
   * @param rideId ID of the ride
   * @param status New status ('arrived_pickup', 'in_progress', 'arrived_destination', 'completed')
   * @param additionalData Additional data like actual fare, distance
   */
  updateRideStatus(
    rideId: string, 
    status: 'arrived_pickup' | 'in_progress' | 'arrived_destination' | 'completed',
    additionalData?: { actualFare?: number; actualDistance?: number }
  ): void {
    this.emit('ride:update_status', {
      rideId,
      status,
      ...additionalData
    });
  }

  /**
   * Mark a notification as read
   * @param notificationId ID of the notification
   */
  markNotificationAsRead(notificationId: string): void {
    this.emit('notification:read', { notificationId });
  }

  /**
   * Join a ride room to receive updates about a specific ride
   * @param rideId ID of the ride
   */
  joinRideRoom(rideId: string): void {
    this.emit('join:room', { room: `ride:${rideId}` });
  }

  /**
   * Leave a ride room
   * @param rideId ID of the ride
   */
  leaveRideRoom(rideId: string): void {
    this.emit('leave:room', { room: `ride:${rideId}` });
  }
}

// Create singleton instance
export const socketService = new SocketService();
