const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Cart item schema for food ordering
 */
const CartItemSchema = new Schema({
  foodItem: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant.menu.categories.items',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  options: [{
    optionId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    choiceId: {
      type: String,
      required: true
    },
    choice: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    }
  }],
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  }
});

/**
 * Food cart schema
 */
const FoodCartSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  restaurant: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant'
  },
  items: [CartItemSchema],
  subtotal: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

/**
 * Calculate subtotal based on items
 */
FoodCartSchema.methods.calculateSubtotal = function() {
  if (!this.items || this.items.length === 0) {
    this.subtotal = 0;
    return;
  }
  
  this.subtotal = this.items.reduce((total, item) => {
    return total + item.totalPrice;
  }, 0);
};

/**
 * Calculate total price for cart item
 */
CartItemSchema.methods.calculateTotalPrice = function() {
  let optionsTotal = 0;
  
  if (this.options && this.options.length > 0) {
    optionsTotal = this.options.reduce((total, option) => {
      return total + option.price;
    }, 0);
  }
  
  this.totalPrice = (this.price + optionsTotal) * this.quantity;
};

/**
 * Update timestamps on save
 */
FoodCartSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate total price for each item
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      if (typeof item.calculateTotalPrice === 'function') {
        item.calculateTotalPrice();
      }
    });
  }
  
  // Calculate subtotal
  this.calculateSubtotal();
  
  next();
});

const FoodCart = mongoose.model('FoodCart', FoodCartSchema);

module.exports = FoodCart;
