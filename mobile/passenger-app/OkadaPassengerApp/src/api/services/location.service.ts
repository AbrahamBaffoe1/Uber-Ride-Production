import { apiClient } from '../client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedLocation {
  id: string;
  name: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  icon: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  code?: number;
}

export interface PopularDestination {
  id: string;
  name: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  popularity: number;
}

export interface CityCenter {
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * Location service for managing user saved locations
 */
class LocationService {
  /**
   * Get all saved locations for the current user
   */
  async getSavedLocations(): Promise<SavedLocation[]> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await apiClient.get<ApiResponse<SavedLocation[]>>('/locations/saved');
      
      if (response.status !== 'success' || !response.data) {
        throw new Error(response.message || 'Failed to fetch saved locations');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching saved locations:', error);
      return []; // Return empty array on error for graceful handling
    }
  }
  
  /**
   * Add a new saved location
   */
  async addSavedLocation(location: Omit<SavedLocation, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<SavedLocation> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await apiClient.post<ApiResponse<SavedLocation>>(
        '/locations/saved',
        location
      );
      
      if (response.status !== 'success' || !response.data) {
        throw new Error(response.message || 'Failed to add saved location');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error adding saved location:', error);
      throw error;
    }
  }
  
  /**
   * Delete a saved location
   */
  async deleteSavedLocation(locationId: string): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await apiClient.delete<ApiResponse<boolean>>(
        `/locations/saved/${locationId}`
      );
      
      if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to delete saved location');
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting saved location:', error);
      throw error;
    }
  }
  
  /**
   * Get popular destinations
   */
  async getPopularDestinations(): Promise<PopularDestination[]> {
    try {
      const response = await apiClient.get<ApiResponse<PopularDestination[]>>('/locations/popular');
      
      if (response.status !== 'success' || !response.data) {
        throw new Error(response.message || 'Failed to fetch popular destinations');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching popular destinations:', error);
      // Return empty array instead of throwing to handle gracefully in UI
      return [];
    }
  }
  
  /**
   * Get nearest city center
   */
  async getNearestCityCenter(latitude: number, longitude: number): Promise<CityCenter | null> {
    try {
      const response = await apiClient.get<ApiResponse<CityCenter>>('/locations/city-center', {
        params: { latitude, longitude }
      });
      
      if (response.status !== 'success' || !response.data) {
        return null;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching nearest city center:', error);
      return null;
    }
  }
}

export const locationService = new LocationService();
