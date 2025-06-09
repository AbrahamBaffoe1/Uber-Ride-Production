/**
 * Location Routes
 * Handles location-related endpoints for passengers
 */
import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as locationsController from '../controllers/locations.controller.js';

const router = express.Router();

/**
 * Passenger-specific location routes
 */
// Get saved locations
router.get('/saved', authenticate, locationsController.getSavedLocations);

// Get popular destinations
router.get('/popular', authenticate, locationsController.getPopularDestinations);

// Get nearest city center
router.get('/city-center', authenticate, locationsController.getNearestCityCenter);

// Save a location
router.post('/save', authenticate, locationsController.saveLocation);

// Delete a saved location
router.delete('/saved/:locationId', authenticate, locationsController.deleteSavedLocation);

// Get suggested locations based on user's current location  
router.get('/suggestions', authenticate, locationsController.getSuggestedLocations);

// Search for locations using Google Places API
router.get('/search', authenticate, locationsController.searchLocations);

export default router;
