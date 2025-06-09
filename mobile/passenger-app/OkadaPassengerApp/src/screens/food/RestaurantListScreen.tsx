import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Platform,
  StatusBar,
  RefreshControl,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { RootStackParamList, RestaurantData } from '../../navigation/types';
import foodService from '../../api/services/foodService';

type RestaurantListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RestaurantList'>;
type RestaurantListScreenRouteProp = RouteProp<RootStackParamList, 'RestaurantList'>;

const RestaurantListScreen: React.FC = () => {
  const navigation = useNavigation<RestaurantListScreenNavigationProp>();
  const route = useRoute<RestaurantListScreenRouteProp>();
  
  const initialCuisine = route.params?.cuisine;
  const initialSearchQuery = route.params?.searchQuery;
  
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<RestaurantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [selectedCuisine, setSelectedCuisine] = useState<string | undefined>(initialCuisine);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationName, setLocationName] = useState('Current Location');
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch user location
  const fetchUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoadError('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Get location name
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode.length > 0) {
        const address = geocode[0];
        const name = address.street 
          ? `${address.street}, ${address.city || ''}`
          : 'Current Location';
        setLocationName(name);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setLoadError('Failed to get your location. Please try again.');
    }
  };

  // Fetch restaurants
  const fetchRestaurants = async () => {
    if (!userLocation) {
      setLoadError('Unable to determine your location');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setLoadError(null);
    
    try {
      // Real API call with GraphQL using our foodService
      const restaurantsData = await foodService.getRestaurants(
        userLocation.latitude,
        userLocation.longitude,
        selectedCuisine
      );
      
      setRestaurants(restaurantsData);
      
      // Apply search filter if search query exists
      if (searchQuery) {
        filterRestaurants(restaurantsData, searchQuery);
      } else {
        setFilteredRestaurants(restaurantsData);
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      setLoadError('Failed to load restaurants. Please try again.');
      setRestaurants([]);
      setFilteredRestaurants([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter restaurants based on search query
  const filterRestaurants = (restaurantsToFilter: RestaurantData[], query: string) => {
    if (!query.trim()) {
      setFilteredRestaurants(restaurantsToFilter);
      return;
    }

    const lowerCaseQuery = query.toLowerCase().trim();
    const filtered = restaurantsToFilter.filter(
      restaurant => 
        restaurant.name.toLowerCase().includes(lowerCaseQuery) ||
        restaurant.cuisineType.toLowerCase().includes(lowerCaseQuery)
    );
    
    setFilteredRestaurants(filtered);
  };

  // Initial data load
  useEffect(() => {
    fetchUserLocation();
  }, []);

  // Fetch restaurants when location is available
  useEffect(() => {
    if (userLocation) {
      fetchRestaurants();
    }
  }, [userLocation, selectedCuisine]);

  // Handle search query changes
  useEffect(() => {
    if (restaurants.length > 0) {
      filterRestaurants(restaurants, searchQuery);
    }
  }, [searchQuery]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (userLocation) {
        fetchRestaurants();
      }
    }, [userLocation, selectedCuisine])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRestaurants();
  };

  const handleRestaurantPress = (restaurant: RestaurantData) => {
    navigation.navigate('RestaurantDetail', { restaurant });
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setFilteredRestaurants(restaurants);
  };

  // Cuisine filter
  const availableCuisines = Array.from(
    new Set(restaurants.map(restaurant => restaurant.cuisineType))
  ).sort();

  const renderCuisineFilter = () => (
    <View style={styles.cuisineFilterContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cuisineFilterContent}
      >
        <TouchableOpacity
          style={[
            styles.cuisineFilterItem,
            selectedCuisine === undefined && styles.selectedCuisineItem
          ]}
          onPress={() => setSelectedCuisine(undefined)}
        >
          <Text style={[
            styles.cuisineFilterText,
            selectedCuisine === undefined && styles.selectedCuisineText
          ]}>
            All
          </Text>
        </TouchableOpacity>
        
        {availableCuisines.map(cuisine => (
          <TouchableOpacity
            key={cuisine}
            style={[
              styles.cuisineFilterItem,
              selectedCuisine === cuisine && styles.selectedCuisineItem
            ]}
            onPress={() => setSelectedCuisine(cuisine)}
          >
            <Text style={[
              styles.cuisineFilterText,
              selectedCuisine === cuisine && styles.selectedCuisineText
            ]}>
              {cuisine}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderRestaurantItem = ({ item }: { item: RestaurantData }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => handleRestaurantPress(item)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.image || 'https://via.placeholder.com/100' }}
        style={styles.restaurantImage}
        resizeMode="cover"
      />
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.restaurantDetails}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFC107" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
          <View style={styles.dotSeparator} />
          <Text style={styles.cuisineText}>{item.cuisineType}</Text>
        </View>
        <View style={styles.restaurantFooter}>
          <View style={styles.deliveryInfo}>
            <Ionicons name="time-outline" size={14} color="#555" />
            <Text style={styles.deliveryTimeText}>{item.deliveryTime}</Text>
          </View>
          <View style={styles.deliveryInfo}>
            <Ionicons name="bicycle-outline" size={14} color="#555" />
            <Text style={styles.deliveryFeeText}>{item.deliveryFee}</Text>
          </View>
          <View style={styles.distanceInfo}>
            <Ionicons name="location-outline" size={14} color="#555" />
            <Text style={styles.distanceText}>
              {item.distance || '2.1 km'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedCuisine ? `${selectedCuisine} Restaurants` : 'All Restaurants'}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search restaurants or cuisine types"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Cuisine filter */}
      {!loading && restaurants.length > 0 && renderCuisineFilter()}

      {/* Restaurant list */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading restaurants...</Text>
        </View>
      ) : loadError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#F44336" />
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              fetchUserLocation();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredRestaurants.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={60} color="#CCC" />
          <Text style={styles.emptyText}>
            {searchQuery
              ? `No restaurants found for "${searchQuery}"`
              : 'No restaurants available in this area'}
          </Text>
          {searchQuery && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={handleClearSearch}
            >
              <Text style={styles.clearSearchText}>Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredRestaurants}
          renderItem={renderRestaurantItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

import { ScrollView } from 'react-native-gesture-handler';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F3F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 0,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  clearSearchButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  clearSearchText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  cuisineFilterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  cuisineFilterContent: {
    paddingHorizontal: 16,
  },
  cuisineFilterItem: {
    backgroundColor: '#F2F3F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedCuisineItem: {
    backgroundColor: '#8B5CF6',
  },
  cuisineFilterText: {
    fontSize: 14,
    color: '#555',
  },
  selectedCuisineText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  restaurantCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  restaurantImage: {
    width: 100,
    height: 100,
  },
  restaurantInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  restaurantDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 2,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#999',
    marginHorizontal: 6,
  },
  cuisineText: {
    fontSize: 13,
    color: '#555',
  },
  restaurantFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryTimeText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 4,
  },
  deliveryFeeText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 4,
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 4,
  },
});

export default RestaurantListScreen;
