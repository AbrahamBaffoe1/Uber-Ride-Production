import { apiClient, ApiResponse } from '../client';
import { API_ENDPOINTS } from '../config';

// Type definitions
export interface LocationUpdate {
  latitude: number;
  longitude: number;
  heading?: number;  // Direction in degrees (0-359)
  speed?: number;    // Speed in km/h
  accuracy?: number; // Accuracy in meters
}

export interface AvailabilityUpdate {
  isAvailable: boolean;
}

export interface LocationResponse {
  location: {
    latitude: number;
    longitude: number;
  };
  heading?: number;
  speed?: number;
  accuracy?: number;
  updatedAt: string;
}

export interface AvailabilityResponse {
  isAvailable: boolean;
  updatedAt: string;
}

class LocationService {
  /**
   * Update rider's current location
   * @param locationData Location data to update
   * @returns Promise with updated location data
   */
  async updateLocation(locationData: LocationUpdate): Promise<ApiResponse<LocationResponse>> {
    return apiClient.post<ApiResponse<LocationResponse>>(
      API_ENDPOINTS.RIDER.UPDATE_LOCATION,
      locationData
    );
  }
  
  /**
   * Update rider's availability status (online/offline)
   * @param availabilityData Availability data to update
   * @returns Promise with updated availability status
   */
  async updateAvailability(availabilityData: AvailabilityUpdate): Promise<ApiResponse<AvailabilityResponse>> {
    return apiClient.post<ApiResponse<AvailabilityResponse>>(
      API_ENDPOINTS.RIDER.UPDATE_AVAILABILITY,
      availabilityData
    );
  }
}

// Export a singleton instance
export const locationService = new LocationService();
