/**
 * Base Payment Provider
 * Defines the interface that all payment providers must implement
 */

class BasePaymentProvider {
  constructor(config) {
    this.config = config;
    this.name = 'base';
  }

  /**
   * Initialize the payment provider
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async initialize() {
    throw new Error('Method not implemented: initialize()');
  }

  /**
   * Get provider metadata
   * @returns {Object} Provider metadata
   */
  getMetadata() {
    return {
      name: this.name,
      isConfigured: false,
      supportedPaymentMethods: [],
      supportedCurrencies: [],
      supportedCountries: []
    };
  }

  /**
   * Initiate a payment
   * @param {Object} paymentData Payment details
   * @returns {Promise<Object>} Payment initialization result
   */
  async initiatePayment(paymentData) {
    throw new Error('Method not implemented: initiatePayment()');
  }

  /**
   * Verify a payment
   * @param {string} reference Payment reference
   * @returns {Promise<Object>} Payment verification result
   */
  async verifyPayment(reference) {
    throw new Error('Method not implemented: verifyPayment()');
  }

  /**
   * Process a webhook event
   * @param {Object} payload Webhook payload
   * @param {Object} headers Request headers
   * @returns {Promise<Object>} Webhook processing result
   */
  async processWebhook(payload, headers) {
    throw new Error('Method not implemented: processWebhook()');
  }

  /**
   * Refund a payment
   * @param {string} transactionId Transaction ID to refund
   * @param {number} amount Amount to refund (optional, full refund if not specified)
   * @returns {Promise<Object>} Refund result
   */
  async refundPayment(transactionId, amount = null) {
    throw new Error('Method not implemented: refundPayment()');
  }

  /**
   * Get a payment transaction details
   * @param {string} transactionId Transaction ID
   * @returns {Promise<Object>} Transaction details
   */
  async getTransaction(transactionId) {
    throw new Error('Method not implemented: getTransaction()');
  }

  /**
   * Verify webhook signature
   * @param {Object} payload Webhook payload
   * @param {Object} headers Request headers
   * @returns {boolean} Whether the signature is valid
   */
  verifyWebhookSignature(payload, headers) {
    throw new Error('Method not implemented: verifyWebhookSignature()');
  }
}

module.exports = BasePaymentProvider;
