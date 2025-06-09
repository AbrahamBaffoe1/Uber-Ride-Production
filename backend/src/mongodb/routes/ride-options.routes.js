/**
 * Ride Options and Pricing Routes
 * Provides endpoints for ride options and fare estimation
 */
import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import RiderLocation from '../models/RiderLocation.js';
import { calculateDistance, calculateFare } from '../../services/rides.service.js';

const router = express.Router();

/**
 * @route GET /api/v1/mongo/rides/options
 * @desc Get available ride options based on location
 * @access Private
 */
router.get('/options', authenticate, async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    // Find available riders nearby
    const nearbyRiders = await RiderLocation.find({
      status: 'online',
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: 5000 // 5km radius
        }
      }
    }).populate('riderId', 'riderProfile.vehicleType');
    
    // Count riders by vehicle type
    const vehicleTypeCount = {};
    nearbyRiders.forEach(rider => {
      const vehicleType = rider.riderId?.riderProfile?.vehicleType || 'standard';
      vehicleTypeCount[vehicleType] = (vehicleTypeCount[vehicleType] || 0) + 1;
    });
    
    // Define ride options
    const rideOptions = [
      {
        id: 'standard',
        name: 'Standard Okada',
        icon: 'motorcycle',
        description: 'Regular motorbike ride',
        price: '₦500',
        time: nearbyRiders.length > 0 ? '5 min away' : 'No riders nearby',
        multiplier: 1.0,
        status: vehicleTypeCount['standard'] > 0 ? 'available' : 'unavailable',
        capacity: 1,
        basePrice: 500,
        pricePerKm: 100,
        pricePerMinute: 5,
        vehicleType: 'standard'
      },
      {
        id: 'premium',
        name: 'Premium Okada',
        icon: 'motorcycle',
        description: 'Comfortable motorbike ride',
        price: '₦800',
        time: vehicleTypeCount['premium'] > 0 ? '7 min away' : 'No riders nearby',
        multiplier: 1.6,
        status: vehicleTypeCount['premium'] > 0 ? 'available' : 'unavailable',
        capacity: 1,
        basePrice: 800,
        pricePerKm: 160,
        pricePerMinute: 8,
        vehicleType: 'premium'
      }
    ];
    
    return res.status(200).json({
      success: true,
      data: rideOptions
    });
  } catch (error) {
    console.error('Error fetching ride options:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch ride options'
    });
  }
});

/**
 * @route GET /api/v1/mongo/rides/price-estimate
 * @desc Get price estimate for a ride
 * @access Private
 */
router.get('/price-estimate', authenticate, async (req, res) => {
  try {
    const { 
      rideOptionId, 
      pickupLat, 
      pickupLng, 
      dropoffLat, 
      dropoffLng 
    } = req.query;
    
    if (!rideOptionId || !pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      return res.status(400).json({
        success: false,
        message: 'All parameters are required'
      });
    }
    
    // Calculate distance and duration using external service
    const { distance, duration } = await calculateDistance(
      parseFloat(pickupLat), 
      parseFloat(pickupLng), 
      parseFloat(dropoffLat), 
      parseFloat(dropoffLng)
    );
    
    // Get pricing based on ride option
    const pricing = {
      standard: { basePrice: 500, pricePerKm: 100, pricePerMinute: 5 },
      premium: { basePrice: 800, pricePerKm: 160, pricePerMinute: 8 }
    };
    
    const option = pricing[rideOptionId] || pricing.standard;
    
    // Calculate fare
    const fare = calculateFare(distance, duration, option);
    
    return res.status(200).json({
      success: true,
      data: {
        estimatedFare: fare.totalFare,
        currencySymbol: '₦',
        formattedPrice: `₦${fare.totalFare.toFixed(2)}`,
        estimatedDistance: distance,
        estimatedDuration: duration
      }
    });
  } catch (error) {
    console.error('Error calculating price estimate:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate price estimate'
    });
  }
});

export default router;
