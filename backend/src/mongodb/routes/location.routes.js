/**
 * Location Routes
 * Handles rider location tracking and searching for nearby riders
 */
import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import RiderLocation from '../models/RiderLocation.js';
import mapsService from '../../services/maps.service.js';
import * as socketService from '../../services/socket.service.js';
import { isValidObjectId } from 'mongoose';
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

/**
 * Helper function to check if the user ID is a temporary one
 * @param {String|ObjectId} userId - User ID to check
 * @returns {Boolean} - Whether the ID is temporary
 */
const isTemporaryId = (userId) => {
  return typeof userId === 'string' && userId.startsWith('temp-');
};

/**
 * @route POST /api/v1/mongo/location/update
 * @desc Update rider's current location
 * @access Private (rider only)
 */
router.post('/update', authenticate, async (req, res) => {
  try {
    // All users in the rider app have rider role
    
    const { 
      lat, 
      lng, 
      accuracy, 
      heading, 
      speed, 
      altitude, 
      status,
      batteryLevel,
      deviceId,
      appVersion,
      provider,
      mock = false
    } = req.body;
    
    // Validate required fields
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    // Prepare location data
    const locationData = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      accuracy: accuracy ? parseFloat(accuracy) : undefined,
      heading: heading ? parseFloat(heading) : undefined,
      speed: speed ? parseFloat(speed) : undefined,
      altitude: altitude ? parseFloat(altitude) : undefined,
      status,
      batteryLevel: batteryLevel ? parseFloat(batteryLevel) : undefined,
      metadata: {
        deviceId,
        appVersion,
        provider,
        mock: !!mock
      }
    };
    
    // Check if this is a temporary user ID (used during registration)
    if (isTemporaryId(req.user._id)) {
      console.log('Using temporary user ID for location update:', req.user._id);
      
      // For temporary users, return a synthetic response without DB interaction
      return res.status(200).json({
        success: true,
        message: 'Location temporarily stored (registration in progress)',
        data: {
          riderId: req.user._id,
          currentLocation: {
            type: 'Point',
            coordinates: [locationData.lng, locationData.lat]
          },
          heading: locationData.heading,
          speed: locationData.speed,
          status: status || 'offline',
          batteryLevel: locationData.batteryLevel,
          formattedAddress: 'Registration in progress',
          lastUpdated: new Date()
        }
      });
    }
    
    // For regular users, update in the database
    try {
      // Update rider location
      const riderLocation = await RiderLocation.updateRiderLocation(req.user._id, locationData);
      
      // Add formatted address using reverse geocoding
      if (riderLocation) {
        try {
          const geocodeResult = await mapsService.reverseGeocode({ 
            lat: locationData.lat, 
            lng: locationData.lng 
          });
          
          if (geocodeResult.success) {
            // Update the location document with address information
            riderLocation.formattedAddress = geocodeResult.data.formatted_address;
            riderLocation.addressComponents = geocodeResult.data.addressComponents;
            await riderLocation.save();
          }
        } catch (geocodeError) {
          console.warn('Error in reverse geocoding:', geocodeError);
          // Continue even if geocoding fails
        }
      }
      
      // Emit location update via socket if rider is en_route
      if (status === 'en_route' && riderLocation.currentRideId) {
        try {
          socketService.emitToRoom(
            `ride:${riderLocation.currentRideId}`, 
            'rider_location_update', 
            {
              riderId: req.user._id,
              location: {
                lat: locationData.lat,
                lng: locationData.lng
              },
              heading: locationData.heading,
              speed: locationData.speed,
              timestamp: new Date()
            }
          );
        } catch (socketError) {
          console.warn('Error emitting location update via socket:', socketError);
          // Continue even if socket emission fails
        }
      }
      
      return res.status(200).json({
        success: true,
        message: 'Location updated successfully',
        data: riderLocation
      });
    } catch (dbError) {
      console.error('Database error updating rider location:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error updating rider location:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update location'
    });
  }
});

/**
 * @route GET /api/v1/mongo/location/current
 * @desc Get rider's current location
 * @access Private (rider only)
 */
