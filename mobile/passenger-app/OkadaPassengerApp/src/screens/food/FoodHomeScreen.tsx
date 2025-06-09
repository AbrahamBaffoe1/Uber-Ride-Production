import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  FlatList,
  Dimensions,
  TextInput,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import foodService from '../../api/services/foodService';
import * as Location from 'expo-location';

type FoodScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Food'>;

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.7;
const CUISINE_CARD_WIDTH = width * 0.28;

interface CuisineType {
  id: string;
  name: string;
  image: string;
}

const FoodHomeScreen: React.FC = () => {
  const navigation = useNavigation<FoodScreenNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cuisineTypes, setCuisineTypes] = useState<CuisineType[]>([]);
  const [featuredRestaurants, setFeaturedRestaurants] = useState<any[]>([]);
  const [nearbyRestaurants, setNearbyRestaurants] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationName, setLocationName] = useState('Current Location');

  const fetchUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
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
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch user location if not available
      if (!userLocation) {
        await fetchUserLocation();
      }

      // Fetch cuisine types
      const cuisines = await foodService.getCuisineTypes();
      setCuisineTypes(cuisines);

      // Only fetch restaurants if we have user location
      if (userLocation) {
        // Fetch featured restaurants (no cuisine filter)
        const featured = await foodService.getRestaurants(
          userLocation.latitude,
          userLocation.longitude
        );
        
        // Sort by rating to get featured restaurants
        const sortedFeatured = [...featured].sort((a, b) => b.rating - a.rating).slice(0, 10);
        setFeaturedRestaurants(sortedFeatured);
        
        // Get nearby restaurants (all within radius)
        setNearbyRestaurants(featured);
      }
    } catch (error) {
      console.error('Error loading food data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchUserLocation();
  }, []);

  // Effect to load data when location is available
  useEffect(() => {
    if (userLocation) {
      loadData();
    }
  }, [userLocation]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (userLocation) {
        loadData();
      }
    }, [userLocation])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleRestaurantPress = (restaurant: any) => {
    navigation.navigate('RestaurantDetail', { restaurant });
  };

  const handleCuisinePress = (cuisine: CuisineType) => {
    navigation.navigate('RestaurantList', { cuisine: cuisine.name });
  };

  const handleViewAllPress = (type: 'nearby' | 'featured') => {
    navigation.navigate('RestaurantList', {});
  };

  const handleSearchPress = () => {
    // Navigate to search screen or filter current results
    if (searchQuery.trim()) {
      navigation.navigate('RestaurantList', { searchQuery });
    }
  };

  const renderRestaurantCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => handleRestaurantPress(item)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.image || 'https://via.placeholder.com/150' }}
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
        <View style={styles.deliveryInfo}>
          <Text style={styles.deliveryTimeText}>{item.deliveryTime}</Text>
          <View style={styles.dotSeparator} />
          <Text style={styles.deliveryFeeText}>{item.deliveryFee}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCuisineCard = ({ item }: { item: CuisineType }) => (
    <TouchableOpacity
      style={styles.cuisineCard}
      onPress={() => handleCuisinePress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.cuisineImageContainer}>
        <Image
          source={{ uri: item.image || 'https://via.placeholder.com/100' }}
          style={styles.cuisineImage}
          resizeMode="cover"
        />
      </View>
      <Text style={styles.cuisineName} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading restaurants...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.locationContainer}>
          <Ionicons name="location" size={20} color="#8B5CF6" />
          <Text style={styles.locationText} numberOfLines={1}>
            {locationName}
          </Text>
          <TouchableOpacity onPress={fetchUserLocation}>
            <Ionicons name="chevron-down" size={20} color="#555" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for restaurants or dishes"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchPress}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Cuisine Categories */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Food Categories</Text>
          <FlatList
            data={cuisineTypes}
            renderItem={renderCuisineCard}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cuisineList}
          />
        </View>
        
        {/* Featured Restaurants */}
        {featuredRestaurants.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Restaurants</Text>
              <TouchableOpacity onPress={() => handleViewAllPress('featured')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={featuredRestaurants}
              renderItem={renderRestaurantCard}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.restaurantList}
              snapToInterval={CARD_WIDTH + 15}
              decelerationRate="fast"
            />
          </View>
        )}
        
        {/* Nearby Restaurants */}
        {nearbyRestaurants.length > 0 ? (
          <View style={[styles.sectionContainer, { paddingBottom: 20 }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Restaurants Near You</Text>
              <TouchableOpacity onPress={() => handleViewAllPress('nearby')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {nearbyRestaurants.slice(0, 5).map((restaurant) => (
              <TouchableOpacity
                key={restaurant.id}
                style={styles.nearbyRestaurantCard}
                onPress={() => handleRestaurantPress(restaurant)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: restaurant.image || 'https://via.placeholder.com/100' }}
                  style={styles.nearbyRestaurantImage}
                  resizeMode="cover"
                />
                <View style={styles.nearbyRestaurantInfo}>
                  <Text style={styles.nearbyRestaurantName} numberOfLines={1}>
                    {restaurant.name}
                  </Text>
                  <View style={styles.nearbyRestaurantDetails}>
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={14} color="#FFC107" />
                      <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
                    </View>
                    <View style={styles.dotSeparator} />
                    <Text style={styles.cuisineText}>{restaurant.cuisineType}</Text>
                  </View>
                  <View style={styles.nearbyRestaurantFooter}>
                    <View style={styles.deliveryInfo}>
                      <Ionicons name="time-outline" size={14} color="#555" />
                      <Text style={styles.deliveryTimeText}>{restaurant.deliveryTime}</Text>
                    </View>
                    <View style={styles.deliveryInfo}>
                      <Ionicons name="bicycle-outline" size={14} color="#555" />
                      <Text style={styles.deliveryFeeText}>{restaurant.deliveryFee}</Text>
                    </View>
                    <View style={styles.distanceInfo}>
                      <Ionicons name="location-outline" size={14} color="#555" />
                      <Text style={styles.distanceText}>
                        {restaurant.distance || '2.1 km'}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="restaurant-outline" size={60} color="#ccc" />
            <Text style={styles.emptyStateText}>No restaurants found nearby</Text>
            <Text style={styles.emptyStateSubtext}>
              Please try a different location or check back later
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginHorizontal: 5,
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
  sectionContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  cuisineList: {
    paddingVertical: 12,
  },
  cuisineCard: {
    width: CUISINE_CARD_WIDTH,
    marginRight: 10,
    alignItems: 'center',
  },
  cuisineImageContainer: {
    width: CUISINE_CARD_WIDTH - 20,
    height: CUISINE_CARD_WIDTH - 20,
    borderRadius: (CUISINE_CARD_WIDTH - 20) / 2,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  cuisineImage: {
    width: '100%',
    height: '100%',
  },
  cuisineName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  restaurantList: {
    paddingVertical: 8,
  },
  restaurantCard: {
    width: CARD_WIDTH,
    marginRight: 15,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  restaurantImage: {
    width: '100%',
    height: 160,
  },
  restaurantInfo: {
    padding: 12,
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
    marginBottom: 6,
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
  nearbyRestaurantCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  nearbyRestaurantImage: {
    width: 100,
    height: 100,
  },
  nearbyRestaurantInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  nearbyRestaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  nearbyRestaurantDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  nearbyRestaurantFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 20,
  },
});

export default FoodHomeScreen;
