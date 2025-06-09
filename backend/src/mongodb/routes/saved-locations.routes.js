/**
 * Saved Locations Routes
 * Handles user saved locations, popular destinations, and city centers
 */
const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const User = require('../models/User');
const { isValidObjectId } = require('mongoose');
const mapsService = require('../../services/maps.service');

const router = express.Router();

/**
 * @route GET /api/v1/mongo/locations/saved
 * @desc Get user's saved locations
 * @access Private
 */
router.get('/saved', authenticate, async (req, res) => {
  try {
    // Find user and populate saved addresses
    const user = await User.findById(req.user._id);
    
    if (!user || !user.passengerProfile) {
      return res.status(200).json({
        status: 'success',
        data: []
      });
    }
    
    // Format saved addresses
    const savedLocations = (user.passengerProfile.savedAddresses || []).map(address => ({
      id: address._id.toString(),
      name: address.name,
      address: address.address,
      coordinates: {
        latitude: address.coordinates.coordinates[1],
        longitude: address.coordinates.coordinates[0]
      },
      icon: address.icon || 'pin',
      userId: user._id,
      createdAt: address.createdAt || user.createdAt,
      updatedAt: address.updatedAt || user.updatedAt
    }));
    
    return res.status(200).json({
      status: 'success',
      data: savedLocations
    });
  } catch (error) {
    console.error('Error fetching saved locations:', error);
    
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch saved locations'
    });
  }
});

/**
 * @route POST /api/v1/mongo/locations/saved
 * @desc Add a new saved location
 * @access Private
 */
router.post('/saved', authenticate, async (req, res) => {
  try {
    const { name, address, coordinates, icon } = req.body;
    
    // Validate required fields
    if (!name || !address || !coordinates || !coordinates.latitude || !coordinates.longitude) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, address, and coordinates are required'
      });
    }
    
    // Find user
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Initialize passengerProfile if it doesn't exist
    if (!user.passengerProfile) {
      user.passengerProfile = { savedAddresses: [] };
    }
    
    // Initialize savedAddresses if it doesn't exist
    if (!user.passengerProfile.savedAddresses) {
      user.passengerProfile.savedAddresses = [];
    }
    
    // Check if user already has max number of saved locations (10)
    if (user.passengerProfile.savedAddresses.length >= 10) {
      return res.status(400).json({
        status: 'error',
        message: 'Maximum number of saved locations reached (10)'
      });
    }
    
    // Create new saved location
    const savedLocation = {
      name,
      address,
      coordinates: {
        type: 'Point',
        coordinates: [coordinates.longitude, coordinates.latitude]
      },
      icon: icon || 'pin',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Add to user's saved addresses
    user.passengerProfile.savedAddresses.push(savedLocation);
    
    // Save user
    await user.save();
    
    // Get the saved location that was just added
    const newSavedLocation = user.passengerProfile.savedAddresses[user.passengerProfile.savedAddresses.length - 1];
    
    // Format response
    const response = {
      id: newSavedLocation._id.toString(),
      name: newSavedLocation.name,
      address: newSavedLocation.address,
      coordinates: {
        latitude: newSavedLocation.coordinates.coordinates[1],
        longitude: newSavedLocation.coordinates.coordinates[0]
      },
      icon: newSavedLocation.icon,
      userId: user._id,
      createdAt: newSavedLocation.createdAt,
      updatedAt: newSavedLocation.updatedAt
    };
    
    return res.status(201).json({
      status: 'success',
      data: response
    });
  } catch (error) {
    console.error('Error adding saved location:', error);
    
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to add saved location'
    });
  }
});

/**
 * @route DELETE /api/v1/mongo/locations/saved/:id
 * @desc Delete a saved location
 * @access Private
 */
router.delete('/saved/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid location ID'
      });
    }
    
    // Find user
    const user = await User.findById(req.user._id);
    
    if (!user || !user.passengerProfile || !user.passengerProfile.savedAddresses) {
      return res.status(404).json({
        status: 'error',
        message: 'User or saved locations not found'
      });
    }
    
    // Find the index of the saved location
    const locationIndex = user.passengerProfile.savedAddresses.findIndex(
      address => address._id.toString() === id
    );
    
    if (locationIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Saved location not found'
      });
    }
    
    // Remove the saved location
    user.passengerProfile.savedAddresses.splice(locationIndex, 1);
    
    // Save user
    await user.save();
    
    return res.status(200).json({
      status: 'success',
      message: 'Saved location deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting saved location:', error);
    
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to delete saved location'
    });
  }
});

