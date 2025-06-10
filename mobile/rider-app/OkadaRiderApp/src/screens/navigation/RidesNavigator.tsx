// src/screens/navigation/RidesNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RidesStackParamList } from './types';
import RidesScreen from '../rides/RidesScreen';

// Import these placeholder components later when they're implemented
const RideDetailsScreen = (props: any) => null;
const RideCompleteScreen = (props: any) => null;
const RideHistoryScreen = () => null;

const Stack = createStackNavigator<RidesStackParamList>();

const RidesNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="RidesList" component={RidesScreen} />
      <Stack.Screen name="RideDetails" component={RideDetailsScreen} />
      <Stack.Screen name="RideComplete" component={RideCompleteScreen} />
      <Stack.Screen name="RideHistory" component={RideHistoryScreen} />
    </Stack.Navigator>
  );
};

export default RidesNavigator;
