import { NavigatorScreenParams } from '@react-navigation/native';

// Auth Stack - All authentication related screens
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  PhoneVerification: {
    phone: string;
    userId: string;
  };
  Verification: {
    userId: string;
    email?: string;
    phoneNumber?: string;
  };
  ForgotPassword: undefined;
  ResetPassword: {
    token: string;
  };
  RiderInfo: undefined;
  DocumentUpload: undefined;
  RegistrationComplete: undefined;
  AuthSuccess: {
    action: 'login' | 'logout' | 'signup' | 'passwordReset';
    destination?: keyof AuthStackParamList | keyof MainTabParamList | keyof HomeStackParamList;
    message?: string;
  };
  AuthError: {
    error: string;
    action?: 'login' | 'logout' | 'signup' | 'passwordReset';
    retryDestination?: keyof AuthStackParamList;
  };
};

// Home Stack - Main app screens
export type HomeStackParamList = {
  Dashboard: undefined;
  RideDetails: {
    rideId: string;
    passengerName?: string;
    pickupLocation?: string;
    dropoffLocation?: string;
    distance?: string;
    estimatedFare?: string;
    timestamp?: Date;
    status?: 'accepted' | 'arrived' | 'started';
  };
  RideComplete: {
    rideId: string;
  };
};

// Main Tab Navigator - Combines bottom tabs
export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  RidesTab: NavigatorScreenParams<RidesStackParamList>;
  EarningsTab: NavigatorScreenParams<EarningsStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

// Rides Stack - Ride-related screens
export type RidesStackParamList = {
  RidesList: undefined;
  RideDetails: {
    rideId: string;
    passengerName?: string;
    pickupLocation?: string;
    dropoffLocation?: string;
    distance?: string;
    estimatedFare?: string;
    timestamp?: Date;
    status?: 'accepted' | 'arrived' | 'started';
  };
  RideComplete: {
    rideId: string;
  };
  RideHistory: undefined;
};

// Earnings Stack - Earnings-related screens
export type EarningsStackParamList = {
  EarningsOverview: undefined;
  EarningsHistory: undefined;
  CashoutConfirmation: {
    amount: number;
  };
  RiderMetrics: {
    date?: string;
  };
};

// Profile Stack - Profile-related screens
export type ProfileStackParamList = {
  ProfileOverview: undefined;
  Settings: undefined;
  Notifications: undefined;
  Support: undefined;
  Safety: {
    rideId?: string;
  };
  Compliance: undefined;
};

// Root Navigator - Top level navigation
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

// Declare navigation types for useNavigation hook
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
