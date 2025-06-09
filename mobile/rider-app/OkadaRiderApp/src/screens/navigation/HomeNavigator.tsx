// src/navigation/HomeNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeStackParamList } from './types';

// Import screens
import DashboardScreen from '../home/DashboardScreen';
import RideDetailsScreen from '../rides/RideDetailsScreen';
import RideCompleteScreen from '../rides/RideCompleteScreen';
import EarningsScreen from '../earnings/EarningsScreen';
import EarningsHistoryScreen from '../earnings/EarningsHistoryScreen';
import CashoutConfirmationScreen from '../earnings/CashoutConfirmationScreen';
import ProfileScreen from '../profile/ProfileScreen';
import HistoryScreen from '../history/HistoryScreen';
import SupportScreen from '../support/SupportScreen';
import SafetyScreen from '../safety/SafetyScreen';
import SettingsScreen from '../settings/SettingsScreen';
import ComplianceScreen from '../compliance/ComplianceScreen';
import NotificationsScreen from '../notifications/NotificationsScreen';

const Stack = createStackNavigator<HomeStackParamList>();

const HomeNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="RideDetails" component={RideDetailsScreen} />
      <Stack.Screen name="RideComplete" component={RideCompleteScreen} />
      <Stack.Screen name="Earnings" component={EarningsScreen} />
      <Stack.Screen name="EarningsHistory" component={EarningsHistoryScreen} />
      <Stack.Screen name="CashoutConfirmation" component={CashoutConfirmationScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="Safety" component={SafetyScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Compliance" component={ComplianceScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
};

export default HomeNavigator;