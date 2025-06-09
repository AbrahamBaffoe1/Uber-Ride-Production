const express = require('express');
const { 
  requestRide, 
  getRideById, 
  cancelRide, 
  rateRide, 
  getRideHistory, 
  getActiveRide, 
  trackRide 
} = require('../controllers/ride.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

// All ride routes require authentication
router.use(authenticate);

// Request a new ride
router.post('/', requestRide);

// Get a specific ride by ID
router.get('/:id', getRideById);

// Cancel a ride
router.post('/:id/cancel', cancelRide);

// Rate a completed ride
router.post('/:id/rate', rateRide);

// Get ride history
router.get('/history', getRideHistory);

// Get active ride if exists
router.get('/active', getActiveRide);

// Track a ride in real-time
router.get('/:id/track', trackRide);

module.exports = router;
