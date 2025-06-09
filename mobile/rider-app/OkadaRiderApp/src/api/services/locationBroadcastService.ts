import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../apiClient';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { authService } from './authService';
import NetInfo from '@react-native-community/netinfo';

interface BroadcastOptions {
  enableHighAccuracy?: boolean;
  distanceInterval?: number;
  timeInterval?: number;
  onStatusChange?: (status: BroadcastStatus) => void;
  onError?: (error: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  includeBatteryLevel?: boolean;
}

export type BroadcastStatus = 
  | 'initializing' 
  | 'connected'
  | 'broadcasting'
  | 'paused'
  | 'offline'
  | 'permission_denied'
  | 'error';

interface RiderStatus {
  status: 'online' | 'offline' | 'busy' | 'en_route';
  isBroadcasting: boolean;
  lastLocation?: {
    lat: number;
    lng: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
    timestamp: number;
  };
}

class LocationBroadcastService {
  private socket: Socket | null = null;
  private watchId: number | null = null;
  private isConnected = false;
  private isBroadcasting = false;
  private broadcastStatus: BroadcastStatus = 'initializing';
  private currentRideId: string | null = null;
  private lastBroadcastTime = 0;
  private distanceThreshold = 10; // meters
  private timeInterval = 5000; // milliseconds
  private lastLocation: Location.LocationObject | null = null;
  private batteryLevel: number | null = null;
  private locationPermission: Location.PermissionStatus | null = null;
  private callbacks = {
    statusChange: (status: BroadcastStatus) => {},
    error: (error: any) => {},
    connect: () => {},
    disconnect: () => {},
  };
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private networkSubscription: any = null;
  private batterySubscription: { remove: () => void } | null = null;
  private isReconnecting = false;

  constructor() {
    // Initialize battery monitoring (if available in platform)
    this.initializeBatteryMonitoring();
  }

