import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, FoodOrderData } from '../../navigation/types';
import foodService from '../../api/services/foodService';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

type FoodOrderTrackingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'FoodOrderTracking'>;
type FoodOrderTrackingScreenRouteProp = RouteProp<RootStackParamList, 'FoodOrderTracking'>;

const FoodOrderTrackingScreen: React.FC = () => {
  const navigation = useNavigation<FoodOrderTrackingScreenNavigationProp>();
  const route = useRoute<FoodOrderTrackingScreenRouteProp>();
  const { orderId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  
  const [riderLocation, setRiderLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  
  // Animation for progress
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  // Helper function to get step index based on order status
  const getStepIndex = (status: string): number => {
    const steps = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered'];
    return steps.indexOf(status);
  };
  
  // Load order data
  const loadOrderData = async () => {
    try {
      const orderData = await foodService.getFoodOrder(orderId);
      
      // Add estimatedDeliveryTime if not present
      if (!orderData.estimatedDeliveryTime) {
        // Create a delivery estimate (30-45 min from now)
        const now = new Date();
        const deliveryTime = new Date(now.getTime() + 45 * 60000);
        const timeString = deliveryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        orderData.estimatedDeliveryTime = timeString;
      }
      
      setOrder(orderData);
      
      if (orderData.rider?.currentLocation) {
        setRiderLocation(orderData.rider.currentLocation);
      }
      
      // Animate progress bar based on order status
      const stepIndex = getStepIndex(orderData.status);
      const progress = stepIndex / 5; // 5 is the number of steps - 1
      
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    } catch (error) {
      console.error('Error loading order:', error);
      Alert.alert('Error', 'Failed to load order details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Load order data and subscribe to updates
  useEffect(() => {
    loadOrderData();
    
    // Set up polling interval to refresh order status
    const intervalId = setInterval(async () => {
      try {
        const refreshedOrder = await foodService.getFoodOrder(orderId);
        
        // Add estimatedDeliveryTime if not present
        if (!refreshedOrder.estimatedDeliveryTime) {
          // Create a delivery estimate (30-45 min from now)
          const now = new Date();
          const deliveryTime = new Date(now.getTime() + 45 * 60000);
          const timeString = deliveryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          refreshedOrder.estimatedDeliveryTime = timeString;
        }
        
        setOrder((prevOrder: any) => {
          // Only update if status has changed
          if (prevOrder && prevOrder.status !== refreshedOrder.status) {
            // Update progress animation
            const stepIndex = getStepIndex(refreshedOrder.status);
            const progress = stepIndex / 5; // 5 is the number of steps - 1
            
            Animated.timing(progressAnim, {
              toValue: progress,
              duration: 1000,
              useNativeDriver: false,
            }).start();
          }
          return refreshedOrder;
        });
        
        // Update rider location if available
        if (refreshedOrder.rider?.currentLocation) {
          setRiderLocation(refreshedOrder.rider.currentLocation);
        }
      } catch (error) {
        console.error('Error refreshing order status:', error);
      }
    }, 10000); // Poll every 10 seconds
    
    // Try to set up real-time updates if available
    let statusSubscription: any = null;
    let locationSubscription: any = null;
    
    const setupRealTimeUpdates = async () => {
      try {
        // Get subscription token for order updates
        const subscription = await foodService.subscribeToOrderUpdates(orderId);
        
        if (subscription && subscription.subscriptionToken) {
          // In a real implementation, this would connect to a WebSocket or use a similar technology
          console.log('Subscribed to order updates with token:', subscription.subscriptionToken);
        }
      } catch (error) {
        console.error('Error setting up real-time updates:', error);
        // Continue with polling as fallback
      }
    };
    
    setupRealTimeUpdates();
    
    // Clean up on unmount
    return () => {
      clearInterval(intervalId);
      
      if (statusSubscription && statusSubscription.unsubscribe) {
        statusSubscription.unsubscribe();
      }
      
      if (locationSubscription && locationSubscription.unsubscribe) {
        locationSubscription.unsubscribe();
      }
    };
  }, [orderId]);
  
  const handleBackPress = () => {
    navigation.goBack();
  };
  
  const handleCallRestaurant = () => {
    // Placeholder for calling restaurant
    Alert.alert('Call Restaurant', 'This would call the restaurant in a real app.');
  };
  
  const handleCallRider = () => {
    // Placeholder for calling rider
    Alert.alert('Call Rider', 'This would call the rider in a real app.');
  };
  
  const handleMessageRider = () => {
    // Placeholder for messaging rider
    Alert.alert('Message Rider', 'This would open a chat with the rider in a real app.');
  };
  
  const handleCancelOrder = async () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const cancelledOrder = await foodService.cancelOrder(orderId);
              
              // Update local order state
              setOrder((prevOrder: any) => {
                if (!prevOrder) return null;
                return {
                  ...prevOrder,
                  status: 'cancelled',
                };
              });
              
              Alert.alert('Order Cancelled', 'Your order has been cancelled successfully.');
            } catch (error) {
              console.error('Error cancelling order:', error);
              Alert.alert('Error', 'Failed to cancel order. Please try again.');
            }
          },
        },
      ]
    );
  };
  
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending': return 'Order Placed';
      case 'confirmed': return 'Order Confirmed';
      case 'preparing': return 'Preparing Your Food';
      case 'ready': return 'Food Ready for Pickup';
      case 'picked_up': return 'Food On The Way';
      case 'delivered': return 'Order Delivered';
      case 'cancelled': return 'Order Cancelled';
      default: return 'Unknown Status';
    }
  };
  
  const getStatusDescription = (status: string): string => {
    switch (status) {
      case 'pending': return 'Your order has been received. Waiting for the restaurant to confirm.';
      case 'confirmed': return 'The restaurant has confirmed your order and will start preparing it soon.';
      case 'preparing': return 'The restaurant is now preparing your delicious meal.';
      case 'ready': return 'Your food is ready for pickup. A delivery person will pick it up soon.';
      case 'picked_up': return 'A delivery person has picked up your food and is on the way to you.';
      case 'delivered': return 'Your food has been delivered. Enjoy your meal!';
      case 'cancelled': return 'This order has been cancelled.';
      default: return '';
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }
  
  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color="#FF4757" />
        <Text style={styles.errorTitle}>Order Not Found</Text>
        <Text style={styles.errorMessage}>We couldn't find the order you're looking for.</Text>
        <TouchableOpacity
          style={styles.backToHomeButton}
          onPress={() => navigation.navigate('FoodHome')}
        >
          <Text style={styles.backToHomeButtonText}>Back to Food Home</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const isOrderActive = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up'].includes(order.status);
  const showRiderInfo = ['picked_up'].includes(order.status) && order.rider;
  const showMap = riderLocation !== null && showRiderInfo;
  
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
        <Text style={styles.headerTitle}>Order Tracking</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleCallRestaurant}
        >
          <Ionicons name="call" size={22} color="#8B5CF6" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>{getStatusText(order.status)}</Text>
            {order.status !== 'cancelled' && (
              <Text style={styles.estimatedTime}>
                {order.estimatedDeliveryTime && `Delivery by ${order.estimatedDeliveryTime}`}
              </Text>
            )}
          </View>
          
          <Text style={styles.statusDescription}>
            {getStatusDescription(order.status)}
          </Text>
          
          {isOrderActive && (
            <View style={styles.progressTrackerContainer}>
              <View style={styles.progressLineContainer}>
                <View style={styles.progressLineBg} />
                <Animated.View
                  style={[
                    styles.progressLineFill,
                    { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
                  ]}
                />
              </View>
              
              <View style={styles.stepsContainer}>
                <View style={styles.step}>
                  <View style={[styles.stepCircle, getStepIndex(order.status) >= 0 && styles.activeStepCircle]}>
                    {getStepIndex(order.status) >= 0 && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                  <Text style={styles.stepLabel}>Placed</Text>
                </View>
                
                <View style={styles.step}>
                  <View style={[styles.stepCircle, getStepIndex(order.status) >= 1 && styles.activeStepCircle]}>
                    {getStepIndex(order.status) >= 1 && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                  <Text style={styles.stepLabel}>Confirmed</Text>
                </View>
                
                <View style={styles.step}>
                  <View style={[styles.stepCircle, getStepIndex(order.status) >= 2 && styles.activeStepCircle]}>
                    {getStepIndex(order.status) >= 2 && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                  <Text style={styles.stepLabel}>Preparing</Text>
                </View>
                
                <View style={styles.step}>
                  <View style={[styles.stepCircle, getStepIndex(order.status) >= 3 && styles.activeStepCircle]}>
                    {getStepIndex(order.status) >= 3 && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                  <Text style={styles.stepLabel}>Ready</Text>
                </View>
                
                <View style={styles.step}>
                  <View style={[styles.stepCircle, getStepIndex(order.status) >= 4 && styles.activeStepCircle]}>
                    {getStepIndex(order.status) >= 4 && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                  <Text style={styles.stepLabel}>On the way</Text>
                </View>
                
                <View style={styles.step}>
                  <View style={[styles.stepCircle, getStepIndex(order.status) >= 5 && styles.activeStepCircle]}>
                    {getStepIndex(order.status) >= 5 && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                  <Text style={styles.stepLabel}>Delivered</Text>
                </View>
              </View>
            </View>
          )}
          
          {order.status === 'pending' && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelOrder}
            >
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Restaurant Info */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Restaurant</Text>
          </View>
          
          <View style={styles.restaurantInfo}>
            <Image
              source={{ uri: order.restaurantImage || 'https://via.placeholder.com/60' }}
              style={styles.restaurantImage}
              resizeMode="cover"
            />
            <View style={styles.restaurantDetails}>
              <Text style={styles.restaurantName}>{order.restaurantName}</Text>
              <TouchableOpacity style={styles.callButton} onPress={handleCallRestaurant}>
                <Ionicons name="call-outline" size={14} color="#8B5CF6" />
                <Text style={styles.callButtonText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Rider Information (if food is on the way) */}
        {showRiderInfo && order.rider && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Delivery Person</Text>
            </View>
            
            <View style={styles.riderInfo}>
              <Image
                source={{ uri: order.rider.photo || 'https://via.placeholder.com/60' }}
                style={styles.riderImage}
                resizeMode="cover"
              />
              <View style={styles.riderDetails}>
                <Text style={styles.riderName}>{order.rider.name}</Text>
                <View style={styles.riderContactButtons}>
                  <TouchableOpacity style={styles.riderContactButton} onPress={handleCallRider}>
                    <Ionicons name="call-outline" size={18} color="#8B5CF6" />
                    <Text style={styles.riderContactButtonText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.riderContactButton} onPress={handleMessageRider}>
                    <Ionicons name="chatbubble-outline" size={18} color="#8B5CF6" />
                    <Text style={styles.riderContactButtonText}>Message</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
        
        {/* Map (if rider location is available) */}
        {showMap && (
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: riderLocation!.latitude,
                longitude: riderLocation!.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              region={{
                latitude: riderLocation!.latitude,
                longitude: riderLocation!.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
            >
              <Marker
                coordinate={{
                  latitude: riderLocation!.latitude,
                  longitude: riderLocation!.longitude,
                }}
                title="Delivery Person"
                description="Your delivery person's current location"
              >
                <View style={styles.markerContainer}>
                  <Ionicons name="bicycle" size={24} color="#8B5CF6" />
                </View>
              </Marker>
            </MapView>
          </View>
        )}
        
        {/* Order Details */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Order Details</Text>
            <Text style={styles.orderIdText}>#{orderId.slice(-6)}</Text>
          </View>
          
          {/* Order Items */}
          <View style={styles.orderItems}>
            {order.items.map((item: any) => (
              <View key={item.id} style={styles.orderItem}>
                <View style={styles.orderItemQuantity}>
                  <Text style={styles.orderItemQuantityText}>{item.quantity}x</Text>
                </View>
                
                <View style={styles.orderItemInfo}>
                  <Text style={styles.orderItemName}>{item.name}</Text>
                  
                  {item.options && item.options.length > 0 && (
                    <View style={styles.orderItemOptions}>
                      {item.options.map((option: any, index: number) => (
                        <Text key={index} style={styles.orderItemOption}>
                          {option.name}: {option.choice} 
                          {option.price > 0 ? ` (+$${option.price.toFixed(2)})` : ''}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
                
                <Text style={styles.orderItemPrice}>
                  ${(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
          
          {/* Order Price Breakdown */}
          <View style={styles.orderPriceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>${order.subtotal.toFixed(2)}</Text>
            </View>
            
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Delivery Fee</Text>
              <Text style={styles.priceValue}>${order.deliveryFee.toFixed(2)}</Text>
            </View>
            
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tax</Text>
              <Text style={styles.priceValue}>${order.tax.toFixed(2)}</Text>
            </View>
            
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${order.total.toFixed(2)}</Text>
            </View>
          </View>
          
          {/* Other Order Details */}
          <View style={styles.otherOrderDetails}>
            <View style={styles.orderDetail}>
              <Text style={styles.orderDetailLabel}>Payment Method</Text>
              <Text style={styles.orderDetailValue}>{order.paymentMethod}</Text>
            </View>
            
            <View style={styles.orderDetail}>
              <Text style={styles.orderDetailLabel}>Delivery Address</Text>
              <Text style={styles.orderDetailValue}>{order.deliveryAddress}</Text>
            </View>
            
            <View style={styles.orderDetail}>
              <Text style={styles.orderDetailLabel}>Order Time</Text>
              <Text style={styles.orderDetailValue}>
                {new Date(order.createdAt).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backToHomeButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backToHomeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusHeader: {
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  estimatedTime: {
    fontSize: 14,
    color: '#666',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  progressTrackerContainer: {
    marginVertical: 16,
  },
  progressLineContainer: {
    height: 4,
    marginBottom: 16,
    position: 'relative',
  },
  progressLineBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  progressLineFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 4,
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  step: {
    alignItems: 'center',
    width: 50,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    marginBottom: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStepCircle: {
    backgroundColor: '#8B5CF6',
  },
  stepLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#FF4757',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF4757',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderIdText: {
    fontSize: 14,
    color: '#666',
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  restaurantDetails: {
    marginLeft: 16,
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callButtonText: {
    fontSize: 14,
    color: '#8B5CF6',
    marginLeft: 6,
  },
  riderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riderImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  riderDetails: {
    marginLeft: 16,
    flex: 1,
  },
  riderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  riderContactButtons: {
    flexDirection: 'row',
  },
  riderContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  riderContactButtonText: {
    fontSize: 14,
    color: '#8B5CF6',
    marginLeft: 6,
  },
  mapContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 3,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  orderItems: {
    marginBottom: 16,
  },
  orderItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  orderItemQuantity: {
    width: 30,
    alignItems: 'center',
    marginRight: 10,
  },
  orderItemQuantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  orderItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  orderItemOptions: {
    marginBottom: 2,
  },
  orderItemOption: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  orderPriceBreakdown: {
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  otherOrderDetails: {
    marginTop: 16,
  },
  orderDetail: {
    marginBottom: 12,
  },
  orderDetailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  orderDetailValue: {
    fontSize: 14,
    color: '#333',
  },
});

export default FoodOrderTrackingScreen;
