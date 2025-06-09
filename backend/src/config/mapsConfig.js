/**
 * Google Maps Configuration
 * Central configuration for Google Maps API services
 */
import dotenv from 'dotenv';
dotenv.config();

/**
 * Get Google Maps API configuration
 * @returns {Object} Maps configuration
 */
const getMapsConfig = () => {
  const config = {
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
    isConfigured: !!process.env.GOOGLE_MAPS_API_KEY,
    
    // Default map center (Lagos, Nigeria)
    defaultCenter: {
      lat: 6.5244,
      lng: 3.3792
    },
    
    // API endpoints
    endpoints: {
      geocode: 'https://maps.googleapis.com/maps/api/geocode/json',
      distanceMatrix: 'https://maps.googleapis.com/maps/api/distancematrix/json',
      directions: 'https://maps.googleapis.com/maps/api/directions/json',
      places: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      placeDetails: 'https://maps.googleapis.com/maps/api/place/details/json',
      staticMap: 'https://maps.googleapis.com/maps/api/staticmap',
      streetView: 'https://maps.googleapis.com/maps/api/streetview'
    },
    
    // Settings for static maps
    staticMap: {
      size: '600x300',
      zoom: 14,
      mapType: 'roadmap',
      format: 'png',
      scale: 2 // High resolution
    },
    
    // Available travel modes
    travelModes: ['driving', 'walking', 'bicycling', 'transit'],
    
    // Default search radius (in meters)
    defaultRadius: 1500,
    
    // Place types commonly used in the app
    placeTypes: [
      'bus_station',
      'taxi_stand',
      'train_station',
      'transit_station',
      'gas_station',
      'restaurant',
      'cafe',
      'hospital',
      'pharmacy',
      'police',
      'shopping_mall',
      'hotel'
    ],
    
    // Map style options for mobile app
    mapStyles: {
      light: [], // Default Google Maps style
      dark: [
        { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
        {
          featureType: 'road',
          elementType: 'geometry',
          stylers: [{ color: '#38414e' }]
        },
        {
          featureType: 'road',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#212a37' }]
        },
        {
          featureType: 'road',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#9ca5b3' }]
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#17263c' }]
        }
      ],
      // Additional custom styles can be added here
    },
    
    // Simulation settings (for development without API key)
    simulation: {
      enabled: !process.env.GOOGLE_MAPS_API_KEY,
      simulationDelay: 500, // ms
      simulatedDriverLocations: [
        { lat: 6.5244, lng: 3.3792 }, // Lagos
        { lat: 6.5355, lng: 3.3087 }, // Ikeja
        { lat: 6.4698, lng: 3.5852 }, // Victoria Island
        { lat: 6.6194, lng: 3.3613 }, // Agege
        { lat: 6.4281, lng: 3.4219 }  // Lekki
      ]
    }
  };
  
  return config;
};

/**
 * Generate a static map URL
 * @param {Object} options Map options
 * @param {Array} markers Array of marker objects
 * @param {String} path Encoded polyline path
 * @returns {String} Static map URL
 */
const generateStaticMapUrl = (options = {}, markers = [], path = null) => {
  const config = getMapsConfig();
  
  if (!config.isConfigured) {
    return null;
  }
  
  // Base URL with API key
  let url = `${config.endpoints.staticMap}?key=${config.apiKey}`;
  
  // Add map options
  const size = options.size || config.staticMap.size;
  const zoom = options.zoom || config.staticMap.zoom;
  const mapType = options.mapType || config.staticMap.mapType;
  const format = options.format || config.staticMap.format;
  const scale = options.scale || config.staticMap.scale;
  
  url += `&size=${size}&zoom=${zoom}&maptype=${mapType}&format=${format}&scale=${scale}`;
  
  // Add center if provided
  if (options.center) {
    url += `&center=${options.center.lat},${options.center.lng}`;
  }
  
  // Add markers
  markers.forEach(marker => {
    let markerStr = '&markers=';
    
    if (marker.color) {
      markerStr += `color:${marker.color}|`;
    }
    
    if (marker.label) {
      markerStr += `label:${marker.label}|`;
    }
    
    markerStr += `${marker.lat},${marker.lng}`;
    url += markerStr;
  });
  
  // Add path if provided
  if (path) {
    url += `&path=enc:${path}`;
  }
  
  return url;
};

/**
 * Format coordinates for API calls
 * @param {Object} coordinates Coordinates object with lat and lng
 * @returns {String} Formatted coordinates string
 */
const formatCoordinates = (coordinates) => {
  if (!coordinates || !coordinates.lat || !coordinates.lng) {
    return null;
  }
  
  return `${coordinates.lat},${coordinates.lng}`;
};

export {
  getMapsConfig,
  generateStaticMapUrl,
  formatCoordinates
};
