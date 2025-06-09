import { createAsyncThunk } from '@reduxjs/toolkit';
import { rideService, RideRequestData } from '../../api/services/ride.service';
import { 
  requestRideStart, 
  requestRideSuccess, 
  requestRideFailure, 
  updateRideStatus, 
  loadRideHistorySuccess,
  assignRider,
  cancelRide as cancelRideAction
} from '../../redux/slices/rideSlice';
import { RootState } from '../../redux/store';

/**
 * Request a new ride
 */
export const requestRide = createAsyncThunk(
  'ride/requestRide',
  async (rideData: RideRequestData, { dispatch }) => {
    try {
      dispatch(requestRideStart());
      const response = await rideService.requestRide(rideData);
      
      if (response.status === 'success' && response.data) {
        dispatch(requestRideSuccess(response.data));
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to request ride');
      }
    } catch (error) {
      dispatch(requestRideFailure((error as Error).message));
      throw error;
    }
  }
);

/**
 * Get ride by ID
 */
export const getRideById = createAsyncThunk(
  'ride/getRideById',
  async (rideId: string) => {
    const response = await rideService.getRide(rideId);
    
    if (response.status === 'success' && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'Failed to get ride');
    }
  }
);

/**
 * Cancel a ride
 */
export const cancelRide = createAsyncThunk(
  'ride/cancelRide',
  async (rideId: string, { dispatch, getState }) => {
    const response = await rideService.cancelRide(rideId);
    
    if (response.status === 'success') {
      dispatch(cancelRideAction());
      return true;
    } else {
      throw new Error(response.message || 'Failed to cancel ride');
    }
  }
);

/**
 * Rate a completed ride
 */
export const rateRide = createAsyncThunk(
  'ride/rateRide',
  async ({ rideId, rating, review }: { rideId: string; rating: number; review?: string }) => {
    const response = await rideService.rateRide(rideId, rating, review);
    
    if (response.status === 'success') {
      return true;
    } else {
      throw new Error(response.message || 'Failed to rate ride');
    }
  }
);

/**
 * Get ride history
 */
export const getRideHistory = createAsyncThunk(
  'ride/getRideHistory',
  async ({ page, limit }: { page?: number; limit?: number } = {}, { dispatch }) => {
    const response = await rideService.getRideHistory(page, limit);
    
    if (response.status === 'success' && response.data) {
      dispatch(loadRideHistorySuccess(response.data));
      return response.data;
    } else {
      throw new Error(response.message || 'Failed to get ride history');
    }
  }
);

/**
 * Get active ride
 */
export const getActiveRide = createAsyncThunk(
  'ride/getActiveRide',
  async (_, { dispatch }) => {
    const response = await rideService.getActiveRide();
    
    if (response.status === 'success') {
      if (response.data) {
        dispatch(requestRideSuccess(response.data));
      }
      return response.data;
    } else {
      throw new Error(response.message || 'Failed to get active ride');
    }
  }
);

/**
 * Track a ride in real-time
 */
export const trackRide = createAsyncThunk(
  'ride/trackRide',
  async (rideId: string, { dispatch, getState }) => {
    const response = await rideService.trackRide(rideId);
    
    if (response.status === 'success' && response.data) {
      // Update ride status with tracking data
      dispatch(updateRideStatus({
        status: response.data.status,
        estimatedArrival: response.data.estimatedArrival
      }));
      
      return response.data;
    } else {
      throw new Error(response.message || 'Failed to track ride');
    }
  }
);
