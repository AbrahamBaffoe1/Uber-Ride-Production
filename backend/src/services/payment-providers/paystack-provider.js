/**
 * Paystack Payment Provider
 * Implements payment processing via Paystack
 */
const crypto = require('crypto');
const https = require('https');
const BasePaymentProvider = require('./base-provider');
const axios = require('axios');

class PaystackProvider extends BasePaymentProvider {
  constructor(config) {
    super(config);
    this.name = 'paystack';
    this.baseUrl = 'https://api.paystack.co';
    this.supportedCurrencies = ['NGN', 'GHS', 'ZAR', 'USD'];
    
    this.supportedPaymentMethods = [
      'card', 'bank_transfer', 'ussd', 'qr', 'bank'
    ];
    
    this.supportedCountries = [
      'NG', // Nigeria
      'GH', // Ghana
      'ZA', // South Africa
      'KE'  // Kenya
    ];
  }

  /**
   * Initialize the payment provider
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async initialize() {
    try {
      const { secretKey } = this.config.providers.paystack;
      
      if (!secretKey) {
        console.warn('Paystack not properly configured - missing secret key');
        return false;
      }
      
      this.axiosInstance = axios.create({
        baseURL: this.baseUrl,
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Paystack:', error);
      return false;
    }
  }

  /**
   * Get provider metadata
   * @returns {Object} Provider metadata
   */
  getMetadata() {
    return {
      name: this.name,
      isConfigured: !!this.axiosInstance,
      supportedPaymentMethods: this.supportedPaymentMethods,
      supportedCurrencies: this.supportedCurrencies,
      supportedCountries: this.supportedCountries
    };
  }

