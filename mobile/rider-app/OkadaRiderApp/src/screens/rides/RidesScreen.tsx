import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RidesStackParamList } from '../navigation/types';
import { rideService, RideDetails as RideRequest, ActiveRide } from '../../api/services/ride.service';
import * as authService from '../../services/auth.service';
import { socketService } from '../../services/socketService';

type RidesScreenNavigationProp = StackNavigationProp<RidesStackParamList, 'RidesList'>;

const RidesScreen = () => {
  const navigation = useNavigation<RidesScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);

  // Function to fetch rides
  const fetchRides = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Use the service instead of direct fetch
      const { activeRide: currentRide, rideRequests: availableRides } = await rideService.getRiderRides();
      
      setActiveRide(currentRide);
      setRideRequests(availableRides);
    } catch (error: any) {
      console.error('Error fetching rides:', error);
      Alert.alert('Error', 'Failed to fetch rides. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchRides();
  }, [fetchRides]);

  // Set up real-time listeners when the screen is focused
  useFocusEffect(
    useCallback(() => {
      // Initialize socket if not already connected
      socketService.initialize().catch(console.error);
      
      // Subscribe to ride status changes
      const rideStatusUnsubscribe = rideService.onRideStatusChanged((updatedActiveRide) => {
        setActiveRide(updatedActiveRide);
      });
      
      // Subscribe to ride requests changes
      const rideRequestsUnsubscribe = rideService.onRideRequestsChanged((updatedRideRequests) => {
        setRideRequests(updatedRideRequests);
      });
      
      // Initial fetch
      fetchRides();
      
      // Cleanup function
      return () => {
        rideStatusUnsubscribe();
        rideRequestsUnsubscribe();
      };
    }, [fetchRides])
  );

  // Initial fetch and online status change handler
  useEffect(() => {
    fetchRides();
    
    // Update availability status when online status changes
    rideService.updateAvailability(isOnline)
      .catch(error => {
        console.error('Error updating availability:', error);
        Alert.alert('Error', 'Failed to update availability status.');
      });
  }, [isOnline, fetchRides]);

  const toggleOnlineStatus = async () => {
    try {
      setIsLoading(true);
      // Update availability status in the backend
      await rideService.updateAvailability(!isOnline);
      setIsOnline((prev) => !prev);
    } catch (error) {
      console.error('Error updating availability:', error);
      Alert.alert('Error', 'Failed to update availability status.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderRideRequest = ({ item }: { item: RideRequest }) => (
    <TouchableOpacity
      style={styles.rideCard}
      onPress={() =>
        navigation.navigate('RideDetails', {
          rideId: item.id,
          passengerName: item.passenger.name,
          pickupLocation: item.pickupLocation.address || 'Unknown location',
          dropoffLocation: item.dropoffLocation.address || 'Unknown destination',
          distance: typeof item.distance === 'number' ? 
            `${(item.distance / 1000).toFixed(1)} km` : item.distance,
          estimatedFare: `₦${item.fare}`,
          timestamp: new Date(item.requestedAt),
          status: 'accepted', // default status for ride request details
        })
      }
    >
      <Text style={styles.rideTitle}>{item.passenger.name}</Text>
      <Text style={styles.rideInfo}>Pickup: {item.pickupLocation.address || 'Unknown location'}</Text>
      <Text style={styles.rideInfo}>Dropoff: {item.dropoffLocation.address || 'Unknown destination'}</Text>
      <Text style={styles.rideInfo}>Distance: {typeof item.distance === 'number' ? 
        `${(item.distance / 1000).toFixed(1)} km` : item.distance}</Text>
      <Text style={styles.rideInfo}>Fare: ₦{item.fare}</Text>
    </TouchableOpacity>
  );

  const renderActiveRide = (ride: ActiveRide) => (
    <View style={styles.activeRideCard}>
      <Text style={styles.activeRideTitle}>Active Ride: {ride.passengerName}</Text>
      <Text style={styles.rideInfo}>Status: {ride.status}</Text>
      <Text style={styles.rideInfo}>Pickup: {ride.pickupLocation}</Text>
      <Text style={styles.rideInfo}>Dropoff: {ride.dropoffLocation}</Text>
      <Text style={styles.rideInfo}>Distance: {ride.distance}</Text>
      <Text style={styles.rideInfo}>Duration: {ride.estimatedDuration}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Loading rides...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rides</Text>
        <View style={styles.switchContainer}>
          <Text>{isOnline ? 'Online' : 'Offline'}</Text>
          <Switch value={isOnline} onValueChange={toggleOnlineStatus} />
        </View>
      </View>
      {activeRide ? (
        <View style={styles.section}>{renderActiveRide(activeRide)}</View>
      ) : (
        <FlatList
          data={rideRequests}
          keyExtractor={(item) => item.id}
          renderItem={renderRideRequest}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#007AFF']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text>No ride requests available.</Text>
              {!isOnline && (
                <Text style={styles.offlineText}>
                  You are currently offline. Go online to receive ride requests.
                </Text>
              )}
            </View>
          }
          contentContainerStyle={
            rideRequests.length === 0 ? styles.emptyFlatList : undefined
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  offlineText: {
    marginTop: 8,
    color: '#888',
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    padding: 16,
  },
  rideCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  rideTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  rideInfo: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  activeRideCard: {
    backgroundColor: '#e6f7ff',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  activeRideTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyFlatList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});

export default RidesScreen;
