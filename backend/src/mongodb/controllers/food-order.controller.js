const FoodOrder = require('../models/FoodOrder');
const FoodCart = require('../models/FoodCart');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

/**
 * Food order controller for handling order-related API endpoints
 */
const foodOrderController = {
  /**
   * Place a new food order
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  placeOrder: async (req, res) => {
    try {
      const userId = req.user._id;
      const { restaurantId, deliveryAddress, paymentMethodId, specialInstructions, deliveryLocationCoordinates } = req.body;

      if (!restaurantId || !deliveryAddress || !paymentMethodId) {
        return res.status(400).json({ message: 'Restaurant ID, delivery address and payment method are required' });
      }

      if (!deliveryLocationCoordinates || !deliveryLocationCoordinates.latitude || !deliveryLocationCoordinates.longitude) {
        return res.status(400).json({ message: 'Delivery location coordinates are required' });
      }

      // Find user's cart
      const cart = await FoodCart.findOne({ user: userId });

      if (!cart || !cart.items || cart.items.length === 0) {
        return res.status(400).json({ message: 'Cart is empty' });
      }

      if (!cart.restaurant || cart.restaurant.toString() !== restaurantId) {
        return res.status(400).json({ message: 'Cart does not contain items from this restaurant' });
      }

      // Find restaurant
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      // Check if restaurant is open
      if (!restaurant.isOpen) {
        return res.status(400).json({ message: 'Restaurant is currently closed' });
      }

      // Check minimum order amount
      if (cart.subtotal < restaurant.minOrderAmount) {
        return res.status(400).json({
          message: `Order subtotal does not meet minimum amount of ${restaurant.minOrderAmount}`,
          minOrderAmount: restaurant.minOrderAmount,
          currentSubtotal: cart.subtotal
        });
      }

      // Create order
      const order = new FoodOrder({
        user: userId,
        restaurant: restaurantId,
        restaurantName: restaurant.name,
        restaurantImage: restaurant.image,
        status: 'pending',
        items: cart.items,
        subtotal: cart.subtotal,
        deliveryFee: restaurant.deliveryFee,
        serviceFee: cart.subtotal * 0.10, // 10% service fee
        tax: cart.subtotal * 0.05, // 5% tax
        total: 0, // Will be calculated in pre-save hook
        paymentMethod: paymentMethodId,
        paymentStatus: 'pending',
        deliveryAddress: deliveryAddress,
        deliveryLocationCoordinates: deliveryLocationCoordinates,
        specialInstructions: specialInstructions || '',
        estimatedDeliveryTime: restaurant.deliveryTime
      });

      // Save order
      await order.save();

      // Clear user's cart
      cart.restaurant = null;
      cart.items = [];
      cart.subtotal = 0;
      await cart.save();

      // Process payment (this would typically call a payment service)
      // For demo purposes, we'll simulate successful payment
      order.paymentStatus = 'paid';
      order.addStatusLog('confirmed', 'Order confirmed and payment processed');
      await order.save();

      res.status(201).json({
        message: 'Order placed successfully',
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          items: order.items,
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          serviceFee: order.serviceFee,
          tax: order.tax,
          total: order.total,
          restaurantName: order.restaurantName,
          restaurantImage: order.restaurantImage,
          deliveryAddress: order.deliveryAddress,
          specialInstructions: order.specialInstructions,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          estimatedDeliveryTime: order.estimatedDeliveryTime,
          createdAt: order.createdAt
        }
      });
    } catch (error) {
      console.error('Error placing order:', error);
      res.status(500).json({ message: 'Error placing order', error: error.message });
    }
  },

  /**
   * Get order by ID
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getOrder: async (req, res) => {
    try {
      const userId = req.user._id;
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid order ID' });
      }

      // Find order
      const order = await FoodOrder.findById(id);

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Check if user owns this order or is admin/restaurant owner
      if (order.user.toString() !== userId.toString() && 
          req.user.role !== 'admin' && 
          (!order.restaurant || order.restaurant.toString() !== req.user.restaurantId)) {
        return res.status(403).json({ message: 'Not authorized to view this order' });
      }

      res.status(200).json({ order });
    } catch (error) {
      console.error('Error getting order:', error);
      res.status(500).json({ message: 'Error getting order', error: error.message });
    }
  },

  /**
   * Get user's order history
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getOrderHistory: async (req, res) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10, status } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      const query = { user: userId };

      // Filter by status if provided
      if (status) {
        query.status = status;
      }

      // Get count of total documents that match the query
      const totalCount = await FoodOrder.countDocuments(query);
      
      // Get orders
      const orders = await FoodOrder.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      res.status(200).json({
        orders,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
      });
    } catch (error) {
      console.error('Error getting order history:', error);
      res.status(500).json({ message: 'Error getting order history', error: error.message });
    }
  },

  /**
   * Cancel order
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  cancelOrder: async (req, res) => {
    try {
      const userId = req.user._id;
      const { id } = req.params;
      const { reason } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid order ID' });
      }

      // Find order
      const order = await FoodOrder.findById(id);

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Check if user owns this order
      if (order.user.toString() !== userId.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to cancel this order' });
      }

      // Check if order can be cancelled
      const cancelableStatuses = ['pending', 'confirmed', 'preparing'];
      if (!cancelableStatuses.includes(order.status)) {
        return res.status(400).json({ 
          message: `Cannot cancel order with status: ${order.status}. Order is already ${order.status}`
        });
      }

      // Update order status
      order.addStatusLog('cancelled', `Order cancelled${reason ? `: ${reason}` : ''}`);
      
      // If payment status is paid, mark for refund processing
      if (order.paymentStatus === 'paid') {
        order.paymentStatus = 'refunded';
        // In a real application, you would process the refund with your payment provider
      }

      await order.save();

      res.status(200).json({
        message: 'Order cancelled successfully',
        order
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({ message: 'Error cancelling order', error: error.message });
    }
  },

  /**
   * Get restaurant orders (for restaurant dashboard)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getRestaurantOrders: async (req, res) => {
    try {
      const { restaurantId } = req.params;
      const { page = 1, limit = 10, status } = req.query;

      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({ message: 'Invalid restaurant ID' });
      }

      // Check if user is authorized (admin or restaurant owner)
      if (req.user.role !== 'admin' && 
          (!req.user.restaurantId || req.user.restaurantId.toString() !== restaurantId)) {
        return res.status(403).json({ message: 'Not authorized to view orders for this restaurant' });
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      const query = { restaurant: restaurantId };

      // Filter by status if provided
      if (status) {
        query.status = status;
      }

      // Get count of total documents that match the query
      const totalCount = await FoodOrder.countDocuments(query);
      
      // Get orders
      const orders = await FoodOrder.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('user', 'name phone');

      res.status(200).json({
        orders,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
      });
    } catch (error) {
      console.error('Error getting restaurant orders:', error);
      res.status(500).json({ message: 'Error getting restaurant orders', error: error.message });
    }
  },

  /**
   * Update order status (for restaurant and rider use)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  updateOrderStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, description } = req.body;

      if (!id || !status) {
        return res.status(400).json({ message: 'Order ID and status are required' });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid order ID' });
      }

      // Find order
      const order = await FoodOrder.findById(id);

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Check if user is authorized (admin, restaurant owner, or assigned rider)
      const isRestaurantOwner = req.user.role === 'restaurant_owner' && 
                               order.restaurant && 
                               req.user.restaurantId && 
                               order.restaurant.toString() === req.user.restaurantId.toString();
      
      const isAssignedRider = req.user.role === 'rider' && 
                             order.rider && 
                             order.rider.toString() === req.user._id.toString();
      
      if (req.user.role !== 'admin' && !isRestaurantOwner && !isAssignedRider) {
        return res.status(403).json({ message: 'Not authorized to update this order' });
      }

      // Validate status transition
      const validStatusTransitions = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['preparing', 'cancelled'],
        'preparing': ['ready_for_pickup', 'cancelled'],
        'ready_for_pickup': ['picked_up'],
        'picked_up': ['in_delivery'],
        'in_delivery': ['delivered']
      };

      if (!validStatusTransitions[order.status] || !validStatusTransitions[order.status].includes(status)) {
        return res.status(400).json({ 
          message: `Invalid status transition from ${order.status} to ${status}`,
          validTransitions: validStatusTransitions[order.status]
        });
      }

      // Update order status
      order.addStatusLog(status, description || `Status updated to ${status}`);
      
      // If order is delivered, set actual delivery time
      if (status === 'delivered') {
        order.actualDeliveryTime = new Date();
      }

      await order.save();

      res.status(200).json({
        message: 'Order status updated successfully',
        order
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ message: 'Error updating order status', error: error.message });
    }
  },

  /**
   * Assign rider to order
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  assignRider: async (req, res) => {
    try {
      const { id } = req.params;
      const { riderId } = req.body;

      if (!id || !riderId) {
        return res.status(400).json({ message: 'Order ID and rider ID are required' });
      }

      if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(riderId)) {
        return res.status(400).json({ message: 'Invalid order or rider ID' });
      }

      // Check if user is authorized (admin or restaurant owner)
      if (req.user.role !== 'admin' && req.user.role !== 'restaurant_owner') {
        return res.status(403).json({ message: 'Not authorized to assign riders' });
      }

      // Find order
      const order = await FoodOrder.findById(id);

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Check if restaurant owner is authorized for this restaurant
      if (req.user.role === 'restaurant_owner' && 
          (!order.restaurant || !req.user.restaurantId || 
           order.restaurant.toString() !== req.user.restaurantId.toString())) {
        return res.status(403).json({ message: 'Not authorized to update orders for this restaurant' });
      }

      // Find rider
      const rider = await User.findOne({ _id: riderId, role: 'rider' });

      if (!rider) {
        return res.status(404).json({ message: 'Rider not found' });
      }

      // Assign rider to order
      order.rider = riderId;
      order.riderDetails = {
        name: rider.name,
        phone: rider.phone,
        photo: rider.photo || '',
      };

      order.addStatusLog(order.status, `Rider ${rider.name} assigned to order`);
      await order.save();

      res.status(200).json({
        message: 'Rider assigned successfully',
        order
      });
    } catch (error) {
      console.error('Error assigning rider:', error);
      res.status(500).json({ message: 'Error assigning rider', error: error.message });
    }
  },

  /**
   * Update rider location
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  updateRiderLocation: async (req, res) => {
    try {
      const { id } = req.params;
      const { latitude, longitude } = req.body;

      if (!id || !latitude || !longitude) {
        return res.status(400).json({ message: 'Order ID, latitude, and longitude are required' });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid order ID' });
      }

      // Find order
      const order = await FoodOrder.findById(id);

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Check if user is authorized (must be the assigned rider or admin)
      if (req.user.role !== 'admin' && 
          (!order.rider || order.rider.toString() !== req.user._id.toString())) {
        return res.status(403).json({ message: 'Not authorized to update this order' });
      }

      // Update rider location
      order.updateRiderLocation(latitude, longitude);
      await order.save();

      res.status(200).json({
        message: 'Rider location updated successfully',
        location: {
          latitude,
          longitude,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Error updating rider location:', error);
      res.status(500).json({ message: 'Error updating rider location', error: error.message });
    }
  },

  /**
   * Subscribe to order updates (for real-time tracking)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  subscribeToOrderUpdates: async (req, res) => {
    try {
      const userId = req.user._id;
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid order ID' });
      }

      // Find order
      const order = await FoodOrder.findById(id);

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Check if user is authorized (order owner, admin, restaurant owner, or assigned rider)
      const isOrderOwner = order.user.toString() === userId.toString();
      const isRestaurantOwner = req.user.role === 'restaurant_owner' && 
                              order.restaurant && 
                              req.user.restaurantId && 
                              order.restaurant.toString() === req.user.restaurantId.toString();
      const isAssignedRider = req.user.role === 'rider' && 
                            order.rider && 
                            order.rider.toString() === userId.toString();
      
      if (!isOrderOwner && req.user.role !== 'admin' && !isRestaurantOwner && !isAssignedRider) {
        return res.status(403).json({ message: 'Not authorized to subscribe to this order' });
      }

      // Generate subscription token (in a real app, would create a proper subscription)
      const subscriptionToken = `order_${order._id}_${Date.now()}`;
      const channelName = `order_updates_${order._id}`;

      res.status(200).json({
        message: 'Subscribed to order updates',
        subscriptionToken,
        channelName,
        order
      });
    } catch (error) {
      console.error('Error subscribing to order updates:', error);
      res.status(500).json({ message: 'Error subscribing to order updates', error: error.message });
    }
  }
};

module.exports = foodOrderController;
