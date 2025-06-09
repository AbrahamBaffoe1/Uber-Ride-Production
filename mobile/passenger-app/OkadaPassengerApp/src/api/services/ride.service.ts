import { apiClient } from '../client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RideOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  price: string; // Base price format "₦1,500"
  time: string;   // Estimated time format "5 min away"
  multiplier: number; // Price multiplier for distance calculation
  status: 'available' | 'busy' | 'unavailable';
  capacity: number; // Max number of passengers
  basePrice: number; // Base price in smallest currency unit
  pricePerKm: number; // Price per km in smallest currency unit
  pricePerMinute: number; // Price per minute in smallest currency unit
  vehicleType: string; // Vehicle type identifier
}

export interface RideHistory {
  id: string;
  date: string;
  pickupLocation: string;
  dropoffLocation: string;
  fare: string;
  status: 'completed' | 'cancelled' | 'failed';
  driverName: string;
  driverPhoto?: string;
  rating?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Ride service for managing rides and ride options
 */
class RideService {
  /**
   * Get all available ride options based on user location
   * @param latitude User's current latitude
   * @param longitude User's current longitude
   */
  async getRideOptions(latitude: number, longitude: number): Promise<RideOption[]> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await apiClient.get<ApiResponse<RideOption[]>>('/api/v1/mongo/rides/options', {
        params: { latitude, longitude }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching ride options:', error);
      throw error;
    }
  }
  
  /**
   * Get ride price estimate
   * @param rideOptionId Ride option ID
   * @param pickupLat Pickup latitude
   * @param pickupLng Pickup longitude
   * @param dropoffLat Dropoff latitude
   * @param dropoffLng Dropoff longitude
   */
  async getRidePriceEstimate(
    rideOptionId: string,
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number
  ): Promise<{
    estimatedFare: number;
    currencySymbol: string;
    formattedPrice: string;
    estimatedDistance: number;
    estimatedDuration: number;
  }> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await apiClient.get<ApiResponse<{
        estimatedFare: number;
        currencySymbol: string;
        formattedPrice: string;
        estimatedDistance: number;
        estimatedDuration: number;
      }>>('/api/v1/mongo/rides/price-estimate', {
        params: {
          rideOptionId,
          pickupLat,
          pickupLng,
          dropoffLat,
          dropoffLng
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching ride price estimate:', error);
      throw error;
    }
  }
  
  /**
   * Get user's ride history
   * @param page Page number (1-based)
   * @param limit Number of items per page
   */
  async getRideHistory(page: number = 1, limit: number = 10): Promise<{
    rides: RideHistory[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await apiClient.get<ApiResponse<{
        rides: RideHistory[];
        totalCount: number;
        totalPages: number;
        currentPage: number;
      }>>('/api/v1/mongo/rides/history', {
        params: { page, limit }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching ride history:', error);
      throw error;
    }
  }
  
  /**
   * Get details for a specific ride
   * @param rideId Ride ID
   */
  async getRideDetails(rideId: string): Promise<any> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await apiClient.get<ApiResponse<any>>(`/api/v1/mongo/rides/${rideId}`);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching ride details:', error);
      throw error;
    }
  }
  
  /**
   * Rate a completed ride
   * @param rideId Ride ID
   * @param rating Rating (1-5)
   * @param feedback Optional feedback text
   */
  async rateRide(rideId: string, rating: number, feedback?: string): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      await apiClient.post<ApiResponse<boolean>>(`/api/v1/mongo/rides/${rideId}/rate`, {
        rating,
        feedback
      });
      
      return true;
    } catch (error) {
      console.error('Error rating ride:', error);
      throw error;
    }
  }
}

export const rideService = new RideService();
