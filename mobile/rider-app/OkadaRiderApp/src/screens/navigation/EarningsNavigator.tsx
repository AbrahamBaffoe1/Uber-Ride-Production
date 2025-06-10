// src/screens/navigation/EarningsNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { EarningsStackParamList } from './types';
import EarningsScreen from '../earnings/EarningsScreen';
import RiderMetricsScreen from '../metrics/RiderMetricsScreen';

// Import these placeholder components later when they're implemented
const EarningsHistoryScreen = () => null;
const CashoutConfirmationScreen = (props: any) => null;

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
