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
  FlatList,
  KeyboardAvoidingView
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
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

interface RideType {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: string;
  time: string;
  capacity: string;
  color: string;
}

export default function ModernHomeScreen({ navigation }: Props) {
  const isFocused = useIsFocused();
  const [user, setUser] = useState<User | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);
  const [showRideOptions, setShowRideOptions] = useState(false);
  const [selectedRideType, setSelectedRideType] = useState('standard');
  const [showDestinationSearch, setShowDestinationSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedLocation[]>([]);
  const [rideOptions, setRideOptions] = useState<RideEstimate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 6.5244,
    longitude: 3.3792,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  });
  
  const bottomSheetAnim = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(-width * 0.8)).current;
  const mapRef = useRef<MapView>(null);

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
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        // Update map region to current location
        setMapRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
        
        // Animate map to current location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }, 1000);
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

  // Toggle menu
  const toggleMenu = () => {
    const toValue = showMenu ? -width * 0.8 : 0;
    Animated.timing(menuAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setShowMenu(!showMenu);
  };

  // Handle destination selection
  const handleDestinationSelect = async (destination: any) => {
    // Handle both GooglePlacesAutocomplete and saved location formats
    let locationData = {
      latitude: 0,
      longitude: 0,
      address: ''
    };
    
    // If this is from GooglePlacesAutocomplete
    if (destination.geometry) {
      locationData = {
        latitude: destination.geometry.location.lat,
        longitude: destination.geometry.location.lng,
        address: destination.formatted_address || destination.name,
      };
    } 
    // If this is from saved places
    else if (destination.coordinates) {
      locationData = {
        latitude: destination.coordinates.latitude,
        longitude: destination.coordinates.longitude,
        address: destination.address || destination.name,
      };
    }
    
    setDestinationLocation(locationData);
    setShowDestinationSearch(false);
    
    // Animate map to new location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 1000);
    }
    
    // Fetch ride options or show mock data if API unavailable
    if (currentLocation) {
      setIsLoading(true);
      try {
        const estimates = await rideService.getRideEstimates(
          currentLocation.latitude,
          currentLocation.longitude,
          locationData.latitude,
          locationData.longitude
        );
        setRideOptions(estimates);
        showBottomSheet();
      } catch (error) {
        console.log('Using mock ride options due to API unavailability');
        // Use mock data when API is unavailable
        const mockRideOptions: RideEstimate[] = [
          { 
            rideType: 'standard', 
            estimatedPrice: '10-14',
            estimatedTime: '5',
            currency: 'USD',
            distance: '2.5'
          },
          { 
            rideType: 'comfort', 
            estimatedPrice: '15-20',
            estimatedTime: '5',
            currency: 'USD',
            distance: '2.5'
          }
        ];
        setRideOptions(mockRideOptions);
        showBottomSheet();
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // Handle location search
  const handleLocationSearch = (text: string) => {
    setSearchQuery(text);
    
    // Mock search results if API is not available
    if (text.length > 2) {
      const mockResults = [
        {
          id: '1',
          name: `${text} in Lagos`,
          address: 'Lagos, Nigeria',
          coordinates: {
            latitude: 6.5244,
            longitude: 3.3792
          }
        },
        {
          id: '2',
          name: `${text} Market`,
          address: 'Main Street, Lagos',
          coordinates: {
            latitude: 6.5350,
            longitude: 3.3452
          }
        },
        {
          id: '3',
          name: `${text} Plaza`,
          address: 'Victoria Island, Lagos',
          coordinates: {
            latitude: 6.4281,
            longitude: 3.4219
          }
        }
      ];
      setSearchResults(mockResults);
    } else {
      setSearchResults([]);
    }
  };

  // Ride type data with realistic Nigerian pricing
  const rideTypes: RideType[] = [
    { 
      id: 'motorcycle', 
      name: 'Okada', 
      description: 'Fast and affordable motorcycle rides', 
      icon: '🏍️', 
      price: '₦300-800', 
      time: '3 min', 
      capacity: '1',
      color: '#ff6b35'
    },
    { 
      id: 'tricycle', 
      name: 'Keke NAPEP', 
      description: 'Comfortable three-wheeler rides', 
      icon: '🛺', 
      price: '₦500-1200', 
      time: '5 min', 
      capacity: '3',
      color: '#2B5CE6'
    },
    { 
      id: 'car', 
      name: 'Standard Car', 
      description: 'Comfortable car rides for individuals and families', 
      icon: '🚗', 
      price: '₦1000-2500', 
      time: '7 min', 
      capacity: '4',
      color: '#000000'
    },
    { 
      id: 'bicycle', 
      name: 'Bicycle', 
      description: 'Eco-friendly short distance rides', 
      icon: '🚲', 
      price: '₦200-500', 
      time: '8 min', 
      capacity: '1',
      color: '#4CAF50'
    },
  ];

  // Recent destinations (mock data)
  const recentDestinations = [
    { id: '1', name: 'Lagos Airport', address: 'Murtala Muhammed International Airport', icon: '✈️' },
    { id: '2', name: 'Victoria Island', address: 'Victoria Island, Lagos', icon: '🏢' },
    { id: '3', name: 'Lekki Phase 1', address: 'Lekki, Lagos', icon: '🏖️' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Real Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={mapRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={true}
      >
        {/* Destination Marker */}
        {destinationLocation && (
          <Marker
            coordinate={{
              latitude: destinationLocation.latitude,
              longitude: destinationLocation.longitude,
            }}
            title="Destination"
            description={destinationLocation.address}
          >
            <View style={styles.destinationMarker}>
              <View style={styles.destinationMarkerInner} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Top Bar */}
      <SafeAreaView style={styles.topContainer}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={toggleMenu}
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
          {savedPlaces.length > 0 ? (
            savedPlaces.slice(0, 3).map((place, index) => (
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
            ))
          ) : (
            <>
              <TouchableOpacity style={styles.quickAccessButton}>
                <View style={styles.quickAccessIcon}>
                  <Text style={styles.quickAccessIconText}>🏠</Text>
                </View>
                <Text style={styles.quickAccessText}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAccessButton}>
                <View style={styles.quickAccessIcon}>
                  <Text style={styles.quickAccessIconText}>💼</Text>
                </View>
                <Text style={styles.quickAccessText}>Work</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAccessButton}>
                <View style={styles.quickAccessIcon}>
                  <Text style={styles.quickAccessIconText}>⭐</Text>
                </View>
                <Text style={styles.quickAccessText}>Saved</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

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
          <TouchableOpacity 
            style={styles.bottomSheetHandle}
            onPress={hideBottomSheet}
          >
            <View style={styles.handleBar} />
          </TouchableOpacity>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.destinationInfo}>
              <Text style={styles.destinationLabel}>Going to</Text>
              <Text style={styles.destinationAddress}>
                {destinationLocation?.address || 'Selected location'}
              </Text>
            </View>

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
                const selectedRide = rideTypes.find(r => r.id === selectedRideType);
                if (destinationLocation) {
                  navigation.navigate('Booking', {
                    destination: {
                      address: destinationLocation.address || '',
                      coordinates: {
                        latitude: destinationLocation.latitude,
                        longitude: destinationLocation.longitude
                      }
                    }
                  });
                }
              }}
            >
              <Text style={styles.confirmButtonText}>
                Confirm {rideTypes.find(r => r.id === selectedRideType)?.name}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Side Menu */}
      <Animated.View 
        style={[
          styles.sideMenu,
          {
            transform: [{ translateX: menuAnim }]
          }
        ]}
      >
        <SafeAreaView style={styles.menuContent}>
          <View style={styles.menuHeader}>
            <View style={styles.userInfo}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {user?.firstName?.charAt(0) || 'U'}
                </Text>
              </View>
              <View>
                <Text style={styles.userName}>
                  {user?.firstName || 'User'} {user?.lastName || ''}
                </Text>
                <Text style={styles.userPhone}>{user?.phoneNumber || ''}</Text>
              </View>
            </View>
          </View>

          <ScrollView style={styles.menuItems}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                toggleMenu();
                navigation.navigate('RideHistory');
              }}
            >
              <Text style={styles.menuItemIcon}>🕒</Text>
              <Text style={styles.menuItemText}>Your trips</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                toggleMenu();
                navigation.navigate('Payment');
              }}
            >
              <Text style={styles.menuItemIcon}>💳</Text>
              <Text style={styles.menuItemText}>Payment</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                toggleMenu();
                navigation.navigate('SavedLocations');
              }}
            >
              <Text style={styles.menuItemIcon}>⭐</Text>
              <Text style={styles.menuItemText}>Saved places</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                toggleMenu();
                navigation.navigate('Settings');
              }}
            >
              <Text style={styles.menuItemIcon}>⚙️</Text>
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                toggleMenu();
                navigation.navigate('Support');
              }}
            >
              <Text style={styles.menuItemIcon}>❓</Text>
              <Text style={styles.menuItemText}>Help & Support</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                toggleMenu();
                navigation.navigate('Profile');
              }}
            >
              <Text style={styles.menuItemIcon}>👤</Text>
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                toggleMenu();
                navigation.navigate('Notifications');
              }}
            >
              <Text style={styles.menuItemIcon}>🔔</Text>
              <Text style={styles.menuItemText}>Notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                toggleMenu();
                navigation.navigate('Rewards');
              }}
            >
              <Text style={styles.menuItemIcon}>🏆</Text>
              <Text style={styles.menuItemText}>Rewards</Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={async () => {
              try {
                await authService.logout();
                navigation.navigate('Login');
              } catch (error) {
                Alert.alert('Error', 'Failed to logout');
              }
            }}
          >
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>

      {/* Menu Overlay */}
      {showMenu && (
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={toggleMenu}
        />
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
                <GooglePlacesAutocomplete
                  placeholder='Where to?'
                  onPress={(data, details = null) => {
                    if (details) {
                      handleDestinationSelect(details);
                    }
                  }}
                  query={{
                    key: 'AIzaSyCyy70YM-Wx42jda2YPcs6k3sYKPMRK6u4', // Real Google Maps API key
                    language: 'en',
                    components: 'country:ng', // Restrict to Nigeria
                  }}
                  fetchDetails={true}
                  styles={{
                    textInput: styles.googleSearchInput,
                    container: {
                      flex: 0,
                    },
                    listView: {
                      position: 'absolute',
                      top: 50,
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      borderRadius: 5,
                      flex: 1,
                      elevation: 3,
                      zIndex: 1000,
                    },
                  }}
                  enablePoweredByContainer={false}
                  debounce={300}
                  nearbyPlacesAPI="GooglePlacesSearch"
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

            {/* Local Search Results - shown when GooglePlacesAutocomplete has no internet connection */}
            {searchResults.length > 0 && (
              <View style={styles.searchSection}>
                <Text style={styles.searchSectionTitle}>Search Results</Text>
                {searchResults.map((place) => (
                  <TouchableOpacity
                    key={place.id}
                    style={styles.searchResultItem}
                    onPress={() => handleDestinationSelect(place)}
                  >
                    <View style={styles.searchResultIcon}>
                      <Text>📍</Text>
                    </View>
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultTitle}>{place.name}</Text>
                      <Text style={styles.searchResultSubtitle}>{place.address}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Recent Destinations */}
            <View style={styles.searchSection}>
              <Text style={styles.searchSectionTitle}>Recent</Text>
              {recentDestinations.map((place) => (
                <TouchableOpacity
                  key={place.id}
                  style={styles.searchResultItem}
                  onPress={() => handleDestinationSelect(place)}
                >
                  <View style={styles.searchResultIcon}>
                    <Text>{place.icon}</Text>
                  </View>
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultTitle}>{place.name}</Text>
                    <Text style={styles.searchResultSubtitle}>{place.address}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
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
  mapPlaceholder: {
    flex: 1,
  },
  mapGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContent: {
    alignItems: 'center',
  },
  mapIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  mapText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '500',
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
    zIndex: 100,
  },
  bottomSheetHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  destinationInfo: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  destinationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  destinationAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  bottomSheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    paddingHorizontal: 20,
    marginTop: 16,
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
  sideMenu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: width * 0.8,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  menuContent: {
    flex: 1,
  },
  menuHeader: {
    backgroundColor: '#000000',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  menuItems: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333333',
  },
  logoutButton: {
    margin: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    color: '#ff3333',
    fontWeight: '500',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  googleSearchInput: {
    height: 48,
    fontSize: 16,
    color: '#333333',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    backgroundColor: 'transparent',
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
