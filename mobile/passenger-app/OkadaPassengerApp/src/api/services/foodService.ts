import { apiClient } from '../client';
import { AxiosResponse } from 'axios';

/**
 * Restaurant interfaces
 */
export interface Restaurant {
  _id: string;
  name: string;
  description: string;
  cuisineType: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: number;
  address: string;
  image: string;
  isOpen: boolean;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  menu: {
    categories: Array<{
      _id: string;
      name: string;
      items: Array<FoodItem>;
    }>;
  };
  distance?: number;
}

export interface FoodItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isPopular: boolean;
  isVegetarian: boolean;
  options?: Array<{
    _id: string;
    name: string;
    required: boolean;
    multiSelect: boolean;
    choices: Array<{
      _id: string;
      name: string;
      price: number;
    }>;
  }>;
}

/**
 * Cart interfaces
 */
export interface CartItem {
  id: string;
  foodItem: string;
  name: string;
  price: number;
  quantity: number;
  options: Array<{
    optionId: string;
    name: string;
    choiceId: string;
    choice: string;
    price: number;
  }>;
  totalPrice: number;
}

export interface Cart {
  id: string | null;
  items: CartItem[];
  subtotal: number;
  restaurantId: string | null;
}

/**
 * Order interfaces
 */
export interface FoodOrder {
  id: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  total: number;
  restaurantName: string;
  restaurantImage: string;
  deliveryAddress: string;
  specialInstructions?: string;
  paymentMethod: string;
  paymentStatus: string;
  estimatedDeliveryTime: string;
  createdAt: string;
  updatedAt: string;
  rider?: {
    id: string;
    name: string;
    phone: string;
    photo: string;
    currentLocation?: {
      latitude: number;
      longitude: number;
    };
  };
}

/**
 * Request interfaces
 */
export interface AddToCartRequest {
  restaurantId: string;
  foodItemId: string;
  quantity?: number;
  options?: Array<{
    optionId: string;
    choiceId: string;
  }>;
  clearExisting?: boolean;
}

export interface PlaceOrderRequest {
  restaurantId: string;
  deliveryAddress: string;
  paymentMethodId: string;
  specialInstructions?: string;
}

/**
 * Food service for interacting with the food delivery API
 */
class FoodService {
  /**
   * Get all restaurants with optional filtering
   * @param latitude - User latitude for distance calculation
   * @param longitude - User longitude for distance calculation
   * @param cuisineType - Filter by cuisine type
   * @param sort - Sort by rating, deliveryTime, etc.
   * @param page - Page number for pagination
   * @param limit - Items per page
   */
  async getRestaurants(
    latitude?: number,
    longitude?: number,
    cuisineType?: string,
    sort: string = 'rating',
    page: number = 1,
    limit: number = 10
  ): Promise<{ restaurants: Restaurant[]; totalPages: number; currentPage: number; totalCount: number }> {
    const params: any = { page, limit, sort };
    
    if (latitude) params.latitude = latitude;
    if (longitude) params.longitude = longitude;
    if (cuisineType) params.cuisineType = cuisineType;
    
    const response: AxiosResponse<{
      restaurants: Restaurant[];
      totalPages: number;
      currentPage: number;
      totalCount: number;
    }> = await apiClient.get('/food/restaurants', { params });
    
    return response.data;
  }
  
  /**
   * Get featured restaurants
   * @param latitude - User latitude for distance calculation
   * @param longitude - User longitude for distance calculation
   */
  async getFeaturedRestaurants(
    latitude?: number,
    longitude?: number
  ): Promise<{ restaurants: Restaurant[] }> {
    const params: any = {};
    
    if (latitude) params.latitude = latitude;
    if (longitude) params.longitude = longitude;
    
    const response: AxiosResponse<{ restaurants: Restaurant[] }> = await apiClient.get(
      '/food/restaurants/featured',
      { params }
    );
    
    return response.data;
  }
  
  /**
   * Get restaurant by ID
   * @param id - Restaurant ID
   * @param latitude - User latitude for distance calculation
   * @param longitude - User longitude for distance calculation
   */
  async getRestaurant(
    id: string,
    latitude?: number,
    longitude?: number
  ): Promise<{ restaurant: Restaurant }> {
    const params: any = {};
    
    if (latitude) params.latitude = latitude;
    if (longitude) params.longitude = longitude;
    
    const response: AxiosResponse<{ restaurant: Restaurant }> = await apiClient.get(
      `/food/restaurants/${id}`,
      { params }
    );
    
    return response.data;
  }
  
  /**
   * Get restaurant details (legacy method - maps to getRestaurant)
   * @param id - Restaurant ID
   */
  async getRestaurantDetails(id: string): Promise<any> {
    const { restaurant } = await this.getRestaurant(id);
    return restaurant;
  }
  
  /**
   * Search restaurants
   * @param query - Search query
   * @param latitude - User latitude for distance calculation
   * @param longitude - User longitude for distance calculation
   * @param page - Page number for pagination
   * @param limit - Items per page
   */
  async searchRestaurants(
    query: string,
    latitude?: number,
    longitude?: number,
    page: number = 1,
    limit: number = 10
  ): Promise<{ restaurants: Restaurant[]; totalPages: number; currentPage: number; totalCount: number }> {
    const params: any = { query, page, limit };
    
    if (latitude) params.latitude = latitude;
    if (longitude) params.longitude = longitude;
    
    const response: AxiosResponse<{
      restaurants: Restaurant[];
      totalPages: number;
      currentPage: number;
      totalCount: number;
    }> = await apiClient.get('/food/restaurants/search', { params });
    
    return response.data;
  }
  
