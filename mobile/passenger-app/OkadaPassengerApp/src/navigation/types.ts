/**
 * Navigation Type Definitions for Okada Passenger App.
 * 
 * This file defines the navigation parameter lists for various stacks.
 * Improvements include:
 *  - Modular subtypes for ride tracking and completion details.
 *  - Replacing 'any' with a defined DestinationData interface.
 *  - Allowing keyboard configuration for screens that require keyboard adjustment by adding an optional keyboardOptions parameter.
 */

/**
 * Options for handling keyboard behavior in screens.
 */
export interface KeyboardOptions {
  keyboardVerticalOffset?: number;
}

/**
 * Structure to represent destination data.
 * Replace or extend the properties as needed.
 */
export interface DestinationData {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  placeId?: string;
  // Add more fields if necessary.
}

/**
 * Common ride tracking information used across ride detail screens.
 */
export interface RideTrackingInfo {
  rideId: string;
  riderId: string;
  riderName: string;
  riderPhoto: string;
  riderVehicleInfo: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupName: string;
  dropoffName: string;
  fare: string;
  distance: string;
  duration: string;
  paymentMethod: string;
  riderRating: number;
}

/**
 * Ride completion information for the RideCompletion screen.
 */
export interface RideCompletionInfo {
  rideId: string;
  riderName: string;
  pickupName: string;
  dropoffName: string;
  fare: string;
  paymentMethod: string;
}

/**
 * Restaurant data for food ordering
 */
export interface RestaurantData {
  id: string;
  name: string;
  image: string;
  cuisineType: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distance?: string;
}

/**
 * Food item data for restaurant menus
 */
export interface FoodItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  options?: FoodItemOption[];
  popular?: boolean;
}

/**
 * Food item option for customization
 */
export interface FoodItemOption {
  id: string;
  name: string;
  choices: {
    id: string;
    name: string;
    price: number;
  }[];
  required?: boolean;
  multiSelect?: boolean;
}

/**
 * Food order data for tracking
 */
export interface FoodOrderData {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    options?: {
      name: string;
      choice: string;
      price: number;
    }[];
  }[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  deliveryAddress: string;
  deliveryTime: string;
  paymentMethod: string;
  createdAt: string;
}

/**
 * Parameter list for the root navigation stack.
 * Note: Authentication screens now allow an optional keyboardOptions parameter
 * to pass configuration (e.g., keyboardVerticalOffset) to better handle keyboard issues.
 */
export type RootStackParamList = {
  // Authentication screens
  Splash: undefined;
  Onboarding: undefined;
  Login: { keyboardOptions?: KeyboardOptions } | undefined;
  SignUp: { keyboardOptions?: KeyboardOptions } | undefined;
  ForgotPassword: { keyboardOptions?: KeyboardOptions } | undefined;
  Auth: undefined;
  // Add missing screens
  ResetPassword: undefined;
  PassengerInfo: undefined;
  DocumentUpload: undefined;
  RegistrationComplete: undefined;
  Verification: {
    email: string;
    phone: string;
    verificationMethod: 'email' | 'phone';
  };
  AuthSuccess: {
    action: 'login' | 'logout' | 'signup' | 'passwordReset';
    destination?: keyof RootStackParamList;
    message?: string;
  };
  AuthError: {
    error: string;
    action?: 'login' | 'logout' | 'signup' | 'passwordReset';
    retryDestination?: keyof RootStackParamList;
  };
  
  // Main navigation
  Home: undefined;
  MainApp: undefined;
  
  // Core features
  Booking: { destination?: DestinationData } | undefined;
  Payment: undefined;
  Profile: undefined;
  Safety: undefined;
  
  // Map and location selection
  Map: {
    initialLocation?: {
      latitude: number;
      longitude: number;
    };
    destination?: DestinationData;
    onSelectLocation?: (location: DestinationData) => void;
  };
  
  // Ride related screens
  RideConfirmation: undefined;
  RideTracking: { rideId: string };
  Tracking: RideTrackingInfo;
  RideDetails: { rideId: string };
  RideHistory: undefined;
  RideCompletion: RideCompletionInfo;
  RateRider: {
    rideId: string;
    riderName: string;
  };
  
  // Food ordering screens
  Food: undefined;
  FoodHome: undefined;
  RestaurantList: { cuisine?: string; searchQuery?: string } | undefined;
  RestaurantDetail: { restaurant: RestaurantData };
  FoodItemDetail: { foodItem: FoodItem, restaurantId: string };
  FoodCart: { restaurantId: string } | undefined;
  FoodCheckout: undefined;
  FoodOrderTracking: { orderId: string };
  FoodOrderHistory: undefined;
  FoodOrderDetail: { order: FoodOrderData };
  
  // Settings and Preferences
  SavedLocations: undefined;
  Notifications: undefined;
  Menu: undefined;
  ScheduleRide: undefined;
  Rewards: undefined;
  AddPaymentMethod: undefined;
  PromoCodes: undefined;
  Support: undefined;
  Settings: undefined;
};

/**
 * Parameter list for the bottom tab navigator.
 */
export type TabParamList = {
  Home: undefined;
  Activity: undefined;
  Profile: undefined;
};

/**
 * Parameter list for the main application stack.
 */
export type MainAppStackParamList = {
  Home: undefined;
  Booking: { destination?: DestinationData } | undefined;
  RideConfirmation: undefined;
  Payment: undefined;
  Settings: undefined;
  Profile: undefined;
  History: undefined;
  Tracking: RideTrackingInfo;
  Safety: undefined;
  Food: undefined;
  RideCompletion: RideCompletionInfo;
  RateRider: {
    rideId: string;
    riderName: string;
  };
  RideDetails: { rideId: string };
  RideHistory: undefined;
  SavedLocations: undefined;
  Notifications: undefined;
  Menu: undefined;
  ScheduleRide: undefined;
  Rewards: undefined;
};