  private async initializeBatteryMonitoring() {
    try {
      // Get initial battery level
      const level = await Battery.getBatteryLevelAsync();
      this.batteryLevel = level;
      
      // Set up a listener for battery changes
      this.batterySubscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
        this.batteryLevel = batteryLevel;
      });
    } catch (error) {
      console.warn('Battery monitoring not available:', error);
      this.batteryLevel = null;
    }
  }

  private updateStatus(status: BroadcastStatus) {
    if (this.broadcastStatus !== status) {
      this.broadcastStatus = status;
      this.callbacks.statusChange(status);
    }
  }

  /**
   * Initialize the tracking connection
   */
  async initialize(options: BroadcastOptions = {}) {
    this.updateStatus('initializing');
    
    // Set callbacks
    if (options.onStatusChange) this.callbacks.statusChange = options.onStatusChange;
    if (options.onError) this.callbacks.error = options.onError;
    if (options.onConnect) this.callbacks.connect = options.onConnect;
    if (options.onDisconnect) this.callbacks.disconnect = options.onDisconnect;
    
    // Set tracking options
    if (options.distanceInterval) this.distanceThreshold = options.distanceInterval;
    if (options.timeInterval) this.timeInterval = options.timeInterval;
    
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      this.locationPermission = status;
      
      if (status !== 'granted') {
        this.updateStatus('permission_denied');
        throw new Error('Location permission not granted');
      }
      
      // Initialize network monitoring
      this.initNetworkMonitoring();
      
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
          deviceType: 'rider_app',
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
      this.updateStatus('error');
      return false;
    }
  }

  private initNetworkMonitoring() {
    // Subscribe to network changes
    this.networkSubscription = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected && state.isInternetReachable;
      
      if (!isConnected && this.isConnected) {
        this.handleNetworkDisconnect();
      } else if (isConnected && !this.isConnected && !this.isReconnecting) {
        this.handleNetworkReconnect();
      }
    });
  }

  private handleNetworkDisconnect() {
    console.log('Network disconnected');
    if (this.broadcastStatus !== 'offline') {
      this.updateStatus('offline');
    }
  }

  private handleNetworkReconnect() {
    console.log('Network reconnected');
    this.isReconnecting = true;
    
    // Attempt to reconnect socket
    if (this.socket?.disconnected) {
      this.socket.connect();
    } else {
      this.updateStatus(this.isBroadcasting ? 'broadcasting' : 'connected');
      this.isReconnecting = false;
    }
  }

  private setupSocketHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to tracking server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      this.updateStatus(this.isBroadcasting ? 'broadcasting' : 'connected');
      this.callbacks.connect();
      
      // Resume broadcasting if it was active before disconnect
      if (this.isBroadcasting && !this.watchId) {
        this.startBroadcasting();
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from tracking server');
      this.isConnected = false;
      this.updateStatus('offline');
      this.callbacks.disconnect();
      
      // Attempt reconnect if broadcasting or has active ride
      if (this.isBroadcasting || this.currentRideId) {
        this.attemptReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.callbacks.error(error);
      this.updateStatus('error');
      
      // Attempt reconnect
      this.attemptReconnect();
    });

    // Tracking events
    this.socket.on('tracking:error', (error) => {
      console.error('Tracking error:', error);
      this.callbacks.error(error);
    });

    // Acknowledge location updates
    this.socket.on('location:updated', (data) => {
      console.debug('Location update acknowledged:', data);
    });
    
    // Ping responses
    this.socket.on('tracking:pong', (data) => {
      console.debug('Received pong:', data);
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isReconnecting) {
      return;
    }
    
    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    // Clear any existing timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    // Exponential backoff
    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
    console.log(`Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      if (this.socket) {
        this.socket.connect();
      }
      this.isReconnecting = false;
    }, delay);
  }

  /**
   * Start broadcasting location
   */
  async startBroadcasting(rideId?: string) {
    if (!this.socket || !this.isConnected) {
      throw new Error('Not connected to tracking server');
    }
    
    if (this.locationPermission !== 'granted') {
      this.updateStatus('permission_denied');
      throw new Error('Location permission not granted');
    }
    
    // Set current ride if provided
    if (rideId) {
      this.currentRideId = rideId;
    }
    
    // Start watching location
    try {
      if (this.watchId !== null) {
        await this.stopWatchingLocation();
      }
      
      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: this.distanceThreshold / 2, // More frequent updates than broadcast threshold
          timeInterval: this.timeInterval / 2,
        },
        this.handleLocationUpdate
      );
      
      this.isBroadcasting = true;
      this.updateStatus('broadcasting');
      
      // Set initial status to online
      await this.updateRiderStatus('online');
      
      return true;
    } catch (error) {
      console.error('Failed to start broadcasting:', error);
      this.isBroadcasting = false;
      this.updateStatus('error');
      this.callbacks.error(error);
      return false;
    }
  }

  /**
   * Stop broadcasting location
   */
  async stopBroadcasting() {
    await this.stopWatchingLocation();
    
    this.isBroadcasting = false;
    
    if (this.isConnected) {
      this.updateStatus('connected');
      // Set status to offline when stopping
      await this.updateRiderStatus('offline');
    } else {
      this.updateStatus('offline');
    }
    
    // Clear current ride
    this.currentRideId = null;
  }

  private async stopWatchingLocation() {
    if (this.watchId !== null) {
      await Location.EventEmitter.removeSubscription(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Handle location update from Location API
   */
  private handleLocationUpdate = (location: Location.LocationObject) => {
    this.lastLocation = location;
    
    // Determine if we should broadcast this update
    const shouldBroadcast = this.shouldBroadcastLocation(location);
    
    if (shouldBroadcast) {
      this.broadcastLocation(location);
      this.lastBroadcastTime = Date.now();
    }
  };

  /**
   * Check if location should be broadcast based on thresholds
   */
  private shouldBroadcastLocation(location: Location.LocationObject): boolean {
    const now = Date.now();
    
    // Always broadcast if first location or enough time has passed
    if (!this.lastLocation || now - this.lastBroadcastTime > this.timeInterval) {
      return true;
    }
    
    // Calculate distance from last broadcast location
    const distance = this.calculateDistance(
      this.lastLocation.coords.latitude, 
      this.lastLocation.coords.longitude,
      location.coords.latitude,
      location.coords.longitude
    );
    
    // Broadcast if moved more than threshold
    return distance > this.distanceThreshold;
  }

  /**
   * Calculate Haversine distance between two points
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }

  /**
   * Broadcast location to server
   */
  private broadcastLocation(location: Location.LocationObject) {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot broadcast location: not connected');
      return;
    }
    
    const { latitude, longitude, accuracy, heading, speed, altitude } = location.coords;
    
    // Prepare data
    const data: any = {
      lat: latitude,
      lng: longitude,
      accuracy,
      heading,
      speed,
      altitude,
      timestamp: new Date(location.timestamp).toISOString(),
      deviceId: 'rider-app',
      appVersion: '1.0.0',
      provider: 'expo-location',
    };
    
    // Add battery level if requested
    if (this.batteryLevel !== null) {
      data.batteryLevel = this.batteryLevel;
    }
    
    // Add current ride if available
    if (this.currentRideId) {
      data.rideId = this.currentRideId;
    }
    
    // Emit location update
    this.socket.emit('location:update', data);
  }

  /**
   * Update rider status
   */
  async updateRiderStatus(status: 'online' | 'offline' | 'busy' | 'en_route'): Promise<boolean> {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot update status: not connected');
      return false;
    }
    
    this.socket.emit('tracking:status', {
      status,
      deviceId: 'rider-app',
      appVersion: '1.0.0',
    });
    
    return true;
  }

  /**
   * Get current rider status
   */
  getCurrentStatus(): RiderStatus {
    return {
      status: this.broadcastStatus === 'broadcasting' ? 'online' : 'offline',
      isBroadcasting: this.isBroadcasting,
      lastLocation: this.lastLocation ? {
        lat: this.lastLocation.coords.latitude,
        lng: this.lastLocation.coords.longitude,
        accuracy: this.lastLocation.coords.accuracy ?? undefined,
        heading: this.lastLocation.coords.heading ?? undefined,
        speed: this.lastLocation.coords.speed ?? undefined,
        timestamp: this.lastLocation.timestamp,
      } : undefined,
    };
  }

  /**
   * Set current ride ID for tracking
   */
  setCurrentRideId(rideId: string | null) {
    this.currentRideId = rideId;
  }

  /**
   * Disconnect from tracking service
   */
  disconnect() {
    // First stop broadcasting
    this.stopBroadcasting();
    
    // Clean up network monitoring
    if (this.networkSubscription) {
      this.networkSubscription();
      this.networkSubscription = null;
    }
    
    // Clean up battery monitoring
    if (this.batterySubscription) {
      this.batterySubscription.remove();
      this.batterySubscription = null;
    }
    
    // Clean up reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.updateStatus('offline');
  }

  /**
   * Test connection with ping
   */
  ping() {
    if (!this.socket || !this.isConnected) {
      return false;
    }
    
    this.socket.emit('tracking:ping', { timestamp: Date.now() });
    return true;
  }
  
  /**
   * Get broadcast status
   */
  getStatus(): BroadcastStatus {
    return this.broadcastStatus;
  }
  
  /**
   * Check if currently broadcasting
   */
  isBroadcastingLocation(): boolean {
    return this.isBroadcasting;
  }
}

export const locationBroadcastService = new LocationBroadcastService();
