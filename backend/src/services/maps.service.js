/**
 * Maps Service
 * Central service for Google Maps API interactions
 */
import axios from 'axios';
import { getMapsConfig, generateStaticMapUrl, formatCoordinates } from '../config/mapsConfig.js';

// Helper function to add delay for simulations
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Geocode an address to coordinates
 * @param {string} address Address to geocode
 * @returns {Promise<Object>} Geocoding result
 */
const geocodeAddress = async (address) => {
  try {
    const config = getMapsConfig();
    
    // Check if API key is available
    if (!config.isConfigured) {
      // Return simulated response for development
      await delay(config.simulation.simulationDelay);
      
      return {
        success: true,
        data: {
          coordinates: config.defaultCenter,
          formatted_address: `${address} (Simulated)`,
          place_id: 'simulated-place-id',
          location_type: 'APPROXIMATE'
        },
        simulated: true
      };
    }
    
    // Call Google Maps Geocoding API
    const response = await axios.get(config.endpoints.geocode, {
      params: {
        address,
        key: config.apiKey
      }
    });
    
    // Process and format the response
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      const location = result.geometry.location;
      
      return {
        success: true,
        data: {
          coordinates: {
            lat: location.lat,
            lng: location.lng
          },
          formatted_address: result.formatted_address,
          place_id: result.place_id,
          location_type: result.geometry.location_type,
          address_components: result.address_components
        }
      };
    } else {
      return {
        success: false,
        message: 'No coordinates found for this address',
        status: response.data.status
      };
    }
  } catch (error) {
    console.error('Error in geocoding address:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to geocode address',
      error: error.response?.data || error.message
    };
  }
};

/**
 * Reverse geocode coordinates to address
 * @param {Object} coordinates Coordinates to reverse geocode
 * @param {number} coordinates.lat Latitude
 * @param {number} coordinates.lng Longitude
 * @returns {Promise<Object>} Reverse geocoding result
 */
const reverseGeocode = async (coordinates) => {
  try {
    const config = getMapsConfig();
    
    // Check if API key is available
    if (!config.isConfigured) {
      // Return simulated response for development
      await delay(config.simulation.simulationDelay);
      
      return {
        success: true,
        data: {
          formatted_address: 'Simulated Address, Lagos, Nigeria',
          place_id: 'simulated-place-id',
          addressComponents: {
            city: 'Lagos',
            state: 'Lagos State',
            country: 'Nigeria',
            postalCode: '100001'
          },
          coordinates
        },
        simulated: true
      };
    }
    
    // Check for valid coordinates
    if (!coordinates || !coordinates.lat || !coordinates.lng) {
      return {
        success: false,
        message: 'Valid coordinates are required'
      };
    }
    
    // Call Google Maps Reverse Geocoding API
    const response = await axios.get(config.endpoints.geocode, {
      params: {
        latlng: `${coordinates.lat},${coordinates.lng}`,
        key: config.apiKey
      }
    });
    
    // Process and format the response
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      
      // Extract address components
      const addressComponents = {};
      result.address_components.forEach(component => {
        const types = component.types;
        
        if (types.includes('street_number')) {
          addressComponents.streetNumber = component.long_name;
        } else if (types.includes('route')) {
          addressComponents.street = component.long_name;
        } else if (types.includes('locality')) {
          addressComponents.city = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
          addressComponents.state = component.long_name;
          addressComponents.stateCode = component.short_name;
        } else if (types.includes('country')) {
          addressComponents.country = component.long_name;
          addressComponents.countryCode = component.short_name;
        } else if (types.includes('postal_code')) {
          addressComponents.postalCode = component.long_name;
        }
      });
      
      return {
        success: true,
        data: {
          formatted_address: result.formatted_address,
          place_id: result.place_id,
          addressComponents,
          coordinates,
          address_components: result.address_components
        }
      };
    } else {
      return {
        success: false,
        message: 'No address found for these coordinates',
        status: response.data.status
      };
    }
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to reverse geocode coordinates',
      error: error.response?.data || error.message
    };
  }
};

