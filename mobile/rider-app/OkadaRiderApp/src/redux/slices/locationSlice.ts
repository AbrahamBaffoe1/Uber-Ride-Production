// src/redux/slices/locationSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface LocationState {
  currentLocation: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
    timestamp?: string;
  } | null;
  isAvailable: boolean;
  isOnline: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: LocationState = {
  currentLocation: null,
  isAvailable: false,
  isOnline: false,
  isLoading: false,
  error: null,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setCurrentLocation: (state, action: PayloadAction<LocationState['currentLocation']>) => {
      state.currentLocation = action.payload;
    },
    setAvailability: (state, action: PayloadAction<boolean>) => {
      state.isAvailable = action.payload;
    },
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setCurrentLocation,
  setAvailability,
  setOnlineStatus,
  setLoading,
  setError,
} = locationSlice.actions;
export default locationSlice.reducer;
