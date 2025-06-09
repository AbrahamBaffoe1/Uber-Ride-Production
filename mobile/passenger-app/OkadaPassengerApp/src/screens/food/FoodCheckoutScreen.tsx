import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
import { Cart } from '../../api/services/foodService';

type FoodCheckoutRouteProp = RouteProp<RootStackParamList, 'FoodCheckout'>;
type FoodCheckoutNavigationProp = StackNavigationProp<RootStackParamList, 'FoodCheckout'>;

type Props = {
  route: FoodCheckoutRouteProp;
  navigation: FoodCheckoutNavigationProp;
};

// Payment method interface
interface PaymentMethod {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// Address interface
interface DeliveryAddress {
  id: string;
  title: string;
  address: string;
  isPrimary: boolean;
}

// Default payment methods
const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'cash', label: 'Cash on Delivery', icon: 'cash-outline' },
  { id: 'card', label: 'Credit/Debit Card', icon: 'card-outline' },
  { id: 'bank', label: 'Bank Transfer', icon: 'wallet-outline' },
];

// Default delivery addresses - would normally come from user profile API
const DELIVERY_ADDRESSES: DeliveryAddress[] = [
  {
    id: '1',
    title: 'Home',
    address: '123 Main Street, Lagos',
    isPrimary: true,
  },
  {
    id: '2',
    title: 'Work',
    address: '456 Business Avenue, Lagos',
    isPrimary: false,
  },
];

const FoodCheckoutScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
  const [selectedAddress, setSelectedAddress] = useState(DELIVERY_ADDRESSES[0]);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Cart | null>(null);

  // Tax rate constant
  const TAX_RATE = 0.075; // 7.5% tax
  
  // Delivery fee constant
  const DELIVERY_FEE = 500;

  // Calculate totals
  const subtotal = cart?.subtotal || 0;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + DELIVERY_FEE + tax - discount;

  // Load cart data
  useEffect(() => {
    const fetchCart = async () => {
      try {
        setLoading(true);
        const cartData = await foodService.getCart();
        setCart(cartData.cart);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching cart:', error);
        Alert.alert('Error', 'Failed to load cart data. Please try again.');
        setLoading(false);
      }
    };

    fetchCart();
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      Alert.alert('Error', 'Please enter a coupon code');
      return;
    }

    setIsApplyingCoupon(true);

    try {
      // In a real implementation, this would call an API endpoint
      // For now, we'll simulate it with a timeout and some basic logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (couponCode.toUpperCase() === 'OKADA25') {
        setDiscount(subtotal * 0.25); // 25% discount
        setCouponApplied(true);
        Alert.alert('Success', 'Coupon applied successfully!');
      } else {
        Alert.alert('Error', 'Invalid coupon code');
        setCouponCode('');
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      Alert.alert('Error', 'Failed to apply coupon. Please try again.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!cart || !cart.restaurantId) {
      Alert.alert('Error', 'Cannot place order with empty cart');
      return;
    }

    setIsPlacingOrder(true);

    try {
      // Call the API to place the order
      const response = await foodService.placeOrder({
        restaurantId: cart.restaurantId,
        deliveryAddress: selectedAddress.address,
        paymentMethodId: selectedPaymentMethod,
        specialInstructions: deliveryInstructions,
      });
      
      // Navigate to order tracking screen with the new order ID
      navigation.navigate('FoodOrderTracking', { orderId: response.order.id });
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Checkout</Text>
      <View style={styles.placeholder} />
    </View>
  );

  const renderDeliveryAddress = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Delivery Address</Text>
      
      {DELIVERY_ADDRESSES.map((address) => (
        <TouchableOpacity
          key={address.id}
          style={[
            styles.addressItem,
            selectedAddress.id === address.id && styles.selectedAddressItem,
          ]}
          onPress={() => setSelectedAddress(address)}
        >
          <View style={styles.addressInfo}>
            <View style={styles.addressTitleRow}>
              <Text style={styles.addressTitle}>{address.title}</Text>
              {address.isPrimary && (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>Primary</Text>
                </View>
              )}
            </View>
            <Text style={styles.addressText}>{address.address}</Text>
          </View>
          <View style={styles.radioButton}>
            {selectedAddress.id === address.id && (
              <View style={styles.radioButtonInner} />
            )}
          </View>
        </TouchableOpacity>
      ))}
      
      <TouchableOpacity style={styles.addButton}>
        <Ionicons name="add-circle-outline" size={20} color="#8B5CF6" />
        <Text style={styles.addButtonText}>Add New Address</Text>
      </TouchableOpacity>
      
      <Text style={styles.sectionSubtitle}>Delivery Instructions</Text>
      <TextInput
        style={styles.textInput}
        placeholder="E.g., Ring the doorbell, call when arriving, etc."
        value={deliveryInstructions}
        onChangeText={setDeliveryInstructions}
        multiline
        numberOfLines={2}
        textAlignVertical="top"
      />
    </View>
  );

  const renderPaymentMethods = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payment Method</Text>
      
      {PAYMENT_METHODS.map((method) => (
        <TouchableOpacity
          key={method.id}
          style={[
            styles.paymentMethodItem,
            selectedPaymentMethod === method.id && styles.selectedPaymentMethodItem,
          ]}
          onPress={() => setSelectedPaymentMethod(method.id)}
        >
          <View style={styles.paymentMethodIcon}>
            <Ionicons name={method.icon} size={24} color="#8B5CF6" />
          </View>
          <Text style={styles.paymentMethodLabel}>{method.label}</Text>
          <View style={styles.radioButton}>
            {selectedPaymentMethod === method.id && (
              <View style={styles.radioButtonInner} />
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCouponSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Promo Code</Text>
      
      {couponApplied ? (
        <View style={styles.appliedCouponContainer}>
          <View style={styles.appliedCoupon}>
            <Text style={styles.appliedCouponText}>{couponCode.toUpperCase()}</Text>
            <Text style={styles.discountText}>-₦{discount.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setCouponApplied(false);
              setCouponCode('');
              setDiscount(0);
            }}
            style={styles.removeCouponButton}
          >
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.couponInputContainer}>
          <TextInput
            style={styles.couponInput}
            placeholder="Enter promo code"
            value={couponCode}
            onChangeText={setCouponCode}
            autoCapitalize="characters"
          />
          {isApplyingCoupon ? (
            <ActivityIndicator size="small" color="#8B5CF6" style={styles.couponButton} />
          ) : (
            <TouchableOpacity
              style={[
                styles.couponButton,
                !couponCode.trim() && styles.disabledCouponButton,
              ]}
              onPress={handleApplyCoupon}
              disabled={!couponCode.trim()}
            >
              <Text style={styles.couponButtonText}>Apply</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  const renderOrderSummary = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Order Summary</Text>
      
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal</Text>
        <Text style={styles.summaryValue}>₦{subtotal.toFixed(2)}</Text>
      </View>
      
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Delivery Fee</Text>
        <Text style={styles.summaryValue}>₦{DELIVERY_FEE.toFixed(2)}</Text>
      </View>
      
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Tax</Text>
        <Text style={styles.summaryValue}>₦{tax.toFixed(2)}</Text>
      </View>
      
      {couponApplied && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Discount</Text>
          <Text style={[styles.summaryValue, styles.discountValue]}>
            -₦{discount.toFixed(2)}
          </Text>
        </View>
      )}
      
      <View style={[styles.summaryRow, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>₦{total.toFixed(2)}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading checkout data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        {renderHeader()}
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {renderHeader()}
      
      <ScrollView style={styles.content}>
        {renderDeliveryAddress()}
        {renderPaymentMethods()}
        {renderCouponSection()}
        {renderOrderSummary()}
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.placeOrderButton}
          onPress={handlePlaceOrder}
          disabled={isPlacingOrder}
        >
          {isPlacingOrder ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.placeOrderButtonText}>Place Order</Text>
          )}
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  addressItem: {
    flexDirection: 'row',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  selectedAddressItem: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F9F7FF',
  },
  addressInfo: {
    flex: 1,
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  primaryBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  addressText: {
    fontSize: 14,
    color: '#666',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8B5CF6',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#8B5CF6',
    marginLeft: 8,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  selectedPaymentMethodItem: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F9F7FF',
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F9',
    borderRadius: 20,
    marginRight: 12,
  },
  paymentMethodLabel: {
    flex: 1,
    fontSize: 16,
  },
  couponInputContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  couponInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
  },
  couponButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledCouponButton: {
    backgroundColor: '#D1D5DB',
  },
  couponButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  appliedCouponContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appliedCoupon: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
  },
  appliedCouponText: {
    color: '#10B981',
    fontWeight: '600',
  },
  discountText: {
    color: '#10B981',
    fontWeight: '600',
  },
  removeCouponButton: {
    padding: 8,
    marginLeft: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  discountValue: {
    color: '#10B981',
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
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  placeOrderButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  placeOrderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FoodCheckoutScreen;
