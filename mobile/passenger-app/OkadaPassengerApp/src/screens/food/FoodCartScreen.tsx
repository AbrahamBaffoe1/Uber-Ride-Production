import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import foodService from '../../api/services/foodService';

type FoodCartRouteProp = RouteProp<RootStackParamList, 'FoodCart'>;
type FoodCartNavigationProp = StackNavigationProp<RootStackParamList, 'FoodCart'>;

type Props = {
  route: FoodCartRouteProp;
  navigation: FoodCartNavigationProp;
};

// Extended cart item for UI purposes
type ExtendedCartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  selectedOptions?: Array<{
    name: string;
    choice: string;
    price: number;
  }>;
  totalPrice: number;
};

const DELIVERY_FEE = 500;
const TAX_RATE = 0.075; // 7.5%

const FoodCartScreen: React.FC<Props> = ({ route, navigation }) => {
  const [cartItems, setCartItems] = useState<ExtendedCartItem[]>([]);
  const [restaurantName, setRestaurantName] = useState('Restaurant');
  const [loading, setLoading] = useState(true);
  const restaurantId = route.params?.restaurantId;

  // Load cart items from API
  useEffect(() => {
    const fetchCartData = async () => {
      try {
        setLoading(true);
        // Get cart data from the API
        const cartData = await foodService.getCart();
        
        // Map API cart items to our extended format with image placeholder
        const extendedItems = cartData.cart.items.map(item => ({
          id: item.id,
          name: item.name || '',
          price: item.price || 0,
          image: 'https://via.placeholder.com/80', // Use placeholder since CartItem doesn't have image
          quantity: item.quantity || 1,
          selectedOptions: item.options?.map(opt => ({
            name: opt.name || '',
            choice: opt.choice || '',
            price: opt.price || 0
          })),
          totalPrice: item.totalPrice || 0
        }));
        
        setCartItems(extendedItems);
        
        // If restaurant ID is provided, get restaurant details
        if (restaurantId) {
          try {
            const restaurantData = await foodService.getRestaurant(restaurantId);
            setRestaurantName(restaurantData.restaurant.name);
          } catch (err) {
            console.error('Error fetching restaurant details:', err);
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching cart data:', error);
        setLoading(false);
        Alert.alert('Error', 'Failed to load cart data. Please try again.');
      }
    };
    
    fetchCartData();
  }, [restaurantId]);
  
  const handleUpdateQuantity = async (id: string, increment: boolean) => {
    const item = cartItems.find(item => item.id === id);
    if (!item) return;
    
    try {
      const newQuantity = increment ? item.quantity + 1 : Math.max(1, item.quantity - 1);
      
      setLoading(true);
      // Update cart item quantity via API
      const response = await foodService.updateCartItemQuantity(id, newQuantity);
      
      // Update local cart state with new data
      const updatedItems = response.cart.items.map(item => ({
        id: item.id,
        name: item.name || '',
        price: item.price || 0,
        image: 'https://via.placeholder.com/80', // Use placeholder since CartItem doesn't have image
        quantity: item.quantity || 1,
        selectedOptions: item.options?.map(opt => ({
          name: opt.name || '',
          choice: opt.choice || '',
          price: opt.price || 0
        })),
        totalPrice: item.totalPrice || 0
      }));
      
      setCartItems(updatedItems);
      setLoading(false);
    } catch (error) {
      console.error('Error updating quantity:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to update item quantity. Please try again.');
    }
  };

  const handleRemoveItem = (id: string) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              // Remove item from cart via API
              const response = await foodService.removeFromCart(id);
              
              // Update local cart state with new data
              const updatedItems = response.cart.items.map(item => ({
                id: item.id,
                name: item.name || '',
                price: item.price || 0,
                image: 'https://via.placeholder.com/80', // Use placeholder since CartItem doesn't have image
                quantity: item.quantity || 1,
                selectedOptions: item.options?.map(opt => ({
                  name: opt.name || '',
                  choice: opt.choice || '',
                  price: opt.price || 0
                })),
                totalPrice: item.totalPrice || 0
              }));
              
              setCartItems(updatedItems);
              setLoading(false);
            } catch (error) {
              console.error('Error removing item:', error);
              setLoading(false);
              Alert.alert('Error', 'Failed to remove item from cart. Please try again.');
            }
          },
        },
      ]
    );
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const itemOptionsTotal = (item.selectedOptions || []).reduce(
        (optTotal: number, opt) => optTotal + opt.price, 0
      );
      return total + (item.price + itemOptionsTotal) * item.quantity;
    }, 0);
  };

  const calculateTax = (subtotal: number) => {
    return subtotal * TAX_RATE;
  };

  const calculateTotal = (subtotal: number, tax: number) => {
    return subtotal + tax + DELIVERY_FEE;
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert('Cart Empty', 'Add items to your cart before checking out.');
      return;
    }
    navigation.navigate('FoodCheckout');
  };

  const renderEmptyCart = () => (
    <View style={styles.emptyCartContainer}>
      <Ionicons name="cart-outline" size={80} color="#ccc" />
      <Text style={styles.emptyCartText}>Your cart is empty</Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => navigation.navigate('RestaurantList')}
      >
        <Text style={styles.browseButtonText}>Browse Restaurants</Text>
      </TouchableOpacity>
    </View>
  );

  const subtotal = calculateSubtotal();
  const tax = calculateTax(subtotal);
  const total = calculateTotal(subtotal, tax);

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Cart</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading cart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Cart</Text>
        <View style={styles.placeholder} />
      </View>

      {cartItems.length === 0 ? (
        renderEmptyCart()
      ) : (
        <>
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>{restaurantName}</Text>
          </View>

          <ScrollView style={styles.cartItemsContainer}>
            {cartItems.map(item => (
              <View key={item.id} style={styles.cartItem}>
                <Image source={{ uri: item.image }} style={styles.itemImage} />
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.selectedOptions && item.selectedOptions.length > 0 && (
                    <View style={styles.itemOptions}>
                      {item.selectedOptions.map((option, index) => (
                        <Text key={index} style={styles.itemOption}>
                          {option.name}: {option.choice} (+₦{option.price})
                        </Text>
                      ))}
                    </View>
                  )}
                  <View style={styles.itemPriceRow}>
                    <Text style={styles.itemPrice}>
                      ₦{item.price}
                      {item.selectedOptions && item.selectedOptions.length > 0 && 
                        ` + ₦${item.selectedOptions.reduce((t: number, o) => t + o.price, 0)}`}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => handleRemoveItem(item.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.quantityControl}>
                  <TouchableOpacity
                    onPress={() => handleUpdateQuantity(item.id, false)}
                    style={styles.quantityButton}
                    disabled={item.quantity <= 1}
                  >
                    <Ionicons 
                      name="remove" 
                      size={18} 
                      color={item.quantity <= 1 ? '#ccc' : '#000'} 
                    />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <TouchableOpacity
                    onPress={() => handleUpdateQuantity(item.id, true)}
                    style={styles.quantityButton}
                  >
                    <Ionicons name="add" size={18} color="#000" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₦{subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>₦{tax.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>₦{DELIVERY_FEE.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₦{total.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  restaurantInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '600',
  },
  cartItemsContainer: {
    flex: 1,
  },
  cartItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemOptions: {
    marginBottom: 4,
  },
  itemOption: {
    fontSize: 12,
    color: '#666',
  },
  itemPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    marginTop: 'auto',
  },
  quantityButton: {
    width: 28,
    height: 28,
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    marginHorizontal: 8,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  summaryContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkoutButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyCartText: {
    fontSize: 18,
    color: '#666',
    marginVertical: 16,
  },
  browseButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FoodCartScreen;
