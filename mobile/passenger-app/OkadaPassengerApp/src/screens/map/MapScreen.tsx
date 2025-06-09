import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Keyboard,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { googleMapsService, PlacePrediction, DirectionsResult } from '../../services/googleMapsService';
import { debounce } from 'lodash';

// Default Lagos coordinates
const DEFAULT_LATITUDE = 6.5244;
const DEFAULT_LONGITUDE = 3.3792;

interface Props {
  navigation: StackNavigationProp<RootStackParamList, 'Map'>;
  route: RouteProp<RootStackParamList, 'Map'>;
}

const MapScreen: React.FC<Props> = ({ navigation, route }) => {
  // Refs
  const mapRef = useRef<MapView | null>(null);
  const searchInputRef = useRef<TextInput | null>(null);
  
  // State variables
  const [region, setRegion] = useState({
    latitude: DEFAULT_LATITUDE,
    longitude: DEFAULT_LONGITUDE,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  });
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlacePrediction[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<{
    coordinates: { latitude: number; longitude: number };
    address: string;
    placeId?: string;
  } | null>(null);
  const [destination, setDestination] = useState<{
    coordinates: { latitude: number; longitude: number };
    address: string;
    placeId?: string;
  } | null>(null);
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Get initial location from props or use default
  useEffect(() => {
    const initialLocation = route.params?.initialLocation;
    if (initialLocation) {
      setRegion({
        ...region,
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
      });
    }
    
    const initialDestination = route.params?.destination;
    if (initialDestination) {
      setDestination({
        coordinates: {
          latitude: initialDestination.latitude,
          longitude: initialDestination.longitude,
        },
        address: initialDestination.address,
        placeId: initialDestination.placeId,
      });
    }
  }, [route.params]);

  // Get user's current location
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          console.log('Location permission denied');
          return;
        }
        
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        setUserLocation(location);
        
        // Only update region if no initial location was provided
        if (!route.params?.initialLocation) {
          setRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          });
        }
        
        // If a destination is set, get directions
        if (destination) {
          getDirections(
            { latitude: location.coords.latitude, longitude: location.coords.longitude },
            destination.coordinates
          );
        }
      } catch (error) {
        console.error('Error getting user location:', error);
      }
    };
    
    getUserLocation();
  }, [destination]);

  // Calculate route when both origin and destination are set
  useEffect(() => {
    if (userLocation && destination) {
      getDirections(
        { latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude },
        destination.coordinates
      );
    }
  }, [userLocation, destination]);

  // Debounced search function to prevent API rate limiting
  const debouncedSearch = useRef(
    debounce(async (query: string) => {
      if (!query || query.length < 3) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      
      setIsSearching(true);
      
      try {
        // Use current location for biasing results if available
        const locationBias = userLocation ? {
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude
        } : undefined;
        
        const results = await googleMapsService.searchPlaces(query, locationBias);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching places:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500)
  ).current;

  // Handle search input changes
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  // Get directions between two points
  const getDirections = async (origin: { latitude: number; longitude: number }, dest: { latitude: number; longitude: number }) => {
    if (!origin || !dest) return;
    
    setIsLoadingRoute(true);
    
    try {
      const result = await googleMapsService.getDirections(
        origin,
        dest,
        'driving'
      );
      
      if (result) {
        setDirections(result);
        
        // Fit map to show the entire route
        if (mapRef.current && mapReady) {
          mapRef.current.fitToCoordinates(
            [
              { latitude: origin.latitude, longitude: origin.longitude },
              { latitude: dest.latitude, longitude: dest.longitude }
            ],
            {
              edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
              animated: true
            }
          );
        }
      }
    } catch (error) {
      console.error('Error getting directions:', error);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Select a place from search results
  const handleSelectPlace = async (place: PlacePrediction) => {
    Keyboard.dismiss();
    setSearchQuery(place.description);
    setSearchResults([]);
    
    try {
      // Get place details including coordinates
      const details = await googleMapsService.getPlaceDetails(place.placeId);
      
      if (details) {
      const selectedLocation = {
        address: details.formattedAddress,
        coordinates: details.coordinates,
        placeId: details.placeId
      };
        
        setSelectedPlace(selectedLocation);
        setDestination(selectedLocation);
        
        // Update map region
        setRegion({
          latitude: details.coordinates.latitude,
          longitude: details.coordinates.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
      }
    } catch (error) {
      console.error('Error getting place details:', error);
    }
  };

  // Clear search and reset map
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPlace(null);
    setDestination(null);
    setDirections(null);
    
    // Reset map to user location
    if (userLocation) {
      setRegion({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      });
      
      if (mapRef.current && mapReady) {
        mapRef.current.animateToRegion({
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
      }
    }
  };

  // Center map on user's current location
  const centerOnUserLocation = () => {
    if (!userLocation) return;
    
    if (mapRef.current && mapReady) {
      mapRef.current.animateToRegion({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      });
    }
  };

  // Confirm selected destination and navigate back
  const confirmDestination = () => {
    if (!destination) return;
    
    if (route.params?.onSelectLocation && destination) {
      route.params.onSelectLocation({
        coordinates: {
          latitude: destination.coordinates.latitude,
          longitude: destination.coordinates.longitude
        },
        address: destination.address,
        placeId: destination.placeId
      });
    }
    
    navigation.goBack();
  };

  // Proceed to booking with selected destination
  const proceedToBooking = () => {
    if (!destination) return;
    
    navigation.navigate('Booking', {
      destination: {
        coordinates: {
          latitude: destination.coordinates.latitude,
          longitude: destination.coordinates.longitude
        },
        address: destination.address,
        placeId: destination.placeId
      }
    });
  };

  // Render search result item
  const renderSearchResultItem = ({ item }: { item: PlacePrediction }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => handleSelectPlace(item)}
    >
      <View style={styles.searchResultIconContainer}>
        <Ionicons name="location-outline" size={24} color="#0066cc" />
      </View>
      <View style={styles.searchResultTextContainer}>
        <Text style={styles.searchResultMainText} numberOfLines={1}>
          {item.mainText}
        </Text>
        <Text style={styles.searchResultSecondaryText} numberOfLines={1}>
          {item.secondaryText}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Get polyline coordinates from directions
  const getPolylineCoordinates = () => {
    if (!directions || !directions.steps || directions.steps.length === 0) {
      return [];
    }
    
    // Simple polyline for testing - in a real app you would decode the polyline
    const startCoords = { 
      latitude: userLocation?.coords.latitude || DEFAULT_LATITUDE,
      longitude: userLocation?.coords.longitude || DEFAULT_LONGITUDE
    };
    
    const endCoords = {
      latitude: destination?.coordinates.latitude || DEFAULT_LATITUDE,
      longitude: destination?.coordinates.longitude || DEFAULT_LONGITUDE
    };
    
    return [startCoords, endCoords];
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={true}
        onMapReady={() => setMapReady(true)}
        onRegionChangeComplete={setRegion}
      >
        {/* Origin Marker (User Location) */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.coords.latitude,
              longitude: userLocation.coords.longitude,
            }}
            title="Your Location"
            pinColor="#0066cc"
          />
        )}
        
        {/* Destination Marker */}
        {destination && (
          <Marker
            coordinate={{
              latitude: destination.coordinates.latitude,
              longitude: destination.coordinates.longitude,
            }}
            title={destination.address}
            description="Destination"
            pinColor="#ff3b30"
          />
        )}
        
        {/* Route Polyline */}
        {directions && (
          <Polyline
            coordinates={getPolylineCoordinates()}
            strokeWidth={4}
            strokeColor="#0066cc"
          />
        )}
      </MapView>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBarContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search for a destination"
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearSearch}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Search Results */}
        {(searchResults.length > 0 || isSearching) && (
          <View style={styles.searchResultsContainer}>
            {isSearching ? (
              <ActivityIndicator style={styles.loadingIndicator} color="#0066cc" />
            ) : (
              <FlatList
                data={searchResults}
                renderItem={renderSearchResultItem}
                keyExtractor={(item) => item.id}
                style={styles.searchResultsList}
                keyboardShouldPersistTaps="handled"
              />
            )}
          </View>
        )}
      </View>
      
      {/* Map Controls */}
      <View style={styles.mapControlsContainer}>
        <TouchableOpacity
          style={styles.mapControlButton}
          onPress={centerOnUserLocation}
        >
          <Ionicons name="locate" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      {/* Bottom Action Bar */}
      {destination && !searchResults.length && (
        <View style={styles.bottomActionBar}>
          <View style={styles.destinationInfoContainer}>
            <Text style={styles.destinationLabel}>Destination</Text>
            <Text style={styles.destinationAddress} numberOfLines={1}>
              {destination.address}
            </Text>
            {directions && (
              <View style={styles.tripDetailsContainer}>
                <View style={styles.tripDetailItem}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.tripDetailText}>
                    {directions.duration.text}
                  </Text>
                </View>
                <View style={styles.tripDetailItem}>
                  <Ionicons name="navigate-outline" size={16} color="#666" />
                  <Text style={styles.tripDetailText}>
                    {directions.distance.text}
                  </Text>
                </View>
              </View>
            )}
          </View>
          
          {isLoadingRoute ? (
            <ActivityIndicator color="#0066cc" />
          ) : (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={route.params?.onSelectLocation ? confirmDestination : proceedToBooking}
            >
              <Text style={styles.confirmButtonText}>
                {route.params?.onSelectLocation ? 'Confirm Location' : 'Continue to Booking'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  backButton: {
    marginRight: 10,
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  searchResultsContainer: {
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    maxHeight: 300,
  },
  loadingIndicator: {
    padding: 20,
  },
  searchResultsList: {
    padding: 10,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchResultIconContainer: {
    marginRight: 10,
  },
  searchResultTextContainer: {
    flex: 1,
  },
  searchResultMainText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  searchResultSecondaryText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  mapControlsContainer: {
    position: 'absolute',
    bottom: 120,
    right: 15,
  },
  mapControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 10,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  destinationInfoContainer: {
    marginBottom: 15,
  },
  destinationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  destinationAddress: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  tripDetailsContainer: {
    flexDirection: 'row',
  },
  tripDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  tripDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  confirmButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MapScreen;
