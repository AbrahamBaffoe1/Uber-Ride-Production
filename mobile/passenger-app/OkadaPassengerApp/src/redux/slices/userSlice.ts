import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'mobileMoney' | 'cash';
  name: string;
  last4?: string;
  expiryDate?: string;
  isDefault: boolean;
}

export interface SavedLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'home' | 'work' | 'favorite' | 'other';
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  photo?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  emergencyContact?: {
    name: string;
    phoneNumber: string;
    relationship: string;
  };
}

export interface UserPreferences {
  language: string;
  notifications: {
    rideUpdates: boolean;
    promotions: boolean;
    accountActivity: boolean;
  };
  theme: 'light' | 'dark' | 'system';
}

export interface UserState {
  profile: UserProfile | null;
  paymentMethods: PaymentMethod[];
  savedLocations: SavedLocation[];
  preferences: UserPreferences;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  paymentMethods: [],
  savedLocations: [],
  preferences: {
    language: 'en',
    notifications: {
      rideUpdates: true,
      promotions: true,
      accountActivity: true,
    },
    theme: 'system',
  },
  loading: false,
  error: null,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserProfile: (state, action: PayloadAction<UserProfile>) => {
      state.profile = action.payload;
    },
    updateUserProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    },
    setPaymentMethods: (state, action: PayloadAction<PaymentMethod[]>) => {
      state.paymentMethods = action.payload;
    },
    addPaymentMethod: (state, action: PayloadAction<PaymentMethod>) => {
      if (action.payload.isDefault) {
        // Set all existing payment methods to non-default
        state.paymentMethods = state.paymentMethods.map(method => ({
          ...method,
          isDefault: false,
        }));
      }
      state.paymentMethods.push(action.payload);
    },
    removePaymentMethod: (state, action: PayloadAction<string>) => {
      state.paymentMethods = state.paymentMethods.filter(
        method => method.id !== action.payload
      );
    },
    setDefaultPaymentMethod: (state, action: PayloadAction<string>) => {
      state.paymentMethods = state.paymentMethods.map(method => ({
        ...method,
        isDefault: method.id === action.payload,
      }));
    },
    setSavedLocations: (state, action: PayloadAction<SavedLocation[]>) => {
      state.savedLocations = action.payload;
    },
    addSavedLocation: (state, action: PayloadAction<SavedLocation>) => {
      state.savedLocations.push(action.payload);
    },
    updateSavedLocation: (state, action: PayloadAction<SavedLocation>) => {
      const index = state.savedLocations.findIndex(
        location => location.id === action.payload.id
      );
      if (index !== -1) {
        state.savedLocations[index] = action.payload;
      }
    },
    removeSavedLocation: (state, action: PayloadAction<string>) => {
      state.savedLocations = state.savedLocations.filter(
        location => location.id !== action.payload
      );
    },
    updateUserPreferences: (state, action: PayloadAction<Partial<UserPreferences>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    updateNotificationPreferences: (
      state,
      action: PayloadAction<Partial<UserPreferences['notifications']>>
    ) => {
      state.preferences.notifications = {
        ...state.preferences.notifications,
        ...action.payload,
      };
    },
    setUserLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setUserError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setUserProfile,
  updateUserProfile,
  setPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  setDefaultPaymentMethod,
  setSavedLocations,
  addSavedLocation,
  updateSavedLocation,
  removeSavedLocation,
  updateUserPreferences,
  updateNotificationPreferences,
  setUserLoading,
  setUserError,
} = userSlice.actions;

export default userSlice.reducer;