/**
 * Calculate distance between two points
 * @param {Object} origin Origin coordinates or address
 * @param {Object} destination Destination coordinates or address
 * @param {string} mode Travel mode (driving, walking, bicycling, transit)
 * @returns {Promise<Object>} Distance calculation result
 */
const calculateDistance = async (origin, destination, mode = 'driving') => {
  try {
    const config = getMapsConfig();
    
    // Check if API key is available
    if (!config.isConfigured) {
      // Return simulated response for development
      await delay(config.simulation.simulationDelay);
      
      // Generate random but sensible distance and duration
      const distance = Math.floor(Math.random() * 20) + 5; // 5-25 km
      const duration = Math.floor(distance * 2 * 60); // Approx 30km/h as seconds
      
      return {
        success: true,
        data: {
          distance: {
            text: `${distance} km`,
            value: distance * 1000 // meters
          },
          duration: {
            text: `${Math.floor(duration / 60)} mins`,
            value: duration // seconds
          },
          origin: typeof origin === 'string' ? origin : 'Origin Location',
          destination: typeof destination === 'string' ? destination : 'Destination Location',
          fare: {
            currency: 'NGN',
            value: Math.floor(distance * 100) + 500 // Basic pricing model
          }
        },
        simulated: true
      };
    }
    
    // Format origin and destination for API
    let originStr = typeof origin === 'string' ? origin : formatCoordinates(origin);
    let destinationStr = typeof destination === 'string' ? destination : formatCoordinates(destination);
    
    if (!originStr || !destinationStr) {
      return {
        success: false,
        message: 'Valid origin and destination are required'
      };
    }
    
    // Call Google Maps Distance Matrix API
    const response = await axios.get(config.endpoints.distanceMatrix, {
      params: {
        origins: originStr,
        destinations: destinationStr,
        mode,
        key: config.apiKey
      }
    });
    
    // Process and format the response
    if (response.data.status === 'OK' && response.data.rows.length > 0) {
      const element = response.data.rows[0].elements[0];
      
      if (element.status === 'OK') {
        return {
          success: true,
          data: {
            distance: element.distance,
            duration: element.duration,
            origin: response.data.origin_addresses[0],
            destination: response.data.destination_addresses[0],
            fare: element.fare, // Only available for some regions and modes
            mode
          }
        };
      } else {
        return {
          success: false,
          message: 'Could not calculate distance',
          status: element.status
        };
      }
    } else {
      return {
        success: false,
        message: 'Distance Matrix API error',
        status: response.data.status
      };
    }
  } catch (error) {
    console.error('Error calculating distance:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to calculate distance',
      error: error.response?.data || error.message
    };
  }
};

/**
 * Get directions between two points
 * @param {Object|string} origin Origin coordinates or address
 * @param {Object|string} destination Destination coordinates or address
 * @param {string} mode Travel mode (driving, walking, bicycling, transit)
 * @param {string|null} waypoints Optional waypoints
 * @returns {Promise<Object>} Directions result
 */
