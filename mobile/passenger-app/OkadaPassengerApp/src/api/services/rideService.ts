import { apiClient } from '../apiClient';

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export interface RideEstimate {
  id?: string;
  rideType: string;
  estimatedPrice: string;
  estimatedTime: string;
  distance: string;
  currency: string;
  rating?: string;
}

export interface RideRequest {
  pickupLocation: Location;
  dropoffLocation: Location;
  rideType: string;
  paymentMethod: string;
  scheduledTime?: Date;
  notes?: string;
}

export interface ActiveRide {
  id: string;
  status: 'requested' | 'accepted' | 'arrived' | 'started' | 'completed' | 'cancelled';
  pickupLocation: Location;
  dropoffLocation: Location;
  rideType: string;
  fare: string;
  rider?: {
    id: string;
    name: string;
    rating: number;
    phoneNumber?: string;
    vehicleInfo?: string;
  };
  estimatedArrival?: string;
  estimatedDuration?: string;
  distance?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RideHistory {
  id: string;
  destination: string;
  date: string;
  price: string;
  status: string;
  driver?: {
    name: string;
    avatar: string;
  };
}

class RideService {
  // Get ride estimates based on locations
  async getRideEstimates(
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number
  ): Promise<RideEstimate[]> {
    try {
      // Use any type to handle different response formats from MongoDB 
      const response = await apiClient.get<any>('/rides/estimate', {
        params: {
          pickupLat,
          pickupLng,
          dropoffLat,
          dropoffLng
        }
      });
      
      // Handle various response formats
      let estimates: RideEstimate[] = [];
      
      if (response && response.estimates && Array.isArray(response.estimates)) {
        // Format: { estimates: [] }
        estimates = response.estimates;
      } else if (response && response.data && Array.isArray(response.data)) {
        // Format: { data: [] }
        estimates = response.data;
      } else if (response && Array.isArray(response)) {
        // Direct array format
        estimates = response;
      } else if (response && response.status === 'success' && response.estimates && Array.isArray(response.estimates)) {
        // MongoDB format: { status: 'success', estimates: [] }
        estimates = response.estimates;
      } else {
        // Fallback for empty responses or unexpected formats
        console.warn('Unexpected ride estimates response format:', response);
        estimates = [];
      }
      
      // Make sure each estimate has an ID and rating for UI compatibility
      return estimates.map((estimate, index) => ({
        ...estimate,
        id: estimate.id || `ride-${index}`,
        rating: estimate.rating || '4.8'
      }));
    } catch (error) {
      console.error('Error fetching ride estimates:', error);
      // Return empty array rather than throwing to enable graceful UI handling
      return [];
    }
  }
  
  // Request a new ride
  async requestRide(rideRequest: RideRequest): Promise<ActiveRide> {
    const response = await apiClient.post<{ride: ActiveRide}>('/rides', rideRequest);
    return response.ride;
  }
  
  // Get active ride details
  async getActiveRide(): Promise<ActiveRide | null> {
    try {
      const response = await apiClient.get<{ride: ActiveRide}>('/rides/active');
      return response.ride;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No active ride
      }
      throw error;
    }
  }
  
  // Get ride history with improved error handling
  async getRideHistory(): Promise<RideHistory[]> {
    try {
      const response = await apiClient.get<any>('/rides/history');
      
      // Handle various response formats
      if (response && response.rides && Array.isArray(response.rides)) {
        return response.rides;
      } else if (response && response.data && Array.isArray(response.data)) {
        return response.data;
      } else if (response && Array.isArray(response)) {
        return response;
      } else if (response && response.data && response.data.rides && Array.isArray(response.data.rides)) {
        return response.data.rides;
      } else if (response && response.success === true && response.data && Array.isArray(response.data)) {
        // Handle MongoDB response format: { success: true, data: [] }
        return response.data;
      } else {
        console.log('No ride history found or unexpected response format:', response);
        return []; // Return empty array if no rides or unexpected format
      }
    } catch (error) {
      console.error('Error fetching ride history:', error);
      // Return empty array instead of throwing to enable graceful UI handling
      return [];
    }
  }
  
  // Get details for a specific ride with improved error handling
  async getRideById(rideId: string): Promise<ActiveRide | null> {
    try {
      const response = await apiClient.get<any>(`/rides/${rideId}`);
      
      // Handle various response formats
      if (response && response.ride) {
        return response.ride;
      } else if (response && response.data && response.data.ride) {
        return response.data.ride;
      } else if (response && !response.ride && !response.data) {
        // If response exists but doesn't have expected structure, assume it's the ride object itself
        return response;
      } else {
        console.log(`No ride found with ID ${rideId} or unexpected response format:`, response);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching ride with ID ${rideId}:`, error);
      return null; // Return null instead of throwing to enable graceful UI handling
    }
  }
  
  // Cancel a ride
  async cancelRide(rideId: string, reason?: string): Promise<void> {
    await apiClient.post(`/rides/${rideId}/cancel`, { reason });
  }
  
  // Rate a completed ride
  async rateRide(rideId: string, rating: number, feedback?: string): Promise<void> {
    await apiClient.post(`/rides/${rideId}/rate`, {
      rating,
      feedback
    });
  }
  
  // Track ride in real-time (get rider location)
  async trackRide(rideId: string): Promise<{location: {latitude: number, longitude: number}}> {
    const response = await apiClient.get<{location: {latitude: number, longitude: number}}>(`/rides/${rideId}/track`);
    return response;
  }
  
  // Get available promotions
  async getPromotions(): Promise<any[]> {
    const response = await apiClient.get<{promotions: any[]}>('/promotions');
    return response.promotions;
  }
  
  // Apply a promotion code
  async applyPromotion(code: string): Promise<{discount: string, message: string}> {
    const response = await apiClient.post<{discount: string, message: string}>('/promotions/apply', { code });
    return response;
  }
  
  // Save favorite place
  async saveFavoritePlace(name: string, location: Location): Promise<void> {
    await apiClient.post('/user/places', { name, location });
  }
  
  // Get favorite places
  async getFavoritePlaces(): Promise<{id: string, name: string, location: Location}[]> {
    const response = await apiClient.get<{places: {id: string, name: string, location: Location}[]}>('/user/places');
    return response.places;
  }
}

export const rideService = new RideService();
