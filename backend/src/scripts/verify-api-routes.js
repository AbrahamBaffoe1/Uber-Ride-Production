/**
 * API Routes Verification Script
 * 
 * This script checks if all essential API routes are properly registered
 * and functioning correctly.
 */
import express from 'express';
import { setupAppRoutes } from '../mongodb/routes/index.js';
import { connectToRiderDB, connectToPassengerDB } from '../config/mongodb.js';
import { logInfo, logError } from '../services/logging.service.js';

const verifyApiRoutes = async () => {
  try {
    logInfo('system', 'info', 'Starting API routes verification');
    
    // Mock Express app for routes registration
    const app = express();
    
    // Connect to databases
    const riderConnection = await connectToRiderDB();
    const passengerConnection = await connectToPassengerDB();
    
    // Get the router with all routes configured
    const router = await setupAppRoutes(riderConnection, passengerConnection);
    
    // Register the router
    app._router = router;
    
    // Get all registered routes
    const routes = [];
    
    // Function to extract routes from a router or middleware
    const extractRoutes = (layer) => {
      if (layer.route) {
        // It's a route
        const path = layer.route.path;
        const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
        routes.push({ path, methods });
      } else if (layer.name === 'router' && layer.handle.stack) {
        // It's a sub-router
        const routerPath = layer.regexp.toString().split('?')[0].replace(/\\\//g, '/').replace(/\^|\/\\?(?=\/|$)/g, '');
        
        // Process all layers in the sub-router
        layer.handle.stack.forEach(subLayer => {
          if (subLayer.route) {
            const subPath = subLayer.route.path;
            const subMethods = Object.keys(subLayer.route.methods).map(m => m.toUpperCase());
            
            // Combine parent router path with sub-route path
            const fullPath = `${routerPath}${subPath}`;
            routes.push({ path: fullPath, methods: subMethods });
          }
        });
      }
    };
    
    // Extract routes from the router
    router.stack.forEach(extractRoutes);
    
    // Verify essential API routes are registered
    const essentialRoutes = [
      // Analytics routes
      { path: '/analytics/otp', method: 'GET' },
      { path: '/analytics/otp/summary', method: 'GET' },
      { path: '/analytics/payments', method: 'GET' },
      { path: '/analytics/payments/summary', method: 'GET' },
      { path: '/analytics/reconciliation/status', method: 'GET' },
      
      // Reconciliation routes
      { path: '/reconciliation/status', method: 'GET' },
      { path: '/reconciliation/unmatched-transactions', method: 'GET' },
      { path: '/reconciliation/unreconciled-rides', method: 'GET' }
    ];
    
    // Check if all essential routes are registered
    const missingRoutes = [];
    
    essentialRoutes.forEach(essentialRoute => {
      const found = routes.some(route => 
        route.path.includes(essentialRoute.path) && 
        route.methods.includes(essentialRoute.method)
      );
      
      if (!found) {
        missingRoutes.push(essentialRoute);
      }
    });
    
    if (missingRoutes.length > 0) {
      logError('system', 'error', 'Missing essential API routes', { missingRoutes });
      console.error('❌ Missing essential API routes:');
      missingRoutes.forEach(route => {
        console.error(`   - ${route.method} ${route.path}`);
      });
    } else {
      logInfo('system', 'info', 'All essential API routes are registered correctly');
      console.log('✅ All essential API routes are registered correctly');
    }
    
    // List all registered routes for debugging
    console.log('\nRegistered API Routes:');
    routes.sort((a, b) => a.path.localeCompare(b.path));
    routes.forEach(route => {
      console.log(`${route.methods.join(', ')} ${route.path}`);
    });
    
  } catch (error) {
    logError('system', 'error', 'Error verifying API routes', { error });
    console.error('Error verifying API routes:', error);
  }
};

// Run the verification if this script is executed directly
if (require.main === module) {
  verifyApiRoutes()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default verifyApiRoutes;
