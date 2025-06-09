// src/redux/slices/ridesSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface Passenger {
  id: string;
  name: string;
  phone: string;
  photo?: string;
  rating?: number;
}

interface Ride {
  id: string;
  status: 'requested' | 'accepted' | 'arrived' | 'started' | 'completed' | 'cancelled' | 'expired';
  passenger: Passenger;
  pickupLocation: Location;
  dropoffLocation: Location;
  fare: number;
  distance: number | string;
  duration: number | string;
  distanceToPickup?: number | string;
  estimatedArrival?: string;
  requestedAt: string;
  acceptedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  paymentMethod: 'cash' | 'card' | 'mobile_money';
}

interface RidesState {
  activeRide: Ride | null;
  availableRides: Ride[];
  rideHistory: Ride[];
  isLoading: boolean;
  error: string | null;
}

const initialState: RidesState = {
  activeRide: null,
  availableRides: [],
  rideHistory: [],
  isLoading: false,
  error: null,
};

const ridesSlice = createSlice({
  name: 'rides',
  initialState,
  reducers: {
    setActiveRide: (state, action: PayloadAction<Ride | null>) => {
      state.activeRide = action.payload;
    },
    setAvailableRides: (state, action: PayloadAction<Ride[]>) => {
      state.availableRides = action.payload;
    },
    setRideHistory: (state, action: PayloadAction<Ride[]>) => {
      state.rideHistory = action.payload;
    },
    updateRideStatus: (state, action: PayloadAction<{ rideId: string; status: Ride['status'] }>) => {
      if (state.activeRide && state.activeRide.id === action.payload.rideId) {
        state.activeRide.status = action.payload.status;
      }
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
  setActiveRide,
  setAvailableRides,
  setRideHistory,
  updateRideStatus,
  setLoading,
  setError,
} = ridesSlice.actions;
export default ridesSlice.reducer;
