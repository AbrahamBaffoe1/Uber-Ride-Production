/**
 * Ride Service for Rider App
 * Handles ride requests, accepting rides, and updating ride status
 */
import { apiClient } from '../client';
import { socketService } from './socket.service';

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

export default {
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
