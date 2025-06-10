// src/screens/navigation/SafetyNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SafetyStackParamList } from './types';
import SafetyScreen from '../safety/SafetyScreen';

// Import these placeholder components later when they're implemented
const EmergencyContactsScreen = () => null;
const ReportIncidentScreen = () => null;
const SafetyTipsScreen = () => null;
const SOSHistoryScreen = () => null;

const Stack = createStackNavigator<SafetyStackParamList>();

const SafetyNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="SafetyCenter" component={SafetyScreen} />
      <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
      <Stack.Screen name="ReportIncident" component={ReportIncidentScreen} />
      <Stack.Screen name="SafetyTips" component={SafetyTipsScreen} />
      <Stack.Screen name="SOSHistory" component={SOSHistoryScreen} />
    </Stack.Navigator>
  );
};

export default SafetyNavigator;