  /**
   * Initiate a payment
   * @param {Object} paymentData Payment details
   * @returns {Promise<Object>} Payment initialization result
   */
  async initiatePayment(paymentData) {
    try {
      if (!this.axiosInstance) {
        throw new Error('Paystack not initialized');
      }

      const {
        amount,
        currency = 'NGN',
        email,
        name,
        phone,
        reference = `PSK-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        callback_url = this.config.callbackUrl,
        meta = {},
        customer = {}
      } = paymentData;

      // Convert amount to kobo (Paystack requires amount in the smallest currency unit)
      const amountInKobo = Math.round(amount * 100);

      // Prepare the payload
      const payload = {
        email: email || customer.email,
        amount: amountInKobo,
        currency,
        reference,
        callback_url,
        metadata: {
          consumer_id: meta.userId || '',
          rider_id: meta.riderId || '',
          trip_id: meta.tripId || '',
          custom_fields: [
            {
              display_name: 'Customer Name',
              variable_name: 'customer_name',
              value: name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer'
            },
            {
              display_name: 'Payment For',
              variable_name: 'payment_for',
              value: meta.paymentFor || 'Ride'
            }
          ],
          ...meta
        },
        channels: this.getChannelsFromPaymentMethods(paymentData.paymentMethods)
      };

      // Call Paystack to initialize transaction
      const response = await this.axiosInstance.post('/transaction/initialize', payload);

      if (response.data.status) {
        return {
          success: true,
          message: 'Payment initiated successfully',
          data: {
            reference,
            redirectUrl: response.data.data.authorization_url,
            accessCode: response.data.data.access_code,
            amount: amount, // Original amount, not in kobo
            currency,
            provider: this.name,
            status: 'pending',
            meta
          }
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Failed to initiate payment',
          data: {
            reference,
            provider: this.name,
            error: response.data
          }
        };
      }
    } catch (error) {
      console.error('Paystack payment initiation error:', error);
      return {
        success: false,
        message: 'Payment initiation failed',
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Verify a payment
   * @param {string} reference Payment reference
   * @returns {Promise<Object>} Payment verification result
   */
  async verifyPayment(reference) {
    try {
      if (!this.axiosInstance) {
        throw new Error('Paystack not initialized');
      }

      const response = await this.axiosInstance.get(`/transaction/verify/${reference}`);

      if (response.data.status && response.data.data.status === 'success') {
        // Convert amount from kobo back to regular currency
        const amount = response.data.data.amount / 100;
        
        return {
          success: true,
          message: 'Payment verified successfully',
          data: {
            reference,
            transactionId: response.data.data.id,
            amount,
            currency: response.data.data.currency,
            provider: this.name,
            status: 'completed',
            paymentMethod: response.data.data.channel,
            meta: response.data.data.metadata || {},
            customer: {
              email: response.data.data.customer.email,
              name: response.data.data.customer.customer_code
            },
            paidAt: response.data.data.paid_at
          }
        };
      } else {
        return {
          success: false,
          message: 'Payment verification failed',
          data: {
            reference,
            provider: this.name,
            status: response.data.data ? response.data.data.status : 'unknown',
            error: response.data.message || 'Unknown error'
          }
        };
      }
    } catch (error) {
      console.error('Paystack payment verification error:', error);
      return {
        success: false,
        message: 'Payment verification failed',
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Process a webhook event
   * @param {Object} payload Webhook payload
   * @param {Object} headers Request headers
   * @returns {Promise<Object>} Webhook processing result
   */
  async processWebhook(payload, headers) {
    try {
      // Verify webhook signature
      const isValid = this.verifyWebhookSignature(payload, headers);
      
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      // Check if this is a charge success event
      if (payload.event === 'charge.success') {
        const { reference, status, amount, currency, channel, customer, metadata } = payload.data;

        // Convert amount from kobo back to regular currency
        const originalAmount = amount / 100;

        if (status === 'success') {
          return {
            success: true,
            action: 'PAYMENT_COMPLETED',
            data: {
              reference,
              transactionId: payload.data.id,
              amount: originalAmount,
              currency,
              provider: this.name,
              status: 'completed',
              paymentMethod: channel,
              customer,
              meta: metadata || {}
            }
          };
        } else {
          return {
            success: false,
            action: 'PAYMENT_FAILED',
            data: {
              reference,
              provider: this.name,
              status,
              error: 'Payment was not successful'
            }
          };
        }
      }

      // For other event types
      return {
        success: true,
        action: 'EVENT_RECEIVED',
        event: payload.event,
        data: payload.data
      };
    } catch (error) {
      console.error('Paystack webhook processing error:', error);
      return {
        success: false,
        message: 'Webhook processing failed',
        error: error.message
      };
    }
  }

  /**
   * Refund a payment
   * @param {string} transactionId Transaction ID to refund
   * @param {number} amount Amount to refund (optional, full refund if not specified)
   * @returns {Promise<Object>} Refund result
   */
  async refundPayment(transactionId, amount = null) {
    try {
      if (!this.axiosInstance) {
        throw new Error('Paystack not initialized');
      }

      const payload = {
        transaction: transactionId
      };

      // If specific amount provided, convert to kobo and add to payload
      if (amount) {
        payload.amount = Math.round(amount * 100);
      }

      const response = await this.axiosInstance.post('/refund', payload);

      if (response.data.status) {
        // Convert amount from kobo back to regular currency
        const refundAmount = response.data.data.amount / 100;
        
        return {
          success: true,
          message: 'Refund processed successfully',
          data: {
            refundId: response.data.data.id,
            transactionId,
            amount: refundAmount,
            status: response.data.data.status,
            provider: this.name
          }
        };
      } else {
        return {
          success: false,
          message: 'Refund failed',
          data: {
            transactionId,
            provider: this.name,
            error: response.data.message
          }
        };
      }
    } catch (error) {
      console.error('Paystack refund error:', error);
      return {
        success: false,
        message: 'Refund failed',
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Get transaction details
   * @param {string} transactionId Transaction ID (can be reference or transaction ID)
   * @returns {Promise<Object>} Transaction details
   */
  async getTransaction(transactionId) {
    try {
      if (!this.axiosInstance) {
        throw new Error('Paystack not initialized');
      }

      // First, try to query by reference
      try {
        const response = await this.axiosInstance.get(`/transaction/verify/${transactionId}`);
        
        if (response.data.status) {
          // Convert amount from kobo back to regular currency
          const amount = response.data.data.amount / 100;
          
          return {
            success: true,
            data: {
              transactionId: response.data.data.id,
              reference: response.data.data.reference,
              amount,
              currency: response.data.data.currency,
              status: response.data.data.status,
              paymentMethod: response.data.data.channel,
              customer: {
                email: response.data.data.customer.email,
                name: response.data.data.customer.customer_code
              },
              createdAt: response.data.data.created_at,
              provider: this.name
            }
          };
        }
      } catch (error) {
        // If it fails, try querying by transaction ID
        if (error.response && error.response.status === 404) {
          const response = await this.axiosInstance.get(`/transaction/${transactionId}`);
          
          if (response.data.status) {
            // Convert amount from kobo back to regular currency
            const amount = response.data.data.amount / 100;
            
            return {
              success: true,
              data: {
                transactionId: response.data.data.id,
                reference: response.data.data.reference,
                amount,
                currency: response.data.data.currency,
                status: response.data.data.status,
                paymentMethod: response.data.data.channel,
                customer: {
                  email: response.data.data.customer.email,
                  name: response.data.data.customer.customer_code
                },
                createdAt: response.data.data.created_at,
                provider: this.name
              }
            };
          }
        }
        
        // Re-throw if it wasn't a 404 or if second attempt fails
        throw error;
      }
      
      return {
        success: false,
        message: 'Could not retrieve transaction',
        error: 'Transaction not found'
      };
    } catch (error) {
      console.error('Paystack get transaction error:', error);
      return {
        success: false,
        message: 'Failed to retrieve transaction details',
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Verify webhook signature
   * @param {Object} payload Webhook payload
   * @param {Object} headers Request headers
   * @returns {boolean} Whether the signature is valid
   */
  verifyWebhookSignature(payload, headers) {
    try {
      const { webhookSecret } = this.config.providers.paystack;
      const signature = headers['x-paystack-signature'];
      
      if (!webhookSecret || !signature) {
        return false;
      }

      // Verify HMAC SHA512 signature
      const hash = crypto
        .createHmac('sha512', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      return signature === hash;
    } catch (error) {
      console.error('Paystack webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Convert payment methods to Paystack channels
   * @param {Array} paymentMethods Payment methods
   * @returns {Array} Payment channels for Paystack
   */
  getChannelsFromPaymentMethods(paymentMethods) {
    if (!paymentMethods || !Array.isArray(paymentMethods) || paymentMethods.length === 0) {
      // Default to all channels
      return ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'];
    }

    const channelMapping = {
      'card': 'card',
      'bank_transfer': 'bank_transfer',
      'ussd': 'ussd',
      'qr': 'qr',
      'bank': 'bank'
    };

    return paymentMethods
      .map(method => channelMapping[method])
      .filter(Boolean);
  }
}

module.exports = PaystackProvider;
