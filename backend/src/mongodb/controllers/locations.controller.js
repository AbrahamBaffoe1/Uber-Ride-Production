/**
 * Locations Controller for Passenger App
 * Handles location-related endpoints for passengers
 */
import SavedLocation from '../models/SavedLocation.js';
import mapsService from '../../services/maps.service.js';

/**
 * Get user's saved locations
 * @route GET /api/v1/mongo/locations/saved
 */
export const getSavedLocations = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    
    const savedLocations = await SavedLocation.find({ 
      userId,
      status: 'active' 
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      status: 'success',
      data: {
        locations: savedLocations.map(location => ({
          id: location._id,
          name: location.name,
          address: location.address,
          coordinates: location.coordinates,
          type: location.type,
          createdAt: location.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching saved locations:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch saved locations'
    });
  }
};

/**
 * Get popular destinations
 * @route GET /api/v1/mongo/locations/popular
 */
export const getPopularDestinations = async (req, res) => {
  try {
    // For now, return static popular destinations
    // TODO: Implement dynamic popular destinations based on ride history
    const popularDestinations = [
      {
        id: '1',
        name: 'Airport',
        address: 'International Airport',
        coordinates: {
          lat: 6.5818,
          lng: 3.3211
        },
        type: 'airport'
      },
      {
        id: '2',
        name: 'Central Business District',
        address: 'Victoria Island, Lagos',
        coordinates: {
          lat: 6.4281,
          lng: 3.4219
        },
        type: 'business'
      },
      {
        id: '3',
        name: 'National Stadium',
        address: 'Surulere, Lagos',
        coordinates: {
          lat: 6.4949,
          lng: 3.3650
        },
        type: 'landmark'
      }
    ];

    return res.status(200).json({
      status: 'success',
      data: {
        destinations: popularDestinations
      }
    });
  } catch (error) {
    console.error('Error fetching popular destinations:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch popular destinations'
    });
  }
};

/**
 * Get nearest city center based on coordinates
 * @route GET /api/v1/mongo/locations/city-center
 */
export const getNearestCityCenter = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        status: 'error',
        message: 'Latitude and longitude are required'
      });
    }

    // Use reverse geocoding to get city information
    try {
      const geocodeResult = await mapsService.reverseGeocode({
        lat: parseFloat(latitude),
        lng: parseFloat(longitude)
      });

      if (geocodeResult.success) {
        // Extract city information from address components
        const addressComponents = geocodeResult.data.addressComponents || [];
        const cityComponent = addressComponents.find(
          component => component.types.includes('locality') || 
                      component.types.includes('administrative_area_level_1')
        );

        const cityName = cityComponent ? cityComponent.long_name : 'City Center';

        return res.status(200).json({
          status: 'success',
          data: {
            cityCenter: {
              name: cityName,
              address: geocodeResult.data.formatted_address,
              coordinates: {
                lat: parseFloat(latitude),
                lng: parseFloat(longitude)
              }
            }
          }
        });
      }
    } catch (geocodeError) {
      console.warn('Geocoding error:', geocodeError);
    }

    // Fallback response if geocoding fails
    return res.status(200).json({
      status: 'success',
      data: {
        cityCenter: {
          name: 'City Center',
          address: 'Current Location',
          coordinates: {
            lat: parseFloat(latitude),
            lng: parseFloat(longitude)
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching nearest city center:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch nearest city center'
    });
  }
};

/**
 * Save a location for the user
 * @route POST /api/v1/mongo/locations/save
 */
export const saveLocation = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { name, address, coordinates, type = 'other' } = req.body;

    if (!name || !address || !coordinates) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, address, and coordinates are required'
      });
    }

    const savedLocation = new SavedLocation({
      userId,
      name,
      address,
      coordinates: {
        type: 'Point',
        coordinates: [coordinates.lng, coordinates.lat]
      },
      type,
      status: 'active'
    });

    await savedLocation.save();

    return res.status(201).json({
      status: 'success',
      message: 'Location saved successfully',
      data: {
        location: {
          id: savedLocation._id,
          name: savedLocation.name,
          address: savedLocation.address,
          coordinates: {
            lat: coordinates.lat,
            lng: coordinates.lng
          },
          type: savedLocation.type
        }
      }
    });
  } catch (error) {
    console.error('Error saving location:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to save location'
    });
  }
};

/**
 * Delete a saved location
 * @route DELETE /api/v1/mongo/locations/saved/:locationId
 */
export const deleteSavedLocation = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { locationId } = req.params;

    const result = await SavedLocation.findOneAndUpdate(
      { _id: locationId, userId },
      { status: 'deleted' },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        status: 'error',
        message: 'Location not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Location deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting location:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete location'
    });
  }
};
