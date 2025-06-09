import { apiClient } from '../apiClient';

// Type definitions for rides data from the API
export interface ApiRideRequest {
  _id: string;
  userId: string;
  pickupLocation: {
    address: string;
    coordinates: {
      type: string;
      coordinates: [number, number]; // [longitude, latitude]
    }
  };
  destination: {
    address: string;
    coordinates: {
      type: string;
      coordinates: [number, number]; // [longitude, latitude]
    }
  };
  fare: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    surgeMultiplier: number;
    totalFare: number;
    currency: string;
  };
  status: string;
  createdAt: Date;
  estimatedDistance?: number;
  estimatedDuration?: number;
}

// Interface matching what the Dashboard component expects
export interface RideRequest {
  id: string;
  passengerName: string;
  passengerRating: number;
  pickupLocation: string;
  dropoffLocation: string;
  distance: string;
  estimatedFare: string;
  estimatedTime: string;
}

export interface ActiveRide {
  _id: string;
  userId: string;
  riderId: string;
  pickupLocation: {
    address: string;
    coordinates: {
      type: string;
      coordinates: [number, number]; // [longitude, latitude]
    }
  };
  destination: {
    address: string;
    coordinates: {
      type: string;
      coordinates: [number, number]; // [longitude, latitude]
    }
  };
  status: string;
  estimatedDuration: number;
  estimatedDistance: number;
  fare: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    surgeMultiplier: number;
    totalFare: number;
    currency: string;
  };
  createdAt: Date;
  passengerInfo?: {
    name: string;
    rating: number;
  };
}

export interface RideSummary {
  _id: string;
  userId: string;
  riderId: string;
  pickupLocation: {
    address: string;
  };
  destination: {
    address: string;
  };
  status: string;
  estimatedDistance: number;
  actualDistance: number;
  estimatedDuration: number;
  actualDuration: number;
  fare: {
    totalFare: number;
    currency: string;
  };
  paymentMethod: string;
  paymentStatus: string;
  createdAt: Date;
  actualPickupTime?: Date;
  actualDropoffTime?: Date;
  passengerInfo?: {
    name: string;
  };
}

export interface AcceptRideResponse {
  success: boolean;
  message?: string;
  ride?: ActiveRide;
}

export interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  passengerProfile?: {
    averageRating?: number;
  }
}

class RideService {
  // Default coordinates for Lagos, Nigeria
  private defaultLatitude: number = 6.5244;
  private defaultLongitude: number = 3.3792;

