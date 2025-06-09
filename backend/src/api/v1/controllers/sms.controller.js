/**
 * SMS Controller
 * Handles incoming SMS and USSD webhook requests from SMS providers
 */
const { smsService } = require('../../../services/sms.service');

/**
 * Handle incoming SMS webhook
 * @route POST /api/v1/sms/webhook/:provider
 * @access Public
 */
exports.handleSmsWebhook = async (req, res, next) => {
  try {
    const { provider } = req.params;
    let smsData;
    
    // Different providers have different webhook formats
    switch (provider) {
      case 'africastalking': {
        // Africa's Talking format
        smsData = {
          from: req.body.from,
          to: req.body.to,
          text: req.body.text,
          date: req.body.date,
          id: req.body.id,
        };
        break;
      }
      
      case 'twilio': {
        // Twilio format
        smsData = {
          from: req.body.From,
          to: req.body.To,
          text: req.body.Body,
          date: new Date().toISOString(),
          id: req.body.MessageSid,
        };
        break;
      }
      
      case 'nexmo': {
        // Nexmo/Vonage format
        smsData = {
          from: req.body.msisdn,
          to: req.body.to,
          text: req.body.text,
          date: new Date().toISOString(),
          id: req.body.messageId,
        };
        break;
      }
      
      case 'infobip': {
        // Infobip format
        const message = req.body.results[0];
        smsData = {
          from: message.from,
          to: message.to,
          text: message.text,
          date: message.receivedAt,
          id: message.messageId,
        };
        break;
      }
      
      default:
        return res.status(400).json({
          status: 'error',
          message: `Unsupported SMS provider: ${provider}`,
        });
    }
    
    // Process the SMS
    const result = await smsService.processIncomingSMS(smsData);
    
    // Log the incoming SMS and result
    console.log('Incoming SMS:', smsData);
    console.log('Processing result:', result);
    
    // Return success response based on provider
    switch (provider) {
      case 'africastalking':
        // Africa's Talking expects a specific response format
        return res.status(200).json({ status: 'Success' });
        
      case 'twilio':
        // Twilio expects a TwiML response, but for command processing 
        // we can just return a 200 OK
        return res.status(200).send('');
        
      case 'nexmo':
      case 'infobip':
      default:
        // Others generally just expect a 200 OK
        return res.status(200).json({
          status: 'success',
          message: 'SMS processed successfully',
        });
    }
  } catch (error) {
    console.error('Error processing SMS webhook:', error);
    return next(error);
  }
};

/**
 * Handle incoming USSD webhook
 * @route POST /api/v1/ussd/webhook/:provider
 * @access Public
 */
exports.handleUssdWebhook = async (req, res, next) => {
  try {
    const { provider } = req.params;
    let ussdData;
    
    // Different providers have different webhook formats
    switch (provider) {
      case 'africastalking': {
        // Africa's Talking format
        ussdData = {
          sessionId: req.body.sessionId,
          serviceCode: req.body.serviceCode,
          phoneNumber: req.body.phoneNumber,
          text: req.body.text,
        };
        break;
      }
      
      // Other providers would have their own formats
      // This is a simplified example
      default:
        return res.status(400).json({
          status: 'error',
          message: `Unsupported USSD provider: ${provider}`,
        });
    }
    
    // Process the USSD request
    const result = await smsService.processUSSDRequest(ussdData);
    
    // Log the incoming USSD and result
    console.log('Incoming USSD:', ussdData);
    console.log('Processing result:', result);
    
    // Process any actions from the USSD response
    if (result.action) {
      // Process the action (in background)
      smsService.processUSSDAction(result.action).catch(err => {
        console.error('Error processing USSD action:', err);
      });
    }
    
    // Return response based on provider
    switch (provider) {
      case 'africastalking':
        // Africa's Talking expects the USSD menu as a plain text response
        return res.status(200).send(result.response);
        
      default:
        // Default response format
        return res.status(200).json({
          status: 'success',
          response: result.response,
        });
    }
  } catch (error) {
    console.error('Error processing USSD webhook:', error);
    
    // Even on error, we need to return a valid USSD response
    return res.status(200).send('END An error occurred. Please try again later.');
  }
};

/**
 * Initiate outgoing SMS
 * @route POST /api/v1/sms/send
 * @access Private (Admin only)
 */
exports.sendSms = async (req, res, next) => {
  try {
    const { to, message, from } = req.body;
    
    // Validate required fields
    if (!to || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'Recipient and message are required',
      });
    }
    
    // Send the SMS
    const result = await smsService.sendSMS(to, message, from);
    
    return res.status(200).json({
      status: 'success',
      message: 'SMS sent successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    return next(error);
  }
};

/**
 * Receive mobile money transaction callback
 * @route POST /api/v1/payment/callback/:provider
 * @access Public
 */
exports.handlePaymentCallback = async (req, res, next) => {
  try {
    const { provider } = req.params;
    let paymentData;
    
    // Different providers have different callback formats
    switch (provider) {
      case 'africastalking': {
        // Africa's Talking format
        paymentData = {
          provider: 'africastalking',
          type: req.body.type,
          transactionId: req.body.transactionId,
          status: req.body.status,
          amount: req.body.amount,
          currency: req.body.currency,
          phoneNumber: req.body.phoneNumber,
          providerMetadata: req.body,
        };
        break;
      }
      
      // Other payment providers would have their own formats
      default:
        return res.status(400).json({
          status: 'error',
          message: `Unsupported payment provider: ${provider}`,
        });
    }
    
    // Process the payment callback
    // In a real implementation, this would update the payment status in the database
    console.log('Payment callback received:', paymentData);
    
    // Return success response based on provider
    return res.status(200).json({
      status: 'success',
      message: 'Payment callback processed successfully',
    });
  } catch (error) {
    console.error('Error processing payment callback:', error);
    return next(error);
  }
};

/**
 * Get SMS provider status
 * @route GET /api/v1/sms/status
 * @access Private (Admin only)
 */
exports.getSmsProviderStatus = async (req, res, next) => {
  try {
    // Get active provider
    const activeProvider = smsService.getActiveProvider();
    
    // In a real implementation, we would check if the provider is actually working
    // Here we just return the active provider
    
    return res.status(200).json({
      status: 'success',
      data: {
        activeProvider,
        isOperational: true,
      },
    });
  } catch (error) {
    console.error('Error getting SMS provider status:', error);
    return next(error);
  }
};

/**
 * Cleanup expired USSD sessions (admin maintenance)
 * @route POST /api/v1/ussd/cleanup
 * @access Private (Admin only)
 */
exports.cleanupUssdSessions = async (req, res, next) => {
  try {
    // Cleanup expired sessions
    const cleanupCount = await smsService.cleanupExpiredSessions();
    
    return res.status(200).json({
      status: 'success',
      message: `Cleaned up ${cleanupCount} expired USSD sessions`,
    });
  } catch (error) {
    console.error('Error cleaning up USSD sessions:', error);
    return next(error);
  }
};
