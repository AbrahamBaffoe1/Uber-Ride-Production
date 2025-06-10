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

/**
 * @route PUT /api/v1/mongo/location/status
 * @desc Update user's location status (for riders)
 * @access Private
 */
router.put('/status', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { latitude, longitude, isAvailable, heading, speed } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        status: 'error',
        message: 'Latitude and longitude are required'
      });
    }
    
    // Update location status (especially for riders)
    const locationData = {
      userId,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      heading: heading || null,
      speed: speed || null,
      lastUpdated: new Date()
    };
    
    // If user is a rider, update rider location
    if (req.user.role === 'rider') {
      const mongoose = await import('mongoose');
      const riderLocationsCollection = mongoose.default.connection.collection('rider_locations');
      await riderLocationsCollection.findOneAndUpdate(
        { userId },
        { $set: locationData },
        { upsert: true, new: true }
      );
    } else {
      // For passengers, we can store in a general locations collection
      const mongoose = await import('mongoose');
      const locationsCollection = mongoose.default.connection.collection('user_locations');
      await locationsCollection.findOneAndUpdate(
        { userId },
        { $set: locationData },
        { upsert: true, new: true }
      );
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Location status updated successfully',
      data: {
        location: {
          latitude,
          longitude
        },
        isAvailable,
        lastUpdated: locationData.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error updating location status:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update location status',
      error: error.message
    });
  }
});

export default router;
