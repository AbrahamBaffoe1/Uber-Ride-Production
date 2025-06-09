const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PaymentSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ride: {
    type: Schema.Types.ObjectId,
    ref: 'Ride',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'NGN',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'mobile_money'],
    required: true,
  },
  paymentMethodDetails: {
    type: Object,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },
  transactionId: {
    type: String,
  },
  gatewayReference: {
    type: String,
  },
  gatewayResponse: {
    type: Object,
  },
  refundId: {
    type: String,
  },
  refundReason: {
    type: String,
  },
  metadata: {
    type: Object,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Set updatedAt before update
PaymentSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

const Payment = mongoose.model('Payment', PaymentSchema);

module.exports = Payment;
