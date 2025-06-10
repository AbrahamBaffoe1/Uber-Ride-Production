/**
 * Ride Service for Rider App
 * Handles ride requests, accepting rides, and updating ride status
 */
import { apiClient } from '../client';
import { socketService } from './socket.service';

// Types
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface Passenger {
  id: string;
  name: string;
  phone?: string;
  rating?: number;
  photo?: string;
}

export interface RideDetails {
  id: string;
  passenger: Passenger;
  pickupLocation: Location;
  dropoffLocation: Location;
  distance: number | string;
  estimatedDuration?: string;
  fare: number;
  requestedAt: string;
  status: 'requested' | 'accepted' | 'arrived' | 'started' | 'completed' | 'cancelled';
}

export interface ActiveRide {
  id: string;
  passengerName: string;
  pickupLocation: string;
  dropoffLocation: string;
  distance: string;
  estimatedDuration?: string;
  status: 'accepted' | 'arrived' | 'started';
}

// Event listeners
let rideStatusChangeListeners: Array<(ride: ActiveRide | null) => void> = [];
let rideRequestsChangeListeners: Array<(requests: RideDetails[]) => void> = [];

/**
 * Get rides for current rider (active ride and available requests)
 * @returns Promise with active ride and ride requests
 */
export const getRiderRides = async (): Promise<{
  activeRide: ActiveRide | null;
  rideRequests: RideDetails[];
}> => {
  try {
    // Try to fetch from multiple endpoints with fallbacks
    const [activeRideResponse, requestsResponse] = await Promise.allSettled([
      apiClient.get('/rider/rides/active').catch(() => ({ data: null })),
      apiClient.get('/rides/nearby').catch(() => ({ data: [] }))
    ]);

    const activeRide = activeRideResponse.status === 'fulfilled' ? activeRideResponse.value.data : null;
    const rideRequests = requestsResponse.status === 'fulfilled' ? requestsResponse.value.data : [];

    return {
      activeRide,
      rideRequests: Array.isArray(rideRequests) ? rideRequests : []
    };
  } catch (error) {
    console.error('Error fetching rider rides:', error);
    return {
      activeRide: null,
      rideRequests: []
    };
  }
};

/**
 * Update rider availability status
 * @param isAvailable Whether the rider is available
 * @returns Promise with result
 */
