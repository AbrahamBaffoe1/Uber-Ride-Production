// src/screens/navigation/EarningsNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { EarningsStackParamList } from './types';

// Import screens
import EarningsScreen from '../earnings/EarningsScreen';
import EarningsHistoryScreen from '../earnings/EarningsHistoryScreen';
import CashoutConfirmationScreen from '../earnings/CashoutConfirmationScreen';
import RiderMetricsScreen from '../metrics/RiderMetricsScreen';

const Stack = createStackNavigator<EarningsStackParamList>();

const EarningsNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="EarningsOverview" component={EarningsScreen} />
      <Stack.Screen name="EarningsHistory" component={EarningsHistoryScreen} />
      <Stack.Screen name="CashoutConfirmation" component={CashoutConfirmationScreen} />
      <Stack.Screen name="RiderMetrics" component={RiderMetricsScreen} />
    </Stack.Navigator>
  );
};

export default EarningsNavigator;
