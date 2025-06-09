/**
 * Flutterwave API Integration Service
 * For handling multiple payment methods including card payments, mobile money, bank transfers
 * Reference: https://developer.flutterwave.com/reference
 */
const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class FlutterwaveService {
  constructor() {
    // Base config
    this.config = {
      // These would come from environment variables in a real implementation
      secretKey: process.env.FLUTTERWAVE_SECRET_KEY || 'your-secret-key',
      publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY || 'your-public-key',
      encryptionKey: process.env.FLUTTERWAVE_ENCRYPTION_KEY || 'your-encryption-key',
      environment: process.env.FLUTTERWAVE_ENVIRONMENT || 'test', // 'test' or 'live'
      businessName: process.env.BUSINESS_NAME || 'Okada Transportation',
      logoUrl: process.env.LOGO_URL || 'https://okada-transportation.com/logo.png',
      callbackUrl: process.env.FLUTTERWAVE_CALLBACK_URL || 'https://api.okadatransportation.com/v1/payments/callback/flutterwave',
      redirectUrl: process.env.FLUTTERWAVE_REDIRECT_URL || 'https://okadatransportation.com/payment-response'
    };

    // Determine base URL based on environment
    this.baseUrl = 'https://api.flutterwave.com/v3';

    // Create axios instance with default config
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.secretKey}`
      }
    });
  }

  /**
   * Encrypt payment data for secure transmission
   * @param {Object} data - Data to encrypt
   * @returns {string} - Encrypted data
   */
  encryptData(data) {
    const key = this.config.encryptionKey;
    const text = JSON.stringify(data);
    
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'utf-8'), Buffer.alloc(16, 0));
    let encrypted = cipher.update(text, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    
    return encrypted;
  }

  /**
   * Verify webhook signature
   * @param {string} signature - Signature from header
   * @param {string} requestBody - Request body as string
   * @returns {boolean} - Whether the signature is valid
   */
  verifyWebhookSignature(signature, requestBody) {
    const secretHash = crypto
      .createHmac('sha256', this.config.secretKey)
      .update(requestBody)
      .digest('hex');
    
    return signature === secretHash;
  }

  /**
   * Initiate a payment
   * @param {Object} paymentData - Payment data
   * @param {string} paymentData.transactionRef - Transaction reference
   * @param {number} paymentData.amount - Amount to charge
   * @param {string} paymentData.currency - Currency code (e.g., 'GHS', 'NGN', 'USD')
   * @param {string} paymentData.email - Customer email
   * @param {string} paymentData.phoneNumber - Customer phone number
   * @param {string} paymentData.name - Customer name
   * @param {string} paymentData.description - Payment description
   * @param {string} [paymentData.paymentMethod] - Payment method (optional)
   * @param {Object} [paymentData.customizations] - Custom fields (optional)
   * @returns {Promise<Object>} - Payment link details
   */
  async initiatePayment(paymentData) {
    try {
      // Set default payment method if not provided
      const paymentMethod = paymentData.paymentMethod || 'card,mobilemoney,ussd,banktransfer';
      
      // Format request data
      const requestData = {
        tx_ref: paymentData.transactionRef || `OKADA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        amount: paymentData.amount,
        currency: paymentData.currency,
        payment_options: paymentMethod,
        redirect_url: this.config.redirectUrl,
        customer: {
          email: paymentData.email,
          phone_number: paymentData.phoneNumber,
          name: paymentData.name
        },
        meta: {
          source: 'okada_transportation',
          payment_type: paymentData.paymentType || 'regular',
          ride_id: paymentData.rideId || null
        },
        customizations: {
          title: paymentData.customizations?.title || 'Okada Transportation Payment',
          description: paymentData.description || 'Payment for transportation services',
          logo: paymentData.customizations?.logo || this.config.logoUrl
        }
      };

      // Make API request
      const response = await this.httpClient.post('/payments', requestData);
      
      if (response.data.status !== 'success') {
        throw new Error(`Payment initiation failed: ${response.data.message}`);
      }

      return {
        status: 'success',
        transactionRef: requestData.tx_ref,
        paymentLink: response.data.data.link,
        paymentId: response.data.data.id
      };
    } catch (error) {
      console.error('Error initiating payment:', error.response?.data || error.message);
      throw new Error(`Failed to initiate payment: ${error.message}`);
    }
  }

  /**
   * Verify a payment
   * @param {string} transactionId - Transaction ID (from Flutterwave)
   * @returns {Promise<Object>} - Payment verification details
   */
  async verifyPayment(transactionId) {
    try {
      const response = await this.httpClient.get(`/transactions/${transactionId}/verify`);
      
      if (response.data.status !== 'success') {
        throw new Error(`Payment verification failed: ${response.data.message}`);
      }

      const paymentData = response.data.data;
      
      return {
        status: 'success',
        verified: paymentData.status === 'successful',
        transactionRef: paymentData.tx_ref,
        transactionId: paymentData.id,
        amount: paymentData.amount,
        currency: paymentData.currency,
        paymentMethod: paymentData.payment_type,
        customerEmail: paymentData.customer.email,
        customerName: paymentData.customer.name,
        narration: paymentData.narration,
        processorResponse: paymentData.processor_response,
        paymentDate: new Date(paymentData.created_at)
      };
    } catch (error) {
      console.error('Error verifying payment:', error.response?.data || error.message);
      throw new Error(`Failed to verify payment: ${error.message}`);
    }
  }

  /**
   * Validate a payment by reference
   * @param {string} transactionRef - Transaction reference
   * @param {number} amount - Expected amount
   * @param {string} currency - Expected currency
   * @returns {Promise<Object>} - Payment validation result
   */
  async validateTransactionReference(transactionRef, amount, currency) {
    try {
      const response = await this.httpClient.get(`/transactions/verify_by_reference?tx_ref=${transactionRef}`);
      
      if (response.data.status !== 'success') {
        return {
          status: 'failed',
          message: response.data.message,
          valid: false
        };
      }

      const paymentData = response.data.data;
      
      // Check if amount and currency match
      const amountMatch = parseFloat(paymentData.amount) === parseFloat(amount);
      const currencyMatch = paymentData.currency === currency;
      
      return {
        status: 'success',
        valid: paymentData.status === 'successful' && amountMatch && currencyMatch,
        transactionRef: paymentData.tx_ref,
        transactionId: paymentData.id,
        amount: paymentData.amount,
        currency: paymentData.currency,
        paymentMethod: paymentData.payment_type,
        amountMatch,
        currencyMatch,
        paymentStatus: paymentData.status
      };
    } catch (error) {
      console.error('Error validating transaction reference:', error.response?.data || error.message);
      return {
        status: 'failed',
        message: `Failed to validate transaction: ${error.message}`,
        valid: false
      };
    }
  }

  /**
   * Initiate a mobile money payment
   * @param {Object} paymentData - Payment data
   * @param {string} paymentData.phoneNumber - Phone number
   * @param {string} paymentData.network - Mobile money network (MTN, VODAFONE, AIRTEL, etc.)
   * @param {number} paymentData.amount - Amount to charge
   * @param {string} paymentData.currency - Currency code (e.g., 'GHS')
   * @param {string} paymentData.email - Customer email
   * @param {string} paymentData.name - Customer name
   * @param {string} paymentData.description - Payment description
   * @returns {Promise<Object>} - Payment status
   */
  async initiateMobileMoneyPayment(paymentData) {
    try {
      // Generate transaction reference
      const txRef = paymentData.transactionRef || `OKADA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Format request data
      let requestData = {
        tx_ref: txRef,
        amount: paymentData.amount,
        currency: paymentData.currency,
        redirect_url: this.config.redirectUrl,
        customer: {
          email: paymentData.email,
          phone_number: paymentData.phoneNumber,
          name: paymentData.name
        },
        meta: {
          source: 'okada_transportation',
          payment_type: paymentData.paymentType || 'mobile_money',
          ride_id: paymentData.rideId || null
        },
        customizations: {
          title: 'Okada Transportation Payment',
          description: paymentData.description || 'Payment for transportation services',
          logo: this.config.logoUrl
        }
      };
      
      // Add mobile money specific fields
      switch (paymentData.currency) {
        case 'GHS': // Ghana
          requestData = {
            ...requestData,
            payment_type: 'mobilemoneygh',
            mobilemoney: {
              phone: paymentData.phoneNumber,
              provider: paymentData.network.toUpperCase(),
              // Map network to provider
              // MTN => MTN, VODAFONE => VOD, AIRTEL => AIRTEL
            }
          };
          break;
          
        case 'NGN': // Nigeria
          requestData = {
            ...requestData,
            payment_type: 'mobilemoneynigeria',
            mobilemoney: {
              phone: paymentData.phoneNumber,
              provider: paymentData.network.toUpperCase()
            }
          };
          break;
          
        default:
          throw new Error(`Unsupported currency for mobile money: ${paymentData.currency}`);
      }

      // Make API request
      const response = await this.httpClient.post('/charges?type=mobile_money', requestData);
      
      if (response.data.status !== 'success') {
        throw new Error(`Mobile money payment initiation failed: ${response.data.message}`);
      }

      return {
        status: 'success',
        transactionRef: txRef,
        flutterwaveRef: response.data.data.flw_ref,
        transactionId: response.data.data.id,
        requiresRedirect: !!response.data.data.meta?.authorization?.redirect,
        redirectUrl: response.data.data.meta?.authorization?.redirect,
        authMode: response.data.data.meta?.authorization?.mode,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error initiating mobile money payment:', error.response?.data || error.message);
      throw new Error(`Failed to initiate mobile money payment: ${error.message}`);
    }
  }

  /**
   * Create a virtual card
   * @param {Object} cardData - Card data
   * @param {string} cardData.currency - Currency code (e.g., 'USD')
   * @param {number} cardData.amount - Amount to fund the card with
   * @param {string} cardData.firstName - First name
   * @param {string} cardData.lastName - Last name
   * @param {string} cardData.email - Email address
   * @param {string} cardData.phoneNumber - Phone number
   * @param {string} cardData.title - Card title
   * @returns {Promise<Object>} - Virtual card details
   */
  async createVirtualCard(cardData) {
    try {
      // Format request data
      const requestData = {
        currency: cardData.currency,
        amount: cardData.amount,
        first_name: cardData.firstName,
        last_name: cardData.lastName,
        email: cardData.email,
        phone: cardData.phoneNumber,
        title: cardData.title || 'Okada Transportation Card',
        billing_address: cardData.billingAddress || 'Accra, Ghana',
        billing_city: cardData.billingCity || 'Accra',
        billing_state: cardData.billingState || 'Greater Accra',
        billing_country: cardData.billingCountry || 'GH',
        billing_postal_code: cardData.billingPostalCode || '00000',
        callback_url: this.config.callbackUrl
      };

      // Make API request
      const response = await this.httpClient.post('/virtual-cards', requestData);
      
      if (response.data.status !== 'success') {
        throw new Error(`Virtual card creation failed: ${response.data.message}`);
      }

      return {
        status: 'success',
        cardId: response.data.data.id,
        cardNumber: response.data.data.card_pan,
        maskedCardNumber: response.data.data.masked_pan,
        expiryMonth: response.data.data.expiration.substring(0, 2),
        expiryYear: response.data.data.expiration.substring(3),
        cvv: response.data.data.cvv,
        balance: response.data.data.amount,
        currency: response.data.data.currency,
        status: response.data.data.status
      };
    } catch (error) {
      console.error('Error creating virtual card:', error.response?.data || error.message);
      throw new Error(`Failed to create virtual card: ${error.message}`);
    }
  }

  /**
   * Refund a payment
   * @param {Object} refundData - Refund data
   * @param {string} refundData.transactionId - Transaction ID to refund
   * @param {number} refundData.amount - Amount to refund (optional, defaults to full amount)
   * @param {string} refundData.reason - Reason for refund
   * @returns {Promise<Object>} - Refund status
   */
  async refundPayment(refundData) {
    try {
      // Format request data
      const requestData = {
        id: refundData.transactionId,
        amount: refundData.amount
      };

      // Make API request
      const response = await this.httpClient.post('/transactions/refund', requestData);
      
      if (response.data.status !== 'success') {
        throw new Error(`Refund failed: ${response.data.message}`);
      }

      return {
        status: 'success',
        refundId: response.data.data.id,
        transactionId: refundData.transactionId,
        amount: response.data.data.amount,
        currency: response.data.data.currency,
        status: response.data.data.status,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error refunding payment:', error.response?.data || error.message);
      throw new Error(`Failed to refund payment: ${error.message}`);
    }
  }

  /**
   * Get a list of banks for a country
   * @param {string} country - Country code (e.g., 'GH' for Ghana, 'NG' for Nigeria)
   * @returns {Promise<Array>} - List of banks
   */
  async getBanks(country) {
    try {
      const response = await this.httpClient.get(`/banks/${country}`);
      
      if (response.data.status !== 'success') {
        throw new Error(`Failed to get banks: ${response.data.message}`);
      }

      return response.data.data.map(bank => ({
        id: bank.id,
        code: bank.code,
        name: bank.name
      }));
    } catch (error) {
      console.error('Error getting banks:', error.response?.data || error.message);
      throw new Error(`Failed to get banks: ${error.message}`);
    }
  }
}

// Create a singleton instance
const flutterwaveService = new FlutterwaveService();

module.exports = { flutterwaveService };
