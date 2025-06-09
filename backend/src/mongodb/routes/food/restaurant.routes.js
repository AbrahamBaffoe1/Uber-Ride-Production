const express = require('express');
const restaurantController = require('../../controllers/restaurant.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const restaurantMiddleware = require('../../middlewares/restaurant.middleware');
const adminMiddleware = require('../../middlewares/admin.middleware');

const router = express.Router();

/**
 * Public routes (no authentication required)
 */

// GET /api/food/restaurants - Get all restaurants with optional filtering
router.get('/', restaurantController.getAllRestaurants);

// GET /api/food/restaurants/featured - Get featured restaurants
router.get('/featured', restaurantController.getFeaturedRestaurants);

// GET /api/food/restaurants/categories - Get restaurant categories (cuisine types)
router.get('/categories', restaurantController.getRestaurantCategories);

// GET /api/food/restaurants/search - Search restaurants
router.get('/search', restaurantController.searchRestaurants);

// GET /api/food/restaurants/:id - Get restaurant by ID
router.get('/:id', restaurantController.getRestaurantById);

/**
 * Protected routes (authentication required)
 */
router.use(authMiddleware.authenticate);

// POST /api/food/restaurants - Create a new restaurant (admin only)
router.post('/', restaurantController.createRestaurant);

// PUT /api/food/restaurants/:id - Update restaurant details (admin or restaurant owner)
router.put('/:id', restaurantController.updateRestaurant);

// Restaurant menu operations (admin or restaurant owner)

// POST /api/food/restaurants/:id/categories - Add a menu category
router.post('/:id/categories', restaurantController.addMenuCategory);

// POST /api/food/restaurants/:id/categories/:categoryId/items - Add a menu item
router.post('/:id/categories/:categoryId/items', restaurantController.addMenuItem);

// PUT /api/food/restaurants/:id/categories/:categoryId/items/:itemId - Update a menu item
router.put('/:id/categories/:categoryId/items/:itemId', restaurantController.updateMenuItem);

// DELETE /api/food/restaurants/:id/categories/:categoryId/items/:itemId - Delete a menu item
router.delete('/:id/categories/:categoryId/items/:itemId', restaurantController.deleteMenuItem);

module.exports = router;
