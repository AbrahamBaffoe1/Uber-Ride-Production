/**
 * MongoDB Geocoding Routes
 * Defines API endpoints for geocoding and location-based services
 * Using the centralized Maps service for consistent handling
 */
const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const mapsService = require('../../services/maps.service');

const router = express.Router();

/**
 * @route GET /api/v1/mongo/geocoding/address
 * @desc Convert coordinates to address (reverse geocoding)
 * @access Private
 */
router.get('/address', authenticate, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    // Use the Maps service for reverse geocoding
    const result = await mapsService.reverseGeocode({ lat: parseFloat(lat), lng: parseFloat(lng) });
    
    // Return the result
    return res.status(result.success ? 200 : (result.status === 404 ? 404 : 500)).json(result);
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to convert coordinates to address'
    });
  }
});

/**
 * @route GET /api/v1/mongo/geocoding/coordinates
 * @desc Convert address to coordinates (forward geocoding)
 * @access Private
 */
router.get('/coordinates', authenticate, async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required'
      });
    }
    
    // Use the Maps service for geocoding
    const result = await mapsService.geocodeAddress(address);
    
    // Return the result
    return res.status(result.success ? 200 : (result.status === 404 ? 404 : 500)).json(result);
  } catch (error) {
    console.error('Error in forward geocoding:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to convert address to coordinates'
    });
  }
});

/**
 * @route GET /api/v1/mongo/geocoding/distance
 * @desc Calculate distance between two points
 * @access Private
 */
router.get('/distance', authenticate, async (req, res) => {
  try {
    const { origins, destinations, mode = 'driving' } = req.query;
    
    if (!origins || !destinations) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination coordinates are required'
      });
    }
    
    // Parse coordinates if provided as "lat,lng" strings
    let origin = origins;
    let destination = destinations;
    
    if (origins.includes(',')) {
      const [lat, lng] = origins.split(',').map(coord => parseFloat(coord.trim()));
      origin = { lat, lng };
    }
    
    if (destinations.includes(',')) {
      const [lat, lng] = destinations.split(',').map(coord => parseFloat(coord.trim()));
      destination = { lat, lng };
    }
    
    // Use the Maps service for distance calculation
    const result = await mapsService.calculateDistance(origin, destination, mode);
    
    // Return the result
    return res.status(result.success ? 200 : (result.status === 404 ? 404 : 500)).json(result);
  } catch (error) {
    console.error('Error calculating distance:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate distance'
    });
  }
});

/**
 * @route GET /api/v1/mongo/geocoding/places
 * @desc Search for places nearby
 * @access Private
 */
router.get('/places', authenticate, async (req, res) => {
  try {
    const { location, radius = 1500, type, keyword } = req.query;
    
    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates are required'
      });
    }
    
    // Parse location if provided as "lat,lng" string
    let locationObj = location;
    if (typeof location === 'string' && location.includes(',')) {
      const [lat, lng] = location.split(',').map(coord => parseFloat(coord.trim()));
      locationObj = { lat, lng };
    }
    
    // Use the Maps service for places search
    const result = await mapsService.searchNearbyPlaces(
      locationObj, 
      parseInt(radius), 
      type, 
      keyword
    );
    
    // Return the result
    return res.status(result.success ? 200 : (result.status === 404 ? 404 : 500)).json(result);
  } catch (error) {
    console.error('Error searching places:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to search places'
    });
  }
});

/**
 * @route GET /api/v1/mongo/geocoding/directions
 * @desc Get directions between two points
 * @access Private
 */
router.get('/directions', authenticate, async (req, res) => {
  try {
    const { origin, destination, mode = 'driving', waypoints } = req.query;
    
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination are required'
      });
    }
    
    // Use the Maps service for directions
    const result = await mapsService.getDirections(origin, destination, mode, waypoints);
    
    // Return the result
    return res.status(result.success ? 200 : (result.status === 404 ? 404 : 500)).json(result);
  } catch (error) {
    console.error('Error getting directions:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get directions'
    });
  }
});

/**
 * @route GET /api/v1/mongo/geocoding/route-options
 * @desc Get multiple route options between two points
 * @access Private
 */
router.get('/route-options', authenticate, async (req, res) => {
  try {
    const { origin, destination } = req.query;
    
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination are required'
      });
    }
    
    // Use the Maps service for route options
    const result = await mapsService.getRouteOptions(origin, destination);
    
    // Return the result
    return res.status(result.success ? 200 : (result.status === 404 ? 404 : 500)).json(result);
  } catch (error) {
    console.error('Error getting route options:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get route options'
    });
  }
});

/**
 * @route GET /api/v1/mongo/geocoding/static-map
 * @desc Get a static map image URL
 * @access Private
 */
router.get('/static-map', authenticate, async (req, res) => {
  try {
    const { center, zoom, size, mapType, markers, path } = req.query;
    
    // Parse center if provided as "lat,lng" string
    let centerObj = null;
    if (center && center.includes(',')) {
      const [lat, lng] = center.split(',').map(coord => parseFloat(coord.trim()));
      centerObj = { lat, lng };
    }
    
    // Parse markers if provided
    let markersArray = [];
    if (markers && typeof markers === 'string') {
      try {
        markersArray = JSON.parse(markers);
      } catch (e) {
        console.warn('Could not parse markers JSON:', e);
      }
    }
    
    // Get the static map URL
    const mapUrl = mapsService.getStaticMapUrl(
      {
        center: centerObj,
        zoom: zoom ? parseInt(zoom) : undefined,
        size,
        mapType
      },
      markersArray,
      path
    );
    
    if (!mapUrl) {
      return res.status(503).json({
        success: false,
        message: 'Static map service is not configured'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        url: mapUrl
      }
    });
  } catch (error) {
    console.error('Error generating static map:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate static map'
    });
  }
});

/**
 * @route GET /api/v1/mongo/geocoding/status
 * @desc Check if geocoding service is configured and available
 * @access Private
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const config = mapsService.getConfig();
    
    return res.status(200).json({
      success: true,
      data: {
        isConfigured: config.isConfigured,
        defaultCenter: config.defaultCenter,
        simulationEnabled: config.simulation.enabled,
        availableServices: Object.keys(config.endpoints)
      }
    });
  } catch (error) {
    console.error('Error checking geocoding status:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to check geocoding status'
    });
  }
});

module.exports = router;