/**
 * @route GET /api/v1/mongo/locations/popular
 * @desc Get popular destinations
 * @access Public
 */
router.get('/popular', async (req, res) => {
  try {
    // In a real application, this would come from analytics data
    // For demonstration, we'll return hardcoded popular destinations
    const popularDestinations = [
      {
        id: 'popular1',
        name: 'City Center',
        address: 'Downtown, Lagos',
        coordinates: {
          latitude: 6.4550,
          longitude: 3.3841
        },
        popularity: 98
      },
      {
        id: 'popular2',
        name: 'Ikeja Mall',
        address: 'Ikeja, Lagos',
        coordinates: {
          latitude: 6.6018,
          longitude: 3.3515
        },
        popularity: 85
      },
      {
        id: 'popular3',
        name: 'Lekki Phase 1',
        address: 'Lekki, Lagos',
        coordinates: {
          latitude: 6.4381,
          longitude: 3.4694
        },
        popularity: 92
      },
      {
        id: 'popular4',
        name: 'Victoria Island',
        address: 'Victoria Island, Lagos',
        coordinates: {
          latitude: 6.4281,
          longitude: 3.4219
        },
        popularity: 90
      },
      {
        id: 'popular5',
        name: 'Murtala Muhammed Airport',
        address: 'Ikeja, Lagos',
        coordinates: {
          latitude: 6.5774,
          longitude: 3.3213
        },
        popularity: 87
      }
    ];
    
    return res.status(200).json({
      status: 'success',
      data: popularDestinations
    });
  } catch (error) {
    console.error('Error fetching popular destinations:', error);
    
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch popular destinations'
    });
  }
});

/**
 * @route GET /api/v1/mongo/locations/city-center
 * @desc Get nearest city center based on coordinates
 * @access Public
 */
router.get('/city-center', async (req, res) => {
  try {
    const { latitude, longitude } = req.query.params || req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        status: 'error',
        message: 'Latitude and longitude are required'
      });
    }
    
    // In a real application, this would use GeoIP or a city database
    // For demonstration, we'll use hardcoded city centers for certain regions
    // and use the maps service for others
    
    // Hardcoded city centers for common locations
    const cityCenters = [
      {
        name: 'Lagos',
        latitude: 6.4550,
        longitude: 3.3841,
        bounds: {
          minLat: 6.3936,
          maxLat: 6.7075,
          minLng: 3.0982,
          maxLng: 3.4693
        }
      },
      {
        name: 'Abuja',
        latitude: 9.0765,
        longitude: 7.3986,
        bounds: {
          minLat: 8.9936,
          maxLat: 9.1075,
          minLng: 7.3186,
          maxLng: 7.4786
        }
      },
      {
        name: 'Kano',
        latitude: 12.0022,
        longitude: 8.5920,
        bounds: {
          minLat: 11.9500,
          maxLat: 12.0544,
          minLng: 8.5420,
          maxLng: 8.6420
        }
      }
    ];
    
    // Try to find a city center that contains these coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    for (const city of cityCenters) {
      if (lat >= city.bounds.minLat && lat <= city.bounds.maxLat &&
          lng >= city.bounds.minLng && lng <= city.bounds.maxLng) {
        return res.status(200).json({
          status: 'success',
          data: {
            name: city.name,
            latitude: city.latitude,
            longitude: city.longitude
          }
        });
      }
    }
    
    // If we couldn't find a hardcoded city center, try using the maps service
    try {
      const geocodeResult = await mapsService.reverseGeocode({ lat, lng });
      
      if (geocodeResult.success && geocodeResult.data) {
        // Extract city name from address components
        let cityName = 'Unknown City';
        
        if (geocodeResult.data.addressComponents) {
          const cityComponent = geocodeResult.data.addressComponents.find(
            component => component.types.includes('locality')
          );
          
          if (cityComponent) {
            cityName = cityComponent.long_name;
          }
        }
        
        return res.status(200).json({
          status: 'success',
          data: {
            name: cityName,
            latitude: lat,
            longitude: lng
          }
        });
      }
    } catch (geocodeError) {
      console.warn('Error in reverse geocoding:', geocodeError);
      // Continue to fallback
    }
    
    // Fallback: return the input coordinates as the "city center"
    return res.status(200).json({
      status: 'success',
      data: {
        name: 'Current Location',
        latitude: lat,
        longitude: lng
      }
    });
  } catch (error) {
    console.error('Error finding nearest city center:', error);
    
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to find nearest city center'
    });
  }
});

module.exports = router;
