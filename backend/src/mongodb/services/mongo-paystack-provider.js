/**
 * MongoDB Paystack Payment Provider
 * Extends the base Paystack provider with MongoDB integration
 */
const PaystackProvider = require('../../services/payment-providers/paystack-provider');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');
const loggingService = require('../../services/logging.service');
// Create a simple logger that uses the logging service
const logger = {
  info: (message, metadata = {}) => loggingService.log('payment', 'info', message, metadata),
  error: (message, metadata = {}) => loggingService.log('payment', 'error', message, metadata),
  warn: (message, metadata = {}) => loggingService.log('payment', 'warn', message, metadata),
  debug: (message, metadata = {}) => loggingService.log('payment', 'debug', message, metadata)
};

class MongoPaystackProvider extends PaystackProvider {
  constructor(config) {
    super(config);
    this.transactionModel = Transaction;
  }

  /**
   * Override initiate payment to add MongoDB integration
   * @param {Object} paymentData Payment details
   * @returns {Promise<Object>} Payment initialization result with MongoDB transaction
   */
  async initiatePayment(paymentData) {
    let session;
    let transaction;

    try {
      // Start a MongoDB transaction
      session = await mongoose.startSession();
      session.startTransaction();

      // Create a transaction record
      const transactionData = {
        userId: paymentData.userId || (paymentData.meta ? paymentData.meta.userId : null),
        amount: paymentData.amount,
        currency: paymentData.currency || 'NGN',
        type: paymentData.type || 'ride_payment',
        status: 'pending',
        gateway: this.name,
        description: paymentData.description || 'Payment via Paystack',
        metadata: paymentData.meta || {},
        rideId: paymentData.rideId || (paymentData.meta ? paymentData.meta.rideId : null),
        paymentMethod: paymentData.paymentMethod
      };

      transaction = await this.transactionModel.createTransaction(transactionData);
      logger.info(`Created Paystack pending transaction: ${transaction._id}`);

      // Add transaction ID to payment data metadata
      if (!paymentData.meta) paymentData.meta = {};
      paymentData.meta.transactionId = transaction._id.toString();
      paymentData.reference = paymentData.reference || `PSK-${Date.now()}-${transaction._id.toString().slice(-6)}`;

      // Use the parent class to initialize the payment
      const result = await super.initiatePayment(paymentData);

      if (result.success) {
        // Update the transaction with gateway response
        transaction.gatewayTransactionId = result.data.reference;
        transaction.gatewayResponse = result.data;
        await transaction.save({ session });

        // Commit the MongoDB transaction
        await session.commitTransaction();

        // Add MongoDB transaction ID to result
        return {
          ...result,
          transactionId: transaction._id.toString()
        };
      } else {
        // Payment initiation failed at Paystack
        transaction.status = 'failed';
        transaction.failureReason = result.message || result.error || 'Paystack payment initiation failed';
        transaction.gatewayResponse = result;
        await transaction.save({ session });

        // Commit the MongoDB transaction
        await session.commitTransaction();

        // Add MongoDB transaction ID to result
        return {
          ...result,
          transactionId: transaction._id.toString()
        };
      }
    } catch (error) {
      logger.error('Error in MongoDB Paystack initiatePayment:', error);

      // Abort the transaction if it was started
      if (session && session.inTransaction()) {
        await session.abortTransaction();
      }

      // If we created a transaction record but couldn't save it in the transaction, 
      // try to update it outside the transaction
      if (transaction) {
        try {
          transaction.status = 'failed';
          transaction.failureReason = error.message;
          await transaction.save();
        } catch (updateError) {
          logger.error('Failed to update transaction after error:', updateError);
        }
      }

      return {
        success: false,
        message: 'MongoDB Paystack payment initiation failed',
        error: error.message,
        transactionId: transaction ? transaction._id.toString() : null
      };
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  /**
   * Override verify payment to add MongoDB integration
   * @param {string} reference Payment reference
   * @returns {Promise<Object>} Payment verification result with MongoDB transaction
   */
  async verifyPayment(reference) {
    let session;

    try {
      // Start a MongoDB transaction
      session = await mongoose.startSession();
      session.startTransaction();

      // Check if this reference corresponds to a MongoDB transaction
      let transaction = await this.transactionModel.findOne({
        $or: [
          { gatewayTransactionId: reference },
          { _id: mongoose.Types.ObjectId.isValid(reference) ? reference : null }
        ]
      }).session(session);

      // If we found a transaction by MongoDB ID, use its Paystack reference
      let paystackReference = reference;
      if (transaction && mongoose.Types.ObjectId.isValid(reference)) {
        paystackReference = transaction.gatewayTransactionId;
        if (!paystackReference) {
          throw new Error(`Transaction ${reference} has no gateway transaction ID`);
        }
      }

      // Use parent class to verify the payment
      const result = await super.verifyPayment(paystackReference);

      // If we found a transaction, update it
      if (transaction) {
        if (result.success) {
          transaction.status = 'completed';
          transaction.processedAt = new Date();
          transaction.gatewayResponse = result.data;
          transaction.paymentMethod = result.data.paymentMethod || transaction.paymentMethod;

          // Update payment details if available
          if (result.data.paymentDetails) {
            transaction.paymentDetails = {
              ...transaction.paymentDetails,
              ...result.data.paymentDetails
            };
          }

          await transaction.save({ session });
        } else {
          transaction.status = 'failed';
          transaction.failureReason = result.message || result.error || 'Verification failed';
          transaction.gatewayResponse = result;
          await transaction.save({ session });
        }

        await session.commitTransaction();

        // Add MongoDB transaction ID to result
        return {
          ...result,
          transactionId: transaction._id.toString()
        };
      } else if (result.success) {
        // If payment verification successful but no transaction found,
        // create a new transaction record
        try {
          const transactionData = {
            userId: result.data.metadata?.userId || null,
            amount: result.data.amount,
            currency: result.data.currency,
            type: 'ride_payment', // Default, might need updating
            status: 'completed',
            gateway: this.name,
            gatewayTransactionId: result.data.reference,
            gatewayResponse: result.data,
            description: 'Payment verified via Paystack',
            paymentMethod: result.data.paymentMethod,
            processedAt: new Date()
          };

          const newTransaction = await this.transactionModel.createTransaction(transactionData);
          logger.info(`Created transaction from verification: ${newTransaction._id}`);

          await session.commitTransaction();

          // Add MongoDB transaction ID to result
          return {
            ...result,
            transactionId: newTransaction._id.toString()
          };
        } catch (createError) {
          logger.error('Failed to create transaction from verification:', createError);
          await session.abortTransaction();

          // Return original result
          return result;
        }
      } else {
        // Verification failed and no transaction found
        await session.commitTransaction();
        return result;
      }
    } catch (error) {
      logger.error('Error in MongoDB Paystack verifyPayment:', error);

      // Abort the transaction if it was started
      if (session && session.inTransaction()) {
        await session.abortTransaction();
      }

      return {
        success: false,
        message: 'MongoDB Paystack payment verification failed',
        error: error.message
      };
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  /**
   * Override process webhook to add MongoDB integration
   * @param {Object} payload Webhook payload
   * @param {Object} headers Request headers
   * @returns {Promise<Object>} Webhook processing result with MongoDB transaction
   */
  async processWebhook(payload, headers) {
    let session;

    try {
      // Start a MongoDB transaction
      session = await mongoose.startSession();
      session.startTransaction();

      // Use parent class to process the webhook
      const result = await super.processWebhook(payload, headers);

      if (result.success) {
        // Get the reference from the result
        const reference = result.data?.reference;

        if (reference) {
          // Find the transaction in MongoDB
          const transaction = await this.transactionModel.findOne({
            gatewayTransactionId: reference
          }).session(session);

          if (transaction) {
            // Update the transaction based on the webhook event
            if (result.action === 'PAYMENT_COMPLETED') {
              transaction.status = 'completed';
              transaction.processedAt = new Date();
              transaction.gatewayResponse = result.data;

              if (result.data.paymentMethod) {
                transaction.paymentMethod = result.data.paymentMethod;
              }

              await transaction.save({ session });
            } else if (result.action === 'PAYMENT_FAILED') {
              transaction.status = 'failed';
              transaction.failureReason = result.data.error || 'Payment failed';
              transaction.gatewayResponse = result.data;
              await transaction.save({ session });
            }

            await session.commitTransaction();

            // Add MongoDB transaction ID to result
            return {
              ...result,
              transactionId: transaction._id.toString()
            };
          } else if (result.action === 'PAYMENT_COMPLETED') {
            // If payment completion webhook but no transaction found,
            // create a new transaction record
            try {
              const transactionData = {
                userId: result.data.metadata?.userId || null,
                amount: result.data.amount,
                currency: result.data.currency || 'NGN',
                type: 'ride_payment', // Default, might need updating
                status: 'completed',
                gateway: this.name,
                gatewayTransactionId: reference,
                gatewayResponse: result.data,
                description: 'Payment completed via Paystack webhook',
                paymentMethod: result.data.paymentMethod,
                processedAt: new Date()
              };

              const newTransaction = await this.transactionModel.createTransaction(transactionData);
              logger.info(`Created transaction from webhook: ${newTransaction._id}`);

              await session.commitTransaction();

              // Add MongoDB transaction ID to result
              return {
                ...result,
                transactionId: newTransaction._id.toString()
              };
            } catch (createError) {
              logger.error('Failed to create transaction from webhook:', createError);
              await session.abortTransaction();

              // Return original result
              return result;
            }
          } else {
            // Webhook event that doesn't need transaction creation
            await session.commitTransaction();
            return result;
          }
        } else {
          // No reference in the webhook payload
          await session.commitTransaction();
          return result;
        }
      } else {
        // Webhook verification failed
        await session.commitTransaction();
        return result;
      }
    } catch (error) {
      logger.error('Error in MongoDB Paystack processWebhook:', error);

      // Abort the transaction if it was started
      if (session && session.inTransaction()) {
        await session.abortTransaction();
      }

      return {
        success: false,
        message: 'MongoDB Paystack webhook processing failed',
        error: error.message
      };
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  /**
   * Override refund payment to add MongoDB integration
   * @param {string} transactionId Transaction ID to refund
   * @param {Object} options Refund options
   * @returns {Promise<Object>} Refund result with MongoDB transaction
   */
  async refundPayment(transactionId, options = {}) {
    let session;

    try {
      // Start a MongoDB transaction
      session = await mongoose.startSession();
      session.startTransaction();

      // Find the transaction in MongoDB
      let transaction;
      let paystackTransactionId;

      // Check if it's a MongoDB ID
      if (mongoose.Types.ObjectId.isValid(transactionId)) {
        transaction = await this.transactionModel.findById(transactionId).session(session);

        if (transaction) {
          paystackTransactionId = transaction.gatewayTransactionId;
        }
      }

      // If not found by MongoDB ID, try to find by Paystack transaction ID
      if (!transaction) {
        transaction = await this.transactionModel.findOne({
          gatewayTransactionId: transactionId
        }).session(session);

        if (transaction) {
          paystackTransactionId = transaction.gatewayTransactionId;
        } else {
          paystackTransactionId = transactionId;
        }
      }

      // If transaction found but not completed, can't refund
      if (transaction && transaction.status !== 'completed') {
        await session.abortTransaction();

        return {
          success: false,
          message: `Cannot refund transaction with status: ${transaction.status}`,
          error: 'Transaction is not in a refundable state'
        };
      }

      // Use parent class to issue the refund
      const result = await super.refundPayment(paystackTransactionId, options);

      if (result.success && transaction) {
        // If refund successful and we have the original transaction
        // Create a refund transaction linked to the original
        const refundTransactionData = {
          userId: transaction.userId,
          amount: options.amount || transaction.amount,
          currency: transaction.currency,
          type: 'refund',
          status: 'completed',
          gateway: this.name,
          gatewayTransactionId: result.data.refundId,
          gatewayResponse: result.data,
          description: `Refund for transaction ${transaction._id}`,
          metadata: {
            originalTransactionId: transaction._id,
            reason: options.reason || 'Manual refund'
          },
          paymentMethod: transaction.paymentMethod,
          processedAt: new Date(),
          refundDetails: {
            refundAmount: options.amount || transaction.amount,
            refundReason: options.reason || 'Manual refund',
            refundedAt: new Date(),
            refundTransactionId: transaction._id
          }
        };

        const refundTransaction = await this.transactionModel.createTransaction(refundTransactionData);

        // Update the original transaction to reference the refund
        transaction.status = options.amount && options.amount < transaction.amount
          ? 'partially_refunded'
          : 'refunded';

        if (!transaction.refundDetails) {
          transaction.refundDetails = {};
        }

        transaction.refundDetails.refundAmount = options.amount || transaction.amount;
        transaction.refundDetails.refundReason = options.reason || 'Manual refund';
        transaction.refundDetails.refundedAt = new Date();
        transaction.refundDetails.refundTransactionId = refundTransaction._id;

        await transaction.save({ session });
        await session.commitTransaction();

        // Add transaction IDs to the result
        return {
          ...result,
          originalTransactionId: transaction._id.toString(),
          refundTransactionId: refundTransaction._id.toString()
        };
      } else if (result.success) {
        // Refund successful but original transaction not found
        // Create a standalone refund transaction
        try {
          const refundTransactionData = {
            userId: null, // Unknown user
            amount: options.amount,
            currency: options.currency || 'NGN',
            type: 'refund',
            status: 'completed',
            gateway: this.name,
            gatewayTransactionId: result.data.refundId,
            gatewayResponse: result.data,
            description: `Refund for external transaction ${transactionId}`,
            metadata: {
              externalTransactionId: transactionId,
              reason: options.reason || 'Manual refund'
            },
            processedAt: new Date()
          };

          const refundTransaction = await this.transactionModel.createTransaction(refundTransactionData);
          await session.commitTransaction();

          // Add transaction ID to the result
          return {
            ...result,
            refundTransactionId: refundTransaction._id.toString()
          };
        } catch (createError) {
          logger.error('Failed to create refund transaction:', createError);
          await session.abortTransaction();

          // Return original result
          return result;
        }
      } else {
        // Refund failed
        await session.abortTransaction();
        return result;
      }
    } catch (error) {
      logger.error('Error in MongoDB Paystack refundPayment:', error);

      // Abort the transaction if it was started
      if (session && session.inTransaction()) {
        await session.abortTransaction();
      }

      return {
        success: false,
        message: 'MongoDB Paystack payment refund failed',
        error: error.message
      };
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  /**
   * Override get transaction to add MongoDB integration
   * @param {string} transactionId Transaction ID
   * @returns {Promise<Object>} Transaction details with MongoDB data
   */
  async getTransaction(transactionId) {
    try {
      // Check if it's a MongoDB ID
      let mongoTransaction;
      let isMongoId = false;

      if (mongoose.Types.ObjectId.isValid(transactionId)) {
        mongoTransaction = await this.transactionModel.findById(transactionId)
          .populate('userId', 'firstName lastName email')
          .populate('rideId', 'pickupLocation destination status')
          .lean();

        if (mongoTransaction) {
          isMongoId = true;
        }
      }

      // If not found by MongoDB ID, try to find by Paystack transaction ID
      if (!mongoTransaction) {
        mongoTransaction = await this.transactionModel.findOne({
          gatewayTransactionId: transactionId
        })
          .populate('userId', 'firstName lastName email')
          .populate('rideId', 'pickupLocation destination status')
          .lean();
      }

      if (mongoTransaction) {
        // Format user information
        let user = null;
        if (mongoTransaction.userId) {
          user = {
            id: mongoTransaction.userId._id,
            name: `${mongoTransaction.userId.firstName || ''} ${mongoTransaction.userId.lastName || ''}`.trim(),
            email: mongoTransaction.userId.email
          };
        }

        return {
          success: true,
          data: {
            id: mongoTransaction._id,
            externalId: mongoTransaction.gatewayTransactionId,
            amount: mongoTransaction.amount,
            currency: mongoTransaction.currency,
            type: mongoTransaction.type,
            status: mongoTransaction.status,
            gateway: mongoTransaction.gateway,
            paymentMethod: mongoTransaction.paymentMethod,
            description: mongoTransaction.description,
            metadata: mongoTransaction.metadata,
            user,
            ride: mongoTransaction.rideId,
            createdAt: mongoTransaction.createdAt,
            processedAt: mongoTransaction.processedAt,
            updatedAt: mongoTransaction.updatedAt,
            refundDetails: mongoTransaction.refundDetails,
            fees: mongoTransaction.fees
          }
        };
      } else if (!isMongoId) {
        // If not found in MongoDB and not a MongoDB ID, use parent class
        return await super.getTransaction(transactionId);
      } else {
        return {
          success: false,
          message: 'Transaction not found',
          error: 'Transaction not found in MongoDB'
        };
      }
    } catch (error) {
      logger.error('Error in MongoDB Paystack getTransaction:', error);

      return {
        success: false,
        message: 'Failed to get transaction details',
        error: error.message
      };
    }
  }
}

module.exports = MongoPaystackProvider;