router.get('/current', authenticate, async (req, res) => {
  try {
    // All users in the rider app have rider role
    
    // Check if this is a temporary user ID (used during registration)
    if (isTemporaryId(req.user._id)) {
      console.log('Using temporary user ID:', req.user._id);
      
      // For temporary users, return a synthetic response
      // This allows the app to continue functioning during registration
      return res.status(200).json({
        success: true,
        data: {
          riderId: req.user._id,
          currentLocation: {
            type: 'Point',
            coordinates: [0, 0] // Default coordinates
          },
          formattedAddress: 'Registration in progress',
          status: 'offline',
          lastUpdated: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    
    // For regular users, query the database
    try {
      // Find rider's current location
      const riderLocation = await RiderLocation.findOne({ riderId: req.user._id });
      
      if (!riderLocation) {
        return res.status(404).json({
          success: false,
          message: 'No location data found for this rider'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: riderLocation
      });
    } catch (dbError) {
      console.error('Database error getting rider location:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error getting rider location:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get location data'
    });
  }
});

/**
 * @route GET /api/v1/mongo/location/rider/:riderId
 * @desc Get a specific rider's location (for active rides only)
 * @access Private
 */
router.get('/rider/:riderId', authenticate, async (req, res) => {
  try {
    const { riderId } = req.params;
    
    // Special handling for temporary IDs
    if (isTemporaryId(riderId)) {
      return res.status(404).json({
        success: false,
        message: 'No location data found for this temporary rider'
      });
    }
    
    // Validate rider ID
    if (!isValidObjectId(riderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rider ID'
      });
    }
    
    // Check if the user has permission to view this rider's location
    // TODO: Add proper permission check based on active rides
    
    // Find rider's current location
    const riderLocation = await RiderLocation.findOne({ riderId })
      .populate('riderId', 'firstName lastName phoneNumber profilePicture riderProfile.averageRating');
    
    if (!riderLocation) {
      return res.status(404).json({
        success: false,
        message: 'No location data found for this rider'
      });
    }
    
    // Return a simplified version of the location data
    return res.status(200).json({
      success: true,
      data: {
        riderId: riderLocation.riderId,
        location: {
          lat: riderLocation.currentLocation.coordinates[1],
          lng: riderLocation.currentLocation.coordinates[0]
        },
        formattedAddress: riderLocation.formattedAddress,
        heading: riderLocation.heading,
        speed: riderLocation.speed,
        status: riderLocation.status,
        lastUpdated: riderLocation.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error getting rider location:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get location data'
    });
  }
});

/**
 * @route GET /api/v1/mongo/location/nearby
 * @desc Find nearby riders
 * @access Private
 */
router.get('/nearby', authenticate, async (req, res) => {
  try {
    const { lat, lng, radius = 5000, status = 'online' } = req.query;
    
    // Validate required fields
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    // Find nearby riders
    const nearbyRiders = await RiderLocation.findNearbyRiders(
      { lat: parseFloat(lat), lng: parseFloat(lng) },
      parseFloat(radius),
      status
    );
    
    if (!nearbyRiders || nearbyRiders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No nearby riders found',
        data: {
          count: 0,
          riders: []
        }
      });
    }
    
    // Format the response
    const formattedRiders = nearbyRiders.map(rider => ({
      riderId: rider.riderId._id,
      name: `${rider.riderId.firstName} ${rider.riderId.lastName}`,
      phoneNumber: rider.riderId.phoneNumber,
      profilePicture: rider.riderId.profilePicture,
      rating: rider.riderId.riderProfile?.averageRating || 0,
      location: {
        lat: rider.currentLocation.coordinates[1],
        lng: rider.currentLocation.coordinates[0]
      },
      formattedAddress: rider.formattedAddress,
      status: rider.status,
      lastUpdated: rider.lastUpdated
    }));
    
    return res.status(200).json({
      success: true,
      data: {
        count: formattedRiders.length,
        riders: formattedRiders
      }
    });
  } catch (error) {
    console.error('Error finding nearby riders:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to find nearby riders'
    });
  }
});

/**
 * @route PUT /api/v1/mongo/location/status
 * @desc Update rider's status (online/offline/busy)
 * @access Private (rider only)
 */
router.put('/status', authenticate, async (req, res) => {
  try {
    // All users in the rider app have rider role
    
    const { status } = req.body;
    
    // Validate status
    if (!status || !['online', 'offline', 'busy'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required (online, offline, or busy)'
      });
    }
    
    // Check if this is a temporary user ID (used during registration)
    if (isTemporaryId(req.user._id)) {
      console.log('Using temporary user ID:', req.user._id);
      
      // For temporary users, return a synthetic response without DB interaction
      return res.status(200).json({
        success: true,
        message: `Rider status updated to ${status} (registration in progress)`,
        data: {
          status: status,
          lastUpdated: new Date()
        }
      });
    }
    
    // For regular users, update in the database
    try {
      // Update rider location status
      const riderLocation = await RiderLocation.findOneAndUpdate(
        { riderId: req.user._id },
        { $set: { 
          status,
          lastUpdated: new Date()
        }},
        { new: true, upsert: true }
      );
      
      return res.status(200).json({
        success: true,
        message: `Rider status updated to ${status}`,
        data: {
          status: riderLocation.status,
          lastUpdated: riderLocation.lastUpdated
        }
      });
    } catch (dbError) {
      console.error('Database error updating rider status:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error updating rider status:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update rider status'
    });
  }
});

/**
 * @route GET /api/v1/mongo/location/history/:riderId
 * @desc Get location history for a rider
 * @access Private (admin only)
 */
router.get('/history/:riderId', authenticate, async (req, res) => {
  try {
    // Check if the user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin users can access location history'
      });
    }
    
    const { riderId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Special handling for temporary IDs
    if (isTemporaryId(riderId)) {
      return res.status(404).json({
        success: false,
        message: 'No location history for temporary riders'
      });
    }
    
    // Validate rider ID
    if (!isValidObjectId(riderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rider ID'
      });
    }
    
    // Parse dates
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to last 24 hours
    const end = endDate ? new Date(endDate) : new Date();
    
    // Get location history
    const locationHistory = await RiderLocation.getRiderLocationHistory(riderId, start, end);
    
    return res.status(200).json({
      success: true,
      data: {
        riderId,
        startDate: start,
        endDate: end,
        count: locationHistory.length,
        history: locationHistory
      }
    });
  } catch (error) {
    console.error('Error getting location history:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get location history'
    });
  }
});

