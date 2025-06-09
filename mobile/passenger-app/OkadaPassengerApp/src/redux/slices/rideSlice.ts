import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
}

export interface Rider {
  id: string;
  name: string;
  phoneNumber: string;
  photo: string;
  rating: number;
  vehicleInfo: string;
}

export interface RideDetails {
  id: string;
  status: 'pending' | 'accepted' | 'arrived' | 'started' | 'completed' | 'cancelled';
  pickupLocation: Location;
  dropoffLocation: Location;
  distance: string;
  duration: string;
  fare: string;
  paymentMethod: string;
  rider?: Rider;
  createdAt: string;
  scheduledFor?: string;
  estimatedArrival?: string;
}

export interface RideState {
  currentRide: RideDetails | null;
  rideHistory: RideDetails[];
  loading: boolean;
  error: string | null;
}

const initialState: RideState = {
  currentRide: null,
  rideHistory: [],
  loading: false,
  error: null,
};

export const rideSlice = createSlice({
  name: 'ride',
  initialState,
  reducers: {
    requestRideStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    requestRideSuccess: (state, action: PayloadAction<RideDetails>) => {
      state.currentRide = action.payload;
      state.loading = false;
      state.error = null;
    },
    requestRideFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateRideStatus: (state, action: PayloadAction<{ status: RideDetails['status'], estimatedArrival?: string }>) => {
      if (state.currentRide) {
        state.currentRide.status = action.payload.status;
        if (action.payload.estimatedArrival) {
          state.currentRide.estimatedArrival = action.payload.estimatedArrival;
        }
      }
    },
    assignRider: (state, action: PayloadAction<Rider>) => {
      if (state.currentRide) {
        state.currentRide.rider = action.payload;
      }
    },
    completeRide: (state) => {
      if (state.currentRide) {
        state.currentRide.status = 'completed';
        state.rideHistory.unshift({ ...state.currentRide });
        state.currentRide = null;
      }
    },
    cancelRide: (state) => {
      if (state.currentRide) {
        state.currentRide.status = 'cancelled';
        state.rideHistory.unshift({ ...state.currentRide });
        state.currentRide = null;
      }
    },
    loadRideHistorySuccess: (state, action: PayloadAction<RideDetails[]>) => {
      state.rideHistory = action.payload;
      state.loading = false;
      state.error = null;
    },
    clearCurrentRide: (state) => {
      state.currentRide = null;
    },
  },
});

export const {
  requestRideStart,
  requestRideSuccess,
  requestRideFailure,
  updateRideStatus,
  assignRider,
  completeRide,
  cancelRide,
  loadRideHistorySuccess,
  clearCurrentRide,
} = rideSlice.actions;

export default rideSlice.reducer;