const getDirections = async (origin, destination, mode = 'driving', waypoints = null) => {
  try {
    const config = getMapsConfig();
    
    // Check if API key is available
    if (!config.isConfigured) {
      // Return simulated response for development
      await delay(config.simulation.simulationDelay);
      
      // Generate random but sensible distance and duration
      const distance = Math.floor(Math.random() * 20) + 5; // 5-25 km
      const duration = Math.floor(distance * 2 * 60); // Approx 30km/h as seconds
      
      return {
        success: true,
        data: {
          routes: [
            {
              summary: 'Simulated Route',
              overview_polyline: {
                points: 'simulated_polyline_string'
              },
              bounds: {
                northeast: { lat: 6.5244 + 0.1, lng: 3.3792 + 0.1 },
                southwest: { lat: 6.5244 - 0.1, lng: 3.3792 - 0.1 }
              },
              legs: [
                {
                  distance: { text: `${distance} km`, value: distance * 1000 },
                  duration: { text: `${Math.floor(duration / 60)} mins`, value: duration },
                  start_location: typeof origin === 'object' ? origin : config.defaultCenter,
                  end_location: typeof destination === 'object' ? destination : {
                    lat: config.defaultCenter.lat + 0.05,
                    lng: config.defaultCenter.lng + 0.05
                  },
                  start_address: 'Simulated Origin Address',
                  end_address: 'Simulated Destination Address',
                  steps: [
                    {
                      distance: { text: '0.5 km', value: 500 },
                      duration: { text: '1 min', value: 60 },
                      start_location: typeof origin === 'object' ? origin : config.defaultCenter,
                      end_location: {
                        lat: config.defaultCenter.lat + 0.02,
                        lng: config.defaultCenter.lng + 0.02
                      },
                      instructions: 'Head northeast',
                      travel_mode: mode.toUpperCase()
                    },
                    {
                      distance: { text: `${distance - 0.5} km`, value: (distance - 0.5) * 1000 },
                      duration: { text: `${Math.floor(duration / 60) - 1} mins`, value: duration - 60 },
                      start_location: {
                        lat: config.defaultCenter.lat + 0.02,
                        lng: config.defaultCenter.lng + 0.02
                      },
                      end_location: typeof destination === 'object' ? destination : {
                        lat: config.defaultCenter.lat + 0.05,
                        lng: config.defaultCenter.lng + 0.05
                      },
                      instructions: 'Continue straight',
                      travel_mode: mode.toUpperCase()
                    }
                  ]
                }
              ],
              fare: {
                currency: 'NGN',
                value: Math.floor(distance * 100) + 500 // Basic pricing model
              }
            }
          ]
        },
        simulated: true,
        travelMode: mode
      };
    }
    
    // Format origin and destination for API
    let originStr = typeof origin === 'string' ? origin : formatCoordinates(origin);
    let destinationStr = typeof destination === 'string' ? destination : formatCoordinates(destination);
    
    if (!originStr || !destinationStr) {
      return {
        success: false,
        message: 'Valid origin and destination are required'
      };
    }
    
    // Build parameters for the API call
    const params = {
      origin: originStr,
      destination: destinationStr,
      mode,
      key: config.apiKey
    };
    
    if (waypoints) {
      params.waypoints = waypoints;
    }
    
    // Call Google Maps Directions API
    const response = await axios.get(config.endpoints.directions, { params });
    
    // Process and format the response
    if (response.data.status === 'OK' && response.data.routes.length > 0) {
      return {
        success: true,
        data: {
          routes: response.data.routes.map(route => ({
            summary: route.summary,
            overview_polyline: route.overview_polyline,
            bounds: route.bounds,
            legs: route.legs.map(leg => ({
              distance: leg.distance,
              duration: leg.duration,
              start_location: leg.start_location,
              end_location: leg.end_location,
              start_address: leg.start_address,
              end_address: leg.end_address,
              steps: leg.steps.map(step => ({
                distance: step.distance,
                duration: step.duration,
                start_location: step.start_location,
                end_location: step.end_location,
                instructions: step.html_instructions,
                travel_mode: step.travel_mode,
                polyline: step.polyline
              }))
            })),
            fare: route.fare
          }))
        },
        travelMode: mode
      };
    } else {
      return {
        success: false,
        message: 'Could not find directions',
        status: response.data.status
      };
    }
  } catch (error) {
    console.error('Error getting directions:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to get directions',
      error: error.response?.data || error.message
    };
  }
};

/**
 * Search for places nearby
 * @param {Object} location Center coordinates
 * @param {number} radius Search radius in meters
 * @param {string} type Optional place type
 * @param {string} keyword Optional keyword to search for
 * @returns {Promise<Object>} Places search result
 */