  // Get nearby ride requests for rider
  async getAvailableRides(): Promise<ApiRideRequest[]> {
    try {
      // First try to get the rider's location from the API
      let lat = this.defaultLatitude;
      let lng = this.defaultLongitude;

      try {
        const locationResponse = await apiClient.get<{
          status: string;
          data: {
            currentLocation: {
              coordinates: {
                lat: number;
                lng: number;
              }
            }
          }
        }>('/location/current');
        
        if (locationResponse.status === 'success' && 
            locationResponse.data?.currentLocation?.coordinates) {
          lat = locationResponse.data.currentLocation.coordinates.lat;
          lng = locationResponse.data.currentLocation.coordinates.lng;
        }
      } catch (locationError) {
        console.log('Using default coordinates - API location retrieval failed');
      }

      // Use location to find nearby ride requests
      const response = await apiClient.get<{
        status: string;
        data: {
          rides: ApiRideRequest[]
        }
      }>('/rides/nearby', {
        params: { latitude: lat, longitude: lng, maxDistance: 5000 }
      });
      
      if (response.status === 'success') {
        return response.data.rides || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching available rides:', error);
      return [];
    }
  }
  
  // Get passenger details from API
  private async getPassengerDetails(userId: string): Promise<UserInfo | null> {
    try {
      const response = await apiClient.get<{
        status: string;
        data: {
          user: UserInfo
        }
      }>(`/users/${userId}`);
      
      if (response.status !== 'success') {
        return null;
      }
      
      return response.data.user;
    } catch (error) {
      console.error(`Error fetching passenger details for user ${userId}:`, error);
      return null;
    }
  }
  
  // Calculate estimated time based on distance and traffic conditions
  private calculateEstimatedTime(distance: number): string {
    // Average speed 30 km/h in city traffic
    const averageSpeedKmPerHour = 30;
    
    // Convert to minutes, adding 5 minutes base time for pickup
    const timeInMinutes = Math.ceil((distance / 1000 / averageSpeedKmPerHour) * 60) + 5;
    
    // Return formatted time string
    return `${timeInMinutes} mins`;
  }
  
  // Format distance to user-friendly string
  private formatDistance(distanceInMeters: number): string {
    const distanceInKm = (distanceInMeters / 1000).toFixed(1);
    return `${distanceInKm} km`;
  }
  
  // Get available ride requests formatted for dashboard
  async getAvailableRideRequests(): Promise<RideRequest[]> {
    try {
      const apiRides = await this.getAvailableRides();
      if (!apiRides || apiRides.length === 0) {
        return [];
      }
      
      // Map API response to RideRequest format
      const rideRequests = await Promise.all(
        apiRides.map(async (ride) => {
          // Try to get passenger details for each ride
          let passengerName = 'Anonymous';
          let passengerRating = 5.0;
          
          try {
            const passenger = await this.getPassengerDetails(ride.userId);
            if (passenger) {
              passengerName = `${passenger.firstName} ${passenger.lastName}`;
              passengerRating = passenger.passengerProfile?.averageRating || 5.0;
            }
          } catch (error) {
            // Continue with default values
          }
          
          // Calculate distance string
          const distance = ride.estimatedDistance 
            ? this.formatDistance(ride.estimatedDistance)
            : this.formatDistance(5000); // Default to 5km if not available
          
          // Calculate estimated time
          const estimatedTime = ride.estimatedDuration
            ? `${Math.ceil(ride.estimatedDuration / 60)} mins`
            : this.calculateEstimatedTime(ride.estimatedDistance || 5000);
            
          // Format the ride request for the dashboard
          return {
            id: ride._id,
            passengerName,
            passengerRating,
            pickupLocation: ride.pickupLocation.address,
            dropoffLocation: ride.destination.address,
            distance: distance,
            estimatedFare: `₦${ride.fare.totalFare.toLocaleString()}`,
            estimatedTime: estimatedTime
          };
        })
      );
      
      return rideRequests;
    } catch (error) {
      console.error('Error fetching available ride requests:', error);
      return [];
    }
  }
  
  // Get active ride for rider
  async getActiveRide(): Promise<ActiveRide | null> {
    try {
      // Get the current user's ID
      const userInfo = await apiClient.get<{
        status: string;
        data: {
          user: {
            id: string;
          }
        }
      }>('/auth/me');
      
      if (userInfo.status !== 'success') {
        console.error('Failed to get user info');
        return null;
      }
      
      const riderId = userInfo.data.user.id;
      
      // Find rides where the user is the rider and status is active
      const response = await apiClient.get<{
        status: string;
        data: {
          rides: ActiveRide[]
        }
      }>(`/rides/rider/${riderId}`, {
        params: { 
          status: ['accepted', 'arrived_pickup', 'in_progress'] 
        }
      });
      
      if (response.status !== 'success') {
        console.error('Failed to get active rides');
        return null;
      }
      
      // Return the first active ride if any
      if (response.data.rides && response.data.rides.length > 0) {
        const activeRide = response.data.rides[0];
        
        // Get passenger info
        const passenger = await this.getPassengerDetails(activeRide.userId);
        if (passenger) {
          activeRide.passengerInfo = {
            name: `${passenger.firstName} ${passenger.lastName}`,
            rating: passenger.passengerProfile?.averageRating || 5
          };
        }
        
        return activeRide;
      }
      
      return null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching active ride:', error);
      return null;
    }
  }
  
  // Fetch both ride types at once (used by RidesScreen)
  async getRiderRides(): Promise<{activeRide: ActiveRide | null, rideRequests: ApiRideRequest[]}> {
    try {
      // First try to get active ride
      const activeRide = await this.getActiveRide();
      
      // If there's an active ride, we don't need ride requests
      if (activeRide) {
        return {
          activeRide,
          rideRequests: []
        };
      }
      
      // If no active ride, get available ride requests
      const rideRequests = await this.getAvailableRides();
      return {
        activeRide: null,
        rideRequests
      };
    } catch (error: any) {
      console.error('Error fetching rider rides:', error);
      return {
        activeRide: null,
        rideRequests: []
      };
    }
  }
  
  // Accept a ride request
  async acceptRideRequest(rideId: string): Promise<AcceptRideResponse> {
    try {
      const ride = await this.acceptRide(rideId);
      return {
        success: true,
        ride
      };
    } catch (error: any) {
      console.error('Error accepting ride request:', error);
      return {
        success: false,
        message: error.message || 'Failed to accept ride. Please try again.'
      };
    }
  }
  
  // Accept a ride
  async acceptRide(rideId: string): Promise<ActiveRide> {
    try {
      // Get the current user's ID
      const userInfo = await apiClient.get<{
        status: string;
        data: {
          user: {
            id: string;
          }
        }
      }>('/auth/me');
      
      if (userInfo.status !== 'success') {
        throw new Error('Failed to get user info');
      }
      
      const riderId = userInfo.data.user.id;
      
      // Update the ride with rider ID and change status to accepted
      const response = await apiClient.put<{
        status: string;
        message: string;
        data: {
          ride: ActiveRide
        }
      }>(`/rides/${rideId}`, {
        riderId,
        status: 'accepted'
      });
      
      if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to accept ride');
      }
      
      // Get passenger info for the updated ride
      const passenger = await this.getPassengerDetails(response.data.ride.userId);
      if (passenger) {
        response.data.ride.passengerInfo = {
          name: `${passenger.firstName} ${passenger.lastName}`,
          rating: passenger.passengerProfile?.averageRating || 5
        };
      }
      
      return response.data.ride;
    } catch (error) {
      console.error('Error accepting ride:', error);
      throw error;
    }
  }
  
