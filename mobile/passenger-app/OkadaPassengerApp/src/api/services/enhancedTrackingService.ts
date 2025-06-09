/**
 * Enhanced Tracking Service
 * Provides methods to interact with the enhanced real-time tracking features
 */
import { apiClient } from '../apiClient';
import socketService from '../../services/socketService';

// Types
export interface TrackingLocation {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp?: string;
  formattedAddress?: string;
}

export interface RiderInfo {
  name: string;
  phone: string;
  photo?: string;
  rating: number;
}

export interface TrackingPrediction {
  lat: number;
  lng: number;
  secondsAhead: number;
}

export interface GeofenceInfo {
  id: string;
  name: string;
  type: string;
  center: {
    lat: number;
    lng: number;
  };
  radius: number;
}

export interface EtaInfo {
  success: boolean;
  destination?: {
    eta: string;
    remainingSeconds: number;
    remainingFormatted: string;
  };
  pickup?: {
    eta: string;
    remainingSeconds: number;
    remainingFormatted: string;
    distance: string;
  };
  progress?: number;
  accuracy?: 'high' | 'medium' | 'low';
}

export interface TrackingConfig {
  etaInterval?: number;
  enableGeofencing?: boolean;
  enablePredictions?: boolean;
}

export interface EnhancedTrackingResponse {
  success: boolean;
  riderId: string;
  rideId?: string;
  rider?: RiderInfo;
  location?: TrackingLocation;
  status?: string;
  trackingConfig?: TrackingConfig;
  eta?: EtaInfo;
  sessionId: string;
}

export interface LocationEvent {
  riderId: string;
  rideId?: string;
  location: TrackingLocation;
  timestamp: string;
}

export interface RouteMatchInfo {
  success: boolean;
  matchPoint?: {
    lat: number;
    lng: number;
  };
  distanceFromRoute?: number;
  progress?: number;
  remainingDistance?: number;
  remainingTimeSeconds?: number;
  onRoute?: boolean;
}

