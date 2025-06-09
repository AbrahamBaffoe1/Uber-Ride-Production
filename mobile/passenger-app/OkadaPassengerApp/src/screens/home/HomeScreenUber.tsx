import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Dimensions,
  Animated,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  Keyboard,
  KeyboardAvoidingView
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { BlurView } from 'expo-blur';
import { authService, User } from '../../api/services/authService';
import { locationService, SavedLocation } from '../../api/services/location.service';
import { rideService, RideEstimate } from '../../api/services/rideService';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

type HomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Home'
>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

// Modern map style similar to Uber
const mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{"color": "#f5f5f5"}]
  },
  {
    "elementType": "labels.icon",
    "stylers": [{"visibility": "off"}]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#616161"}]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{"color": "#f5f5f5"}]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{"color": "#ffffff"}]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{"color": "#e0e0e0"}]
  }
];

export default function HomeScreenUber({ navigation }: Props) {
  const isFocused = useIsFocused();
  const [user, setUser] = useState<User | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showRideOptions, setShowRideOptions] = useState<boolean>(false);
  const [selectedRideType, setSelectedRideType] = useState('UberX');
  const [showDestinationSearch, setShowDestinationSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedPlaces, setSavedPlaces] = useState<SavedLocation[]>([]);
  const [recentPlaces, setRecentPlaces] = useState<any[]>([]);
  const [rideOptions, setRideOptions] = useState<RideEstimate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const mapRef = useRef<MapView>(null);
  const bottomSheetAnim = useRef(new Animated.Value(0)).current;

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    
    if (isFocused) {
      fetchUser();
    }
  }, [isFocused]);

  // Get current location
  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Please enable location services');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const region = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        
        setCurrentLocation(region);
        
        // Center map on current location
        if (mapRef.current) {
          mapRef.current.animateToRegion(region, 1000);
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };

    if (isFocused) {
      getLocation();
    }
  }, [isFocused]);

  // Fetch saved places
  useEffect(() => {
    const fetchSavedPlaces = async () => {
      if (!user?.id) return;
      
      try {
        const places = await locationService.getSavedLocations();
        setSavedPlaces(places);
      } catch (error) {
        console.error('Error fetching saved places:', error);
      }
    };

    if (isFocused && user) {
      fetchSavedPlaces();
    }
  }, [isFocused, user]);

  // Show bottom sheet animation
  const showBottomSheet = () => {
    setShowRideOptions(true);
    Animated.spring(bottomSheetAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

  const hideBottomSheet = () => {
    Animated.timing(bottomSheetAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowRideOptions(false);
    });
  };

  // Handle destination selection
  const handleDestinationSelect = async (destination: any) => {
    setDestinationLocation({
      latitude: destination.coordinates.latitude,
      longitude: destination.coordinates.longitude,
    });
    setShowDestinationSearch(false);
    
    // Fetch ride options
    if (currentLocation) {
      setIsLoading(true);
      try {
        const estimates = await rideService.getRideEstimates(
          currentLocation.latitude,
          currentLocation.longitude,
          destination.coordinates.latitude,
          destination.coordinates.longitude
        );
        setRideOptions(estimates);
        showBottomSheet();
      } catch (error) {
        console.error('Error fetching ride estimates:', error);
        Alert.alert('Error', 'Could not fetch ride options');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Ride type data with Uber-like styling
  const rideTypes = [
    { 
      id: 'uberx', 
      name: 'UberX', 
      description: 'Affordable rides', 
      icon: '🚗', 
      price: '$15-20', 
      time: '5 min', 
      capacity: '4',
      color: '#000000'
    },
    { 
      id: 'comfort', 
      name: 'Comfort', 
      description: 'Newer cars, more space', 
      icon: '🚙', 
      price: '$20-25', 
      time: '7 min', 
      capacity: '4',
      color: '#2B5CE6'
    },
    { 
      id: 'xl', 
      name: 'UberXL', 
      description: 'For groups up to 6', 
      icon: '🚐', 
      price: '$25-30', 
      time: '10 min', 
      capacity: '6',
      color: '#276EF1'
    },
    { 
      id: 'black', 
      name: 'Black', 
      description: 'Premium rides', 
      icon: '🚘', 
      price: '$35-45', 
      time: '15 min', 
      capacity: '4',
      color: '#000000'
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Full Screen Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        customMapStyle={mapStyle}
        initialRegion={currentLocation || {
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {destinationLocation && (
          <Marker
            coordinate={destinationLocation}
            title="Destination"
          >
            <View style={styles.destinationMarker}>
              <View style={styles.destinationMarkerInner} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Top Search Bar */}
      <SafeAreaView style={styles.topContainer}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.searchBar}
            onPress={() => setShowDestinationSearch(true)}
          >
            <Text style={styles.searchPlaceholder}>Where to?</Text>
            <View style={styles.searchDivider} />
            <View style={styles.searchTimeContainer}>
              <Text style={styles.searchTimeText}>Now</Text>
              <Text style={styles.searchDropdownIcon}>▼</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Access Buttons */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.quickAccessContainer}
        >
          {savedPlaces.slice(0, 3).map((place, index) => (
            <TouchableOpacity
              key={place.id}
              style={styles.quickAccessButton}
              onPress={() => handleDestinationSelect(place)}
            >
              <View style={styles.quickAccessIcon}>
                <Text style={styles.quickAccessIconText}>
                  {index === 0 ? '🏠' : index === 1 ? '💼' : '⭐'}
                </Text>
              </View>
              <Text style={styles.quickAccessText}>{place.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* My Location Button */}
      <TouchableOpacity 
        style={styles.myLocationButton}
        onPress={() => {
          if (currentLocation && mapRef.current) {
            mapRef.current.animateToRegion(currentLocation, 1000);
          }
        }}
      >
        <Text style={styles.myLocationIcon}>📍</Text>
      </TouchableOpacity>

      {/* Book Ride Button */}
      <TouchableOpacity 
        style={styles.bookRideButton}
        onPress={() => {
          if (currentLocation) {
            navigation.navigate('Booking', {
              destination: undefined
            });
          }
        }}
      >
        <Text style={styles.bookRideButtonText}>Book a Ride</Text>
      </TouchableOpacity>

      {/* Ride Options Bottom Sheet */}
      {showRideOptions && (
        <Animated.View 
          style={[
            styles.bottomSheet,
            {
              transform: [{
                translateY: bottomSheetAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [height * 0.7, 0]
                })
              }]
            }
          ]}
        >
          <View style={styles.bottomSheetHandle} />
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.bottomSheetTitle}>Choose a ride</Text>
            
            {rideTypes.map((ride) => (
              <TouchableOpacity
                key={ride.id}
                style={[
                  styles.rideOption,
                  selectedRideType === ride.id && styles.selectedRideOption
                ]}
                onPress={() => setSelectedRideType(ride.id)}
              >
                <View style={styles.rideOptionLeft}>
                  <Text style={styles.rideOptionIcon}>{ride.icon}</Text>
                  <View style={styles.rideOptionInfo}>
                    <View style={styles.rideOptionHeader}>
                      <Text style={styles.rideOptionName}>{ride.name}</Text>
                      <View style={styles.rideOptionCapacity}>
                        <Text style={styles.rideOptionCapacityIcon}>👤</Text>
                        <Text style={styles.rideOptionCapacityText}>{ride.capacity}</Text>
                      </View>
                    </View>
                    <Text style={styles.rideOptionDescription}>{ride.description}</Text>
                    <Text style={styles.rideOptionTime}>{ride.time} away</Text>
                  </View>
                </View>
                <Text style={styles.rideOptionPrice}>{ride.price}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.bottomSheetFooter}>
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={() => {
                navigation.navigate('Booking', {
                  destination: destinationLocation ? {
                    address: 'Selected destination for ' + selectedRideType,
                    coordinates: {
                      latitude: destinationLocation.latitude,
                      longitude: destinationLocation.longitude
                    }
                  } : undefined
                });
              }}
            >
              <Text style={styles.confirmButtonText}>Confirm {selectedRideType}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Destination Search Modal */}
      <Modal
        visible={showDestinationSearch}
        animationType="slide"
        transparent={false}
      >
        <SafeAreaView style={styles.searchModal}>
          <View style={styles.searchModalHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowDestinationSearch(false)}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            
            <View style={styles.searchInputContainer}>
              <View style={styles.searchDotContainer}>
                <View style={styles.searchDotGreen} />
                <View style={styles.searchDotLine} />
                <View style={styles.searchDotRed} />
              </View>
              
              <View style={styles.searchInputs}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Current location"
                  value={currentLocation ? 'Current location' : ''}
                  editable={false}
                />
                <View style={styles.searchInputDivider} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Where to?"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
              </View>
            </View>
          </View>

          <ScrollView style={styles.searchResults}>
            {/* Saved Places */}
            {savedPlaces.length > 0 && (
              <View>
                <Text style={styles.searchSectionTitle}>Saved places</Text>
                {savedPlaces.map((place) => (
                  <TouchableOpacity
                    key={place.id}
                    style={styles.searchResultItem}
                    onPress={() => handleDestinationSelect(place)}
                  >
                    <View style={styles.searchResultIcon}>
                      <Text>{place.icon || '⭐'}</Text>
                    </View>
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultTitle}>{place.name}</Text>
                      <Text style={styles.searchResultSubtitle}>{place.address}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Recent Places */}
            {recentPlaces.length > 0 && (
              <View style={styles.searchSection}>
                <Text style={styles.searchSectionTitle}>Recent</Text>
                {recentPlaces.map((place, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.searchResultItem}
                    onPress={() => handleDestinationSelect(place)}
                  >
                    <View style={styles.searchResultIcon}>
                      <Text>🕒</Text>
                    </View>
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultTitle}>{place.name}</Text>
                      <Text style={styles.searchResultSubtitle}>{place.address}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Finding rides...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  map: {
    flex: 1,
  },
  topContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuLine: {
    width: 18,
    height: 2,
    backgroundColor: '#000000',
    marginVertical: 1.5,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: '#333333',
  },
  searchDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 12,
  },
  searchTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  searchTimeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginRight: 4,
  },
  searchDropdownIcon: {
    fontSize: 10,
    color: '#333333',
  },
  quickAccessContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  quickAccessButton: {
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 8,
  },
  quickAccessIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickAccessIconText: {
    fontSize: 24,
  },
  quickAccessText: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '500',
  },
  myLocationButton: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  myLocationIcon: {
    fontSize: 20,
  },
  bookRideButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  bookRideButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  destinationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  destinationMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000000',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.7,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  rideOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  selectedRideOption: {
    backgroundColor: '#f5f5f5',
  },
  rideOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rideOptionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  rideOptionInfo: {
    flex: 1,
  },
  rideOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rideOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  rideOptionCapacity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  rideOptionCapacityIcon: {
    fontSize: 10,
    marginRight: 2,
  },
  rideOptionCapacityText: {
    fontSize: 12,
    color: '#666666',
  },
  rideOptionDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  rideOptionTime: {
    fontSize: 12,
    color: '#999999',
  },
  rideOptionPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  bottomSheetFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  confirmButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchModal: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  searchModalHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#000000',
  },
  searchInputContainer: {
    flexDirection: 'row',
    marginTop: 16,
  },
  searchDotContainer: {
    alignItems: 'center',
    marginRight: 16,
    paddingTop: 20,
  },
  searchDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  searchDotLine: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
  searchDotRed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000000',
  },
  searchInputs: {
    flex: 1,
  },
  searchInput: {
    height: 48,
    fontSize: 16,
    color: '#333333',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  searchInputDivider: {
    height: 8,
  },
  searchResults: {
    flex: 1,
    paddingTop: 16,
  },
  searchSection: {
    marginTop: 24,
  },
  searchSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999999',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  searchResultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  searchResultSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333333',
  },
});