const searchNearbyPlaces = async (location, radius = 1500, type = null, keyword = null) => {
  try {
    const config = getMapsConfig();
    
    // Check if API key is available
    if (!config.isConfigured) {
      // Return simulated response for development
      await delay(config.simulation.simulationDelay);
      
      return {
        success: true,
        data: {
          places: [
            {
              place_id: 'simulated-place-1',
              name: 'Lagos Mall',
              vicinity: 'Victoria Island, Lagos',
              rating: 4.2,
              geometry: {
                location: {
                  lat: location.lat + 0.01,
                  lng: location.lng + 0.01
                }
              },
              types: ['shopping_mall', 'point_of_interest', 'establishment']
            },
            {
              place_id: 'simulated-place-2',
              name: 'Lagos Central Hospital',
              vicinity: 'Lagos Island, Lagos',
              rating: 3.8,
              geometry: {
                location: {
                  lat: location.lat - 0.01,
                  lng: location.lng - 0.01
                }
              },
              types: ['hospital', 'health', 'point_of_interest', 'establishment']
            }
          ]
        },
        simulated: true
      };
    }
    
    // Check for valid location
    if (!location || !location.lat || !location.lng) {
      return {
        success: false,
        message: 'Valid location coordinates are required'
      };
    }
    
    // Format location for API
    const locationStr = formatCoordinates(location);
    
    // Build parameters for the API call
    const params = {
      location: locationStr,
      radius,
      key: config.apiKey
    };
    
    if (type) params.type = type;
    if (keyword) params.keyword = keyword;
    
    // Call Google Places API
    const response = await axios.get(config.endpoints.places, { params });
    
    // Process and format the response
    if (response.data.status === 'OK') {
      return {
        success: true,
        data: {
          places: response.data.results.map(place => ({
            place_id: place.place_id,
            name: place.name,
            vicinity: place.vicinity,
            geometry: place.geometry,
            rating: place.rating,
            types: place.types,
            icon: place.icon,
            photos: place.photos
          })),
          next_page_token: response.data.next_page_token
        }
      };
    } else {
      return {
        success: false,
        message: 'No places found',
        status: response.data.status
      };
    }
  } catch (error) {
    console.error('Error searching places:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to search places',
      error: error.response?.data || error.message
    };
  }
};

/**
 * Get detailed information about a place
 * @param {string} placeId Google Places ID
 * @param {Array} fields Optional fields to include
 * @returns {Promise<Object>} Place details result
 */
const getPlaceDetails = async (placeId, fields = null) => {
  try {
    const config = getMapsConfig();
    
    // Check if API key is available
    if (!config.isConfigured) {
      // Return simulated response for development
      await delay(config.simulation.simulationDelay);
      
      return {
        success: true,
        data: {
          place_id: placeId,
          name: 'Simulated Place',
          formatted_address: 'Simulated Address, Lagos, Nigeria',
          geometry: {
            location: config.defaultCenter
          },
          rating: 4.5,
          types: ['point_of_interest', 'establishment'],
          formatted_phone_number: '+234 123 456 7890',
          website: 'https://example.com'
        },
        simulated: true
      };
    }
    
    // Check for valid place ID
    if (!placeId) {
      return {
        success: false,
        message: 'Place ID is required'
      };
    }
    
    // Build parameters for the API call
    const params = {
      place_id: placeId,
      key: config.apiKey
    };
    
    if (fields && Array.isArray(fields) && fields.length > 0) {
      params.fields = fields.join(',');
    }
    
    // Call Google Place Details API
    const response = await axios.get(config.endpoints.placeDetails, { params });
    
    // Process and format the response
    if (response.data.status === 'OK' && response.data.result) {
      return {
        success: true,
        data: response.data.result
      };
    } else {
      return {
        success: false,
        message: 'No place details found',
        status: response.data.status
      };
    }
  } catch (error) {
    console.error('Error getting place details:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to get place details',
      error: error.response?.data || error.message
    };
  }
};

/**
 * Get a static map image URL
 * @param {Object} options Map options
 * @param {Array} markers Array of marker objects
 * @param {String} path Encoded polyline path
 * @returns {String|null} Static map URL or null if not configured
 */
const getStaticMapUrl = (options, markers, path) => {
  return generateStaticMapUrl(options, markers, path);
};

/**
 * Generate multiple route options between two points
 * @param {Object|string} origin Origin coordinates or address
 * @param {Object|string} destination Destination coordinates or address
 * @returns {Promise<Object>} Multiple route options
 */
