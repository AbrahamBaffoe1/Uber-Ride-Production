/**
 * Google Maps Service for Okada Passenger App
 * This service handles interactions with the Google Maps API for searching places,
 * getting directions, and geocoding addresses.
 */

import { GOOGLE_MAPS_API_KEY } from '../config/apiKeys';
import axios from 'axios';

// Place prediction from autocomplete API
export interface PlacePrediction {
  id: string;
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

// Place details returned from place details API
export interface PlaceDetails {
  placeId: string;
  formattedAddress: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  name?: string;
  phoneNumber?: string;
  website?: string;
  rating?: number;
  types?: string[];
}

// Direction step information
export interface DirectionStep {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  startLocation: { latitude: number; longitude: number };
  endLocation: { latitude: number; longitude: number };
  instructions: string;
  maneuver?: string;
  polyline: string;
}

// Complete directions result
export interface DirectionsResult {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  startAddress: string;
  endAddress: string;
  steps: DirectionStep[];
  polyline: string; // Encoded polyline for the entire route
  fare?: { currency: string; value: number };
}

// Google Maps API Service
class GoogleMapsService {
  private apiKey: string;
  private baseUrl: string = 'https://maps.googleapis.com/maps/api';

  constructor() {
    this.apiKey = GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Google Maps API key is not configured');
    }
  }

  /**
   * Search for places based on text input
   * @param query Search query text
   * @param locationBias Optional location bias to prioritize results near a specific point
   * @returns Array of place predictions
   */
  async searchPlaces(
    query: string,
    locationBias?: { latitude: number; longitude: number }
  ): Promise<PlacePrediction[]> {
    try {
      // Setup parameters for the API request
      const params: any = {
        key: this.apiKey,
        input: query,
        components: 'country:ng', // Limit to Nigeria
        language: 'en',
      };

      // Add location bias if provided
      if (locationBias) {
        params.location = `${locationBias.latitude},${locationBias.longitude}`;
        params.radius = 50000; // 50km radius
      }

      // Make the API request
      const response = await axios.get(
        `${this.baseUrl}/place/autocomplete/json`,
        { params }
      );

      // Check for API errors
      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API Error: ${response.data.status}`);
      }

      // Transform the response data to our interface format
      return (response.data.predictions || []).map((prediction: any) => ({
        id: prediction.place_id,
        placeId: prediction.place_id,
        description: prediction.description,
        mainText: prediction.structured_formatting?.main_text || prediction.description,
        secondaryText: prediction.structured_formatting?.secondary_text || '',
      }));
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  }

  /**
   * Get detailed information about a place using its place_id
   * @param placeId Google Place ID
   * @returns Place details including coordinates, address, etc.
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/place/details/json`,
        {
          params: {
            key: this.apiKey,
            place_id: placeId,
            fields: 'formatted_address,geometry,name,rating,formatted_phone_number,website,type',
          },
        }
      );

      if (response.data.status !== 'OK') {
        throw new Error(`Google Place Details API Error: ${response.data.status}`);
      }

      const result = response.data.result;
      return {
        placeId: placeId,
        formattedAddress: result.formatted_address,
        coordinates: {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
        },
        name: result.name,
        phoneNumber: result.formatted_phone_number,
        website: result.website,
        rating: result.rating,
        types: result.types,
      };
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  /**
   * Get directions between two points
   * @param origin Starting coordinates
   * @param destination Ending coordinates
   * @param mode Travel mode (driving, walking, bicycling, transit)
   * @returns Directions result with route information
   */
  async getDirections(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'
  ): Promise<DirectionsResult | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/directions/json`,
        {
          params: {
            key: this.apiKey,
            origin: `${origin.latitude},${origin.longitude}`,
            destination: `${destination.latitude},${destination.longitude}`,
            mode: mode,
            language: 'en',
            alternatives: false,
            region: 'ng', // Nigeria
          },
        }
      );

      if (response.data.status !== 'OK') {
        throw new Error(`Google Directions API Error: ${response.data.status}`);
      }

      const route = response.data.routes[0];
      const leg = route.legs[0];

      // Transform the steps data
      const steps = leg.steps.map((step: any) => ({
        distance: step.distance,
        duration: step.duration,
        startLocation: {
          latitude: step.start_location.lat,
          longitude: step.start_location.lng,
        },
        endLocation: {
          latitude: step.end_location.lat,
          longitude: step.end_location.lng,
        },
        instructions: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
        maneuver: step.maneuver,
        polyline: step.polyline?.points || '',
      }));

      // Create the result object
      const result: DirectionsResult = {
        origin: {
          latitude: origin.latitude,
          longitude: origin.longitude,
        },
        destination: {
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
        distance: leg.distance,
        duration: leg.duration,
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        steps: steps,
        polyline: route.overview_polyline?.points || '',
      };

      // Add fare information if available
      if (route.fare) {
        result.fare = {
          currency: route.fare.currency,
          value: route.fare.value,
        };
      }

      return result;
    } catch (error) {
      console.error('Error getting directions:', error);
      return null;
    }
  }

  /**
   * Geocode an address to coordinates
   * @param address Address text to geocode
   * @returns Coordinates if successful
   */
  async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/geocode/json`,
        {
          params: {
            key: this.apiKey,
            address: address,
            region: 'ng', // Nigeria
          },
        }
      );

      if (response.data.status !== 'OK') {
        throw new Error(`Google Geocoding API Error: ${response.data.status}`);
      }

      const result = response.data.results[0];
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
      };
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to an address
   * @param coordinates Location coordinates
   * @returns Formatted address if successful
   */
  async reverseGeocode(coordinates: { latitude: number; longitude: number }): Promise<string | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/geocode/json`,
        {
          params: {
            key: this.apiKey,
            latlng: `${coordinates.latitude},${coordinates.longitude}`,
            language: 'en',
          },
        }
      );

      if (response.data.status !== 'OK') {
        throw new Error(`Google Reverse Geocoding API Error: ${response.data.status}`);
      }

      return response.data.results[0]?.formatted_address || null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  /**
   * Calculate distance and time between two points
   * @param origin Starting coordinates
   * @param destination Ending coordinates
   * @param mode Travel mode
   * @returns Distance and duration information
   */
  async getDistanceMatrix(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'
  ): Promise<{ distance: string; duration: string; value: number } | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/distancematrix/json`,
        {
          params: {
            key: this.apiKey,
            origins: `${origin.latitude},${origin.longitude}`,
            destinations: `${destination.latitude},${destination.longitude}`,
            mode: mode,
            language: 'en',
            units: 'metric',
          },
        }
      );

      if (response.data.status !== 'OK') {
        throw new Error(`Google Distance Matrix API Error: ${response.data.status}`);
      }

      const element = response.data.rows[0].elements[0];
      if (element.status !== 'OK') {
        throw new Error(`Google Distance Matrix Element Error: ${element.status}`);
      }

      return {
        distance: element.distance.text,
        duration: element.duration.text,
        value: element.distance.value,  // Distance in meters
      };
    } catch (error) {
      console.error('Error getting distance matrix:', error);
      return null;
    }
  }
}

// Export a singleton instance
export const googleMapsService = new GoogleMapsService();
