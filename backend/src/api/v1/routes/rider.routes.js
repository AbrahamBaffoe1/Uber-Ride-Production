const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { 
  getAvailableRides,
  acceptRide,
  rejectRide,
  updateRideStatus,
  getActiveRide,
  getRiderRideHistory,
  updateRiderLocation,
  updateRiderAvailability,
  getRiderEarningsSummary,
  getRiderEarningsHistory,
  requestCashout
} = require('../controllers/rider.controller');

const router = express.Router();

// All rider routes require authentication
router.use(authenticate);

// Rides
router.get('/rides/available', getAvailableRides);
router.post('/rides/:id/accept', acceptRide);
router.post('/rides/:id/reject', rejectRide);
router.post('/rides/:id/status', updateRideStatus);
router.get('/rides/active', getActiveRide);
router.get('/rides/history', getRiderRideHistory);

// Location
router.post('/location', updateRiderLocation);
router.post('/availability', updateRiderAvailability);

// Earnings
router.get('/earnings/summary', getRiderEarningsSummary);
router.get('/earnings/history', getRiderEarningsHistory);
router.post('/earnings/cashout', requestCashout);

module.exports = router;
