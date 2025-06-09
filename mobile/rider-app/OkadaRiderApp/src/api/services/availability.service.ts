/**
 * Rider Availability Service
 * Handles rider location updates and availability status
 */
import { apiClient } from '../client';
import { socketService } from './socket.service';
import { Platform } from 'react-native';

/**
 * Start location tracking service
 * Automatically updates rider location at regular intervals
 * @param options Configuration options
 */
export const startLocationTracking = (options: {
  interval?: number; // Milliseconds between updates
  enableHighAccuracy?: boolean;
  onSuccess?: (position: { latitude: number; longitude: number }) => void;
  onError?: (error: any) => void;
}) => {
  const {
    interval = 15000, // 15 seconds default
    enableHighAccuracy = true,
    onSuccess,
    onError
  } = options;
  
  // Use socket service's built-in location tracking
  // This uses React Native's built-in navigator.geolocation
  socketService.startLocationUpdates(interval);
  
  // Return a function to stop tracking
  return {
    stop: () => {
      socketService.stopLocationUpdates();
    }
  };
};

/**
 * Set rider availability status
 * @param isAvailable Whether the rider is available for rides
 * @returns Promise with result
 */
export const setAvailabilityStatus = async (isAvailable: boolean) => {
  try {
    // Update via socket for real-time updates
    socketService.setAvailability(isAvailable);
    
    // Also update via API for persistence
    const response = await apiClient.post('/rider/availability', {
      status: isAvailable ? 'online' : 'offline'
    });
    
    return response.data;
  } catch (error) {
    console.error('Error setting availability status:', error);
    throw error;
  }
};

/**
 * Get current status
 * @returns Current rider status (online, busy, offline)
 */
export const getCurrentStatus = () => {
  return socketService.getCurrentStatus();
};

/**
 * Manually update rider location
 * @param position Current position
 */
export const updateLocation = (position: {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
}) => {
  const { latitude, longitude, heading = 0, speed = 0, accuracy = 10 } = position;
  socketService.updateLocation(latitude, longitude, heading, speed, accuracy);
};

/**
 * Get the current location once
 * @returns Promise with current position
 */
export const getCurrentLocation = (): Promise<{
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
}> => {
  return new Promise((resolve, reject) => {
    // Use the browser/react native navigator.geolocation API
    navigator.geolocation.getCurrentPosition(
      (position: GeolocationPosition) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: position.coords.heading || 0,
          speed: position.coords.speed || 0,
          accuracy: position.coords.accuracy
        });
      },
      (error: GeolocationPositionError) => {
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  });
};

export default {
  startLocationTracking,
  setAvailabilityStatus,
  getCurrentStatus,
  updateLocation,
  getCurrentLocation
};
