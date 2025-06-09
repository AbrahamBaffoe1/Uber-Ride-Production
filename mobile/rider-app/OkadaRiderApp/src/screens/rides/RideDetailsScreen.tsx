
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeStackParamList } from '../navigation/types';
import { API_BASE_URL } from '../../api/config';
import { apiClient } from '../../api/client';

type RideDetailsScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'RideDetails'>;
type RideDetailsScreenRouteProp = RouteProp<HomeStackParamList, 'RideDetails'>;

interface RideDetails {
  id: string;
  status: 'accepted' | 'arrived' | 'started' | 'completed';
  passengerName: string;
  passengerPhone: string;
  passengerRating: number;
  pickupLocation: string;
  pickupAddress: string;
  dropoffLocation: string;
  dropoffAddress: string;
  distance: string;
  duration: string;
  fare: string;
  paymentMethod: string;
}

const RideDetailsScreen = () => {
  const navigation = useNavigation<RideDetailsScreenNavigationProp>();
  const route = useRoute<RideDetailsScreenRouteProp>();
  const { rideId } = route.params;
  
  const [isLoading, setIsLoading] = useState(true);
  const [ride, setRide] = useState<RideDetails | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetchRideDetails = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) {
          throw new Error('Authentication token not found');
        }
        
        const response = await fetch(`${API_BASE_URL}/rides/${rideId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch ride details');
        }
        
        const data = await response.json();
        if (data && data.data) {
          const rideData = data.data;
          
          setRide({
            id: rideData._id || rideData.id,
            status: rideData.status || 'accepted',
            passengerName: rideData.passenger?.name || 'Passenger',
            passengerPhone: rideData.passenger?.phone || 'Unknown',
            passengerRating: rideData.passenger?.rating || 4.5,
            pickupLocation: rideData.pickupLocation?.name || 'Pickup',
            pickupAddress: rideData.pickupLocation?.address || 'Unknown address',
            dropoffLocation: rideData.dropoffLocation?.name || 'Dropoff',
            dropoffAddress: rideData.dropoffLocation?.address || 'Unknown address',
            distance: rideData.distance ? `${rideData.distance} km` : 'Unknown',
            duration: rideData.duration ? `${rideData.duration} mins` : 'Unknown',
            fare: rideData.fare ? `₦${rideData.fare}` : 'Calculating...',
            paymentMethod: rideData.paymentMethod || 'Cash',
          });
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching ride details:', error);
        setIsLoading(false);
        Alert.alert('Error', 'Failed to load ride details');
      }
    };

    fetchRideDetails();
  }, [rideId]);

  const handleStartNavigation = () => {
    setIsNavigating(true);
    
    // Here you would typically integrate with a maps/navigation service
    // For now, we'll just show an alert
    setTimeout(() => {
      Alert.alert(
        'Navigation Started',
        'Navigation to pickup location started',
        [{ text: 'OK', onPress: () => setIsNavigating(false) }]
      );
    }, 500);
  };

  const handleCallPassenger = () => {
    // This would integrate with the device's phone capabilities
    // For now, we'll just show an alert
    Alert.alert('Call Passenger', `Calling ${ride?.passengerName} at ${ride?.passengerPhone}`);
  };

  const handleUpdateStatus = async () => {
    if (!ride) return;

    setIsUpdatingStatus(true);
    
    try {
      let newStatus: RideDetails['status'];
        
      switch (ride.status) {
        case 'accepted':
          newStatus = 'arrived';
          break;
        case 'arrived':
          newStatus = 'started';
          break;
        case 'started':
          newStatus = 'completed';
          break;
        default:
          newStatus = ride.status;
          break;
      }
      
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch(`${API_BASE_URL}/rides/${ride.id}/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update ride status');
      }
      
      // Update the local state with the new status
      setRide({ ...ride, status: newStatus });
      
      if (newStatus === 'completed') {
        navigation.replace('RideComplete', { rideId: ride.id });
      }
    } catch (error) {
      setIsUpdatingStatus(false);
      Alert.alert('Error', 'Failed to update ride status');
    }
  };

  const getStatusButtonText = () => {
    if (!ride) return '';
    
    switch (ride.status) {
      case 'accepted':
        return 'Arrived at Pickup';
      case 'arrived':
        return 'Start Ride';
      case 'started':
        return 'Complete Ride';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#2E86DE" />
        <Text style={styles.loadingText}>Loading ride details...</Text>
      </SafeAreaView>
    );
  }

  if (!ride) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Text style={styles.errorText}>Failed to load ride details</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image
            source={require('../../../assets/images/back-arrow.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Status</Text>
          <View style={[
            styles.statusBadge,
            ride.status === 'completed' && styles.completedBadge,
            ride.status === 'started' && styles.startedBadge,
            ride.status === 'arrived' && styles.arrivedBadge,
            ride.status === 'accepted' && styles.acceptedBadge,
          ]}>
            <Text style={styles.statusText}>
              {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.passengerCard}>
          <View style={styles.passengerInfo}>
            <Image
              source={require('../../../assets/images/user-avatar.png')}
              style={styles.passengerAvatar}
            />
            <View>
              <Text style={styles.passengerName}>{ride.passengerName}</Text>
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingText}>{ride.passengerRating}</Text>
                <Image
                  source={require('../../../assets/images/star.png')}
                  style={styles.starIcon}
                />
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.callButton}
            onPress={handleCallPassenger}
          >
            <Image
              source={require('../../../assets/images/phone-icon.png')}
              style={styles.callIcon}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.routeCard}>
          <View style={styles.locationContainer}>
            <View style={styles.locationDot} />
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationName}>{ride.pickupLocation}</Text>
              <Text style={styles.locationAddress}>{ride.pickupAddress}</Text>
            </View>
          </View>
          
          <View style={styles.routeLine} />
          
          <View style={styles.locationContainer}>
            <View style={[styles.locationDot, styles.destinationDot]} />
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationName}>{ride.dropoffLocation}</Text>
              <Text style={styles.locationAddress}>{ride.dropoffAddress}</Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Distance</Text>
            <Text style={styles.detailValue}>{ride.distance}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{ride.duration}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Fare</Text>
            <Text style={styles.detailValue}>{ride.fare}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>{ride.paymentMethod}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {ride.status !== 'completed' && (
          <>
            <TouchableOpacity
              style={[
                styles.navigationButton,
                isNavigating && styles.buttonDisabled,
              ]}
              onPress={handleStartNavigation}
              disabled={isNavigating}
            >
              {isNavigating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Image
                    source={require('../../../assets/images/navigation-icon.png')}
                    style={styles.navigationIcon}
                  />
                  <Text style={styles.navigationButtonText}>
                    Navigate to {ride.status === 'accepted' ? 'Pickup' : 'Dropoff'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusButton,
                isUpdatingStatus && styles.buttonDisabled,
              ]}
              onPress={handleUpdateStatus}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.statusButtonText}>
                  {getStatusButtonText()}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[
            styles.sosButton,
            ride.status === 'completed' ? { width: '100%' } : { width: 60 },
          ]}
          onPress={() => navigation.navigate('Safety', { rideId: ride.id })}
        >
          <Text style={styles.sosButtonText}>SOS</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#2E86DE',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  acceptedBadge: {
    backgroundColor: '#E3F2FD',
  },
  arrivedBadge: {
    backgroundColor: '#FFF3E0',
  },
  startedBadge: {
    backgroundColor: '#E8F5E9',
  },
  completedBadge: {
    backgroundColor: '#EFEBE9',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  passengerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passengerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#666666',
    marginRight: 4,
  },
  starIcon: {
    width: 14,
    height: 14,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2E86DE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callIcon: {
    width: 20,
    height: 20,
  },
  routeCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2E86DE',
    marginRight: 12,
    marginTop: 4,
  },
  destinationDot: {
    backgroundColor: '#E74C3C',
  },
  locationTextContainer: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#666666',
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: '#DDDDDD',
    marginLeft: 5,
    marginBottom: 16,
  },
  detailsCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navigationButton: {
    flex: 1,
    backgroundColor: '#27AE60',
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  navigationIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  navigationButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusButton: {
    flex: 1,
    backgroundColor: '#2E86DE',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sosButton: {
    backgroundColor: '#E74C3C',
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sosButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

export default RideDetailsScreen;
