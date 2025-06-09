import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import foodService, { FoodItem, Restaurant } from '../../api/services/foodService';
import { useIsFocused } from '@react-navigation/native';

// Define props type
type RestaurantDetailRouteProp = RouteProp<RootStackParamList, 'RestaurantDetail'>;
type RestaurantDetailNavigationProp = StackNavigationProp<RootStackParamList, 'RestaurantDetail'>;

type Props = {
  route: RestaurantDetailRouteProp;
  navigation: RestaurantDetailNavigationProp;
};

type ExtendedFoodItem = FoodItem & {
  itemCategory?: string;
};

const RestaurantDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { restaurant: routeRestaurant } = route.params;
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Popular');
  const [categories, setCategories] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<ExtendedFoodItem[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const isFocused = useIsFocused();

  // Fetch restaurant details and cart info
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get restaurant details including menu
        const restaurantData = await foodService.getRestaurant(routeRestaurant.id);
        setRestaurant(restaurantData.restaurant);
        
        // Extract menu items from all categories
        const allItems: ExtendedFoodItem[] = [];
        const categoryNames = new Set<string>();
        categoryNames.add('Popular'); // Always include Popular category
        
        restaurantData.restaurant.menu.categories.forEach(category => {
          categoryNames.add(category.name);
          
          category.items.forEach(item => {
            // Add each item with its category
            allItems.push({
              ...item,
              itemCategory: category.name
            });
          });
        });
        
        setMenuItems(allItems);
        setCategories(Array.from(categoryNames));
        
        // Get cart to update cart count
        const cartData = await foodService.getCart();
        setCartCount(cartData.cart.items.length);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching restaurant data:', error);
        setLoading(false);
        Alert.alert('Error', 'Failed to load restaurant information. Please try again.');
      }
    };
    
    if (isFocused) {
      fetchData();
    }
  }, [routeRestaurant.id, isFocused]);

  const filteredItems = menuItems.filter(
    item => selectedCategory === 'Popular' ? item.isPopular : 
      item.itemCategory === selectedCategory
  );

  const handleAddToCart = async (item: ExtendedFoodItem) => {
    try {
      setAddingToCart(item._id);
      
      // Call API to add item to cart
      const response = await foodService.addToCart({
        restaurantId: restaurant?._id || '',
        foodItemId: item._id,
        quantity: 1,
      });
      
      // Update cart count
      setCartCount(response.cart.items.length);
      setAddingToCart(null);
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      setAddingToCart(null);
      Alert.alert('Error', 'Failed to add item to cart. Please try again.');
    }
  };

  const navigateToCart = () => {
    if (restaurant) {
      navigation.navigate('FoodCart', { restaurantId: restaurant._id });
    }
  };

  const navigateToFoodItemDetail = (foodItem: ExtendedFoodItem) => {
    if (restaurant) {
      // Add the missing properties to match the expected FoodItem type in navigation
      const enhancedFoodItem = {
        ...foodItem,
        id: foodItem._id,
        category: foodItem.itemCategory || selectedCategory,
      };
      
      navigation.navigate('FoodItemDetail', { 
        foodItem: enhancedFoodItem as any, 
        restaurantId: restaurant._id 
      });
    }
  };

  // Handle loading state
  if (loading || !restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading restaurant details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>
      <TouchableOpacity onPress={navigateToCart} style={styles.cartButton}>
        <Ionicons name="cart-outline" size={24} color="#000" />
        {cartCount > 0 && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cartCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderRestaurantInfo = () => (
    <View style={styles.restaurantContainer}>
      <Image 
        source={{ uri: restaurant.image }} 
        style={styles.restaurantImage} 
        resizeMode="cover"
      />
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        <View style={styles.infoRow}>
          <Ionicons name="star" size={16} color="#FFC107" />
          <Text style={styles.ratingText}>{restaurant.rating} • </Text>
          <Text style={styles.cuisineText}>{restaurant.cuisineType}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.deliveryText}>{restaurant.deliveryTime} • </Text>
          <Text style={styles.deliveryFeeText}>₦{restaurant.deliveryFee} delivery fee</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.addressText} numberOfLines={1}>
            {restaurant.address}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderCategories = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.categoriesContainer}
      contentContainerStyle={styles.categoriesContentContainer}
    >
      {categories.map(category => (
        <TouchableOpacity
          key={category}
          style={[
            styles.categoryButton,
            selectedCategory === category && styles.selectedCategoryButton
          ]}
          onPress={() => setSelectedCategory(category)}
        >
          <Text 
            style={[
              styles.categoryText,
              selectedCategory === category && styles.selectedCategoryText
            ]}
          >
            {category}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderMenuItem = ({ item }: { item: ExtendedFoodItem }) => (
    <TouchableOpacity 
      style={styles.menuItem}
      onPress={() => navigateToFoodItemDetail(item)}
    >
      <View style={styles.menuItemInfo}>
        <Text style={styles.menuItemName}>{item.name}</Text>
        <Text style={styles.menuItemDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.menuItemPriceRow}>
          <Text style={styles.menuItemPrice}>₦{item.price}</Text>
          {addingToCart === item._id ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => handleAddToCart(item)}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Image 
        source={{ uri: item.image }} 
        style={styles.menuItemImage} 
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {renderHeader()}
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderRestaurantInfo()}
        {renderCategories()}
        <View style={styles.menuContainer}>
          <Text style={styles.menuSectionTitle}>{selectedCategory}</Text>
          {filteredItems.length === 0 ? (
            <Text style={styles.noItemsText}>No items found in this category</Text>
          ) : (
            filteredItems.map(item => renderMenuItem({ item }))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  cartButton: {
    padding: 8,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  restaurantContainer: {
    marginBottom: 16,
  },
  restaurantImage: {
    width: '100%',
    height: 200,
  },
  restaurantInfo: {
    padding: 16,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    marginLeft: 4,
  },
  cuisineText: {
    fontSize: 14,
  },
  deliveryText: {
    fontSize: 14,
    marginLeft: 4,
  },
  deliveryFeeText: {
    fontSize: 14,
  },
  addressText: {
    fontSize: 14,
    marginLeft: 4,
    color: '#666',
    flex: 1,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesContentContainer: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  selectedCategoryButton: {
    backgroundColor: '#8B5CF6',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  selectedCategoryText: {
    color: '#fff',
  },
  menuContainer: {
    padding: 16,
  },
  menuSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    paddingBottom: 16,
  },
  menuItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  menuItemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  addButton: {
    backgroundColor: '#8B5CF6',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noItemsText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
  },
});

export default RestaurantDetailScreen;
