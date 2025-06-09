import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainAppStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

// Import real screen components
import HomeScreen from '../../screens/home/HomeScreen';
import BookingScreen from '../../screens/booking/BookingScreen';
import FoodHomeScreen from '../../screens/food/FoodHomeScreen';
import MapScreen from '../../screens/map/MapScreen';

// Import utils and services
import { View, Text, StyleSheet } from 'react-native';

// Temporary components for screens that aren't fully implemented yet
const TrackingScreen = () => (
  <View style={styles.placeholderContainer}>
    <Ionicons name="location" size={48} color="#8B5CF6" />
    <Text style={styles.placeholderTitle}>Ride Tracking</Text>
    <Text style={styles.placeholderSubtitle}>
      Track your ride in real-time with live map updates
    </Text>
  </View>
);

const PaymentScreen = () => (
  <View style={styles.placeholderContainer}>
    <Ionicons name="card" size={48} color="#8B5CF6" />
    <Text style={styles.placeholderTitle}>Payment Methods</Text>
    <Text style={styles.placeholderSubtitle}>
      Manage your payment options for rides and food delivery
    </Text>
  </View>
);

const ProfileScreen = () => (
  <View style={styles.placeholderContainer}>
    <Ionicons name="person" size={48} color="#8B5CF6" />
    <Text style={styles.placeholderTitle}>User Profile</Text>
    <Text style={styles.placeholderSubtitle}>
      View and edit your profile information
    </Text>
  </View>
);

const SafetyScreen = () => (
  <View style={styles.placeholderContainer}>
    <Ionicons name="shield-checkmark" size={48} color="#8B5CF6" />
    <Text style={styles.placeholderTitle}>Safety Features</Text>
    <Text style={styles.placeholderSubtitle}>
      Access emergency contacts and safety tools during your rides
    </Text>
  </View>
);

const Tab = createBottomTabNavigator<MainAppStackParamList>();

const MainAppNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Booking':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Tracking':
              iconName = focused ? 'location' : 'location-outline';
              break;
            case 'Payment':
              iconName = focused ? 'card' : 'card-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'Food':
              iconName = focused ? 'fast-food' : 'fast-food-outline';
              break;
            case 'Safety':
              iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Booking" component={BookingScreen} />
      <Tab.Screen 
        name="Tracking" 
        component={TrackingScreen} 
      />
      <Tab.Screen name="Food" component={FoodHomeScreen} />
      <Tab.Screen name="Payment" component={PaymentScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Safety" component={SafetyScreen} />
    </Tab.Navigator>
  );
};

// Styles for placeholder components
const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    maxWidth: '80%',
  },
});

export default MainAppNavigator;
