// src/screens/booking/RideBookingScreen.tsx (Passenger App)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../../navigation/types';

type RideBookingScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'RideBooking'>;
type RideBookingScreenRouteProp = RouteProp<HomeStackParamList, 'RideBooking'>;

interface RideOption {
  id: string;
  name: string;
  image: any;
  capacity: string;
  eta: string;
  fare: string;
}

interface PaymentMethod {
  id: string;
  type: 'cash' | 'wallet' | 'card';
  name: string;
  details?: string;
  isDefault: boolean;
}

const RideBookingScreen = () => {
  const navigation = useNavigation<RideBookingScreenNavigationProp>();
  const route = useRoute<RideBookingScreenRouteProp>();
  const { destination, destinationName, useCurrentLocation } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [pickup, setPickup] = useState('Current Location');
  const [dropoff, setDropoff] = useState(destination || '');
  const [pickupName, setPickupName] = useState('Your Location');
  const [dropoffName, setDropoffName] = useState(destinationName || destination || '');
  const [selectedRideOption, setSelectedRideOption] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [distance, setDistance] = useState('0 km');
  const [duration, setDuration] = useState('0 mins');
  const [estimatedFare, setEstimatedFare] = useState('₦0');
  const [rideOptions, setRideOptions] = useState<RideOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    // In a real app, this would fetch data from the API based on pickup and dropoff
    const fetchRideDetails = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          // Set default pickup location if useCurrentLocation is true
          if (useCurrentLocation) {
            setPickup('Your Current Location');
            setPickupName('Your Location');
          }
          
          // Set mock distance and duration based on pickup and dropoff
          if (pickup && dropoff) {
            setDistance('15.5 km');
            setDuration('35 mins');
            setEstimatedFare('₦1,550');
          }
          
          // Set mock ride options
          setRideOptions([
            {
              id: 'standard',
              name: 'Okada Standard',
              image: require('../../assets/images/okada-standard.png'),
              capacity: '1 person',
              eta: '5 mins',
              fare: '₦1,550',
            },
            {
              id: 'express',
              name: 'Okada Express',
              image: require('../../assets/images/okada-express.png'),
              capacity: '1 person',
              eta: '3 mins',
              fare: '₦1,850',
            },
            {
              id: 'premium',
              name: 'Okada Premium',
              image: require('../../assets/images/okada-premium.png'),
              capacity: '1 person',
              eta: '7 mins',
              fare: '₦2,100',
            },
          ]);
          
          // Set default selected ride option
          setSelectedRideOption('standard');
          
          // Set mock payment methods
          setPaymentMethods([
            {
              id: 'cash',
              type: 'cash',
              name: 'Cash',
              isDefault: true,
            },
            {
              id: 'wallet',
              type: 'wallet',
              name: 'Wallet',
              details: 'Balance: ₦5,420',
              isDefault: false,
            },
            {
              id: 'card',
              type: 'card',
              name: 'Visa Card',
              details: '**** 1234',
              isDefault: false,
            },
          ]);
          
          // Set default selected payment method
          const defaultMethod = paymentMethods.find(method => method.isDefault);
          setSelectedPaymentMethod(defaultMethod?.id || 'cash');
          
          setIsLoading(false);
        }, 1500);
      } catch (error) {
        console.error('Error fetching ride details:', error);
        setIsLoading(false);
      }
    };

    fetchRideDetails();
  }, [pickup, dropoff, useCurrentLocation]);

  const handleRideOptionSelect = (id: string) => {
    setSelectedRideOption(id);
    
    // Update fare based on selected option
    const option = rideOptions.find(opt => opt.id === id);
    if (option) {
      setEstimatedFare(option.fare);
    }
  };

  const handlePaymentMethodSelect = (id: string) => {
    setSelectedPaymentMethod(id);
  };

  const handleChangePickup = () => {
    navigation.navigate('LocationSearch');
  };

  const handleChangeDropoff = () => {
    navigation.navigate('LocationSearch');
  };

  const handleBookRide = async () => {
    if (!selectedRideOption || !selectedPaymentMethod) {
      Alert.alert('Error', 'Please select a ride option and payment method');
      return;
    }

    setIsBooking(true);
    try {
      // In a real app, this would call an API to book the ride
      
      // Simulate API call
      setTimeout(() => {
        setIsBooking(false);
        
        // Navigate to rider selection screen
        navigation.navigate('RiderSelection', {
          pickupLocation: pickup,
          pickupName: pickupName,
          dropoffLocation: dropoff,
          dropoffName: dropoffName,
          rideType: selectedRideOption,
          paymentMethod: selectedPaymentMethod,
          fare: estimatedFare,
          distance: distance,
          duration: duration,
        });
      }, 2000);
    } catch (error) {
      setIsBooking(false);
      Alert.alert('Booking Failed', 'Failed to book your ride. Please try again.');
    }
  };

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
        <Text style={styles.headerTitle}>Book a Ride</Text>
        <View style={styles.placeholder} />
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E86DE" />
          <Text style={styles.loadingText}>Calculating route...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.routeCard}>
            <View style={styles.locationContainer}>
              <View style={styles.pickupSection}>
                <View style={styles.locationDot} />
                <TouchableOpacity
                  style={styles.locationInput}
                  onPress={handleChangePickup}
                >
                  <Text style={styles.locationInputLabel}>Pickup</Text>
                  <Text style={styles.locationInputText} numberOfLines={1}>{pickupName}</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.routeLine} />
              
              <View style={styles.dropoffSection}>
                <View style={[styles.locationDot, styles.destinationDot]} />
                <TouchableOpacity
                  style={styles.locationInput}
                  onPress={handleChangeDropoff}
                >
                  <Text style={styles.locationInputLabel}>Dropoff</Text>
                  <Text style={styles.locationInputText} numberOfLines={1}>{dropoffName}</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.routeDetails}>
              <View style={styles.routeDetailsItem}>
                <Text style={styles.routeDetailsLabel}>Distance</Text>
                <Text style={styles.routeDetailsValue}>{distance}</Text>
              </View>
              
              <View style={styles.routeDetailsDivider} />
              
              <View style={styles.routeDetailsItem}>
                <Text style={styles.routeDetailsLabel}>Duration</Text>
                <Text style={styles.routeDetailsValue}>{duration}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Select Ride Type</Text>
          </View>
          
          <View style={styles.rideOptionsContainer}>
            {rideOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.rideOptionCard,
                  selectedRideOption === option.id && styles.selectedRideOption,
                ]}
                onPress={() => handleRideOptionSelect(option.id)}
              >
                <Image source={option.image} style={styles.rideOptionImage} />
                <View style={styles.rideOptionInfo}>
                  <Text style={styles.rideOptionName}>{option.name}</Text>
                  <Text style={styles.rideOptionDetails}>{option.capacity} • {option.eta}</Text>
                </View>
                <Text style={styles.rideOptionFare}>{option.fare}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Payment Method</Text>
          </View>
          
          <View style={styles.paymentMethodsContainer}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethodCard,
                  selectedPaymentMethod === method.id && styles.selectedPaymentMethod,
                ]}
                onPress={() => handlePaymentMethodSelect(method.id)}
              >
                <View style={styles.paymentMethodIcon}>
                  <Image
                    source={
                      method.type === 'cash'
                        ? require('../../assets/images/cash-icon.png')
                        : method.type === 'wallet'
                        ? require('../../assets/images/wallet-icon.png')
                        : require('../../assets/images/card-icon.png')
                    }
                    style={styles.paymentIcon}
                  />
                </View>
                <View style={styles.paymentMethodInfo}>
                  <Text style={styles.paymentMethodName}>{method.name}</Text>
                  {method.details && (
                    <Text style={styles.paymentMethodDetails}>{method.details}</Text>
                  )}
                </View>
                <View
                  style={[
                    styles.radioButton,
                    selectedPaymentMethod === method.id && styles.radioButtonSelected,
                  ]}
                >
                  {selectedPaymentMethod === method.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity
            style={styles.addPaymentMethod}
            onPress={() => navigation.navigate('PaymentMethods')}
          >
            <Image
              source={require('../../assets/images/add-icon.png')}
              style={styles.addIcon}
            />
            <Text style={styles.addPaymentText}>Add Payment Method</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
      
      <View style={styles.footer}>
        <View style={styles.fareContainer}>
          <Text style={styles.fareLabel}>Total Fare</Text>
          <Text style={styles.fareAmount}>{estimatedFare}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.bookButton,
            (isLoading || isBooking) && styles.buttonDisabled,
          ]}
          onPress={handleBookRide}
          disabled={isLoading || isBooking}
        >
          {isBooking ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.bookButtonText}>Book Now</Text>
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
  placeholder: {
    width: 36,
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
  },
  scrollContent: {
    paddingBottom: 100, // space for footer
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  locationContainer: {
    marginBottom: 16,
  },
  pickupSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  locationInput: {
    flex: 1,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 8,
  },
  locationInputLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  locationInputText: {
    fontSize: 16,
    color: '#333333',
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: '#DDDDDD',
    marginLeft: 4,
    marginBottom: 12,
  },
  dropoffSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeDetails: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  routeDetailsItem: {
    flex: 1,
    alignItems: 'center',
  },
  routeDetailsLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  routeDetailsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  routeDetailsDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#F0F0F0',
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  rideOptionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  rideOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  selectedRideOption: {
    borderWidth: 2,
    borderColor: '#2E86DE',
  },
  rideOptionImage: {
    width: 48,
    height: 48,
    marginRight: 16,
  },
  rideOptionInfo: {
    flex: 1,
  },
  rideOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  rideOptionDetails: {
    fontSize: 14,
    color: '#666666',
  },
  rideOptionFare: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  paymentMethodsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedPaymentMethod: {
    borderWidth: 2,
    borderColor: '#2E86DE',
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentIcon: {
    width: 20,
    height: 20,
    tintColor: '#2E86DE',
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  paymentMethodDetails: {
    fontSize: 14,
    color: '#666666',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#2E86DE',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2E86DE',
  },
  addPaymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 16,
  },
  addIcon: {
    width: 20,
    height: 20,
    tintColor: '#2E86DE',
    marginRight: 8,
  },
  addPaymentText: {
    fontSize: 16,
    color: '#2E86DE',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  fareContainer: {
    
  },
  fareLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  bookButton: {
    backgroundColor: '#2E86DE',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RideBookingScreen;