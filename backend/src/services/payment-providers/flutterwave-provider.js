/**
 * Flutterwave Payment Provider
 * Implements payment processing via Flutterwave
 */
const crypto = require('crypto');
const Flutterwave = require('flutterwave-node-v3');
const BasePaymentProvider = require('./base-provider');

class FlutterwaveProvider extends BasePaymentProvider {
  constructor(config) {
    super(config);
    this.name = 'flutterwave';
    this.flw = null;
    this.supportedCurrencies = [
      'NGN', 'GHS', 'KES', 'UGX', 'TZS', 'ZAR', 'USD', 'EUR', 'GBP', 'RWF', 'XOF'
    ];
    
    this.supportedPaymentMethods = [
      'card', 'bank_transfer', 'mobile_money', 'ussd', 'qr', 'mpesa'
    ];
    
    this.supportedCountries = [
      'NG', 'GH', 'KE', 'UG', 'ZA', 'TZ', 'RW', 'CM', 'CI', 'ZM'
    ];
  }

  /**
   * Initialize the payment provider
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async initialize() {
    try {
      const { publicKey, secretKey } = this.config.providers.flutterwave;
      
      if (!publicKey || !secretKey) {
        console.warn('Flutterwave not properly configured - missing keys');
        return false;
      }
      
      this.flw = new Flutterwave(publicKey, secretKey);
      return true;
    } catch (error) {
      console.error('Failed to initialize Flutterwave:', error);
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
      isConfigured: !!this.flw,
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
      if (!this.flw) {
        throw new Error('Flutterwave not initialized');
      }

      const {
        amount,
        currency = 'NGN',
        email,
        name,
        phone,
        tx_ref = `FLW-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        redirect_url = this.config.callbackUrl,
        payment_options = 'card,mobilemoney,ussd',
        meta = {},
        customer = {}
      } = paymentData;

      // Prepare the payload
      const payload = {
        tx_ref,
        amount,
        currency,
        redirect_url,
        payment_options,
        meta: {
          consumer_id: meta.userId || '',
          rider_id: meta.riderId || '',
          trip_id: meta.tripId || '',
          ...meta
        },
        customer: {
          email: email || customer.email,
          phone_number: phone || customer.phone,
          name: name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer'
        },
        customizations: {
          title: paymentData.title || 'Okada Ride Africa',
          description: paymentData.description || 'Payment for ride',
          logo: paymentData.logo || 'https://okada-ride-africa.com/logo.png'
        }
      };

      // Call Flutterwave payment endpoint
      const response = await this.flw.Charge.card(payload);

      if (response.status === 'success') {
        return {
          success: true,
          message: 'Payment initiated successfully',
          data: {
            reference: tx_ref,
            redirectUrl: response.data.link || null,
            paymentId: response.data.id || null,
            amount,
            currency,
            provider: this.name,
            status: 'pending',
            meta
          }
        };
      } else {
        return {
          success: false,
          message: response.message || 'Failed to initiate payment',
          data: {
            reference: tx_ref,
            provider: this.name,
            error: response.data
          }
        };
      }
    } catch (error) {
      console.error('Flutterwave payment initiation error:', error);
      return {
        success: false,
        message: 'Payment initiation failed',
        error: error.message
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
      if (!this.flw) {
        throw new Error('Flutterwave not initialized');
      }

      const response = await this.flw.Transaction.verify({ id: reference });

      if (response.status === 'success' && response.data.status === 'successful') {
        return {
          success: true,
          message: 'Payment verified successfully',
          data: {
            reference: response.data.tx_ref,
            transactionId: response.data.id,
            amount: response.data.amount,
            currency: response.data.currency,
            provider: this.name,
            status: 'completed',
            paymentMethod: response.data.payment_type,
            meta: response.data.meta || {},
            customer: response.data.customer || {},
            paidAt: response.data.created_at
          }
        };
      } else {
        return {
          success: false,
          message: 'Payment verification failed',
          data: {
            reference,
            provider: this.name,
            status: response.data ? response.data.status : 'unknown',
            error: response.message || 'Unknown error'
          }
        };
      }
    } catch (error) {
      console.error('Flutterwave payment verification error:', error);
      return {
        success: false,
        message: 'Payment verification failed',
        error: error.message
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

      // Check if this is a charge completion event
      if (payload.event === 'charge.completed') {
        const { tx_ref, status, amount, currency, payment_type, customer } = payload.data;

        if (status === 'successful') {
          return {
            success: true,
            action: 'PAYMENT_COMPLETED',
            data: {
              reference: tx_ref,
              transactionId: payload.data.id,
              amount,
              currency,
              provider: this.name,
              status: 'completed',
              paymentMethod: payment_type,
              customer,
              meta: payload.data.meta || {}
            }
          };
        } else {
          return {
            success: false,
            action: 'PAYMENT_FAILED',
            data: {
              reference: tx_ref,
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
      console.error('Flutterwave webhook processing error:', error);
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
      if (!this.flw) {
        throw new Error('Flutterwave not initialized');
      }

      const payload = {
        id: transactionId,
        amount: amount || null // null means full refund
      };

      const response = await this.flw.Refund.create(payload);

      if (response.status === 'success') {
        return {
          success: true,
          message: 'Refund processed successfully',
          data: {
            refundId: response.data.id,
            transactionId,
            amount: response.data.amount,
            status: response.data.status,
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
            error: response.message
          }
        };
      }
    } catch (error) {
      console.error('Flutterwave refund error:', error);
      return {
        success: false,
        message: 'Refund failed',
        error: error.message
      };
    }
  }

  /**
   * Get transaction details
   * @param {string} transactionId Transaction ID
   * @returns {Promise<Object>} Transaction details
   */
  async getTransaction(transactionId) {
    try {
      if (!this.flw) {
        throw new Error('Flutterwave not initialized');
      }

      const response = await this.flw.Transaction.verify({ id: transactionId });

      if (response.status === 'success') {
        return {
          success: true,
          data: {
            transactionId: response.data.id,
            reference: response.data.tx_ref,
            amount: response.data.amount,
            currency: response.data.currency,
            status: response.data.status,
            paymentMethod: response.data.payment_type,
            customer: response.data.customer,
            createdAt: response.data.created_at,
            provider: this.name
          }
        };
      } else {
        return {
          success: false,
          message: 'Could not retrieve transaction',
          error: response.message
        };
      }
    } catch (error) {
      console.error('Flutterwave get transaction error:', error);
      return {
        success: false,
        message: 'Failed to retrieve transaction details',
        error: error.message
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
      const { webhookHash } = this.config.providers.flutterwave;
      const signature = headers['verif-hash'];
      
      if (!webhookHash || !signature) {
        return false;
      }

      // Simple comparison for Flutterwave - they just send a hash in the header
      return signature === webhookHash;
    } catch (error) {
      console.error('Flutterwave webhook signature verification error:', error);
      return false;
    }
  }
}

module.exports = FlutterwaveProvider;