export const updateAvailability = async (isAvailable: boolean): Promise<void> => {
  try {
    // Update via socket
    socketService.setAvailability(isAvailable);
    
    // Also update via API
    await apiClient.put('/location/status', {
      status: isAvailable ? 'online' : 'offline',
      timestamp: new Date().toISOString()
    }).catch(error => {
      // If the endpoint doesn't exist, just log it but don't throw
      if (error.code === 404) {
        console.log('Location status endpoint not found, using socket only');
      } else {
        throw error;
      }
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    throw error;
  }
};

/**
 * Subscribe to ride status changes
 * @param callback Callback function
 * @returns Unsubscribe function
 */
export const onRideStatusChanged = (callback: (ride: ActiveRide | null) => void): (() => void) => {
  rideStatusChangeListeners.push(callback);
  
  // Set up socket listeners
  const handleStatusUpdate = (data: any) => {
    if (data && data.ride) {
      const activeRide: ActiveRide = {
        id: data.ride.id,
        passengerName: data.ride.passengerName || 'Unknown',
        pickupLocation: data.ride.pickupLocation || 'Unknown',
        dropoffLocation: data.ride.dropoffLocation || 'Unknown',
        distance: data.ride.distance || 'Unknown',
        estimatedDuration: data.ride.estimatedDuration,
        status: data.ride.status
      };
      callback(activeRide);
    }
  };
  
  socketService.on('ride:status_update_confirmed', handleStatusUpdate);
  socketService.on('ride:acceptance_confirmed', handleStatusUpdate);
  
  // Return unsubscribe function
  return () => {
    rideStatusChangeListeners = rideStatusChangeListeners.filter(l => l !== callback);
    socketService.off('ride:status_update_confirmed', handleStatusUpdate);
    socketService.off('ride:acceptance_confirmed', handleStatusUpdate);
  };
};

/**
 * Subscribe to ride requests changes
 * @param callback Callback function
 * @returns Unsubscribe function
 */
export const onRideRequestsChanged = (callback: (requests: RideDetails[]) => void): (() => void) => {
  rideRequestsChangeListeners.push(callback);
  
  // Set up socket listeners
  const handleNewRequest = (data: any) => {
    if (data) {
      // Fetch updated list of requests
      getRiderRides().then(({ rideRequests }) => {
        callback(rideRequests);
      });
    }
  };
  
  socketService.on('ride:new_request', handleNewRequest);
  socketService.on('ride:request', handleNewRequest);
  
  // Return unsubscribe function
  return () => {
    rideRequestsChangeListeners = rideRequestsChangeListeners.filter(l => l !== callback);
    socketService.off('ride:new_request', handleNewRequest);
    socketService.off('ride:request', handleNewRequest);
  };
};

/**
 * Get active ride for current rider
 * @returns Promise with active ride data
 */
export const getActiveRide = async () => {
  try {
    const response = await apiClient.get('/rider/rides/active');
    return response.data;
  } catch (error) {
    console.error('Error fetching active ride:', error);
    throw error;
  }
};

/**
 * Accept a ride request
 * @param rideId ID of the ride to accept
 * @returns Promise with ride data
 */
export const acceptRide = async (rideId: string) => {
  try {
    // First send via socket for real-time update
    socketService.acceptRide(rideId);
    
    // Then update via API for persistence
    const response = await apiClient.post(`/rider/rides/${rideId}/accept`, {
      timestamp: new Date().toISOString()
    });
    
    return response.data;
  } catch (error) {
    console.error('Error accepting ride:', error);
    throw error;
  }
};

/**
 * Reject a ride request
 * @param rideId ID of the ride to reject
 * @param reason Reason for rejection
 * @returns Promise with result
 */
export const rejectRide = async (rideId: string, reason: string) => {
  try {
    socketService.rejectRide(rideId, reason);
    
    const response = await apiClient.post(`/rider/rides/${rideId}/reject`, {
      reason,
      timestamp: new Date().toISOString()
    });
    
    return response.data;
  } catch (error) {
    console.error('Error rejecting ride:', error);
    throw error;
  }
};

/**
 * Mark arrived at pickup
 * @param rideId ID of the ride
 * @returns Promise with result
 */
export const arrivedAtPickup = async (rideId: string) => {
  try {
    socketService.arrivedAtPickup(rideId);
    
    const response = await apiClient.post(`/rider/rides/${rideId}/arrived`, {
      timestamp: new Date().toISOString()
    });
    
    return response.data;
  } catch (error) {
    console.error('Error marking arrival at pickup:', error);
    throw error;
  }
};

/**
 * Start ride
 * @param rideId ID of the ride to start
 * @returns Promise with result
 */
export const startRide = async (rideId: string) => {
  try {
    socketService.startRide(rideId);
    
    const response = await apiClient.post(`/rider/rides/${rideId}/start`, {
      timestamp: new Date().toISOString()
    });
    
    return response.data;
  } catch (error) {
    console.error('Error starting ride:', error);
    throw error;
  }
};

/**
 * Complete ride
 * @param rideId ID of the ride to complete
 * @param data Additional data about the completed ride
 * @returns Promise with result
 */
export const completeRide = async (rideId: string, data: {
  actualDistance?: number;
  actualDuration?: number;
  fareCollected?: number;
  paymentMethod?: string;
}) => {
  try {
    // First send via socket for real-time update
    socketService.completeRide(rideId, data.actualDistance, data.actualDuration);
    
    // Then update via API for persistence
    const response = await apiClient.post(`/rider/rides/${rideId}/complete`, {
      ...data,
      timestamp: new Date().toISOString()
    });
    
    return response.data;
  } catch (error) {
    console.error('Error completing ride:', error);
    throw error;
  }
};

/**
 * Cancel ride
 * @param rideId ID of the ride to cancel
 * @param reason Reason for cancellation
 * @returns Promise with result
 */
export const cancelRide = async (rideId: string, reason: string) => {
  try {
    socketService.cancelRide(rideId, reason);
    
    const response = await apiClient.post(`/rider/rides/${rideId}/cancel`, {
      reason,
      timestamp: new Date().toISOString()
    });
    
    return response.data;
  } catch (error) {
    console.error('Error cancelling ride:', error);
    throw error;
  }
};

/**
 * Get ride history
 * @param params Query parameters
 * @returns Promise with ride history
 */
export const getRideHistory = async (params: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
}) => {
  try {
    const response = await apiClient.get('/rider/rides/history', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching ride history:', error);
    throw error;
  }
};

/**
 * Listen for new ride requests
 * @param callback Callback function to handle new ride requests
 * @returns Function to stop listening
 */
export const listenForRideRequests = (callback: (rideRequest: any) => void) => {
  const handleNewRequest = (data: any) => {
    callback(data);
  };
  
  // Listen for both new request events (legacy and new)
  socketService.on('ride:request', handleNewRequest);
  socketService.on('ride:new_request', handleNewRequest);
  
  // Return function to unsubscribe
  return () => {
    socketService.off('ride:request', handleNewRequest);
    socketService.off('ride:new_request', handleNewRequest);
  };
};

// Create the service object
export const rideService = {
  getRiderRides,
  updateAvailability,
  onRideStatusChanged,
  onRideRequestsChanged,
  getActiveRide,
  acceptRide,
  rejectRide,
  arrivedAtPickup,
  startRide,
  completeRide,
  cancelRide,
  getRideHistory,
  listenForRideRequests
};

export default rideService;
