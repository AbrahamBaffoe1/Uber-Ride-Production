/**
 * Paystack API Integration Service
 * For handling multiple payment methods including card payments, mobile money, bank transfers
 * Reference: https://paystack.com/docs/api/
 */
const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class PaystackService {
  constructor() {
    // Base config
    this.config = {
      // These would come from environment variables in a real implementation
      secretKey: process.env.PAYSTACK_SECRET_KEY || 'your-secret-key',
      publicKey: process.env.PAYSTACK_PUBLIC_KEY || 'your-public-key',
      environment: process.env.PAYSTACK_ENVIRONMENT || 'test', // 'test' or 'live'
      businessName: process.env.BUSINESS_NAME || 'Okada Transportation',
      callbackUrl: process.env.PAYSTACK_CALLBACK_URL || 'https://api.okadatransportation.com/v1/payments/callback/paystack'
    };

    // Create axios instance with default config
    this.httpClient = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.secretKey}`
      }
    });
  }

  /**
   * Verify webhook signature
   * @param {string} signature - Signature from header
   * @param {string} requestBody - Request body as string
   * @returns {boolean} - Whether the signature is valid
   */
  verifyWebhookSignature(signature, requestBody) {
    try {
      const hash = crypto
        .createHmac('sha512', this.config.secretKey)
        .update(requestBody)
        .digest('hex');
      
      return hash === signature;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Initialize a transaction
   * @param {Object} paymentData - Payment data
   * @param {number} paymentData.amount - Amount in smallest currency unit (kobo, pesewas)
   * @param {string} paymentData.email - Customer email
   * @param {string} paymentData.currency - Currency code (NGN, GHS, USD)
   * @param {string} paymentData.reference - Unique transaction reference
   * @param {string} paymentData.callbackUrl - URL to redirect to after payment
   * @param {Object} paymentData.metadata - Additional data about the transaction
   * @returns {Promise<Object>} - Transaction initialization data
   */
  async initializeTransaction(paymentData) {
    try {
      // Generate reference if not provided
      const reference = paymentData.reference || `OKADA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Format request data
      const requestData = {
        amount: paymentData.amount * 100, // Convert to smallest currency unit
        email: paymentData.email,
        currency: paymentData.currency || 'GHS',
        reference,
        callback_url: paymentData.callbackUrl || this.config.callbackUrl,
        metadata: {
          ...paymentData.metadata || {},
          source: 'okada_transportation',
          ride_id: paymentData.rideId || null,
          transaction_type: paymentData.transactionType || 'payment'
        }
      };

      // Add channels if provided
      if (paymentData.channels) {
        requestData.channels = paymentData.channels;
      }

      // Make request
      const response = await this.httpClient.post('/transaction/initialize', requestData);
      
      if (!response.data.status) {
        throw new Error(`Payment initialization failed: ${response.data.message}`);
      }

      return {
        status: 'success',
        reference,
        paymentLink: response.data.data.authorization_url,
        accessCode: response.data.data.access_code
      };
    } catch (error) {
      console.error('Error initializing transaction:', error.response?.data || error.message);
      throw new Error(`Failed to initialize payment: ${error.message}`);
    }
  }

  /**
   * Verify a transaction
   * @param {string} reference - Transaction reference
   * @returns {Promise<Object>} - Transaction verification data
   */
  async verifyTransaction(reference) {
    try {
      const response = await this.httpClient.get(`/transaction/verify/${reference}`);
      
      if (!response.data.status) {
        throw new Error(`Transaction verification failed: ${response.data.message}`);
      }

      const data = response.data.data;
      
      return {
        status: 'success',
        verified: data.status === 'success',
        reference: data.reference,
        amount: data.amount / 100, // Convert from smallest currency unit
        currency: data.currency,
        paymentDate: new Date(data.paid_at),
        channel: data.channel,
        cardType: data.authorization?.card_type,
        cardLast4: data.authorization?.last4,
        cardExpiry: data.authorization?.exp_month && data.authorization?.exp_year ? 
          `${data.authorization.exp_month}/${data.authorization.exp_year}` : null,
        customerEmail: data.customer.email,
        customerName: data.customer.email,
        metadata: data.metadata
      };
    } catch (error) {
      console.error('Error verifying transaction:', error.response?.data || error.message);
      throw new Error(`Failed to verify transaction: ${error.message}`);
    }
  }

  /**
   * List transactions
   * @param {Object} options - Query options
   * @param {number} options.perPage - Number of records per page
   * @param {number} options.page - Page number
   * @param {string} options.from - Start date (YYYY-MM-DD)
   * @param {string} options.to - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} - Transactions data
   */
  async listTransactions(options = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (options.perPage) queryParams.append('perPage', options.perPage);
      if (options.page) queryParams.append('page', options.page);
      if (options.from) queryParams.append('from', options.from);
      if (options.to) queryParams.append('to', options.to);
      
      const url = `/transaction?${queryParams.toString()}`;
      
      const response = await this.httpClient.get(url);
      
      if (!response.data.status) {
        throw new Error(`Failed to list transactions: ${response.data.message}`);
      }

      return {
        status: 'success',
        transactions: response.data.data.map(tx => ({
          id: tx.id,
          reference: tx.reference,
          amount: tx.amount / 100, // Convert from smallest currency unit
          currency: tx.currency,
          status: tx.status,
          channel: tx.channel,
          createdAt: new Date(tx.created_at),
          customerEmail: tx.customer.email
        })),
        meta: response.data.meta
      };
    } catch (error) {
      console.error('Error listing transactions:', error.response?.data || error.message);
      throw new Error(`Failed to list transactions: ${error.message}`);
    }
  }

  /**
   * Charge an authorization (recurring payments)
   * @param {Object} chargeData - Charge data
   * @param {string} chargeData.authorizationCode - Authorization code from a previous transaction
   * @param {number} chargeData.amount - Amount in smallest currency unit
   * @param {string} chargeData.email - Customer email
   * @param {string} chargeData.reference - Unique transaction reference
   * @returns {Promise<Object>} - Charge result
   */
  async chargeAuthorization(chargeData) {
    try {
      // Generate reference if not provided
      const reference = chargeData.reference || `OKADA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Format request data
      const requestData = {
        authorization_code: chargeData.authorizationCode,
        amount: chargeData.amount * 100, // Convert to smallest currency unit
        email: chargeData.email,
        reference
      };

      // Make request
      const response = await this.httpClient.post('/transaction/charge_authorization', requestData);
      
      if (!response.data.status) {
        throw new Error(`Charge failed: ${response.data.message}`);
      }

      return {
        status: 'success',
        reference,
        transactionId: response.data.data.id,
        amount: response.data.data.amount / 100, // Convert from smallest currency unit
        currency: response.data.data.currency,
        paid: response.data.data.status === 'success'
      };
    } catch (error) {
      console.error('Error charging authorization:', error.response?.data || error.message);
      throw new Error(`Failed to charge authorization: ${error.message}`);
    }
  }

  /**
   * Create a payment plan for subscription
   * @param {Object} planData - Payment plan data
   * @param {string} planData.name - Plan name
   * @param {number} planData.amount - Amount in smallest currency unit
   * @param {string} planData.interval - Interval (hourly, daily, weekly, monthly, quarterly, biannually, annually)
   * @returns {Promise<Object>} - Payment plan data
   */
  async createPlan(planData) {
    try {
      // Format request data
      const requestData = {
        name: planData.name,
        amount: planData.amount * 100, // Convert to smallest currency unit
        interval: planData.interval || 'monthly',
        description: planData.description || `Okada Transportation ${planData.name} plan`
      };

      // Make request
      const response = await this.httpClient.post('/plan', requestData);
      
      if (!response.data.status) {
        throw new Error(`Plan creation failed: ${response.data.message}`);
      }

      return {
        status: 'success',
        planId: response.data.data.id,
        planCode: response.data.data.plan_code,
        name: response.data.data.name,
        amount: response.data.data.amount / 100, // Convert from smallest currency unit
        interval: response.data.data.interval
      };
    } catch (error) {
      console.error('Error creating plan:', error.response?.data || error.message);
      throw new Error(`Failed to create payment plan: ${error.message}`);
    }
  }

  /**
   * Create a subscription for a customer
   * @param {Object} subscriptionData - Subscription data
   * @param {string} subscriptionData.planCode - Plan code
   * @param {string} subscriptionData.customerEmail - Customer email
   * @param {string} subscriptionData.authorizationCode - Authorization code from a previous transaction
   * @returns {Promise<Object>} - Subscription data
   */
  async createSubscription(subscriptionData) {
    try {
      // Format request data
      const requestData = {
        plan: subscriptionData.planCode,
        customer: subscriptionData.customerEmail,
        authorization: subscriptionData.authorizationCode
      };

      // Make request
      const response = await this.httpClient.post('/subscription', requestData);
      
      if (!response.data.status) {
        throw new Error(`Subscription creation failed: ${response.data.message}`);
      }

      return {
        status: 'success',
        subscriptionCode: response.data.data.subscription_code,
        customerEmail: response.data.data.customer.email,
        planCode: response.data.data.plan.plan_code,
        amount: response.data.data.amount / 100, // Convert from smallest currency unit
        status: response.data.data.status
      };
    } catch (error) {
      console.error('Error creating subscription:', error.response?.data || error.message);
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  /**
   * Initiate a mobile money payment
   * @param {Object} paymentData - Payment data
   * @param {string} paymentData.provider - Provider (mtn, vodafone, airtel)
   * @param {string} paymentData.phoneNumber - Customer phone number
   * @param {number} paymentData.amount - Amount to charge
   * @param {string} paymentData.email - Customer email
   * @param {string} paymentData.reference - Unique transaction reference
   * @returns {Promise<Object>} - Payment initialization data
   */
  async initiateMobileMoneyPayment(paymentData) {
    try {
      // Generate reference if not provided
      const reference = paymentData.reference || `OKADA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Format request data
      const requestData = {
        email: paymentData.email,
        amount: paymentData.amount * 100, // Convert to smallest currency unit
        currency: 'GHS', // Mobile money is only supported in Ghana
        reference,
        callback_url: paymentData.callbackUrl || this.config.callbackUrl,
        channels: ['mobile_money'],
        metadata: {
          ...paymentData.metadata || {},
          provider: paymentData.provider,
          phone_number: paymentData.phoneNumber,
          source: 'okada_transportation',
          ride_id: paymentData.rideId || null,
          transaction_type: paymentData.transactionType || 'payment'
        }
      };

      // Make request
      const response = await this.httpClient.post('/transaction/initialize', requestData);
      
      if (!response.data.status) {
        throw new Error(`Mobile money payment initialization failed: ${response.data.message}`);
      }

      return {
        status: 'success',
        reference,
        paymentLink: response.data.data.authorization_url,
        accessCode: response.data.data.access_code
      };
    } catch (error) {
      console.error('Error initiating mobile money payment:', error.response?.data || error.message);
      throw new Error(`Failed to initiate mobile money payment: ${error.message}`);
    }
  }

  /**
   * Refund a transaction
   * @param {Object} refundData - Refund data
   * @param {string} refundData.reference - Transaction reference
   * @param {number} refundData.amount - Amount to refund (optional, defaults to full amount)
   * @returns {Promise<Object>} - Refund data
   */
  async refundTransaction(refundData) {
    try {
      // Format request data
      const requestData = {
        transaction: refundData.reference,
        amount: refundData.amount ? refundData.amount * 100 : undefined // Convert to smallest currency unit if provided
      };

      // Make request
      const response = await this.httpClient.post('/refund', requestData);
      
      if (!response.data.status) {
        throw new Error(`Refund failed: ${response.data.message}`);
      }

      return {
        status: 'success',
        refundId: response.data.data.id,
        reference: response.data.data.transaction.reference,
        amount: response.data.data.amount / 100, // Convert from smallest currency unit
        currency: response.data.data.currency,
        refundStatus: response.data.data.status,
        createdAt: new Date(response.data.data.created_at)
      };
    } catch (error) {
      console.error('Error refunding transaction:', error.response?.data || error.message);
      throw new Error(`Failed to refund transaction: ${error.message}`);
    }
  }

  /**
   * Get a list of banks
   * @param {string} country - Country code (GH, NG)
   * @returns {Promise<Array>} - List of banks
   */
  async getBanks(country = 'GH') {
    try {
      const response = await this.httpClient.get(`/bank?country=${country}`);
      
      if (!response.data.status) {
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

  /**
   * Get exchange rates
   * @param {string} amount - Amount to convert
   * @param {string} currency - Currency to convert from (GHS, USD, EUR)
   * @returns {Promise<Object>} - Exchange rates
   */
  async getExchangeRates(amount, currency = 'GHS') {
    try {
      const response = await this.httpClient.get(`/balance/currency_conversion?amount=${amount * 100}&currency=${currency}`);
      
      if (!response.data.status) {
        throw new Error(`Failed to get exchange rates: ${response.data.message}`);
      }

      return {
        status: 'success',
        rates: Object.entries(response.data.data).map(([key, value]) => ({
          currency: key,
          rate: value.rate,
          amount: value.amount / 100 // Convert from smallest currency unit
        }))
      };
    } catch (error) {
      console.error('Error getting exchange rates:', error.response?.data || error.message);
      throw new Error(`Failed to get exchange rates: ${error.message}`);
    }
  }
}

// Create singleton instance
const paystackService = new PaystackService();

module.exports = { paystackService };
