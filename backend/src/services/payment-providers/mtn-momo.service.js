/**
 * MTN Mobile Money API Integration Service
 * Based on MTN MoMo API v1.0
 * Reference: https://momodeveloper.mtn.com/api-documentation/api-description
 */
const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class MtnMomoService {
  constructor() {
    // Base config
    this.config = {
      // These would come from environment variables in a real implementation
      subscriptionKey: process.env.MTN_MOMO_SUBSCRIPTION_KEY || 'your-subscription-key',
      apiKey: process.env.MTN_MOMO_API_KEY || 'your-api-key',
      userId: process.env.MTN_MOMO_USER_ID || 'your-user-id',
      primaryKey: process.env.MTN_MOMO_PRIMARY_KEY || 'your-primary-key',
      secondaryKey: process.env.MTN_MOMO_SECONDARY_KEY || 'your-secondary-key',
      environment: process.env.MTN_MOMO_ENVIRONMENT || 'sandbox', // 'sandbox' or 'production'
      providerCallbackHost: process.env.PROVIDER_CALLBACK_HOST || 'https://api.okadatransportation.com'
    };

    // Determine base URL based on environment
    this.baseUrl = this.config.environment === 'production'
      ? 'https://proxy.momoapi.mtn.com'
      : 'https://sandbox.momodeveloper.mtn.com';

    // Access token cache
    this.accessToken = null;
    this.tokenExpiry = null;

    // Create axios instance with default config
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        'Content-Type': 'application/json',
        'X-Target-Environment': this.config.environment
      }
    });

    // Setup request interceptor to handle authentication
    this.httpClient.interceptors.request.use(
      async (config) => {
        // Skip auth header for token endpoints
        if (config.url.includes('/token')) {
          return config;
        }

        // Check if we need to refresh the token
        if (!this.isTokenValid()) {
          await this.getAccessToken();
        }

        // Add Authorization header
        config.headers.Authorization = `Bearer ${this.accessToken}`;
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  /**
   * Check if the current access token is valid
   * @returns {boolean} Whether the token is valid
   */
  isTokenValid() {
    return this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry;
  }

  /**
   * Get a new access token
   * @returns {Promise<string>} Access token
   */
  async getAccessToken() {
    try {
      const auth = Buffer.from(`${this.config.userId}:${this.config.apiKey}`).toString('base64');
      const response = await this.httpClient.post('/collection/token/', {}, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      this.accessToken = response.data.access_token;

      // Calculate token expiry (typically 1 hour)
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      return this.accessToken;
    } catch (error) {
      console.error('Error getting MTN MoMo access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with MTN MoMo API');
    }
  }

  /**
   * Get account balance
   * @returns {Promise<Object>} Account balance information
   */
  async getAccountBalance() {
    try {
      const response = await this.httpClient.get('/collection/v1_0/account/balance');
      return {
        currency: response.data.currency,
        availableBalance: response.data.availableBalance
      };
    } catch (error) {
      console.error('Error getting account balance:', error.response?.data || error.message);
      throw new Error('Failed to retrieve account balance');
    }
  }

  /**
   * Check if an account is active
   * @param {string} phoneNumber Phone number to check (in international format)
   * @returns {Promise<boolean>} Whether the account is active
   */
  async isAccountActive(phoneNumber) {
    try {
      const response = await this.httpClient.get(`/collection/v1_0/accountholder/msisdn/${phoneNumber}/active`);
      return response.data.result;
    } catch (error) {
      // 404 means account not found, which we interpret as not active
      if (error.response && error.response.status === 404) {
        return false;
      }
      console.error('Error checking account status:', error.response?.data || error.message);
      throw new Error(`Failed to check account status for ${phoneNumber}`);
    }
  }

  /**
   * Get account holder information
   * @param {string} phoneNumber Phone number (in international format)
   * @returns {Promise<Object>} Account holder information
   */
  async getAccountHolderInfo(phoneNumber) {
    try {
      const response = await this.httpClient.get(`/collection/v1_0/accountholder/msisdn/${phoneNumber}/basicuserinfo`);
      return response.data;
    } catch (error) {
      console.error('Error getting account holder info:', error.response?.data || error.message);
      throw new Error(`Failed to get account holder info for ${phoneNumber}`);
    }
  }

  /**
   * Request to pay (charge a user)
   * @param {Object} paymentData Payment data
   * @param {string} paymentData.phoneNumber Phone number to charge (in international format)
   * @param {number} paymentData.amount Amount to charge
   * @param {string} paymentData.currency Currency code (e.g., 'EUR')
   * @param {string} paymentData.externalId External reference ID
   * @param {string} paymentData.payerMessage Message to display to payer
   * @param {string} paymentData.payeeNote Note for the payee
   * @returns {Promise<string>} Transaction reference ID
   */
  async requestToPay(paymentData) {
    try {
      // Generate a unique reference ID
      const referenceId = uuidv4();
      
      // Format request data
      const requestData = {
        amount: paymentData.amount.toString(),
        currency: paymentData.currency,
        externalId: paymentData.externalId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: paymentData.phoneNumber
        },
        payerMessage: paymentData.payerMessage,
        payeeNote: paymentData.payeeNote
      };

      // Make API request
      await this.httpClient.post('/collection/v1_0/requesttopay', requestData, {
        headers: {
          'X-Reference-Id': referenceId
        }
      });

      // Return the reference ID for tracking the payment status
      return referenceId;
    } catch (error) {
      console.error('Error requesting payment:', error.response?.data || error.message);
      throw new Error('Failed to request payment from user');
    }
  }

  /**
   * Get the status of a request to pay
   * @param {string} referenceId Reference ID of the payment
   * @returns {Promise<Object>} Payment status information
   */
  async getPaymentStatus(referenceId) {
    try {
      const response = await this.httpClient.get(`/collection/v1_0/requesttopay/${referenceId}`);
      return {
        amount: response.data.amount,
        currency: response.data.currency,
        externalId: response.data.externalId,
        payerPhoneNumber: response.data.payer.partyId,
        status: response.data.status,
        reason: response.data.reason,
        financialTransactionId: response.data.financialTransactionId,
        createdAt: new Date(response.data.creationTime)
      };
    } catch (error) {
      console.error('Error getting payment status:', error.response?.data || error.message);
      throw new Error(`Failed to get payment status for reference ${referenceId}`);
    }
  }

  /**
   * Validate a callback notification from MTN
   * @param {Object} headers Request headers
   * @param {string} body Request body
   * @returns {boolean} Whether the callback is valid
   */
  validateCallback(headers, body) {
    try {
      // Get the signature from headers
      const signature = headers['x-callback-signature'];
      if (!signature) {
        return false;
      }

      // Create a signature using our API key
      const hmac = crypto.createHmac('sha256', this.config.apiKey);
      hmac.update(body);
      const calculatedSignature = hmac.digest('hex');

      // Compare signatures
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(calculatedSignature)
      );
    } catch (error) {
      console.error('Error validating callback:', error);
      return false;
    }
  }

  /**
   * Request to withdraw (disburse funds to a user)
   * @param {Object} paymentData Payment data
   * @param {string} paymentData.phoneNumber Phone number to send to (in international format)
   * @param {number} paymentData.amount Amount to send
   * @param {string} paymentData.currency Currency code (e.g., 'EUR')
   * @param {string} paymentData.externalId External reference ID
   * @param {string} paymentData.payerMessage Message to display to payer
   * @param {string} paymentData.payeeNote Note for the payee
   * @returns {Promise<string>} Transaction reference ID
   */
  async requestToWithdraw(paymentData) {
    try {
      // Generate a unique reference ID
      const referenceId = uuidv4();
      
      // Format request data
      const requestData = {
        amount: paymentData.amount.toString(),
        currency: paymentData.currency,
        externalId: paymentData.externalId,
        payee: {
          partyIdType: 'MSISDN',
          partyId: paymentData.phoneNumber
        },
        payerMessage: paymentData.payerMessage,
        payeeNote: paymentData.payeeNote
      };

      // Make API request
      await this.httpClient.post('/disbursement/v1_0/transfer', requestData, {
        headers: {
          'X-Reference-Id': referenceId
        }
      });

      // Return the reference ID for tracking the payment status
      return referenceId;
    } catch (error) {
      console.error('Error requesting withdrawal:', error.response?.data || error.message);
      throw new Error('Failed to send payment to user');
    }
  }

  /**
   * Get the status of a withdrawal request
   * @param {string} referenceId Reference ID of the withdrawal
   * @returns {Promise<Object>} Withdrawal status information
   */
  async getWithdrawalStatus(referenceId) {
    try {
      const response = await this.httpClient.get(`/disbursement/v1_0/transfer/${referenceId}`);
      return {
        amount: response.data.amount,
        currency: response.data.currency,
        externalId: response.data.externalId,
        payeePhoneNumber: response.data.payee.partyId,
        status: response.data.status,
        reason: response.data.reason,
        financialTransactionId: response.data.financialTransactionId,
        createdAt: new Date(response.data.creationTime)
      };
    } catch (error) {
      console.error('Error getting withdrawal status:', error.response?.data || error.message);
      throw new Error(`Failed to get withdrawal status for reference ${referenceId}`);
    }
  }
}

// Create a singleton instance
const mtnMomoService = new MtnMomoService();

module.exports = { mtnMomoService };
