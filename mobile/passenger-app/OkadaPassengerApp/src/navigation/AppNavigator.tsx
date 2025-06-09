import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from '../services/auth';

// Import the modern screens
import ModernHomeScreen from '../screens/home/ModernHomeScreen';
import ModernBookingScreen from '../screens/booking/ModernBookingScreen';
import HomeScreenUber from '../screens/home/HomeScreenUber';

// Import other existing screens
import SplashScreen from '../screens/splash/SplashScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignupScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import AuthSuccessScreen from '../screens/auth/AuthSuccessScreen';
import AuthErrorScreen from '../screens/auth/AuthErrorScreen';
import RideTrackingScreen from '../screens/tracking/RideTrackingScreen';
import RideHistoryScreen from '../screens/history/RideHistoryScreen';
import RideCompletionScreen from '../screens/rideCompletion/RideCompletionScreen';
import PaymentScreen from '../screens/payment/PaymentScreen';
import SavedLocationsScreen from '../screens/locations/SavedLocationsScreen';
import SettingsScreen from '../screens/settings/Settings';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SupportScreen from '../screens/helpsupport/HelpSupportScreen';
import SafetyScreen from '../screens/safety/SafetyScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth and onboarding state
  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      try {
        let user: unknown = null;
        const unsubscribe = onAuthStateChanged((authUser) => {
          user = authUser;
        });
        
        const onboarded = await AsyncStorage.getItem('@onboarded');
        unsubscribe();
        
        setIsAuthenticated(!!user);
        setShowOnboarding(onboarded !== 'true');
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndOnboarding();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#ffffff' }
        }}
        initialRouteName="Splash"
      >
        {/* Common Screens */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        
        {/* Onboarding Flow */}
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />

        {/* Auth Screens */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="AuthSuccess" component={AuthSuccessScreen} />
        <Stack.Screen name="AuthError" component={AuthErrorScreen} />
        
        {/* Main App Screens - Using Modern UI */}
        <Stack.Screen name="Home" component={HomeScreenUber} />
        <Stack.Screen name="Booking" component={ModernBookingScreen} />
        
        {/* Other Screens */}
        <Stack.Screen name="Tracking" component={RideTrackingScreen} />
        <Stack.Screen name="RideTracking" component={RideTrackingScreen} />
        <Stack.Screen name="RideCompletion" component={RideCompletionScreen} />
        <Stack.Screen name="RideHistory" component={RideHistoryScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen name="SavedLocations" component={SavedLocationsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Support" component={SupportScreen} />
        <Stack.Screen name="Safety" component={SafetyScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
