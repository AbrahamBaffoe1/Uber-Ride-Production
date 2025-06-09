/**
 * SMS Service
 * Handles sending SMS messages using various providers
 */
import twilio from 'twilio';
import { v4 as uuidv4 } from 'uuid';

// Initialize Twilio client if credentials are available
let twilioClient;
try {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
} catch (error) {
  console.warn('Failed to initialize Twilio client:', error.message);
}

/**
 * Send SMS using Twilio
 * @param {String} to - Recipient phone number
 * @param {String} message - SMS message content
 * @returns {Object} Result object with messageId
 */
const sendViaTwilio = async (to, message) => {
  try {
    if (!twilioClient) {
      throw new Error('Twilio client not initialized');
    }
    
    // Format phone number for Twilio (must be E.164 format)
    let formattedPhone = to;
    if (!to.startsWith('+')) {
      formattedPhone = `+${to}`;
    }
    
    // Send SMS
    const result = await twilioClient.messages.create({
      body: message,
      to: formattedPhone,
      from: process.env.TWILIO_PHONE_NUMBER
    });
    
    return {
      success: true,
      messageId: result.sid,
      provider: 'twilio'
    };
  } catch (error) {
    console.error('Error sending SMS via Twilio:', error);
    throw error;
  }
};

/**
 * Send SMS using fallback method (console log in development)
 * @param {String} to - Recipient phone number
 * @param {String} message - SMS message content
 * @returns {Object} Result object with messageId
 */
const sendViaFallback = async (to, message) => {
  // In production, this would integrate with another SMS provider
  // For development, just log the message
  console.log(`[SMS FALLBACK] To: ${to}, Message: ${message}`);
  
  return {
    success: true,
    messageId: `fallback-${uuidv4()}`,
    provider: 'fallback'
  };
};

/**
 * Send SMS message
 * @param {String} to - Recipient phone number
 * @param {String} message - SMS message content
 * @param {Object} options - Additional options
 * @returns {Object} Result object with messageId
 */
const sendSMS = async (to, message, options = {}) => {
  try {
    // Try primary provider (Twilio)
    try {
      return await sendViaTwilio(to, message);
    } catch (primaryError) {
      console.warn('Primary SMS provider failed, using fallback:', primaryError.message);
      
      // Use fallback provider
      return await sendViaFallback(to, message);
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};

/**
 * Verify phone number format
 * @param {String} phoneNumber - Phone number to verify
 * @returns {Boolean} Whether phone number is valid
 */
const isValidPhoneNumber = (phoneNumber) => {
  // Basic validation - in production, use a more robust solution
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
};

export {
  sendSMS,
  isValidPhoneNumber
};
