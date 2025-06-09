import { createAsyncThunk } from '@reduxjs/toolkit';
import { 
  setActiveRide, 
  setAvailableRides, 
  setRideHistory, 
  updateRideStatus,
  setLoading, 
  setError 
} from '../slices/ridesSlice';
import { rideService, RideStatusUpdate } from '../../api/services/ride.service';
import { socketService } from '../../api/services/socket.service';
import { RootState } from '../store';

/**
 * Fetch available rides near the rider
 */
export const fetchAvailableRides = createAsyncThunk(
  'rides/fetchAvailable',
  async (radius: number = 5, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const response = await rideService.getAvailableRides(radius);
      
      if (response.status === 'success' && response.data) {
        dispatch(setAvailableRides(response.data));
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch available rides');
      }
    } catch (error) {
      dispatch(setError((error as Error).message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Accept a ride request
 */
export const acceptRide = createAsyncThunk(
  'rides/accept',
  async (rideId: string, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const response = await rideService.acceptRide(rideId);
      
      if (response.status === 'success' && response.data) {
        dispatch(setActiveRide(response.data));
        
        // Also use socket service to ensure real-time updates
        socketService.acceptRide(rideId);
        
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to accept ride');
      }
    } catch (error) {
      dispatch(setError((error as Error).message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Reject a ride request
 */
export const rejectRide = createAsyncThunk(
  'rides/reject',
  async ({ rideId, reason }: { rideId: string; reason?: string }, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const response = await rideService.rejectRide(rideId, reason);
      
      if (response.status === 'success') {
        // Remove the ride from available rides
        return { rideId };
      } else {
        throw new Error(response.message || 'Failed to reject ride');
      }
    } catch (error) {
      dispatch(setError((error as Error).message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Update ride status (arrived, started, completed)
 */
export const updateRideStatusThunk = createAsyncThunk(
  'rides/updateStatus',
  async (
    { rideId, statusUpdate }: { rideId: string; statusUpdate: RideStatusUpdate }, 
    { dispatch }
  ) => {
    try {
      dispatch(setLoading(true));
      const response = await rideService.updateRideStatus(rideId, statusUpdate);
      
      if (response.status === 'success' && response.data) {
        dispatch(updateRideStatus({ rideId, status: statusUpdate.status }));
        
        // Also use socket service to ensure real-time updates
        socketService.updateRideStatus(rideId, statusUpdate.status, {
          actualDistance: statusUpdate.actualDistance,
          actualDuration: statusUpdate.actualDuration,
          actualFare: statusUpdate.actualFare,
        });
        
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update ride status');
      }
    } catch (error) {
      dispatch(setError((error as Error).message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Get active ride for the rider
 */
export const getActiveRide = createAsyncThunk(
  'rides/getActive',
  async (_, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const response = await rideService.getActiveRide();
      
      if (response.status === 'success') {
        if (response.data) {
          dispatch(setActiveRide(response.data));
        } else {
          dispatch(setActiveRide(null));
        }
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to get active ride');
      }
    } catch (error) {
      dispatch(setError((error as Error).message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Get ride history for the rider
 */
export const getRideHistory = createAsyncThunk(
  'rides/getHistory',
  async ({ page, limit }: { page?: number; limit?: number } = {}, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const response = await rideService.getRideHistory(page, limit);
      
      if (response.status === 'success' && response.data) {
        // Transform the ride history items to match the Ride interface
        const formattedRides = response.data.map(historyItem => ({
          id: historyItem.id,
          status: historyItem.status,
          passenger: {
            id: historyItem.passenger.id,
            name: historyItem.passenger.name,
            phone: 'N/A', // Not available in history but required by interface
            photo: historyItem.passenger.photo,
          },
          pickupLocation: {
            latitude: 0, // Not available in history but required by interface
            longitude: 0, // Not available in history but required by interface
            address: historyItem.pickupLocation.address,
          },
          dropoffLocation: {
            latitude: 0, // Not available in history but required by interface
            longitude: 0, // Not available in history but required by interface
            address: historyItem.dropoffLocation.address,
          },
          fare: historyItem.fare,
          distance: historyItem.distance,
          duration: historyItem.duration,
          requestedAt: historyItem.completedAt || historyItem.cancelledAt || new Date().toISOString(), // Required field
          completedAt: historyItem.completedAt,
          cancelledAt: historyItem.cancelledAt,
          paymentMethod: historyItem.paymentMethod,
        }));
        
        dispatch(setRideHistory(formattedRides));
        return formattedRides;
      } else {
        throw new Error(response.message || 'Failed to get ride history');
      }
    } catch (error) {
      dispatch(setError((error as Error).message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);
