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
  icon?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  type?: string;
  source?: string;
  popularity?: number;
  rating?: number;
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
  type?: string;
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
      
      const response = await apiClient.get<ApiResponse<any>>('/locations/saved');
      
      if (response.status !== 'success' || !response.data) {
        throw new Error(response.message || 'Failed to fetch saved locations');
      }
      
      // Backend returns { status: 'success', data: { locations: [...] } }
      return response.data.locations || [];
    } catch (error) {
      console.error('Error fetching saved locations:', error);
      return []; // Return empty array on error for graceful handling
    }
  }

  /**
   * Get suggested locations based on user's current location
   * This will return saved locations if available, or popular destinations if not
   */
  async getSuggestedLocations(latitude?: number, longitude?: number): Promise<SavedLocation[]> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const params: any = {};
      if (latitude && longitude) {
        params.latitude = latitude;
        params.longitude = longitude;
      }
      
      const response = await apiClient.get<ApiResponse<any>>('/locations/suggestions', { params });
      
      if (response.status !== 'success' || !response.data) {
        // If suggestions fail, fallback to popular destinations
        const popularDestinations = await this.getPopularDestinations();
        return popularDestinations.map(dest => ({
          id: dest.id,
          name: dest.name,
          address: dest.address,
          coordinates: dest.coordinates,
          type: dest.type,
          source: 'popular'
        }));
      }
      
      // Backend returns { status: 'success', data: { suggestions: [...] } }
      return response.data.suggestions || [];
    } catch (error) {
      console.error('Error fetching suggested locations:', error);
      // Fallback to popular destinations if suggestions fail
      const popularDestinations = await this.getPopularDestinations();
      return popularDestinations.map(dest => ({
        id: dest.id,
        name: dest.name,
        address: dest.address,
        coordinates: dest.coordinates,
        type: dest.type,
        source: 'popular'
      }));
    }
  }

  /**
   * Search for locations using Google Places API
   */
  async searchLocations(query: string, latitude?: number, longitude?: number): Promise<SavedLocation[]> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const params: any = { query };
      if (latitude && longitude) {
        params.latitude = latitude;
        params.longitude = longitude;
      }
      
      const response = await apiClient.get<ApiResponse<any>>('/locations/search', { params });
      
      if (response.status !== 'success' || !response.data) {
        throw new Error(response.message || 'Failed to search locations');
      }
      
      // Backend returns { status: 'success', data: { results: [...] } }
      return response.data.results || [];
    } catch (error) {
      console.error('Error searching locations:', error);
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
      const response = await apiClient.get<ApiResponse<any>>('/locations/popular');
      
      if (response.status !== 'success' || !response.data) {
        throw new Error(response.message || 'Failed to fetch popular destinations');
      }
      
      // Backend returns { status: 'success', data: { destinations: [...] } }
      return response.data.destinations || [];
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
      const response = await apiClient.get<ApiResponse<any>>('/locations/city-center', {
        params: { latitude, longitude }
      });
      
      if (response.status !== 'success' || !response.data) {
        return null;
      }
      
      // Backend returns { status: 'success', data: { cityCenter: {...} } }
      const cityCenter = response.data.cityCenter;
      if (cityCenter) {
        return {
          name: cityCenter.name,
          latitude: cityCenter.coordinates.lat,
          longitude: cityCenter.coordinates.lng
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching nearest city center:', error);
      return null;
    }
  }
}

export const locationService = new LocationService();
