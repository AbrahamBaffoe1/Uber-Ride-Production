/**
 * Transaction Model for MongoDB
 * Defines the schema and methods for payment transactions and rider earnings
 */
import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// Define transaction schema
const transactionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'NGN'
  },
  type: {
    type: String,
    required: true,
    enum: [
      'ride_payment',      // Customer paying for ride
      'ride_earning',      // Rider earning from ride
      'cashout',           // Rider cashing out earnings
      'refund',            // Refund to customer
      'adjustment',        // Manual adjustment to balance
      'promotion',         // Promotional credit
      'fee',               // Platform fee
      'commission',        // Platform commission
      'tax',               // Tax payment
      'deposit',           // User depositing funds
      'withdrawal'         // User withdrawing funds
    ],
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: [
      'pending',           // Transaction initiated but not completed
      'processing',        // Transaction is being processed
      'completed',         // Transaction completed successfully
      'failed',            // Transaction failed
      'cancelled',         // Transaction was cancelled
      'refunded',          // Transaction was refunded
      'partially_refunded' // Transaction was partially refunded
    ],
    default: 'pending',
    index: true
  },
  gateway: {
    type: String,
    enum: [
      'paystack',
      'flutterwave',
      'stripe',
      'cash',
      'mobile_money',
      'bank_transfer',
      'wallet',
      'internal',
      null
    ],
    default: null
  },
  gatewayTransactionId: {
    type: String,
    sparse: true,
    index: true
  },
  gatewayResponse: Schema.Types.Mixed,
  description: String,
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  rideId: {
    type: Schema.Types.ObjectId,
    ref: 'Ride',
    sparse: true,
    index: true
  },
  failureReason: String,
  paymentMethod: {
    type: String,
    enum: ['card', 'cash', 'mobile_money', 'bank_transfer', 'wallet', null],
    default: null
  },
  paymentDetails: {
    // For card payments
    cardBrand: String,
    last4Digits: String,
    expiryMonth: String,
    expiryYear: String,
    
    // For bank transfers
    bankName: String,
    accountNumber: String,
    accountName: String,
    
    // For mobile money
    provider: String,
    phoneNumber: String
  },
  // For cashouts and bank transfers
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountName: String,
    routingNumber: String,
    swiftCode: String
  },
  fees: {
    platformFee: Number, // Fee charged by the platform
    processingFee: Number, // Fee charged by the payment processor
    taxAmount: Number // Tax amount
  },
  refundDetails: {
    refundAmount: Number,
    refundReason: String,
    refundedAt: Date,
    refundTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction'
    }
  },
  // Date when the transaction was processed by the gateway
  processedAt: Date,
  // For recurring transactions
  recurringDetails: {
    isRecurring: Boolean,
    frequency: String, // daily, weekly, monthly
    startDate: Date,
    endDate: Date,
    billingCycle: Number // Current billing cycle
  },
  ipAddress: String,
  userAgent: String,
  // For split payments
  splits: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: Number,
    description: String
  }]
}, {
  timestamps: true
});

// Add compound indices for common queries
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ rideId: 1, type: 1 });
transactionSchema.index({ createdAt: 1 });
transactionSchema.index({ gateway: 1, gatewayTransactionId: 1 }, { sparse: true });

/**
 * Get user balance
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} - User balance
 */
transactionSchema.statics.getUserBalance = async function(userId) {
  const aggregation = await this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalEarnings: {
          $sum: {
            $cond: [
              {
                $in: ['$type', ['ride_earning', 'deposit', 'promotion', 'adjustment']]
              },
              '$amount',
              0
            ]
          }
        },
        totalWithdrawals: {
          $sum: {
            $cond: [
              {
                $in: ['$type', ['cashout', 'withdrawal', 'fee', 'commission', 'tax']]
              },
              '$amount',
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalEarnings: 1,
        totalWithdrawals: 1,
        availableBalance: { $subtract: ['$totalEarnings', '$totalWithdrawals'] }
      }
    }
  ]);
  
  if (aggregation.length === 0) {
    return {
      totalEarnings: 0,
      totalWithdrawals: 0,
      availableBalance: 0
    };
  }
  
  return aggregation[0];
};

/**
 * Get recent transactions for a user
 * @param {ObjectId} userId - User ID
 * @param {Number} limit - Maximum number of transactions to return
 * @param {Number} skip - Number of transactions to skip (for pagination)
 * @returns {Promise<Array>} - Recent transactions
 */
transactionSchema.statics.getRecentTransactions = async function(userId, limit = 10, skip = 0) {
  return this.find({
    userId
  })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .populate('rideId', 'pickupLocation destination status');
};

/**
 * Get transaction statistics for a user
 * @param {ObjectId} userId - User ID
 * @param {Date} startDate - Start date for statistics
 * @param {Date} endDate - End date for statistics
 * @returns {Promise<Object>} - Transaction statistics
 */
transactionSchema.statics.getTransactionStats = async function(userId, startDate, endDate) {
  const stats = await this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        status: 'completed',
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  // Transform to more readable format
  const result = {
    earnings: 0,
    cashouts: 0,
    fees: 0,
    totalTransactions: 0
  };
  
  stats.forEach(stat => {
    result.totalTransactions += stat.count;
    
    if (['ride_earning', 'promotion', 'adjustment'].includes(stat._id)) {
      result.earnings += stat.totalAmount;
    } else if (['cashout', 'withdrawal'].includes(stat._id)) {
      result.cashouts += stat.totalAmount;
    } else if (['fee', 'commission', 'tax'].includes(stat._id)) {
      result.fees += stat.totalAmount;
    }
  });
  
  return result;
};

/**
 * Create a new transaction
 * @param {Object} data - Transaction data
 * @returns {Promise<Object>} - Created transaction
 */
transactionSchema.statics.createTransaction = async function(data) {
  const transaction = new this(data);
  return transaction.save();
};

// Create model
const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
