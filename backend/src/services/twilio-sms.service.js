/**
 * Twilio SMS Service
 * Handles sending SMS via Twilio API
 */
import twilio from 'twilio';
import dotenv from 'dotenv';
import * as emailService from './email.service.js';

// Initialize dotenv
dotenv.config();

// Initialize Twilio client
let twilioClient;
let twilioInitialized = false;
let useEmailFallback = false;

// Try to initialize Twilio client
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    twilioInitialized = true;
    console.log('Twilio client initialized successfully');
  } else {
    console.warn('Twilio credentials not found. Using email fallback for SMS.');
    useEmailFallback = true;
  }
} catch (error) {
  console.error('Error initializing Twilio client:', error);
  useEmailFallback = true;
}

/**
 * Send SMS via Twilio
 * @param {string} to - Recipient phone number (with country code)
 * @param {string} message - SMS content
 * @returns {Promise<Object>} - Response from Twilio
 */
export const sendSMS = async (to, message) => {
  try {
    // Validate phone number format
    if (!to || !to.match(/^\+\d{10,15}$/)) {
      throw new Error('Invalid phone number format. Must include country code (e.g., +1234567890)');
    }

    if (!message) {
      throw new Error('Message content is required');
    }

    // Log the SMS operation in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SMS SERVICE] Attempting to send SMS to ${to}`);
      console.log(`[SMS SERVICE] Message: ${message}`);
    }

    // If Twilio is not initialized or we're using email fallback, send via email
    if (useEmailFallback || !twilioInitialized) {
      return await sendSMSViaEmail(to, message);
    }

    // Send SMS via Twilio
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    console.log(`[SMS SERVICE] SMS sent successfully: ${result.sid}`);
    return {
      status: 'delivered',
      messageId: result.sid,
      to,
      provider: 'twilio'
    };
  } catch (twilioError) {
    console.error('[SMS SERVICE] Error sending SMS via Twilio:', twilioError);
    
    // If Twilio fails, try email fallback
    if (!useEmailFallback) {
      console.log('[SMS SERVICE] Trying email fallback for SMS...');
      try {
        return await sendSMSViaEmail(to, message);
      } catch (emailError) {
        console.error('[SMS SERVICE] Email fallback also failed:', emailError);
        throw emailError;
      }
    } else {
      throw twilioError;
    }
  }
};

/**
 * Send SMS via email fallback
 * This uses email to SMS gateways provided by carriers
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS content
 * @returns {Promise<Object>} - Response object
 */
const sendSMSViaEmail = async (phoneNumber, message) => {
  try {
    // Log fallback usage
    console.log(`[SMS SERVICE] Using email-to-SMS fallback for ${phoneNumber}`);
    
    // Use email service's SMS gateway fallback
    const result = await emailService.sendSMS(phoneNumber, message);
    
    return {
      status: 'delivered',
      messageId: `email-sms-${Date.now()}`,
      to: phoneNumber,
      provider: 'email-gateway'
    };
  } catch (error) {
    console.error('[SMS SERVICE] Email-to-SMS fallback failed:', error);
    
    // In development, still return success with console output
    if (process.env.NODE_ENV === 'development') {
      console.log('\n==== DEVELOPMENT MODE: SMS CONTENT ====');
      console.log(`To: ${phoneNumber}`);
      console.log(`Message: ${message}`);
      console.log('========================================\n');
      
      return {
        status: 'delivered',
        messageId: `dev-sms-${Date.now()}`,
        to: phoneNumber,
        provider: 'development-console'
      };
    }
    
    throw error;
  }
};

/**
 * Check if a phone number is valid
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - Whether the phone number is valid
 */
export const isValidPhoneNumber = (phoneNumber) => {
  // Simple validation for international format with country code
  return phoneNumber && phoneNumber.match(/^\+\d{10,15}$/);
};

/**
 * Get the currently active SMS provider
 * @returns {string} - Provider name
 */
export const getActiveProvider = () => {
  if (useEmailFallback) {
    return 'email-gateway';
  }
  return 'twilio';
};
