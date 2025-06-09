import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthStackParamList } from './types';

// Import screens
import LoginScreen from '../auth/LoginScreen';
import RegisterScreen from '../auth/RegisterScreen';
import PhoneVerificationScreen from '../auth/PhoneVerificationScreen';
import VerificationScreen from '../auth/VerificationScreen';
import ForgotPasswordScreen from '../auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../auth/ResetPasswordScreen';
import RiderInfoScreen from '../auth/RiderInfoScreen';
import DocumentUploadScreen from '../auth/DocumentUploadScreen';
import RegistrationCompleteScreen from '../auth/RegistrationCompleteScreen';
import AuthSuccessScreen from '../auth/AuthSuccessScreen';
import AuthErrorScreen from '../auth/AuthErrorScreen';

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' },
      }}
      initialRouteName="Login"
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />
      <Stack.Screen name="Verification" component={VerificationScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="RiderInfo" component={RiderInfoScreen} />
      <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
      <Stack.Screen name="RegistrationComplete" component={RegistrationCompleteScreen} />
      <Stack.Screen name="AuthSuccess" component={AuthSuccessScreen} />
      <Stack.Screen name="AuthError" component={AuthErrorScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