  // Decline a ride request
  async declineRideRequest(rideId: string): Promise<void> {
    try {
      // Call the API to record the decline
      await apiClient.post<{
        status: string;
        message: string;
      }>(`/rides/${rideId}/decline`, {
        reason: 'rider_choice'
      });
    } catch (error) {
      console.error('Error declining ride request:', error);
      throw error;
    }
  }
  
  // Update rider's status (online/offline)
  async updateRiderStatus(isOnline: boolean): Promise<void> {
    try {
      // Use the existing updateAvailability method
      await this.updateAvailability(isOnline);
    } catch (error: any) {
      // If we get a 403, the user likely doesn't have rider permissions yet
      if (error.response?.status === 403) {
        console.warn('User does not have rider permissions to update status');
        // Don't throw the error - let the UI continue to work
        return;
      }
      
      console.error('Error updating rider status:', error);
      // Don't throw the error here either, to keep the app functioning
    }
  }
  
  // Update ride status (arrived_pickup, in_progress, completed)
  async updateRideStatus(rideId: string, status: string): Promise<void> {
    try {
      const response = await apiClient.patch<{
        status: string;
        message: string;
      }>(`/rides/${rideId}/status`, { status });
      
      if (response.status !== 'success') {
        throw new Error(response.message || `Failed to update ride status to ${status}`);
      }
      
      // If the status is in_progress, update the rider location status
      if (status === 'in_progress') {
        const locationResponse = await apiClient.put<{
          status: string;
          message: string;
        }>('/location/status', { status: 'en_route' });
        
        if (locationResponse.status !== 'success') {
          console.warn('Failed to update rider status to en_route:', locationResponse.message);
        }
      } else if (status === 'completed' || status === 'arrived_destination') {
        // If the ride is completed, update the rider status back to online
        const locationResponse = await apiClient.put<{
          status: string;
          message: string;
        }>('/location/status', { status: 'online' });
        
        if (locationResponse.status !== 'success') {
          console.warn('Failed to update rider status to online:', locationResponse.message);
        }
      }
    } catch (error) {
      console.error(`Error updating ride status to ${status}:`, error);
      throw error;
    }
  }
  
