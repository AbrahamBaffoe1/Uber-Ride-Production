// src/screens/navigation/RidesNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RidesStackParamList } from './types';

// Import screens
import RidesScreen from '../rides/RidesScreen';
import RideDetailsScreen from '../rides/RideDetailsScreen';
import RideCompleteScreen from '../rides/RideCompleteScreen';
import HistoryScreen from '../history/HistoryScreen';

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
      <Stack.Screen name="RideHistory" component={HistoryScreen} />
    </Stack.Navigator>
  );
};

export default RidesNavigator;
