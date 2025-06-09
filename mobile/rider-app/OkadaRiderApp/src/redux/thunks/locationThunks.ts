import { createAsyncThunk } from '@reduxjs/toolkit';
import { 
  setCurrentLocation, 
  setAvailability, 
  setOnlineStatus,
  setLoading, 
  setError 
} from '../slices/locationSlice';
import { locationService, LocationUpdate } from '../../api/services/location.service';
import { socketService } from '../../api/services/socket.service';

/**
 * Update rider's location on the server and through socket
 */
export const updateLocation = createAsyncThunk(
  'location/update',
  async (locationData: LocationUpdate, { dispatch, getState }) => {
    try {
      dispatch(setLoading(true));
      
      // Update location on server through REST API
      const response = await locationService.updateLocation(locationData);
      
      if (response.status === 'success' && response.data) {
        // Update Redux state
        dispatch(setCurrentLocation({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          heading: locationData.heading,
          speed: locationData.speed,
          accuracy: locationData.accuracy,
          timestamp: new Date().toISOString(),
        }));
        
        // Send update through socket for real-time communication
        socketService.updateLocation({ 
          location: {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            heading: locationData.heading,
            speed: locationData.speed,
          }
        });
        
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update location');
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
 * Update rider's availability status (online/offline)
 */
export const updateAvailability = createAsyncThunk(
  'location/availability',
  async (isAvailable: boolean, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      
      // Update availability on server through REST API
      const response = await locationService.updateAvailability({ isAvailable });
      
      if (response.status === 'success' && response.data) {
        // Update Redux state
        dispatch(setAvailability(isAvailable));
        
        // Send update through socket for real-time communication
        socketService.updateAvailability(isAvailable);
        
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update availability');
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
 * Initialize socket connection for real-time location updates
 */
export const initializeRealTimeUpdates = createAsyncThunk(
  'location/initRealTime',
  async (_, { dispatch }) => {
    try {
      // Initialize socket connection
      await socketService.initialize();
      
      // Set online status when socket connects
      socketService.on('connect', () => {
        dispatch(setOnlineStatus(true));
        console.log('Socket connected, rider is online');
      });
      
      // Set offline status when socket disconnects
      socketService.on('disconnect', () => {
        dispatch(setOnlineStatus(false));
        console.log('Socket disconnected, rider is offline');
      });
      
      // Listen for location update confirmations
      socketService.on('location:updated', (data) => {
        console.log('Location update confirmed:', data);
      });
      
      // Listen for availability update confirmations
      socketService.on('availability:updated', (data) => {
        console.log('Availability update confirmed:', data);
        dispatch(setAvailability(data.isAvailable));
      });
      
      return { success: true };
    } catch (error) {
      dispatch(setError((error as Error).message));
      dispatch(setOnlineStatus(false));
      throw error;
    }
  }
);

/**
 * Terminate socket connection and cleanup
 */
export const terminateRealTimeUpdates = createAsyncThunk(
  'location/terminateRealTime',
  async (_, { dispatch }) => {
    try {
      // Disconnect socket
      socketService.disconnect();
      
      // Update Redux state
      dispatch(setOnlineStatus(false));
      
      return { success: true };
    } catch (error) {
      dispatch(setError((error as Error).message));
      throw error;
    }
  }
);
