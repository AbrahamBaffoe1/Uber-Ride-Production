// src/screens/booking/RiderSelectionScreen.tsx (Passenger App)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../../navigation/types';

type RiderSelectionScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'RiderSelection'>;
type RiderSelectionScreenRouteProp = RouteProp<HomeStackParamList, 'RiderSelection'>;

interface RiderInfo {
  id: string;
  name: string;
  rating: number;
  totalRides: number;
  photo: any;
  vehicleInfo: string;
  eta: string;
  distance: string;
}

const RiderSelectionScreen = () => {
  const navigation = useNavigation<RiderSelectionScreenNavigationProp>();
  const route = useRoute<RiderSelectionScreenRouteProp>();
  const { 
    pickupLocation, 
    pickupName, 
    dropoffLocation, 
    dropoffName, 
    rideType, 
    paymentMethod, 
    fare, 
    distance, 
    duration 
  } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [availableRiders, setAvailableRiders] = useState<RiderInfo[]>([]);
  const [selectedRider, setSelectedRider] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    // In a real app, this would fetch available riders from the API
    const fetchAvailableRiders = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          const mockRiders: RiderInfo[] = [
            {
              id: '1',
              name: 'Daniel O.',
              rating: 4.8,
              totalRides: 728,
              photo: require('../../assets/images/rider1.png'),
              vehicleInfo: 'Yamaha YBR 125 • Black',
              eta: '5 mins',
              distance: '0.8 km',
            },
            {
              id: '2',
              name: 'Emmanuel A.',
              rating: 4.9,
              totalRides: 1205,
              photo: require('../../assets/images/rider2.png'),
              vehicleInfo: 'Honda CG 150 • Red',
              eta: '7 mins',
              distance: '1.2 km',
            },
            {
              id: '3',
              name: 'Michael T.',
              rating: 4.7,
              totalRides: 540,
              photo: require('../../assets/images/rider3.png'),
              vehicleInfo: 'Suzuki GS 150 • Blue',
              eta: '9 mins',
              distance: '1.5 km',
            },
          ];
          
          setAvailableRiders(mockRiders);
          setIsLoading(false);
        }, 2000);
      } catch (error) {
        console.error('Error fetching available riders:', error);
        setIsLoading(false);
      }
    };

    fetchAvailableRiders();
  }, []);

  const handleSelectRider = (riderId: string) => {
    setSelectedRider(riderId);
  };

  const handleConfirmRider = async () => {
    if (!selectedRider) {
      Alert.alert('Error', 'Please select a rider');
      return;
    }

    setIsConfirming(true);
    try {
      // In a real app, this would call the API to confirm the selected rider
      
      // Simulate API call
      setTimeout(() => {
        setIsConfirming(false);
        
        // Get the selected rider object
        const rider = availableRiders.find(r => r.id === selectedRider);
        
        // Navigate to ride tracking screen
        navigation.navigate('RideTracking', {
          rideId: 'RID' + Date.now().toString().slice(-6),
          riderId: selectedRider,
          riderName: rider?.name || '',
          riderRating: rider?.rating || 0,
          riderPhoto: rider?.photo,
          riderVehicleInfo: rider?.vehicleInfo || '',
          pickupLocation,
          pickupName,
          dropoffLocation,
          dropoffName,
          fare,
          distance,
          duration,
          paymentMethod,
        });
      }, 1500);
    } catch (error) {
      setIsConfirming(false);
      Alert.alert('Error', 'Failed to confirm ride with selected rider. Please try again.');
    }
  };

  const handleCancelRide = () => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          onPress: () => {
            // Go back to home screen
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
          } 
        },
      ]
    );
  };

  const renderRiderItem = ({ item }: { item: RiderInfo }) => (
    <TouchableOpacity
      style={[
        styles.riderCard,
        selectedRider === item.id && styles.selectedRiderCard,
      ]}
      onPress={() => handleSelectRider(item.id)}
    >
      <View style={styles.riderInfo}>
        <Image source={item.photo} style={styles.riderPhoto} />
        <View style={styles.riderDetails}>
          <Text style={styles.riderName}>{item.name}</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingValue}>{item.rating}</Text>
            <Image
              source={require('../../assets/images/star.png')}
              style={styles.starIcon}
            />
            <Text style={styles.totalRides}>({item.totalRides} rides)</Text>
          </View>
          <Text style={styles.vehicleInfo}>{item.vehicleInfo}</Text>
        </View>
      </View>
      <View style={styles.etaContainer}>
        <Text style={styles.etaValue}>{item.eta}</Text>
        <Text style={styles.distanceValue}>{item.distance} away</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Image
        source={require('../../assets/images/no-riders.png')}
        style={styles.emptyStateImage}
      />
      <Text style={styles.emptyStateTitle}>No Riders Available</Text>
      <Text style={styles.emptyStateMessage}>
        Sorry, there are no riders available in your area at the moment.
        Please try again later or choose a different location.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image
            source={require('../../assets/images/back-arrow.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Rider</Text>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancelRide}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.routeCard}>
        <View style={styles.routeInfo}>
          <View style={styles.locationContainer}>
            <View style={styles.locationDot} />
            <Text style={styles.locationText} numberOfLines={1}>{pickupName}</Text>
          </View>
          
          <View style={styles.routeLine} />
          
          <View style={styles.locationContainer}>
            <View style={[styles.locationDot, styles.destinationDot]} />
            <Text style={styles.locationText} numberOfLines={1}>{dropoffName}</Text>
          </View>
        </View>
        
        <View style={styles.routeDetails}>
          <View style={styles.routeDetailItem}>
            <Text style={styles.routeDetailValue}>{distance}</Text>
            <Text style={styles.routeDetailLabel}>Distance</Text>
          </View>
          
          <View style={styles.routeDetailDivider} />
          
          <View style={styles.routeDetailItem}>
            <Text style={styles.routeDetailValue}>{duration}</Text>
            <Text style={styles.routeDetailLabel}>Duration</Text>
          </View>
          
          <View style={styles.routeDetailDivider} />
          
          <View style={styles.routeDetailItem}>
            <Text style={styles.routeDetailValue}>{fare}</Text>
            <Text style={styles.routeDetailLabel}>Fare</Text>
          </View>
        </View>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E86DE" />
          <Text style={styles.loadingText}>Finding nearby riders...</Text>
        </View>
      ) : (
        <>
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Available Riders</Text>
          </View>
          
          <FlatList
            data={availableRiders}
            renderItem={renderRiderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.ridersList}
            ListEmptyComponent={renderEmptyState}
          />
        </>
      )}
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (!selectedRider || isConfirming) && styles.buttonDisabled,
          ]}
          onPress={handleConfirmRider}
          disabled={!selectedRider || isConfirming}
        >
          {isConfirming ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Rider</Text>
          )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
    tintColor: '#333333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#E74C3C',
    fontWeight: '500',
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  routeInfo: {
    marginBottom: 16,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2E86DE',
    marginRight: 12,
  },
  destinationDot: {
    backgroundColor: '#E74C3C',
  },
  locationText: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: '#DDDDDD',
    marginLeft: 4,
    marginBottom: 8,
  },
  routeDetails: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  routeDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  routeDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  routeDetailLabel: {
    fontSize: 12,
    color: '#666666',
  },
  routeDetailDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#F0F0F0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  ridersList: {
    paddingHorizontal: 16,
    paddingBottom: 100, // space for footer
  },
  riderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  selectedRiderCard: {
    borderWidth: 2,
    borderColor: '#2E86DE',
  },
  riderInfo: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  riderPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  riderDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  riderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingValue: {
    fontSize: 14,
    color: '#333333',
    marginRight: 4,
  },
  starIcon: {
    width: 14,
    height: 14,
    marginRight: 4,
  },
  totalRides: {
    fontSize: 12,
    color: '#666666',
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#666666',
  },
  etaContainer: {
    alignItems: 'flex-end',
  },
  etaValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  distanceValue: {
    fontSize: 14,
    color: '#666666',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  confirmButton: {
    backgroundColor: '#2E86DE',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RiderSelectionScreen;