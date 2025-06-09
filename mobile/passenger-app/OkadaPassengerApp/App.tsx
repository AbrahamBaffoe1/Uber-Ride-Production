import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged } from './src/services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from './src/navigation/types';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import { LogBox, Platform } from 'react-native';
// Import native exception wrapper without causing type errors
const NativeExceptionWrapper = Platform.OS === 'ios'
  ? require('./src/native-exception-wrapper').default
  : { markInitialized: () => {} };

// Ignore specific warnings
LogBox.ignoreLogs([
  'Require cycle:',
  'Non-serializable values were found in the navigation state',
  'ViewPropTypes will be removed',
  'AsyncStorage has been extracted from react-native',
]);

// Auth Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import AuthSuccessScreen from './src/screens/auth/AuthSuccessScreen';
import AuthErrorScreen from './src/screens/auth/AuthErrorScreen';

// Main Screens
import HomeScreen from './src/screens/home/HomeScreen';
import BookingScreen from './src/screens/booking/BookingScreen';
import RideTrackingScreen from './src/screens/tracking/RideTrackingScreen';
import RideCompletionScreen from './src/screens/rideCompletion/RideCompletionScreen';
import PaymentScreen from './src/screens/payment/PaymentScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import SafetyScreen from './src/screens/safety/SafetyScreen';

const Stack = createStackNavigator<RootStackParamList>();

import SplashScreen from './src/screens/splash/SplashScreen';
import OnboardingScreen from './src/screens/onboarding/OnboardingScreen';
import SavedLocationsScreen from './src/screens/locations/SavedLocationsScreen';


export default function App() {
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
        
        // Mark initialization as complete for our exception wrapper
        if (Platform.OS === 'ios') {
          NativeExceptionWrapper.markInitialized();
        }
      }
    };

    checkAuthAndOnboarding();
  }, []);

  return (
    <Provider store={store}>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{
              headerStyle: { backgroundColor: '#007bff' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' }
            }}>
            {/* Common Screens */}
            <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
            
            {/* Onboarding Flow - Always include it in stack, navigation will be controlled by the screens */}
            <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />

            {/* Auth Flow */}
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SignUp" component={SignupScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AuthSuccess" component={AuthSuccessScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AuthError" component={AuthErrorScreen} options={{ headerShown: false }} />

            {/* Authenticated App Flow */}
            <Stack.Group navigationKey={isAuthenticated ? "auth" : "unauth"}>
              <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
              <Stack.Screen 
                name="Booking" 
                component={BookingScreen}
                options={{ headerTitle: 'New Ride Booking' }}
              />
              <Stack.Screen 
                name="Tracking" 
                component={RideTrackingScreen}
                options={{ headerTitle: 'Ride Tracking' }}
              />
              <Stack.Screen 
                name="RideCompletion" 
                component={RideCompletionScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Payment"
                component={PaymentScreen}
                options={{ headerTitle: 'Payment Methods' }}
              />
              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ headerTitle: 'My Profile' }}
              />
              <Stack.Screen
                name="Safety"
                component={SafetyScreen}
                options={{ headerTitle: 'Safety Toolkit' }}
              />
              <Stack.Screen
                name="SavedLocations"
                component={SavedLocationsScreen}
                options={{ headerShown: false }}
              />
            </Stack.Group>
          </Stack.Navigator>
        </NavigationContainer>
      </Provider>
  );
}
