import express from 'express';
import sharedRoutes from './shared/index.js';
import passengerRoutes from './passenger/index.js';
import riderRoutes from './rider/index.js';
import rideOptionsRoutes from './ride-options.routes.js';
import ridesRoutes from './rides.routes.js';
import locationRoutes from './location.routes.js';
import adminRoutes from './admin.routes.js';
import userRoutes from './user.routes.js';
import ridePricingRoutes from './ride-pricing.routes.js';
import analyticsRoutes from './analytics.routes.js';
import earningsRoutes from './earnings.routes.js';
import safetyRoutes from './safety.routes.js';
// OTP routes are imported and used in shared routes

/**
 * Set up and configure the application routes
 * @param {Object} riderConnection - Mongoose connection to the rider database
 * @param {Object} passengerConnection - Mongoose connection to the passenger database
 * @returns {Promise<Object>} Express router with all routes configured
 */
const setupAppRoutes = async (riderConnection, passengerConnection) => {
  const router = express.Router();

  /**
   * API Routes
   */

  // Shared routes - needs both connections
  // This is an async function so we need to await it
  const sharedRouter = await sharedRoutes(riderConnection, passengerConnection);
  router.use('/', sharedRouter);

  // Passenger-specific routes - needs passenger connection
  router.use('/passenger', passengerRoutes(passengerConnection));

  // Rider-specific routes - needs rider connection
  router.use('/rider', riderRoutes(riderConnection));

  // Ride options routes - this provides the missing endpoints used by the passenger app
  router.use('/rides', rideOptionsRoutes);
  
  // Register the rides routes directly
  router.use('/rides', ridesRoutes);
  
  // Register the location routes directly
  router.use('/location', locationRoutes);
  
  // Also register as 'locations' for backward compatibility with passenger app
  router.use('/locations', locationRoutes);
  
  // Register admin routes
  router.use('/admin', adminRoutes);
  
  // Register user routes
  router.use('/users', userRoutes);
  
  // Register ride pricing and availability routes
  router.use('/ride-pricing', ridePricingRoutes);
  
  // Register analytics routes - used by admin dashboard
  router.use('/analytics', analyticsRoutes);
  
  // Register earnings routes
  router.use('/earnings', earningsRoutes);
  
  // Register safety routes
  router.use('/safety', safetyRoutes);
  
  // OTP routes are already registered in shared routes
  // Removed duplicate registration: router.use('/otp', otpRoutes);

  return router;
};

export default setupAppRoutes;
