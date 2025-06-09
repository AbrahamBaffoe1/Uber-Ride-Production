const express = require('express');
const foodOrderController = require('../../controllers/food-order.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const adminMiddleware = require('../../middlewares/admin.middleware');
const restaurantMiddleware = require('../../middlewares/restaurant.middleware');
const riderMiddleware = require('../../middlewares/rider.middleware');

const router = express.Router();

/**
 * All order routes require authentication
 */
router.use(authMiddleware.authenticate);

// POST /api/food/orders - Place a new food order
router.post('/', foodOrderController.placeOrder);

// GET /api/food/orders/:id - Get order by ID
router.get('/:id', foodOrderController.getOrder);

// GET /api/food/orders - Get user's order history
router.get('/', foodOrderController.getOrderHistory);

// PUT /api/food/orders/:id/cancel - Cancel order
router.put('/:id/cancel', foodOrderController.cancelOrder);

// GET /api/food/orders/:id/subscribe - Subscribe to order updates
router.get('/:id/subscribe', foodOrderController.subscribeToOrderUpdates);

/**
 * Restaurant owner routes
 */

// GET /api/food/orders/restaurant/:restaurantId - Get restaurant orders
router.get('/restaurant/:restaurantId', foodOrderController.getRestaurantOrders);

// Restaurant and rider can update order status
router.put('/:id/status', foodOrderController.updateOrderStatus);

/**
 * Admin and restaurant owner routes
 */

// Assign rider to order
router.put('/:id/assign-rider', foodOrderController.assignRider);

/**
 * Rider routes
 */

// Update rider location for order
router.put('/:id/location', foodOrderController.updateRiderLocation);

module.exports = router;
