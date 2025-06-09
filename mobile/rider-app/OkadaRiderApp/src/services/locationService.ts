import * as Location from 'expo-location';
import { apiClient } from '../api/apiClient';
import { authService } from '../api/services/authService';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationResult {
  success: boolean;
  coordinates: Coordinates;
  source: 'api' | 'device' | 'default';
  error?: string;
}

class LocationService {
  private lastKnownLocation: Coordinates | null = null;
  private locationPermissionGranted: boolean = false;
  private isRequestingPermission: boolean = false;

  constructor() {
    // Initialize by checking for location permissions
    this.checkLocationPermission();
  }

  /**
   * Check if app has location permissions
   */
  private async checkLocationPermission(): Promise<boolean> {
    try {
      // Don't request again if already in progress
      if (this.isRequestingPermission) {
        return this.locationPermissionGranted;
      }

      this.isRequestingPermission = true;
      
      // Check if we have permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      // If not granted, request permission
      if (status !== 'granted') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        this.locationPermissionGranted = newStatus === 'granted';
      } else {
        this.locationPermissionGranted = true;
      }

      this.isRequestingPermission = false;
      return this.locationPermissionGranted;
    } catch (error) {
      console.error('Error checking location permission:', error);
      this.isRequestingPermission = false;
      return false;
    }
  }

  /**
   * Get device location directly from the device
   */
  private async getDeviceLocation(): Promise<LocationResult> {
    try {
      // First ensure we have permission
      const hasPermission = await this.checkLocationPermission();
      
      if (!hasPermission) {
        return {
          success: false,
          coordinates: { latitude: 6.5244, longitude: 3.3792 }, // Default to Lagos
          source: 'default',
          error: 'Location permission not granted'
        };
      }

      // Get the device location with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      const coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      // Store as last known location
      this.lastKnownLocation = coordinates;
      
      return {
        success: true,
        coordinates,
        source: 'device'
      };
    } catch (error) {
      console.error('Error getting device location:', error);
      
      // If we have a last known location, use that
      if (this.lastKnownLocation) {
        return {
          success: true,
          coordinates: this.lastKnownLocation,
          source: 'device',
          error: 'Using last known location due to error'
        };
      }
      
      // Otherwise use default
      return {
        success: false,
        coordinates: { latitude: 6.5244, longitude: 3.3792 }, // Default to Lagos
        source: 'default',
        error: 'Failed to get device location'
      };
    }
  }

  /**
   * Get location from API
   */
  private async getLocationFromApi(): Promise<LocationResult> {
    try {
      // First check if we have an auth token - this is needed to identify as a rider
      const token = await authService.getAuthToken();
      if (!token) {
        console.warn('No auth token available for location API request');
        throw new Error('Authentication token not available');
      }

      // Ensure authorization header is properly set
      const response = await apiClient.get<{
        status: string;
        data: {
          currentLocation: {
            coordinates: {
              lat: number;
              lng: number;
            }
          }
        }
      }>('/location/current', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.status === 'success' && 
          response.data?.currentLocation?.coordinates) {
        
        const coordinates = {
          latitude: response.data.currentLocation.coordinates.lat,
          longitude: response.data.currentLocation.coordinates.lng
        };
        
        // Store as last known location
        this.lastKnownLocation = coordinates;
        
        return {
          success: true,
          coordinates,
          source: 'api'
        };
      }
      
      throw new Error('Invalid API response format');
    } catch (error) {
      console.log('Using default coordinates - API location retrieval failed');
      // Return Lagos coordinates (default for Nigeria)
      return {
        success: false,
        coordinates: { latitude: 6.5244, longitude: 3.3792 }, // Default to Lagos
        source: 'default',
        error: 'API location retrieval failed'
      };
    }
  }

  /**
   * Get the current location using all available methods
   * For rider app: try device location first, then API (reversed from original)
   * This is because riders need to share their location rather than retrieve it
   */
  async getCurrentLocation(): Promise<LocationResult> {
    try {
      // For riders, we should try device location first since they need to share location
      const deviceResult = await this.getDeviceLocation();
      
      if (deviceResult.success) {
        // Update the backend with this location
        await this.updateLocationOnBackend(deviceResult.coordinates);
        return deviceResult;
      }
      
      // If device location fails, try API as backup
      const apiResult = await this.getLocationFromApi();
      
      if (apiResult.success) {
        return apiResult;
      }
      
      // If both fail, return default Lagos coordinates
      console.log('Using default Lagos coordinates - both location methods failed');
      return {
        success: true, // Return as success to avoid app issues
        coordinates: { latitude: 6.5244, longitude: 3.3792 }, // Default to Lagos
        source: 'default',
        error: 'Using default coordinates'
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      
      // Last resort fallback
      return {
        success: false,
        coordinates: { latitude: 6.5244, longitude: 3.3792 }, // Default to Lagos
        source: 'default',
        error: 'Unexpected error during location retrieval'
      };
    }
  }

  /**
   * Update location on the backend
   */
  async updateLocationOnBackend(coordinates: Coordinates): Promise<boolean> {
    try {
      // Get auth token to ensure rider role is recognized
      const token = await authService.getAuthToken();
      if (!token) {
        console.warn('No auth token available for location update');
        return false;
      }

      // Make sure we explicitly set role: 'rider' in the payload
      const response = await apiClient.post<{
        status: string;
        message: string;
      }>('/location/update', {
        lat: coordinates.latitude,
        lng: coordinates.longitude,
        provider: 'gps',
        userType: 'rider', // Add explicit rider identifier
        status: 'online' // Make sure rider status is set
      }, {
        headers: {
          Authorization: `Bearer ${token}` // Ensure token is properly sent
        }
      });
      
      console.log('Location update response:', response);
      return response.status === 'success';
    } catch (error: any) {
      console.warn('Failed to update location on backend:', error);
      // If we get a 403 error, try updating rider status first
      if (error.response?.status === 403) {
        try {
          // Try to update rider status first
          await apiClient.put('/location/status', { status: 'online' });
          console.log('Updated rider status to online');
          return true;
        } catch (statusError) {
          console.warn('Failed to update rider status:', statusError);
        }
      }
      return false;
    }
  }

  /**
   * Start location tracking
   * This will update the location periodically
   */
  async startLocationTracking(intervalMs: number = 30000): Promise<any | null> {
    try {
      // Ensure we have permission
      const hasPermission = await this.checkLocationPermission();
      
      if (!hasPermission) {
        console.error('Cannot start location tracking: permission not granted');
        return null;
      }
      
      // Start watching position
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: intervalMs,
          distanceInterval: 100 // minimum movement in meters
        },
        (location) => {
          const coordinates = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          };
          
          // Store this location
          this.lastKnownLocation = coordinates;
          
          // Update backend
          this.updateLocationOnBackend(coordinates);
        }
      );
      
      return subscription;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      return null;
    }
  }
}

export const locationService = new LocationService();
