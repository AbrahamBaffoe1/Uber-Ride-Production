import React, { useState, useRef, useEffect } from 'react';
import * as Location from 'expo-location';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  StatusBar,
  Animated,
  ActivityIndicator,
  Modal,
  Alert,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { rideService, RideEstimate, ActiveRide } from '../../api/services/rideService';
import { locationService, SavedLocation } from '../../api/services/location.service';
import socketService from '../../services/socketService';
import { Socket } from 'socket.io-client';

const { width, height } = Dimensions.get('window');

// Types
type BookingStep = 'location' | 'options';
type BookingStatus = 'idle' | 'requesting' | 'searching' | 'found' | 'confirmed' | 'noRiders' | 'started' | 'completed';
type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function BookingScreen() {
  const navigation = useNavigation<NavigationProp>();
  
  // State variables
  const [bookingStep, setBookingStep] = useState<BookingStep>('location');
  const [pickupLocation, setPickupLocation] = useState('Current Location');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>('idle');
  const [currentRide, setCurrentRide] = useState<any>(null);
  const [driverData, setDriverData] = useState<any>(null);

  // Animation references
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const searchBarAnimation = useRef(new Animated.Value(0)).current;

  // API data state arrays
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [rideOptions, setRideOptions] = useState<RideEstimate[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isLoadingRideOptions, setIsLoadingRideOptions] = useState(true);
  
  // Fetch user's saved locations and ride options on component mount
  useEffect(() => {
    // Fetch the user's saved locations from the API
    const fetchSavedLocations = async () => {
      setIsLoadingLocations(true);
      try {
        const locations = await locationService.getSavedLocations();
        setSavedLocations(locations);
      } catch (error) {
        console.error('Error fetching saved locations:', error);
        setSavedLocations([]);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    // Fetch available ride options based on current location
    const fetchRideOptions = async () => {
      setIsLoadingRideOptions(true);
      try {
        const userLocation = await getCurrentLocation();
        
        if (!userLocation || !dropoffLocation) {
          setRideOptions([]);
          return;
        }
        
        // Get coordinates or default to a placeholder value
        const dropoffCoords = {
          latitude: 6.5244,
          longitude: 3.3792
        };
        
        const estimates = await rideService.getRideEstimates(
          userLocation.latitude,
          userLocation.longitude,
          dropoffCoords.latitude,
          dropoffCoords.longitude
        );
        
        setRideOptions(estimates);
      } catch (error) {
        console.error('Error fetching ride options:', error);
        setRideOptions([]);
      } finally {
        setIsLoadingRideOptions(false);
      }
    };
    
    fetchSavedLocations();
    fetchRideOptions();
  }, []);

  // Animation for step transition
  const transitionToStep = (step: BookingStep) => {
    // Start fade out animation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setBookingStep(step);
      // Reset slide animation
      slideAnim.setValue(1);
      
      // Start fade in and slide in animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  // Animation for search bar
  useEffect(() => {
    Animated.timing(searchBarAnimation, {
      toValue: searchFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [searchFocused]);

  // Socket reference for cleanup
  const rideSocketRef = useRef<Socket | null>(null);
  
  // Initialize socket service and set up listeners for real-time ride updates
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        // Connect to socket server
        await socketService.connect();
        
        if (socketService.isConnected()) {
          console.log('Socket connected successfully');
          
          // Get ride namespace - now returns a Promise
          const mainSocket = await socketService.getNamespace('/rides');
          
          if (mainSocket) {
            // Store the socket reference for cleanup
            rideSocketRef.current = mainSocket;
            
            console.log('Successfully connected to rides room');
            
            // Set up ride event listeners on the main socket
            mainSocket.on('room:joined', (data) => {
              console.log('Joined room:', data);
            });
            
            mainSocket.on('rider_assigned', (data: { ride: ActiveRide }) => {
              console.log('Rider assigned:', data);
              setCurrentRide(data.ride);
              setDriverData(data.ride.rider);
              setBookingStatus('found');
              setBookingConfirmed(true);
              setIsLoading(false);
            });
            
            mainSocket.on('rider_nearby', (data: { ride: ActiveRide, eta: number }) => {
              console.log('Rider nearby:', data);
              setCurrentRide((prev: any) => ({ ...prev, ...data.ride, estimatedArrival: `${data.eta} min` }));
            });
            
            mainSocket.on('ride_started', (data: { ride: ActiveRide }) => {
              console.log('Ride started:', data);
              setCurrentRide(data.ride);
              setBookingStatus('started');
            });
            
            mainSocket.on('ride_completed', (data: { ride: ActiveRide }) => {
              console.log('Ride completed:', data);
              setCurrentRide(data.ride);
              setBookingStatus('completed');
              // Navigate to ride completion screen
              navigation.navigate('RideCompletion', {
                rideId: data.ride.id,
                riderName: data.ride.rider?.name || 'Driver',
                pickupName: data.ride.pickupLocation.address,
                dropoffName: data.ride.dropoffLocation.address,
                fare: data.ride.fare,
                paymentMethod: 'Cash'
              });
            });
            
            mainSocket.on('ride_cancelled', (data: { ride: ActiveRide, reason: string }) => {
              console.log('Ride cancelled:', data);
              setCurrentRide(data.ride);
              setBookingStatus('idle');
              Alert.alert('Ride Cancelled', data.reason || 'The ride was cancelled');
            });
            
            mainSocket.on('no_riders_available', () => {
              console.log('No riders available');
              setBookingStatus('noRiders');
              setIsLoading(false);
              Alert.alert(
                'No Drivers Available',
                'Sorry, there are no drivers available in your area right now. Please try again later.',
                [{ text: 'OK', onPress: () => setBookingStatus('idle') }]
              );
            });
          }
        }
      } catch (error) {
        console.error('Error initializing socket:', error);
      }
    };
    
    initializeSocket();
    
    // Clean up socket listeners when component unmounts
    return () => {
      if (rideSocketRef.current) {
        // Remove all listeners
        const socket = rideSocketRef.current;
        socket.off('room:joined');
        socket.off('rider_assigned');
        socket.off('rider_nearby');
        socket.off('ride_started');
        socket.off('ride_completed');
        socket.off('ride_cancelled');
        socket.off('no_riders_available');
      }
    };
  }, [navigation]);
  
  // Get current location using device location API
  const getCurrentLocation = async () => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Allow location access to use this feature',
          [{ text: 'OK' }]
        );
        return null;
      }
      
      // Get current position with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      // Get address from coordinates (reverse geocoding)
      const [geocode] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      // Format the address
      const formattedAddress = geocode 
        ? `${geocode.street || ''} ${geocode.name || ''}, ${geocode.city || ''}`
        : 'Current Location';
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: formattedAddress
      };
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Could not determine your current location');
      return null;
    }
  };
  
  // Book ride function using real API
  const confirmBooking = async () => {
    if (!selectedRideId) return;
    
    setIsLoading(true);
    setBookingStatus('requesting');
    
    try {
      // Get current location
      const pickup = await getCurrentLocation();
      
      if (!pickup) {
        setIsLoading(false);
        return;
      }
      
      // Get the selected ride option
      const selectedRide = rideOptions.find(option => option.rideType === selectedRideId);
      
      if (!selectedRide) {
        console.error('Selected ride not found');
        setIsLoading(false);
        setBookingStatus('idle');
        Alert.alert('Booking Error', 'Invalid ride option selected. Please try again.');
        return;
      }
      
      // Prepare ride request object
      const rideRequest = {
        pickupLocation: {
          latitude: pickup.latitude,
          longitude: pickup.longitude,
          address: pickup.address
        },
        dropoffLocation: {
          latitude: 6.5244, // This should be replaced with actual coordinates from geocoding API
          longitude: 3.3792,
          address: dropoffLocation
        },
        rideType: selectedRideId,
        paymentMethod: 'cash' // Default to cash, should be dynamically set based on user selection
      };
      
      // Make the actual API call to request a ride
      const ride = await rideService.requestRide(rideRequest);
      
      // Update the current ride state
      setCurrentRide(ride);
      
      // Update booking status based on the API response
      if (ride.rider) {
        setDriverData(ride.rider);
        setBookingStatus('found');
        setBookingConfirmed(true);
      } else {
        // No riders available
        setBookingStatus('noRiders');
        Alert.alert(
          'No Drivers Available',
          'Sorry, there are no drivers available in your area right now. Please try again later.',
          [{ text: 'OK', onPress: () => setBookingStatus('idle') }]
        );
      }
    } catch (error) {
      console.error('Error requesting ride:', error);
      setIsLoading(false);
      setBookingStatus('idle');
      Alert.alert('Booking Error', 'Failed to request ride. Please try again.');
    }
  };

  // Map Preview component
  const MapPreview = () => (
    <View style={styles.mapContainer}>
      <MaterialCommunityIcons 
        name="map-outline" 
        size={50} 
        color="#ccc"
        style={{ alignSelf: 'center', marginTop: 80 }}
      />
      <Text style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 10 }}>
        Map View
      </Text>
      
      <View style={styles.mapOverlayButtons}>
        <TouchableOpacity style={styles.mapButton}>
          <Ionicons name="locate" size={20} color="#4B5563" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.mapButton}>
          <Ionicons name="layers-outline" size={20} color="#4B5563" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Ride option card component
  const renderRideOption = (option: any) => {
    const isSelected = selectedRideId === option.id;
    
    return (
      <TouchableOpacity 
        key={option.id}
        style={[
          styles.rideOptionCard,
          isSelected && styles.rideOptionCardSelected
        ]}
        onPress={() => setSelectedRideId(option.id)}
      >
        <View style={styles.rideOptionTopRow}>
          <View style={styles.rideOptionIconContainer}>
            <Ionicons name={option.icon || "car-outline"} size={20} color="#4B5563" />
          </View>
          
          <View style={styles.rideOptionInfo}>
            <Text style={styles.rideOptionName}>{option.name}</Text>
            <Text style={styles.rideOptionTime}>{option.time || 'Calculating...'}</Text>
          </View>
          
          <View style={styles.rideOptionPriceContainer}>
            <Text style={styles.rideOptionPrice}>{option.price || 'Calculating...'}</Text>
          </View>
        </View>
        
        <Text style={styles.rideOptionDescription}>
          {option.description || `Standard ${option.name} ride`}
        </Text>
        
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={20} color="#7AC231" />
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  // Location search bar width animation
  const searchBarWidth = searchBarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['87%', '100%'],
  });
  
  // Slide animation for content
  const slideInTransform = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });
  
  // Render different content based on booking step
  const renderStepContent = () => {
    switch (bookingStep) {
      case 'location':
        return (
          <Animated.View 
            style={[
              styles.stepContent,
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideInTransform }]
              }
            ]}
          >
            <MapPreview />
            
            <View style={styles.locationInputContainer}>
              <View style={styles.locationIconContainer}>
                <View style={styles.pickupDot} />
                <View style={styles.locationLine} />
                <View style={styles.dropoffDot} />
              </View>
              
              <View style={styles.inputFieldsContainer}>
                <TouchableOpacity 
                  style={styles.locationInput}
                  onPress={() => setSearchFocused(true)}
                >
                  <Text style={styles.locationInputText}>
                    {pickupLocation || 'Enter pickup location'}
                  </Text>
                </TouchableOpacity>
                
                <View style={styles.inputDivider} />
                
                <TouchableOpacity 
                  style={styles.locationInput}
                  onPress={() => setSearchFocused(true)}
                >
                  <TextInput
                    style={styles.locationInputText}
                    placeholder="Where to?"
                    placeholderTextColor="#9CA3AF"
                    value={dropoffLocation}
                    onChangeText={setDropoffLocation}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            {!searchFocused ? (
              <View style={styles.savedLocationsContainer}>
                <Text style={styles.sectionTitle}>Saved Places</Text>
                
                {isLoadingLocations ? (
                  <ActivityIndicator size="small" color="#0066CC" style={{ marginTop: 20 }} />
                ) : (
                  <>
                    {savedLocations.map(location => (
                      <TouchableOpacity 
                        key={location.id} 
                        style={styles.savedLocationItem}
                        onPress={() => {
                          setDropoffLocation(location.address);
                          setSearchFocused(false);
                        }}
                      >
                        <View style={styles.savedLocationIcon}>
                          <Ionicons name={location.icon === "home" ? "home" : location.icon === "work" ? "briefcase" : "location"} size={18} color="#6B7280" />
                        </View>
                        <View style={styles.savedLocationInfo}>
                          <Text style={styles.savedLocationName}>{location.name}</Text>
                          <Text style={styles.savedLocationAddress}>{location.address}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                      </TouchableOpacity>
                    ))}
                    
                    {savedLocations.length === 0 && !isLoadingLocations && (
                      <View style={styles.emptyStateContainer}>
                        <Text style={styles.emptyStateText}>No saved places yet</Text>
                        <TouchableOpacity style={styles.addButton}>
                          <Text style={styles.addButtonText}>Add a place</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
              </View>
            ) : (
              <View style={styles.searchResultsContainer}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                
                {recentSearches.length === 0 ? (
                  <Text style={styles.emptyStateText}>No recent searches</Text>
                ) : (
                  recentSearches.map(place => (
                    <TouchableOpacity 
                      key={place.id}
                      style={styles.searchResultItem}
                      onPress={() => {
                        setDropoffLocation(place.address);
                        setSearchFocused(false);
                      }}
                    >
                      <View style={styles.searchResultIconContainer}>
                        <Ionicons name="time-outline" size={18} color="#6B7280" />
                      </View>
                      <View style={styles.searchResultInfo}>
                        <Text style={styles.searchResultTitle}>{place.name}</Text>
                        <Text style={styles.searchResultAddress}>{place.address}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
            
            {dropoffLocation && !searchFocused && (
              <TouchableOpacity 
                style={styles.nextButton}
                onPress={() => transitionToStep('options')}
              >
                <Text style={styles.nextButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </Animated.View>
        );
        
      case 'options':
        return (
          <Animated.View 
            style={[
              styles.stepContent,
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideInTransform }]
              }
            ]}
          >
            <MapPreview />
            
            <View style={styles.rideInfoCard}>
              <View style={styles.rideInfoHeader}>
                <Text style={styles.rideInfoTitle}>Trip Details</Text>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => transitionToStep('location')}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.tripLocations}>
                <View style={styles.locationIconContainer}>
                  <View style={styles.pickupDot} />
                  <View style={styles.locationLine} />
                  <View style={styles.dropoffDot} />
                </View>
                
                <View style={styles.tripLocationTexts}>
                  <Text style={styles.pickupLocationText} numberOfLines={1}>
                    {pickupLocation}
                  </Text>
                  <Text style={styles.dropoffLocationText} numberOfLines={1}>
                    {dropoffLocation}
                  </Text>
                </View>
              </View>
              
              <View style={styles.tripMetrics}>
                <View style={styles.tripMetricItem}>
                  <Ionicons name="navigate" size={16} color="#6B7280" />
                  <Text style={styles.tripMetricText}>Calculating...</Text>
                </View>
                
                <View style={styles.tripMetricItem}>
                  <Ionicons name="time-outline" size={16} color="#6B7280" />
                  <Text style={styles.tripMetricText}>Calculating...</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.rideOptionsContainer}>
              <Text style={styles.rideOptionsTitle}>Choose a ride</Text>
              
              {isLoadingRideOptions ? (
                <ActivityIndicator size="small" color="#0066CC" style={{ marginTop: 20 }} />
              ) : (
                <>
                  {rideOptions.length > 0 ? (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.rideOptionsScrollContent}
                    >
                      {rideOptions.map(renderRideOption)}
                    </ScrollView>
                  ) : (
                    <View style={styles.emptyRideOptions}>
                      <Text style={styles.emptyStateText}>No ride options available</Text>
                    </View>
                  )}
                </>
              )}
            </View>
            
            <View style={styles.paymentMethodContainer}>
              <View style={styles.paymentMethodHeader}>
                <Text style={styles.paymentMethodTitle}>Payment Method</Text>
                <TouchableOpacity style={styles.changePaymentButton}>
                  <Text style={styles.changePaymentText}>Change</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.selectedPaymentMethod}>
                <View style={styles.paymentMethodIcon}>
                  <MaterialIcons name="payments" size={20} color="#6B7280" />
                </View>
                <Text style={styles.paymentMethodName}>Cash</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.nextButton,
                !selectedRideId && styles.disabledButton
              ]}
              onPress={() => selectedRideId && confirmBooking()}
              disabled={!selectedRideId || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.nextButtonText}>Book Now</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        );
        
      default:
        return null;
    }
  };

  // Booking confirmation modal
  const renderBookingConfirmationModal = () => (
    <Modal
      visible={bookingConfirmed}
      transparent
      animationType="fade"
    >
      <View style={styles.bookingConfirmationModal}>
        <View style={styles.confirmationContainer}>
          <View style={styles.confirmationIcon}>
            <Ionicons name="checkmark" size={32} color="#059669" />
          </View>
          
          <Text style={styles.confirmationTitle}>
            Your ride is confirmed!
          </Text>
          
          <Text style={styles.confirmationMessage}>
            Your driver is on the way. Please be ready at the pickup location.
          </Text>
          
          <View style={styles.driverInfoContainer}>
            {driverData?.photo ? (
              <Image source={{ uri: driverData.photo }} style={styles.driverAvatar} />
            ) : (
              <View style={styles.driverAvatarPlaceholder}>
                <Text style={styles.driverAvatarText}>DR</Text>
              </View>
            )}
            
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{driverData?.name || 'Driver'}</Text>
              <Text style={styles.driverCar}>
                {driverData?.vehicle ? 
                  `${driverData.vehicle.model} • ${driverData.vehicle.plate}` : 
                  'Vehicle information unavailable'}
              </Text>
            </View>
            
            <View style={styles.driverRating}>
              <Text style={styles.driverRatingText}>{driverData?.rating || '5.0'}</Text>
              <View style={styles.driverRatingStars}>
                <Ionicons name="star" size={14} color="#F59E0B" />
              </View>
            </View>
          </View>
          
          <View style={styles.vehicleInfoContainer}>
            <View style={styles.vehicleInfoItem}>
              <Text style={styles.vehicleInfoLabel}>Arrival</Text>
              <Text style={styles.vehicleInfoValue}>Calculating...</Text>
            </View>
            
            <View style={styles.vehicleInfoItem}>
              <Text style={styles.vehicleInfoLabel}>Distance</Text>
              <Text style={styles.vehicleInfoValue}>
                {currentRide?.distance ? `${currentRide.distance} km` : 'Calculating...'}
              </Text>
            </View>
            
            <View style={styles.vehicleInfoItem}>
              <Text style={styles.vehicleInfoLabel}>Duration</Text>
              <Text style={styles.vehicleInfoValue}>
                {currentRide?.duration ? `${Math.round(currentRide.duration / 60)} min` : 'Calculating...'}
              </Text>
            </View>
          </View>
          
          <View style={styles.confirmationButtons}>
            <TouchableOpacity 
              style={styles.trackRideButton}
              onPress={() => setBookingConfirmed(false)}
            >
              <Text style={styles.trackRideButtonText}>Track Ride</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelRideButton}
              onPress={() => setBookingConfirmed(false)}
            >
              <Text style={styles.cancelRideButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Animated.View 
          style={[
            styles.searchBar,
            { width: searchBarWidth }
          ]}
        >
          {searchFocused ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSearchFocused(false)}
            >
              <Ionicons name="arrow-back" size={22} color="#1F2937" />
            </TouchableOpacity>
          ) : (
            <View style={styles.searchIcon}>
              <Ionicons name="search" size={18} color="#6B7280" />
            </View>
          )}
          
          <TextInput
            style={styles.searchInput}
            placeholder="Where to?"
            placeholderTextColor="#9CA3AF"
            value={dropoffLocation}
            onChangeText={setDropoffLocation}
            onFocus={() => setSearchFocused(true)}
          />
        </Animated.View>
        
        {!searchFocused && (
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="person" size={20} color="#1F2937" />
          </TouchableOpacity>
        )}
      </View>
      
      {renderStepContent()}
      {renderBookingConfirmationModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchBar: {
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 8,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#E5E7EB',
  },
  mapOverlayButtons: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'column',
  },
  mapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  locationInputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
  },
  locationIconContainer: {
    marginRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  locationLine: {
    width: 2,
    height: 30,
    backgroundColor: '#E5E7EB',
    marginVertical: 5,
  },
  dropoffDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  inputFieldsContainer: {
    flex: 1,
  },
  locationInput: {
    height: 32,
    justifyContent: 'center',
  },
  locationInputText: {
    fontSize: 16,
    color: '#1F2937',
  },
  inputDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
  },
  savedLocationsContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 15,
  },
  savedLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  savedLocationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  savedLocationInfo: {
    flex: 1,
  },
  savedLocationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  savedLocationAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 15,
  },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  searchResultsContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    flex: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchResultIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  searchResultAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  nextButton: {
    backgroundColor: '#0066CC',
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  rideInfoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: -20,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 15,
  },
  rideInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  editButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
  },
  editButtonText: {
    fontSize: 12,
    color: '#4B5563',
  },
  tripLocations: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripLocationTexts: {
    flex: 1,
  },
  pickupLocationText: {
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 18,
  },
  dropoffLocationText: {
    fontSize: 15,
    color: '#1F2937',
  },
  tripMetrics: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  tripMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  tripMetricText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 5,
  },
  rideOptionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  rideOptionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  rideOptionsScrollContent: {
    paddingBottom: 10,
  },
  rideOptionCard: {
    width: 200,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rideOptionCardSelected: {
    borderColor: '#0066CC',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rideOptionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rideOptionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rideOptionInfo: {
    flex: 1,
  },
  rideOptionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  rideOptionTime: {
    fontSize: 13,
    color: '#6B7280',
  },
  rideOptionPriceContainer: {
    marginLeft: 8,
  },
  rideOptionPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  rideOptionDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  emptyRideOptions: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  paymentMethodContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  changePaymentButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
  },
  changePaymentText: {
    fontSize: 12,
    color: '#4B5563',
  },
  selectedPaymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  paymentMethodIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  bookingConfirmationModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmationContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  confirmationIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
  },
  confirmationMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  driverInfoContainer: {
    flexDirection: 'row',
    width: '100%',
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 15,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  driverAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  driverAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  driverCar: {
    fontSize: 14,
    color: '#6B7280',
  },
  driverRating: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  driverRatingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  driverRatingStars: {
    flexDirection: 'row',
  },
  vehicleInfoContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  vehicleInfoItem: {
    alignItems: 'center',
  },
  vehicleInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  vehicleInfoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  confirmationButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  trackRideButton: {
    flex: 1,
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  trackRideButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelRideButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 10,
  },
  cancelRideButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  }
});
