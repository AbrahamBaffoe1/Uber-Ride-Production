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
    // Real popular destinations in Lagos, Nigeria
    const popularDestinations = [
      {
        id: '1',
        name: 'Murtala Muhammed International Airport',
        address: 'Ikeja, Lagos State, Nigeria',
        coordinates: {
          lat: 6.5774,
          lng: 3.3212
        },
        type: 'airport',
        popularity: 95
      },
      {
        id: '2',
        name: 'Victoria Island',
        address: 'Victoria Island, Lagos, Nigeria',
        coordinates: {
          lat: 6.4281,
          lng: 3.4219
        },
        type: 'business',
        popularity: 90
      },
      {
        id: '3',
        name: 'Lagos Island',
        address: 'Lagos Island, Lagos, Nigeria',
        coordinates: {
          lat: 6.4541,
          lng: 3.3947
        },
        type: 'business',
        popularity: 85
      },
      {
        id: '4',
        name: 'Ikeja City Mall',
        address: 'Obafemi Awolowo Way, Ikeja, Lagos',
        coordinates: {
          lat: 6.6018,
          lng: 3.3515
        },
        type: 'shopping',
        popularity: 80
      },
      {
        id: '5',
        name: 'National Theatre',
        address: 'Iganmu, Lagos, Nigeria',
        coordinates: {
          lat: 6.4698,
          lng: 3.3889
        },
        type: 'landmark',
        popularity: 75
      },
      {
        id: '6',
        name: 'Lekki Phase 1',
        address: 'Lekki Phase 1, Lagos, Nigeria',
        coordinates: {
          lat: 6.4474,
          lng: 3.4553
        },
        type: 'residential',
        popularity: 75
      },
      {
        id: '7',
        name: 'University of Lagos (UNILAG)',
        address: 'Akoka, Lagos, Nigeria',
        coordinates: {
          lat: 6.5158,
          lng: 3.3898
        },
        type: 'education',
        popularity: 70
      },
      {
        id: '8',
        name: 'Tafawa Balewa Square',
        address: 'Lagos Island, Lagos, Nigeria',
        coordinates: {
          lat: 6.4541,
          lng: 3.3892
        },
        type: 'landmark',
        popularity: 65
      },
      {
        id: '9',
        name: 'Computer Village',
        address: 'Ikeja, Lagos, Nigeria',
        coordinates: {
          lat: 6.6058,
          lng: 3.3518
        },
        type: 'technology',
        popularity: 65
      },
      {
        id: '10',
        name: 'Lagos State University (LASU)',
        address: 'Ojo, Lagos, Nigeria',
        coordinates: {
          lat: 6.5629,
          lng: 3.2815
        },
        type: 'education',
        popularity: 60
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

/**
 * Get suggested locations based on user's current location
 * @route GET /api/v1/mongo/locations/suggestions
 */
export const getSuggestedLocations = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    const userId = req.user.id || req.user._id;
    
    // First check if user has saved locations
    const savedLocationsCount = await SavedLocation.countDocuments({ 
      userId,
      status: 'active' 
    });

    // If user has saved locations, return those
    if (savedLocationsCount > 0) {
      const savedLocations = await SavedLocation.find({ 
        userId,
        status: 'active' 
      }).sort({ usageCount: -1, lastUsed: -1 }).limit(5);

      return res.status(200).json({
        status: 'success',
        data: {
          suggestions: savedLocations.map(location => ({
            id: location._id,
            name: location.name,
            address: location.address,
            coordinates: {
              lat: location.coordinates.coordinates[1],
              lng: location.coordinates.coordinates[0]
            },
            type: location.type,
            source: 'saved'
          }))
        }
      });
    }

    // If no saved locations, provide popular nearby suggestions
    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);
    
    // Calculate distances to popular destinations and return closest ones
    const popularDestinations = [
      {
        id: 'suggested-1',
        name: 'Murtala Muhammed International Airport',
        address: 'Ikeja, Lagos State, Nigeria',
        coordinates: { lat: 6.5774, lng: 3.3212 },
        type: 'airport'
      },
      {
        id: 'suggested-2',
        name: 'Victoria Island',
        address: 'Victoria Island, Lagos, Nigeria',
        coordinates: { lat: 6.4281, lng: 3.4219 },
        type: 'business'
      },
      {
        id: 'suggested-3',
        name: 'Lagos Island',
        address: 'Lagos Island, Lagos, Nigeria',
        coordinates: { lat: 6.4541, lng: 3.3947 },
        type: 'business'
      },
      {
        id: 'suggested-4',
        name: 'Ikeja City Mall',
        address: 'Obafemi Awolowo Way, Ikeja, Lagos',
        coordinates: { lat: 6.6018, lng: 3.3515 },
        type: 'shopping'
      },
      {
        id: 'suggested-5',
        name: 'Lekki Phase 1',
        address: 'Lekki Phase 1, Lagos, Nigeria',
        coordinates: { lat: 6.4474, lng: 3.4553 },
        type: 'residential'
      }
    ];

    // Calculate distance and sort by proximity
    const suggestionsWithDistance = popularDestinations.map(dest => {
      const distance = Math.sqrt(
        Math.pow(userLat - dest.coordinates.lat, 2) + 
        Math.pow(userLng - dest.coordinates.lng, 2)
      );
      return { ...dest, distance, source: 'suggested' };
    });

    // Sort by distance and take top 5
    const sortedSuggestions = suggestionsWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)
      .map(({ distance, ...suggestion }) => suggestion);

    return res.status(200).json({
      status: 'success',
      data: {
        suggestions: sortedSuggestions
      }
    });
  } catch (error) {
    console.error('Error fetching suggested locations:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch suggested locations'
    });
  }
};

