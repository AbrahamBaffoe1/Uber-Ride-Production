import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { RootStackParamList } from './types';

// Import screens
import SplashScreen from '../screens/splash/SplashScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import PhoneVerificationScreen from '../screens/auth/PhoneVerificationScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import PassengerInfoScreen from '../screens/auth/PassengerInfoScreen';
import DocumentUploadScreen from '../screens/auth/DocumentUploadScreen';
import RegistrationCompleteScreen from '../screens/auth/RegistrationCompleteScreen';
import AuthSuccessScreen from '../screens/auth/AuthSuccessScreen';
import AuthErrorScreen from '../screens/auth/AuthErrorScreen';
import MainAppNavigator from './main/MainAppNavigator';

// Food ordering screens
import RestaurantListScreen from '../screens/food/RestaurantListScreen';
import RestaurantDetailScreen from '../screens/food/RestaurantDetailScreen';
import FoodCartScreen from '../screens/food/FoodCartScreen';
import FoodCheckoutScreen from '../screens/food/FoodCheckoutScreen';
import FoodOrderTrackingScreen from '../screens/food/FoodOrderTrackingScreen';

const Stack = createStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#13171D' },
        }}
        initialRouteName="Splash"
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={RegisterScreen} />
        <Stack.Screen name="Verification" component={PhoneVerificationScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="PassengerInfo" component={PassengerInfoScreen} />
        <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
        <Stack.Screen name="RegistrationComplete" component={RegistrationCompleteScreen} />
        <Stack.Screen name="MainApp" component={MainAppNavigator} />
        <Stack.Screen name="Home" component={MainAppNavigator} />
        <Stack.Screen name="Booking" component={MainAppNavigator} />
        <Stack.Screen name="Payment" component={MainAppNavigator} />
        <Stack.Screen name="Profile" component={MainAppNavigator} />
        <Stack.Screen name="Safety" component={MainAppNavigator} />
        <Stack.Screen name="RideConfirmation" component={MainAppNavigator} />
        
        {/* Food ordering screens */}
        <Stack.Screen name="RestaurantList" component={RestaurantListScreen} />
        <Stack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} />
        <Stack.Screen name="FoodCart" component={FoodCartScreen} />
        <Stack.Screen name="FoodCheckout" component={FoodCheckoutScreen} />
        <Stack.Screen name="FoodOrderTracking" component={FoodOrderTrackingScreen} />
        
        {/* Auth success/error screens */}
        <Stack.Screen name="AuthSuccess" component={AuthSuccessScreen} />
        <Stack.Screen name="AuthError" component={AuthErrorScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
