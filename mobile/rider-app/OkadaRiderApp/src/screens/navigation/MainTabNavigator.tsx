// src/navigation/MainTabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, StyleSheet } from 'react-native';
import { MainTabParamList } from './types';

// Import navigators
import HomeNavigator from './HomeNavigator';

// Import screens
import RidesScreen from '../rides/RidesScreen';
import EarningsOverviewScreen from '../earnings/EarningsOverviewScreen';
import ProfileOverviewScreen from '../profile/ProfileOverviewScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2E86DE',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Image
              source={require('../../../assets/images/home-icon.png')}
              style={[styles.tabIcon, { tintColor: color }]}
            />
          ),
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Rides"
        component={RidesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Image
              source={require('../../../assets/images/ride-icon.png')}
              style={[styles.tabIcon, { tintColor: color }]}
            />
          ),
          tabBarLabel: 'Rides',
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsOverviewScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Image
              source={require('../../../assets/images/earnings-icon.png')}
              style={[styles.tabIcon, { tintColor: color }]}
            />
          ),
          tabBarLabel: 'Earnings',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileOverviewScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Image
              source={require('../../../assets/images/profile-icon.png')}
              style={[styles.tabIcon, { tintColor: color }]}
            />
          ),
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 60,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabIcon: {
    width: 24,
    height: 24,
  },
});

export default MainTabNavigator;