/**
 * Search for locations using Google Places API
 * @route GET /api/v1/mongo/locations/search
 */
export const searchLocations = async (req, res) => {
  try {
    const { query, latitude, longitude } = req.query;
    
    if (!query) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required'
      });
    }

    // Use Google Places API to search for locations
    let searchResults = [];
    
    try {
      // Try geocoding the search query first
      const geocodeResult = await mapsService.geocodeAddress(query);
      
      if (geocodeResult.success) {
        searchResults.push({
          id: `geocode-${geocodeResult.data.place_id}`,
          name: query,
          address: geocodeResult.data.formatted_address,
          coordinates: geocodeResult.data.coordinates,
          type: 'search_result',
          source: 'google_places'
        });
      }

      // If we have user location, search for nearby places
      if (latitude && longitude) {
        const nearbyResult = await mapsService.searchNearbyPlaces(
          { lat: parseFloat(latitude), lng: parseFloat(longitude) },
          5000, // 5km radius
          null,
          query
        );

        if (nearbyResult.success && nearbyResult.data.places) {
          const nearbyPlaces = nearbyResult.data.places.slice(0, 5).map(place => ({
            id: `nearby-${place.place_id}`,
            name: place.name,
            address: place.vicinity,
            coordinates: {
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng
            },
            type: 'nearby_place',
            source: 'google_places',
            rating: place.rating
          }));
          
          searchResults = [...searchResults, ...nearbyPlaces];
        }
      }
    } catch (mapsError) {
      console.warn('Maps API error during search:', mapsError);
    }

    // If no results from maps API, provide fallback suggestions
    if (searchResults.length === 0) {
      searchResults = [
        {
          id: 'fallback-1',
          name: query,
          address: `${query}, Lagos, Nigeria`,
          coordinates: { lat: 6.5244, lng: 3.3792 }, // Default Lagos center
          type: 'fallback',
          source: 'fallback'
        }
      ];
    }

    return res.status(200).json({
      status: 'success',
      data: {
        results: searchResults
      }
    });
  } catch (error) {
    console.error('Error searching locations:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to search locations'
    });
  }
};
