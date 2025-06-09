const express = require('express');
const restaurantRoutes = require('./restaurant.routes');
const cartRoutes = require('./cart.routes');
const orderRoutes = require('./order.routes');

/**
 * Set up and configure the food delivery routes
 * @param {Object} passengerConnection - Mongoose connection to the passenger database
 * @returns {Object} Express router with food delivery routes configured
 */
const createFoodRoutes = (passengerConnection) => {
  const router = express.Router();

  /**
   * Food delivery routes
   */

  // Restaurant routes
  router.use('/restaurants', restaurantRoutes);

  // Cart routes
  router.use('/cart', cartRoutes);

  // Order routes 
  router.use('/orders', orderRoutes);

  return router;
};

module.exports = createFoodRoutes;
