import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../apiClient';
import { authService } from './authService';

interface TrackingOptions {
  onLocationUpdate?: (data: any) => void;
  onStatusUpdate?: (data: any) => void;
  onError?: (error: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  enableHighAccuracy?: boolean;
  trackingInterval?: number;
}

class LocationTrackingService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private watchId: number | null = null;
  private trackingInterval: number = 10000; // Default 10 seconds
  private riderId: string | null = null;
  private currentRideId: string | null = null;
  private callbacks = {
    locationUpdate: (data: any) => {},
    statusUpdate: (data: any) => {},
    error: (error: any) => {},
    connect: () => {},
    disconnect: () => {},
  };

  // Initialize the tracking connection
  async initializeTracking(options: TrackingOptions = {}) {
    // Set callbacks
    if (options.onLocationUpdate) this.callbacks.locationUpdate = options.onLocationUpdate;
    if (options.onStatusUpdate) this.callbacks.statusUpdate = options.onStatusUpdate;
    if (options.onError) this.callbacks.error = options.onError;
    if (options.onConnect) this.callbacks.connect = options.onConnect;
    if (options.onDisconnect) this.callbacks.disconnect = options.onDisconnect;
    
    // Set tracking interval
    if (options.trackingInterval) this.trackingInterval = options.trackingInterval;

    try {
      // Get auth token
      const token = await authService.getAuthToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      // Initialize socket connection to tracking namespace
      this.socket = io(`${API_BASE_URL}/tracking`, {
        auth: { token },
        query: {
          device: 'mobile',
          deviceType: 'app',
          appVersion: '1.0.0',
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Set up socket event handlers
      this.setupSocketHandlers();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize tracking:', error);
      this.callbacks.error(error);
      return false;
    }
  }

  private setupSocketHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to tracking server');
      this.isConnected = true;
      this.callbacks.connect();
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from tracking server');
      this.isConnected = false;
      this.callbacks.disconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.callbacks.error(error);
    });

    // Tracking events
    this.socket.on('location:update', (data) => {
      console.log('Received location update:', data);
      this.callbacks.locationUpdate(data);
    });

    this.socket.on('rider:status_update', (data) => {
      console.log('Received rider status update:', data);
      this.callbacks.statusUpdate(data);
    });

    this.socket.on('tracking:error', (error) => {
      console.error('Tracking error:', error);
      this.callbacks.error(error);
    });

    // Tracking status events
    this.socket.on('tracking:started', (data) => {
      console.log('Tracking started:', data);
      this.riderId = data.riderId;
    });

    this.socket.on('tracking:stopped', (data) => {
      console.log('Tracking stopped:', data);
      this.riderId = null;
    });
  }

  // Start tracking a specific rider
  startTrackingRider(riderId: string, rideId?: string) {
    if (!this.socket || !this.isConnected) {
      throw new Error('Tracking service not initialized or connected');
    }

    this.socket.emit('tracking:request', {
      riderId,
      rideId,
      deviceId: 'passenger-app',
      appVersion: '1.0.0',
    });
    
    this.riderId = riderId;
    this.currentRideId = rideId || null;
  }

  // Stop tracking a rider
  stopTrackingRider() {
    if (!this.socket || !this.isConnected || !this.riderId) {
      return;
    }

    this.socket.emit('tracking:stop', {
      riderId: this.riderId,
      rideId: this.currentRideId,
      deviceId: 'passenger-app',
      appVersion: '1.0.0',
    });
    
    this.riderId = null;
    this.currentRideId = null;
  }

  // Get connection status
  isTrackingConnected(): boolean {
    return this.isConnected;
  }

  // Disconnect from tracking service
  disconnect() {
    // Stop tracking any active rider first
    if (this.riderId) {
      this.stopTrackingRider();
    }

    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
  }

  // Test the connection with a ping
  ping() {
    if (!this.socket || !this.isConnected) {
      throw new Error('Tracking service not initialized or connected');
    }

    this.socket.emit('tracking:ping', {
      timestamp: Date.now(),
    });
  }
}

export const locationTrackingService = new LocationTrackingService();
