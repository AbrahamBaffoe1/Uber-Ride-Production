import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
import { RootStackParamList } from './types';

// Import screens and navigators
import SplashScreen from '../splash/SplashScreen';
import OnboardingScreen from '../onboarding/OnboardingScreen';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';

const Stack = createStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const [isAppReady, setIsAppReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Splash');

  useEffect(() => {
    // This is just for initialization purposes
    // The actual navigation logic is handled in SplashScreen component
    const prepareApp = async () => {
      try {
        // You could perform any initialization here if needed
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for stability
        setIsAppReady(true);
      } catch (error) {
        console.error('App preparation error:', error);
        setIsAppReady(true); // Continue despite error
      }
    };

    prepareApp();
  }, []);

  if (!isAppReady) {
    return null; // Or a loading indicator if needed
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#FFFFFF' },
        }}
      >
        <Stack.Screen 
          name="Splash" 
          component={SplashScreen} 
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen} 
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen 
          name="Auth" 
          component={AuthNavigator} 
        />
        <Stack.Screen 
          name="Main" 
          component={MainTabNavigator} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;