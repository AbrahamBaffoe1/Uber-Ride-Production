const express = require('express');
const router = express.Router();

/**
 * @route   GET /api/v1/health
 * @desc    Health check endpoint to verify API is running
 * @access  Public
 */
router.get('/', (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

module.exports = router;
