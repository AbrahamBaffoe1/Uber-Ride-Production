const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PaymentMethodSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['card', 'mobile_money', 'bank_account'],
    required: true,
  },
  // For cards
  cardDetails: {
    last4: String,
    brand: String,
    expiryMonth: String,
    expiryYear: String,
    cardholderName: String,
  },
  // For mobile money
  mobileMoneyDetails: {
    provider: String, // e.g., MTN, Airtel, Vodafone, etc.
    phoneNumber: String,
    accountName: String,
  },
  // For bank accounts
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountName: String,
    routingNumber: String,
  },
  // Token from payment processor
  token: {
    type: String,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
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
PaymentMethodSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

const PaymentMethod = mongoose.model('PaymentMethod', PaymentMethodSchema);

module.exports = PaymentMethod;
