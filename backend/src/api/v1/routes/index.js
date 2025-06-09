const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const rideRoutes = require('./ride.routes');
const paymentRoutes = require('./payment.routes');
const safetyRoutes = require('./safety.routes');
const verifyRoutes = require('./verify.routes');
const riderRoutes = require('./rider.routes');
const documentRoutes = require('./document.routes');
const smsRoutes = require('./sms.routes');
const securityRoutes = require('./security.routes');
const analyticsRoutes = require('./analytics.routes');
const otpRoutes = require('./otp.routes');
const healthRoutes = require('./health.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/rides', rideRoutes);
router.use('/payments', paymentRoutes);
router.use('/safety', safetyRoutes);
router.use('/verify', verifyRoutes);
router.use('/rider', riderRoutes);
router.use('/documents', documentRoutes);
router.use('/sms', smsRoutes);
router.use('/security', securityRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/otp', otpRoutes);
router.use('/health', healthRoutes);

module.exports = router;