/**
 * @route GET /api/v1/mongo/location/stats
 * @desc Get location statistics (for admin dashboard)
 * @access Private (admin only)
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Check if the user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin users can access location statistics'
      });
    }
    
    // Get counts by status
    const onlineCount = await RiderLocation.countDocuments({ status: 'online' });
    const busyCount = await RiderLocation.countDocuments({ status: 'busy' });
    const enRouteCount = await RiderLocation.countDocuments({ status: 'en_route' });
    const offlineCount = await RiderLocation.countDocuments({ status: 'offline' });
    
    // Get recently updated riders
    const recentlyUpdated = await RiderLocation.find()
      .sort({ lastUpdated: -1 })
      .limit(10)
      .populate('riderId', 'firstName lastName phoneNumber');
    
    return res.status(200).json({
      success: true,
      data: {
        statusCounts: {
          online: onlineCount,
          busy: busyCount,
          en_route: enRouteCount,
          offline: offlineCount,
          total: onlineCount + busyCount + enRouteCount + offlineCount
        },
        recentlyUpdated: recentlyUpdated.map(location => ({
          riderId: location.riderId._id,
          name: `${location.riderId.firstName} ${location.riderId.lastName}`,
          phoneNumber: location.riderId.phoneNumber,
          status: location.status,
          lastUpdated: location.lastUpdated
        }))
      }
    });
  } catch (error) {
    console.error('Error getting location statistics:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get location statistics'
    });
  }
});

export default router;
