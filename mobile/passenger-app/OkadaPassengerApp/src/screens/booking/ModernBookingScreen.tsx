import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Dimensions,
  Animated,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { rideService } from '../../api/services/rideService';
import { authService, User } from '../../api/services/authService';

const { width, height } = Dimensions.get('window');

type BookingScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Booking'
>;

type BookingScreenRouteProp = RouteProp<RootStackParamList, 'Booking'>;

interface Props {
  navigation: BookingScreenNavigationProp;
  route: BookingScreenRouteProp;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'cash' | 'mobile';
  display: string;
  icon: string;
}

export default function ModernBookingScreen({ navigation, route }: Props) {
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);
  
  const [destination] = useState(route.params?.destination || null);
  const [selectedPayment, setSelectedPayment] = useState('cash');
  const [promoCode, setPromoCode] = useState('');
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [estimatedFare, setEstimatedFare] = useState('$12-15');
  const [estimatedTime, setEstimatedTime] = useState('8 min');
  const [isBooking, setIsBooking] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Get user info
    const fetchUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();

    // Get current location
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Please enable location services');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        
        // Get address from coordinates
        const address = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });

        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: address[0]?.street || 'Current location'
        });
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };
    getLocation();

    // Animate entrance
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Payment methods
  const paymentMethods: PaymentMethod[] = [
    { id: 'cash', type: 'cash', display: 'Cash', icon: '💵' },
    { id: 'card1', type: 'card', display: '•••• 1234', icon: '💳' },
    { id: 'mobile', type: 'mobile', display: 'Mobile Money', icon: '📱' },
  ];

  // Handle booking
  const handleBooking = async () => {
    if (!currentLocation || !destination) {
      Alert.alert('Error', 'Please set pickup and destination locations');
      return;
    }

    setIsBooking(true);
    
    try {
      // Create ride request
      const rideData = {
        pickupLocation: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          address: currentLocation.address || 'Current location'
        },
        destination: {
          latitude: destination.coordinates.latitude,
          longitude: destination.coordinates.longitude,
          address: destination.address
        },
        paymentMethod: selectedPayment,
        estimatedFare,
        promoCode: promoCode || undefined
      };

      // Request ride (mock for now)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Navigate to tracking screen
      navigation.navigate('RideTracking', {
        rideId: 'mock-ride-id'
      });
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Error', 'Failed to book ride. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Map Background */}
      <View style={styles.mapContainer}>
        <LinearGradient
          colors={['#f0f0f0', '#e0e0e0']}
          style={styles.mapGradient}
        >
          <View style={styles.routeVisualization}>
            <View style={styles.routeDot} />
            <View style={styles.routeLine} />
            <View style={[styles.routeDot, styles.destinationDot]} />
          </View>
        </LinearGradient>
      </View>

      {/* Header */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm your ride</Text>
        <View style={styles.headerSpacer} />
      </SafeAreaView>

      {/* Bottom Sheet */}
      <Animated.View 
        style={[
          styles.bottomSheet,
          {
            opacity: fadeAnim,
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [height * 0.6, 0]
              })
            }]
          }
        ]}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.bottomSheetContent}
        >
          {/* Location Details */}
          <View style={styles.locationSection}>
            <View style={styles.locationRow}>
              <View style={styles.locationDot} />
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Pickup</Text>
                <Text style={styles.locationAddress}>
                  {currentLocation?.address || 'Getting location...'}
                </Text>
              </View>
            </View>
            
            <View style={styles.locationDivider} />
            
            <View style={styles.locationRow}>
              <View style={[styles.locationDot, styles.destinationLocationDot]} />
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Drop-off</Text>
                <Text style={styles.locationAddress}>
                  {destination?.address || 'No destination set'}
                </Text>
              </View>
            </View>
          </View>

          {/* Fare Estimate */}
          <View style={styles.fareSection}>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Estimated fare</Text>
              <Text style={styles.fareAmount}>{estimatedFare}</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Estimated time</Text>
              <Text style={styles.fareTime}>{estimatedTime}</Text>
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>Payment method</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.paymentMethods}
            >
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethod,
                    selectedPayment === method.id && styles.selectedPayment
                  ]}
                  onPress={() => setSelectedPayment(method.id)}
                >
                  <Text style={styles.paymentIcon}>{method.icon}</Text>
                  <Text style={styles.paymentText}>{method.display}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Promo Code */}
          <TouchableOpacity 
            style={styles.promoSection}
            onPress={() => setShowPromoInput(!showPromoInput)}
          >
            <Text style={styles.promoIcon}>🎟️</Text>
            <Text style={styles.promoText}>
              {promoCode || 'Add promo code'}
            </Text>
            <Text style={styles.promoArrow}>›</Text>
          </TouchableOpacity>

          {showPromoInput && (
            <View style={styles.promoInputContainer}>
              <TextInput
                style={styles.promoInput}
                placeholder="Enter promo code"
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity 
                style={styles.promoApplyButton}
                onPress={() => {
                  setShowPromoInput(false);
                  if (promoCode) {
                    Alert.alert('Success', 'Promo code applied!');
                  }
                }}
              >
                <Text style={styles.promoApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Rider Preferences */}
          <View style={styles.preferencesSection}>
            <Text style={styles.sectionTitle}>Rider preferences</Text>
            <View style={styles.preferenceOptions}>
              <TouchableOpacity style={styles.preferenceOption}>
                <Text style={styles.preferenceIcon}>🚭</Text>
                <Text style={styles.preferenceText}>No smoking</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.preferenceOption}>
                <Text style={styles.preferenceIcon}>🎵</Text>
                <Text style={styles.preferenceText}>Quiet ride</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.preferenceOption}>
                <Text style={styles.preferenceIcon}>❄️</Text>
                <Text style={styles.preferenceText}>AC on</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Book Button */}
        <View style={styles.bookButtonContainer}>
          <TouchableOpacity 
            style={[
              styles.bookButton,
              isBooking && styles.bookButtonDisabled
            ]}
            onPress={handleBooking}
            disabled={isBooking}
          >
            {isBooking ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.bookButtonText}>Book Standard • {estimatedFare}</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mapContainer: {
    flex: 1,
  },
  mapGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeVisualization: {
    alignItems: 'center',
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  destinationDot: {
    backgroundColor: '#000000',
  },
  routeLine: {
    width: 2,
    height: 100,
    backgroundColor: '#333333',
    marginVertical: 10,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: '#000000',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  headerSpacer: {
    width: 44,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: height * 0.75,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  bottomSheetContent: {
    paddingBottom: 20,
  },
  locationSection: {
    padding: 20,
    borderBottomWidth: 8,
    borderBottomColor: '#f5f5f5',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    marginRight: 16,
  },
  destinationLocationDot: {
    backgroundColor: '#000000',
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  locationDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
    marginLeft: 5,
    marginVertical: 8,
  },
  fareSection: {
    padding: 20,
    borderBottomWidth: 8,
    borderBottomColor: '#f5f5f5',
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fareLabel: {
    fontSize: 16,
    color: '#666666',
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  fareTime: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  paymentSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  paymentMethods: {
    flexDirection: 'row',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    marginRight: 12,
  },
  selectedPayment: {
    backgroundColor: '#000000',
  },
  paymentIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  promoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  promoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  promoText: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
  },
  promoArrow: {
    fontSize: 20,
    color: '#999999',
  },
  promoInputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  promoInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginRight: 12,
  },
  promoApplyButton: {
    paddingHorizontal: 20,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 8,
  },
  promoApplyText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  preferencesSection: {
    padding: 20,
  },
  preferenceOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  preferenceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    marginBottom: 8,
  },
  preferenceIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  preferenceText: {
    fontSize: 14,
    color: '#333333',
  },
  bookButtonContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  bookButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    opacity: 0.7,
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