const getRouteOptions = async (origin, destination) => {
  try {
    // Get driving directions
    const drivingResult = await getDirections(origin, destination, 'driving');
    
    // For a real implementation, we would also get directions for other modes
    // and combine them, but for simplicity, we'll just simulate the other modes
    
    const config = getMapsConfig();
    
    // If driving directions failed or we're in simulation mode
    if (!drivingResult.success || !config.isConfigured) {
      // Simulate different route options
      const drivingDistance = drivingResult.success ? 
        drivingResult.data.routes[0].legs[0].distance.value : 
        Math.floor(Math.random() * 15000) + 5000;
      
      return {
        success: true,
        data: {
          options: [
            {
              mode: 'driving',
              distance: {
                text: `${(drivingDistance / 1000).toFixed(1)} km`,
                value: drivingDistance
              },
              duration: {
                text: `${Math.floor(drivingDistance / 500)} mins`,
                value: Math.floor(drivingDistance / 500) * 60
              },
              route: drivingResult.success ? drivingResult.data.routes[0] : null,
              fare: {
                currency: 'NGN',
                value: Math.floor(drivingDistance / 100) + 500
              }
            },
            {
              mode: 'motorcycle',
              distance: {
                text: `${(drivingDistance / 1000).toFixed(1)} km`,
                value: drivingDistance
              },
              duration: {
                text: `${Math.floor(drivingDistance / 650)} mins`,
                value: Math.floor(drivingDistance / 650) * 60
              },
              fare: {
                currency: 'NGN',
                value: Math.floor(drivingDistance / 150) + 300
              }
            },
            {
              mode: 'walking',
              distance: {
                text: `${(drivingDistance / 1000).toFixed(1)} km`,
                value: drivingDistance
              },
              duration: {
                text: `${Math.floor(drivingDistance / 80)} mins`,
                value: Math.floor(drivingDistance / 80) * 60
              },
              fare: null
            }
          ],
          origin: typeof origin === 'string' ? origin : formatCoordinates(origin),
          destination: typeof destination === 'string' ? destination : formatCoordinates(destination)
        },
        simulated: !drivingResult.success || drivingResult.simulated
      };
    }
    
    // Get walking directions
    const walkingResult = await getDirections(origin, destination, 'walking');
    
    // Format response with multiple options
    return {
      success: true,
      data: {
        options: [
          {
            mode: 'driving',
            distance: drivingResult.data.routes[0].legs[0].distance,
            duration: drivingResult.data.routes[0].legs[0].duration,
            route: drivingResult.data.routes[0],
            fare: drivingResult.data.routes[0].fare || {
              currency: 'NGN',
              value: Math.floor(drivingResult.data.routes[0].legs[0].distance.value / 100) + 500
            }
          },
          {
            mode: 'motorcycle',
            distance: drivingResult.data.routes[0].legs[0].distance,
            duration: {
              text: `${Math.floor(drivingResult.data.routes[0].legs[0].duration.value * 0.8 / 60)} mins`,
              value: Math.floor(drivingResult.data.routes[0].legs[0].duration.value * 0.8)
            },
            route: drivingResult.data.routes[0],
            fare: {
              currency: 'NGN',
              value: Math.floor(drivingResult.data.routes[0].legs[0].distance.value / 150) + 300
            }
          },
          {
            mode: 'walking',
            distance: walkingResult.success ? walkingResult.data.routes[0].legs[0].distance : drivingResult.data.routes[0].legs[0].distance,
            duration: walkingResult.success ? walkingResult.data.routes[0].legs[0].duration : {
              text: `${Math.floor(drivingResult.data.routes[0].legs[0].distance.value / 80 / 60)} mins`,
              value: Math.floor(drivingResult.data.routes[0].legs[0].distance.value / 80)
            },
            route: walkingResult.success ? walkingResult.data.routes[0] : null,
            fare: null
          }
        ],
        origin: drivingResult.data.routes[0].legs[0].start_address,
        destination: drivingResult.data.routes[0].legs[0].end_address
      }
    };
  } catch (error) {
    console.error('Error getting route options:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to get route options',
      error
    };
  }
};

/**
 * Get the map configuration
 * @returns {Object} Maps configuration
 */
const getConfig = () => {
  return getMapsConfig();
};

export default {
  geocodeAddress,
  reverseGeocode,
  calculateDistance,
  getDirections,
  searchNearbyPlaces,
  getPlaceDetails,
  getStaticMapUrl,
  getRouteOptions,
  getConfig,
  formatCoordinates
};