// Enhanced Tracking Service
const enhancedTrackingService = {
  /**
   * Start enhanced tracking for a rider
   * @param riderId - Rider ID
   * @param rideId - Optional ride ID
   * @param config - Optional tracking configuration
   * @returns Promise with tracking info
   */
  startTracking: async (
    riderId: string,
    rideId?: string,
    config?: TrackingConfig
  ): Promise<EnhancedTrackingResponse> => {
    try {
      // Only start socket connection if not already connected
      if (!socketService.isConnected()) {
        await socketService.connect();
      }
      
      // Join the tracking namespace
      const trackingSocket = socketService.getNamespace('/tracking');
      
      if (!trackingSocket) {
        throw new Error('Tracking socket not available');
      }
      
      // Generate session ID
      const sessionId = Date.now().toString();
      
      // Request to track rider with enhanced features
      return new Promise((resolve, reject) => {
        // Listen for success response
        trackingSocket.once('tracking:enhanced:started', (response: EnhancedTrackingResponse) => {
          resolve(response);
        });
        
        // Listen for errors
        trackingSocket.once('tracking:error', (error: any) => {
          reject(new Error(error.message || 'Failed to start enhanced tracking'));
        });
        
        // Emit tracking request
        trackingSocket.emit('tracking:enhanced:request', {
          riderId,
          rideId,
          deviceId: socketService.getDeviceInfo().deviceId,
          appVersion: socketService.getDeviceInfo().appVersion,
          sessionId,
          ...config
        });
        
        // Set timeout for response
        setTimeout(() => {
          trackingSocket.off('tracking:enhanced:started');
          trackingSocket.off('tracking:error');
          reject(new Error('Tracking request timed out'));
        }, 10000);
      });
    } catch (error) {
      console.error('Enhanced tracking start error:', error);
      throw error;
    }
  },
  
  /**
   * Stop tracking a rider
   * @param riderId - Rider ID
   * @param rideId - Optional ride ID
   * @returns Promise with success status
   */
  stopTracking: async (riderId: string, rideId?: string): Promise<{success: boolean}> => {
    try {
      const trackingSocket = socketService.getNamespace('/tracking');
      
      if (!trackingSocket) {
        throw new Error('Tracking socket not available');
      }
      
      return new Promise((resolve, reject) => {
        // Listen for success response
        trackingSocket.once('tracking:stopped', (response: any) => {
          resolve({success: true});
        });
        
        // Listen for errors
        trackingSocket.once('tracking:error', (error: any) => {
          reject(new Error(error.message || 'Failed to stop tracking'));
        });
        
        // Emit stop request
        trackingSocket.emit('tracking:stop', {
          riderId,
          rideId,
          deviceId: socketService.getDeviceInfo().deviceId,
          appVersion: socketService.getDeviceInfo().appVersion
        });
        
        // Set timeout for response
        setTimeout(() => {
          trackingSocket.off('tracking:stopped');
          trackingSocket.off('tracking:error');
          reject(new Error('Stop tracking request timed out'));
        }, 5000);
      });
    } catch (error) {
      console.error('Stop tracking error:', error);
      throw error;
    }
  },
  
  /**
   * Add location update listener
   * @param callback - Callback function for location updates
   * @returns Cleanup function
   */
  onLocationUpdate: (callback: (event: LocationEvent) => void): (() => void) => {
    const trackingSocket = socketService.getNamespace('/tracking');
    
    if (!trackingSocket) {
      console.error('Tracking socket not available');
      return () => {};
    }
    
    // Add event listener
    trackingSocket.on('location:update', callback);
    
    // Return cleanup function
    return () => {
      trackingSocket.off('location:update', callback);
    };
  },
  
  /**
   * Add ETA update listener
   * @param callback - Callback function for ETA updates
   * @returns Cleanup function
   */
  onEtaUpdate: (callback: (eta: EtaInfo) => void): (() => void) => {
    const trackingSocket = socketService.getNamespace('/tracking');
    
    if (!trackingSocket) {
      console.error('Tracking socket not available');
      return () => {};
    }
    
    // Add event listener
    trackingSocket.on('tracking:eta:update', callback);
    
    // Return cleanup function
    return () => {
      trackingSocket.off('tracking:eta:update', callback);
    };
  },
  
  /**
   * Add geofence event listener
   * @param callback - Callback function for geofence events
   * @returns Cleanup function
   */
  onGeofenceEvent: (
    callback: (event: {
      type: 'enter' | 'exit';
      geofenceId: string;
      riderId: string;
      geofenceType: string;
      location: TrackingLocation;
    }) => void
  ): (() => void) => {
    const trackingSocket = socketService.getNamespace('/tracking');
    
    if (!trackingSocket) {
      console.error('Tracking socket not available');
      return () => {};
    }
    
    // Handle enter events
    const handleEnter = (data: any) => {
      callback({
        type: 'enter',
        geofenceId: data.geofenceId,
        riderId: data.riderId,
        geofenceType: data.geofenceType,
        location: data.location
      });
    };
    
    // Handle exit events
    const handleExit = (data: any) => {
      callback({
        type: 'exit',
        geofenceId: data.geofenceId,
        riderId: data.riderId,
        geofenceType: data.geofenceType,
        location: data.location
      });
    };
    
    // Add event listeners
    trackingSocket.on('geofence:enter', handleEnter);
    trackingSocket.on('geofence:exit', handleExit);
    
    // Return cleanup function
    return () => {
      trackingSocket.off('geofence:enter', handleEnter);
      trackingSocket.off('geofence:exit', handleExit);
    };
  },
  
  /**
   * Create a geofence
   * @param params - Geofence parameters
   * @returns Promise with created geofence
   */
  createGeofence: async (params: {
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
    type?: string;
    riderId?: string;
    rideId?: string;
    metadata?: any;
  }): Promise<{success: boolean; geofenceId: string; geofence: GeofenceInfo}> => {
    try {
      const trackingSocket = socketService.getNamespace('/tracking');
      
      if (!trackingSocket) {
        throw new Error('Tracking socket not available');
      }
      
      return new Promise((resolve, reject) => {
        // Listen for success response
        trackingSocket.once('tracking:geofence:created', (response: any) => {
          resolve(response);
        });
        
        // Listen for errors
        trackingSocket.once('tracking:error', (error: any) => {
          reject(new Error(error.message || 'Failed to create geofence'));
        });
        
        // Emit geofence creation request
        trackingSocket.emit('tracking:geofence:create', {
          ...params,
          deviceId: socketService.getDeviceInfo().deviceId,
          appVersion: socketService.getDeviceInfo().appVersion
        });
        
        // Set timeout for response
        setTimeout(() => {
          trackingSocket.off('tracking:geofence:created');
          trackingSocket.off('tracking:error');
          reject(new Error('Geofence creation request timed out'));
        }, 5000);
      });
    } catch (error) {
      console.error('Geofence creation error:', error);
      throw error;
    }
  },
  
  /**
   * Request ETA update
   * @param rideId - Ride ID
   * @param riderId - Rider ID
   * @returns Promise with ETA info
   */
  requestEta: async (rideId: string, riderId: string): Promise<EtaInfo> => {
    try {
      // Try to use socket for real-time ETA
      const trackingSocket = socketService.getNamespace('/tracking');
      
      if (trackingSocket) {
        return new Promise((resolve, reject) => {
          // Listen for ETA update
          trackingSocket.once('tracking:eta:update', (eta: EtaInfo) => {
            resolve(eta);
          });
          
          // Listen for errors
          trackingSocket.once('tracking:error', (error: any) => {
            reject(new Error(error.message || 'Failed to get ETA'));
          });
          
          // Request ETA
          trackingSocket.emit('tracking:eta:request', { rideId, riderId });
          
          // Set timeout
          setTimeout(() => {
            trackingSocket.off('tracking:eta:update');
            trackingSocket.off('tracking:error');
            // Fall back to REST API if socket times out
            apiClient.get(`/api/v1/mongo/tracking/eta?rideId=${rideId}&riderId=${riderId}`)
              .then(response => resolve(response.data.data))
              .catch(error => reject(error));
          }, 3000);
        });
      } else {
        // Fall back to REST API
        const response = await apiClient.get(`/api/v1/mongo/tracking/eta?rideId=${rideId}&riderId=${riderId}`);
        return response.data.data;
      }
    } catch (error) {
      console.error('ETA request error:', error);
      throw error;
    }
  },
  
  /**
   * Get location history for a rider
   * @param riderId - Rider ID
   * @param options - Optional parameters
   * @returns Promise with location history
   */
  getLocationHistory: async (
    riderId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<{
    success: boolean;
    count: number;
    data: {
      type: string;
      features: Array<{
        type: string;
        geometry: {
          type: string;
          coordinates: [number, number];
        };
        properties: {
          timestamp: string;
          accuracy?: number;
          heading?: number;
          speed?: number;
        };
      }>;
    };
  }> => {
    try {
      // Build query string
      let query = `riderId=${riderId}`;
      
      if (options?.startDate) {
        query += `&startDate=${options.startDate.toISOString()}`;
      }
      
      if (options?.endDate) {
        query += `&endDate=${options.endDate.toISOString()}`;
      }
      
      if (options?.limit) {
        query += `&limit=${options.limit}`;
      }
      
      // Make API request
      const response = await apiClient.get(`/api/v1/mongo/tracking/locations?${query}`);
      return response.data;
    } catch (error) {
      console.error('Get location history error:', error);
      throw error;
    }
  },
  
  /**
   * Get rider trajectory predictions
   * @param riderId - Rider ID
   * @returns Promise with predictions
   */
  getPredictions: async (riderId: string): Promise<{
    success: boolean;
    count: number;
    data: TrackingPrediction[];
  }> => {
    try {
      const response = await apiClient.get(`/api/v1/mongo/tracking/predictions?riderId=${riderId}`);
      return response.data;
    } catch (error) {
      console.error('Get predictions error:', error);
      throw error;
    }
  }
};

export default enhancedTrackingService;
