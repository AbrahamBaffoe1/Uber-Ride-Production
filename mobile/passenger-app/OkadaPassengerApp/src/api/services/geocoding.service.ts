import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../client';

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  accuracy: 'high' | 'medium' | 'low';
  provider: string;
}

export interface ReverseGeocodingResult {
  address: string;
  formattedAddress: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  streetName: string;
  streetNumber: string | null;
  accuracy: 'high' | 'medium' | 'low';
  provider: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Geocoding service to convert addresses to coordinates and vice versa
 */
class GeocodingService {
  /**
   * Convert address to coordinates
   * @param address Address string to geocode
   */
  async geocode(address: string): Promise<GeocodingResult> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await apiClient.get<any>(
        '/api/v1/mongo/geocoding/forward', 
        { params: { address } }
      );
      
      const responseData = response.data as ApiResponse<GeocodingResult>;
      
      if (!responseData.success) {
        throw new Error(responseData.message || 'Failed to geocode address');
      }
      
      return responseData.data;
    } catch (error) {
      console.error('Error geocoding address:', error);
      
      // Return realistic coordinates for Lagos, Nigeria
      return {
        latitude: 6.4550,
        longitude: 3.3841,
        formattedAddress: address,
        accuracy: 'low',
        provider: 'fallback'
      };
    }
  }
  
  /**
   * Convert coordinates to address
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodingResult> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await apiClient.get<any>(
        '/api/v1/mongo/geocoding/reverse',
        { params: { latitude, longitude } }
      );
      
      const responseData = response.data as ApiResponse<ReverseGeocodingResult>;
      
      if (!responseData.success) {
        throw new Error(responseData.message || 'Failed to reverse geocode coordinates');
      }
      
      return responseData.data;
    } catch (error) {
      console.error('Error reverse geocoding coordinates:', error);
      
      // Generate a placeholder address with the actual coordinates
      return {
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        formattedAddress: `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        city: 'Lagos',
        state: 'Lagos State',
        country: 'Nigeria',
        postalCode: '',
        streetName: 'Unknown Street',
        streetNumber: null,
        accuracy: 'low',
        provider: 'fallback'
      };
    }
  }
}

export const geocodingService = new GeocodingService();
