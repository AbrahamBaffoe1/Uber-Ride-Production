import { NavigatorScreenParams } from '@react-navigation/native';

// Auth Stack - All authentication related screens
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  // PhoneVerification removed - no longer using OTP verification for riders
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
  Earnings: undefined;
  EarningsHistory: undefined;
  CashoutConfirmation: {
    amount: number;
  };
  RiderMetrics: {
    date?: string;
  };
  Profile: undefined;
  History: undefined;
  Support: undefined;
  Safety: {
    rideId: string;
  };
  Settings: undefined;
  Compliance: undefined;
  Notifications: undefined;
  Rides: undefined;
};

// Main Tab Navigator - Combines bottom tabs
export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Rides: undefined;
  Earnings: undefined;
  Profile: undefined;
  History: undefined;
  Support: undefined;
  Safety: {
    rideId: string;
  };
  Settings: undefined;
  Compliance: undefined;
  Notifications: undefined;
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
