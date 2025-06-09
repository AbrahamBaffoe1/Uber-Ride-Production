/**
 * Pricing and Availability Service
 * Provides API methods for fare estimation and rider availability
 */
import { apiClient } from '../client';
import { socketService } from './socket.service';

/**
 * Estimate fare for a ride
 * @param params Fare estimation parameters
 * @returns Promise with fare estimation result
 */
export const estimateFare = async (params: {
  origin: {
    latitude: number;
    longitude: number;
  };
  destination: {
    latitude: number;
    longitude: number;
  };
  vehicleType?: string;
  distanceType?: string;
}) => {
  try {
    // Try using socket for real-time updates if connected
    if (socketService.isConnected()) {
      // Socket request will trigger a 'fare:estimated' event that UI can listen for
      socketService.requestFareEstimate(params);
    }
    
    // Make API request in parallel
    const response = await apiClient.post('/ride-pricing/estimate', params);
    return response.data;
  } catch (error) {
    console.error('Error estimating fare:', error);
    throw error;
  }
};

/**
 * Check rider availability at a location
 * @param params Location parameters
 * @returns Promise with availability result
 */
export const checkRiderAvailability = async (params: {
  latitude: number;
  longitude: number;
  vehicleType?: string;
}) => {
  try {
    // Update location via socket for real-time tracking
    if (socketService.isConnected()) {
      socketService.updateLocation({
        latitude: params.latitude,
        longitude: params.longitude
      });
    }
    
    // Make API request
    const response = await apiClient.get('/ride-pricing/availability', {
      params: {
        latitude: params.latitude,
        longitude: params.longitude,
        vehicleType: params.vehicleType
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error checking rider availability:', error);
    throw error;
  }
};

/**
 * Get rider density map
 * @param params Center location and radius
 * @returns Promise with density map
 */
export const getRiderDensityMap = async (params: {
  latitude: number;
  longitude: number;
  radius?: number;
}) => {
  try {
    // Request via socket first if connected
    if (socketService.isConnected()) {
      socketService.requestRiderDensityMap();
    }
    
    // Make API request
    const response = await apiClient.get('/ride-pricing/density-map', {
      params: {
        latitude: params.latitude,
        longitude: params.longitude,
        radius: params.radius
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting rider density map:', error);
    throw error;
  }
};

/**
 * Find nearby riders
 * @param params Location and filter parameters
 * @returns Promise with nearby riders
 */
export const findNearbyRiders = async (params: {
  latitude: number;
  longitude: number;
  maxDistance?: number;
  vehicleType?: string;
}) => {
  try {
    const response = await apiClient.get('/ride-pricing/nearby-riders', {
      params: {
        latitude: params.latitude,
        longitude: params.longitude,
        maxDistance: params.maxDistance,
        vehicleType: params.vehicleType
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error finding nearby riders:', error);
    throw error;
  }
};

/**
 * Calculate ETA between two points
 * @param params Origin and destination
 * @returns Promise with ETA in minutes
 */
export const calculateETA = async (params: {
  origin: {
    latitude: number;
    longitude: number;
  };
  destination: {
    latitude: number;
    longitude: number;
  };
}) => {
  try {
    const response = await apiClient.post('/ride-pricing/calculate-eta', params);
    return response.data;
  } catch (error) {
    console.error('Error calculating ETA:', error);
    throw error;
  }
};

/**
 * Start location tracking for real-time rider availability updates
 * This should be called when the passenger app is opened
 * @param location Current passenger location
 */
export const startLocationTracking = (location: {
  latitude: number;
  longitude: number;
  accuracy?: number;
}) => {
  if (socketService.isConnected()) {
    socketService.updateLocation(location);
  }
};

export default {
  estimateFare,
  checkRiderAvailability,
  getRiderDensityMap,
  findNearbyRiders,
  calculateETA,
  startLocationTracking
};
