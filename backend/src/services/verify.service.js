/**
 * Twilio Verify Service
 * Provides integration with Twilio Verify API for OTP verification
 */
const twilio = require('twilio');
const { getConfig } = require('../config/smsConfig');

class VerifyService {
  constructor() {
    this.config = getConfig();
    this.twilioClient = null;
    this.verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
    
    // Initialize Twilio client
    if (this.config.providers.twilio) {
      const { accountSid, authToken } = this.config.providers.twilio;
      // Validate that accountSid starts with AC as required by Twilio
      if (accountSid && authToken && accountSid.startsWith('AC')) {
        try {
          this.twilioClient = twilio(accountSid, authToken);
          console.log('Twilio Verify service initialized');
        } catch (error) {
          console.error('Failed to initialize Twilio client:', error.message);
          this.twilioClient = null;
        }
      } else {
        console.warn('Twilio credentials appear to be placeholder values or incorrectly formatted.');
        console.warn('Valid Twilio accountSid must start with "AC". SMS functionality will be limited.');
      }
    } else {
      console.warn('No SMS providers are configured. SMS functionality will be limited.');
    }
  }
  
  /**
   * Send verification code via Twilio Verify
   * @param {string} phoneNumber - Phone number with country code (e.g., +1234567890)
   * @param {string} channel - Verification channel (sms, call, email, etc.)
   * @returns {Promise<Object>} - Verification details
   */
  async sendVerificationCode(phoneNumber, channel = 'sms') {
    try {
      // Validate phone number format
      if (!phoneNumber || !/^\+\d{10,15}$/.test(phoneNumber)) {
        throw new Error('Invalid phone number format. Must include country code (e.g., +1234567890)');
      }
      
      // Check if Twilio client and service SID are available
      if (!this.twilioClient || !this.verifyServiceSid) {
        // Fallback to console-based testing if Twilio is not configured
        console.log('\n==================================');
        console.log(`🔐 TWILIO VERIFY SIMULATION (${channel})`);
        console.log(`   To: ${phoneNumber}`);
        console.log('   Verification code would be sent via Twilio Verify API');
        console.log('==================================\n');
        
        // Mock a verification SID for development
        return {
          status: 'pending',
          sid: `SIMULATION-${Date.now()}`,
          to: phoneNumber,
          channel,
          date_created: new Date().toISOString(),
          valid: false
        };
      }
      
      // Send verification via Twilio Verify API
      const verification = await this.twilioClient.verify.v2
        .services(this.verifyServiceSid)
        .verifications.create({
          to: phoneNumber,
          channel
        });
      
      return verification;
    } catch (error) {
      console.error('Error sending verification code:', error);
      
      // For development, provide a fallback
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n==================================');
        console.log(`🔐 VERIFICATION ERROR FALLBACK for ${phoneNumber}`);
        console.log(`   Channel: ${channel}`);
        console.log(`   Error: ${error.message}`);
        console.log('==================================\n');
        
        return {
          status: 'failed',
          errorCode: error.code || 'unknown',
          errorMessage: error.message,
          to: phoneNumber,
          channel,
          date_created: new Date().toISOString()
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Check verification code
   * @param {string} phoneNumber - Phone number with country code
   * @param {string} code - Verification code to check
   * @returns {Promise<Object>} - Verification check result
   */
  async checkVerificationCode(phoneNumber, code) {
    try {
      // Check if Twilio client and service SID are available
      if (!this.twilioClient || !this.verifyServiceSid) {
        // Simulate verification check for development
        console.log('\n==================================');
        console.log(`🔐 TWILIO VERIFY CHECK SIMULATION`);
        console.log(`   To: ${phoneNumber}`);
        console.log(`   Code: ${code}`);
        console.log('==================================\n');
        
        // Mock successful verification for testing
        // In a real app, you would have to check against a stored code
        return {
          status: 'approved',
          sid: `SIMULATION-CHECK-${Date.now()}`,
          to: phoneNumber,
          valid: true,
          date_created: new Date().toISOString()
        };
      }
      
      // Check verification code via Twilio Verify API
      const verificationCheck = await this.twilioClient.verify.v2
        .services(this.verifyServiceSid)
        .verificationChecks.create({
          to: phoneNumber,
          code
        });
      
      return verificationCheck;
    } catch (error) {
      console.error('Error checking verification code:', error);
      
      // For development, provide a fallback
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n==================================');
        console.log(`🔐 VERIFICATION CHECK ERROR FALLBACK for ${phoneNumber}`);
        console.log(`   Code: ${code}`);
        console.log(`   Error: ${error.message}`);
        console.log('==================================\n');
        
        return {
          status: 'failed',
          errorCode: error.code || 'unknown',
          errorMessage: error.message,
          to: phoneNumber,
          valid: false,
          date_created: new Date().toISOString()
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Check if Verify service is properly configured
   * @returns {boolean} - Whether the service is ready to use
   */
  isConfigured() {
    return !!(this.twilioClient && this.verifyServiceSid);
  }
}

// Create and export service instance
const verifyService = new VerifyService();
module.exports = verifyService;
