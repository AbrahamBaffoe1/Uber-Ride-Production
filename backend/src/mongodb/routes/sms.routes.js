/**
 * SMS Routes
 * Provides endpoints for checking SMS delivery status
 * USE Nodemailer for email delivery
 */
const express = require('express');
const { smsService } = require('../../services/sms.service');
const { authenticate } = require('../middlewares/auth.middleware');
const router = express.Router();

/**
 * @route GET /api/v1/mongo/sms/status/:messageId
 * @desc Check the delivery status of an SMS message
 * @access Public
 */
router.get('/status/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    if (!messageId) {
      return res.status(400).json({
        status: 'error',
        message: 'Message ID is required'
      });
    }
    
    // Use the SMS service to check delivery status
    const statusResult = await smsService.checkDeliveryStatus(messageId);
    
    return res.status(200).json({
      status: 'success',
      data: {
        messageId: messageId,
        status: statusResult.status || 'unknown',
        timestamp: statusResult.timestamp || new Date(),
        provider: statusResult.provider || 'unknown',
        error: statusResult.error
      }
    });
  } catch (error) {
    console.error('Error checking SMS status:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to check SMS delivery status'
    });
  }
});

/**
 * @route GET /api/v1/mongo/sms/settings
 * @desc Get SMS service configuration (public info)
 * @access Public
 */
router.get('/settings', async (req, res) => {
  try {
    // Return only the public information about SMS service
    return res.status(200).json({
      status: 'success',
      data: {
        primaryProvider: smsService.getActiveProvider(),
        hasBackupProvider: smsService.isFallbackAvailable(),
        supportsDeliveryStatus: true,
        maxStatusCheckRetries: 10,
        statusCheckInterval: 3000 // ms
      }
    });
  } catch (error) {
    console.error('Error getting SMS settings:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to retrieve SMS service settings'
    });
  }
});

module.exports = router;