  // Get ride details
  async getRideById(rideId: string): Promise<RideSummary> {
    try {
      const response = await apiClient.get<{
        status: string;
        data: {
          ride: RideSummary
        }
      }>(`/rides/${rideId}`);
      
      if (response.status !== 'success') {
        throw new Error(`Failed to get ride details for ID: ${rideId}`);
      }
      
      const ride = response.data.ride;
      
      // Get passenger info if needed
      const passenger = await this.getPassengerDetails(ride.userId);
      if (passenger) {
        ride.passengerInfo = {
          name: `${passenger.firstName} ${passenger.lastName}`
        };
      }
      
      return ride;
    } catch (error) {
      console.error(`Error fetching ride ${rideId}:`, error);
      throw error;
    }
  }
  
  // Get ride history
  async getRideHistory(page: number = 1, limit: number = 20): Promise<RideSummary[]> {
    try {
      const userInfo = await apiClient.get<{
        status: string;
        data: {
          user: {
            id: string;
          }
        }
      }>('/auth/me');
      
      if (userInfo.status !== 'success') {
        throw new Error('Failed to get user info');
      }
      
      const riderId = userInfo.data.user.id;
      
      const response = await apiClient.get<{
        status: string;
        data: {
          rides: RideSummary[];
          pagination: {
            totalPages: number;
            currentPage: number;
            totalItems: number;
          }
        }
      }>(`/rides/rider/${riderId}`, {
        params: { 
          status: ['completed', 'paid'],
          page,
          limit
        }
      });
      
      if (response.status !== 'success') {
        throw new Error('Failed to get ride history');
      }
      
      // Add passenger names to each ride summary
      const rides = response.data.rides || [];
      
      // Get passenger info for each ride (batched to avoid too many requests)
      const passengerIds = [...new Set(rides.map(ride => ride.userId))];
      const passengerDetails: Record<string, UserInfo> = {};
      
      // Get details for all unique passenger IDs
      for (const passengerId of passengerIds) {
        const passenger = await this.getPassengerDetails(passengerId);
        if (passenger) {
          passengerDetails[passengerId] = passenger;
        }
      }
      
      // Update rides with passenger info
      for (const ride of rides) {
        const passenger = passengerDetails[ride.userId];
        if (passenger) {
          ride.passengerInfo = {
            name: `${passenger.firstName} ${passenger.lastName}`
          };
        }
      }
      
      return rides;
    } catch (error) {
      console.error('Error fetching ride history:', error);
      return [];
    }
  }
  
  // Confirm cash payment
  async confirmCashPayment(rideId: string): Promise<void> {
    try {
      // First mark the ride as paid
      const statusResponse = await apiClient.patch<{
        status: string;
        message: string;
      }>(`/rides/${rideId}/status`, { status: 'paid' });
      
      if (statusResponse.status !== 'success') {
        throw new Error(statusResponse.message || 'Failed to update ride status to paid');
      }
      
      // Update payment status
      const paymentResponse = await apiClient.put<{
        status: string;
        message: string;
      }>(`/rides/${rideId}/payment`, {
        paymentMethod: 'cash',
        paymentStatus: 'paid'
      });
      
      if (paymentResponse.status !== 'success') {
        throw new Error(paymentResponse.message || 'Failed to update payment status');
      }
    } catch (error) {
      console.error('Error confirming cash payment:', error);
      throw error;
    }
  }
  
  // Update rider's location
  async updateLocation(latitude: number, longitude: number): Promise<void> {
    try {
      const response = await apiClient.post<{
        status: string;
        message: string;
      }>('/location/update', {
        lat: latitude,
        lng: longitude,
        provider: 'gps'
      });
      
      if (response.status !== 'success') {
        console.warn('Failed to update rider location:', response.message);
      }
    } catch (error) {
      console.error('Error updating rider location:', error);
      // Don't throw the error to keep the app functioning
    }
  }
  
  // Update rider's availability status
  async updateAvailability(isAvailable: boolean): Promise<void> {
    try {
      const status = isAvailable ? 'online' : 'offline';
      const response = await apiClient.put<{
        status: string;
        message: string;
      }>('/location/status', { status });
      
      if (response.status !== 'success') {
        console.warn(`Failed to update availability to ${status}:`, response.message);
      }
    } catch (error) {
      console.error(`Error updating availability to ${isAvailable ? 'online' : 'offline'}:`, error);
      // Don't throw the error to keep the app functioning
    }
  }
}

export const rideService = new RideService();