  /**
   * Get restaurant categories (cuisine types)
   */
  async getRestaurantCategories(): Promise<{ categories: string[] }> {
    const response: AxiosResponse<{ categories: string[] }> = await apiClient.get(
      '/food/restaurants/categories'
    );
    
    return response.data;
  }
  
  /**
   * Get cuisine types (legacy method - maps to getRestaurantCategories)
   */
  async getCuisineTypes(): Promise<any[]> {
    const { categories } = await this.getRestaurantCategories();
    
    // Transform to expected format with id, name, image
    return categories.map((category, index) => ({
      id: `cuisine-${index}`,
      name: category,
      image: `https://via.placeholder.com/100?text=${encodeURIComponent(category)}`,
    }));
  }
  
  /**
   * Get user's cart
   */
  async getCart(): Promise<{ cart: Cart }> {
    const response: AxiosResponse<{ cart: Cart }> = await apiClient.get('/food/cart');
    
    return response.data;
  }
  
  /**
   * Add item to cart
   * @param data - Add to cart request data
   */
  async addToCart(data: AddToCartRequest): Promise<{ message: string; cart: Cart }> {
    const response: AxiosResponse<{ message: string; cart: Cart }> = await apiClient.post(
      '/food/cart',
      data
    );
    
    return response.data;
  }
  
  /**
   * Update cart item quantity
   * @param itemId - Cart item ID
   * @param quantity - New quantity
   */
  async updateCartItemQuantity(
    itemId: string,
    quantity: number
  ): Promise<{ message: string; cart: Cart }> {
    const response: AxiosResponse<{ message: string; cart: Cart }> = await apiClient.put(
      `/food/cart/items/${itemId}`,
      { quantity }
    );
    
    return response.data;
  }
  
  /**
   * Remove item from cart
   * @param cartItemId - Cart item ID
   */
  async removeFromCart(cartItemId: string): Promise<{ message: string; cart: Cart }> {
    const response: AxiosResponse<{ message: string; cart: Cart }> = await apiClient.delete(
      '/food/cart/items',
      { data: { cartItemId } }
    );
    
    return response.data;
  }
  
  /**
   * Clear cart
   */
  async clearCart(): Promise<{ message: string; cart: Cart }> {
    const response: AxiosResponse<{ message: string; cart: Cart }> = await apiClient.delete(
      '/food/cart'
    );
    
    return response.data;
  }
  
  /**
   * Place a food order
   * @param data - Place order request data
   */
  async placeOrder(data: PlaceOrderRequest): Promise<{ message: string; order: FoodOrder }> {
    const response: AxiosResponse<{ message: string; order: FoodOrder }> = await apiClient.post(
      '/food/orders',
      data
    );
    
    return response.data;
  }
  
  /**
   * Get order by ID
   * @param id - Order ID
   */
  async getOrder(id: string): Promise<{ order: FoodOrder }> {
    const response: AxiosResponse<{ order: FoodOrder }> = await apiClient.get(
      `/food/orders/${id}`
    );
    
    return response.data;
  }
  
  /**
   * Get food order (legacy method - maps to getOrder)
   * @param id - Order ID
   */
  async getFoodOrder(id: string): Promise<FoodOrder> {
    const { order } = await this.getOrder(id);
    return order;
  }
  
  /**
   * Get user's order history
   * @param page - Page number for pagination
   * @param limit - Items per page
   * @param status - Filter by order status
   */
  async getOrderHistory(
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<{
    orders: FoodOrder[];
    totalPages: number;
    currentPage: number;
    totalCount: number;
  }> {
    const params: any = { page, limit };
    
    if (status) params.status = status;
    
    const response: AxiosResponse<{
      orders: FoodOrder[];
      totalPages: number;
      currentPage: number;
      totalCount: number;
    }> = await apiClient.get('/food/orders/history', { params });
    
    return response.data;
  }
  
  /**
   * Cancel order
   * @param id - Order ID
   * @param reason - Cancellation reason
   */
  async cancelOrder(id: string, reason?: string): Promise<{ message: string; order: FoodOrder }> {
    const response: AxiosResponse<{ message: string; order: FoodOrder }> = await apiClient.put(
      `/food/orders/${id}/cancel`,
      { reason }
    );
    
    return response.data;
  }
  
  /**
   * Subscribe to order updates
   * @param orderId - Order ID
   */
  async subscribeToOrderUpdates(orderId: string): Promise<{
    message: string;
    subscriptionToken: string;
    channelName: string;
  }> {
    const response: AxiosResponse<{
      message: string;
      subscriptionToken: string;
      channelName: string;
    }> = await apiClient.get(`/food/orders/${orderId}/subscribe`);
    
    return response.data;
  }
  
  /**
   * Subscribe to order status updates (legacy method - maps to subscribeToOrderUpdates)
   * @param orderId - Order ID
   */
  async subscribeToOrderStatus(orderId: string): Promise<any> {
    return this.subscribeToOrderUpdates(orderId);
  }
  
  /**
   * Subscribe to order location updates (legacy method)
   * @param orderId - Order ID
   */
  async subscribeToOrderLocation(orderId: string): Promise<any> {
    // This will be implemented with real-time tracking in the future
    return { subscribed: true, orderId };
  }
}

export const foodService = new FoodService();

// Export as default for backward compatibility
export default foodService;
