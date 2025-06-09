const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Food order item schema (based on cart items)
 */
const OrderItemSchema = new Schema({
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
 * Order status tracking schema (for real-time updates)
 */
const OrderStatusLogSchema = new Schema({
  status: {
    type: String,
    required: true,
    enum: [
      'pending', 
      'payment_processing',
      'confirmed', 
      'preparing',
      'ready_for_pickup', 
      'picked_up', 
      'in_delivery', 
      'delivered', 
      'cancelled',
      'refunded'
    ]
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String
  }
});

/**
 * Delivery location tracking schema
 */
const DeliveryLocationSchema = new Schema({
  coordinates: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

/**
 * Food order schema
 */
const FoodOrderSchema = new Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  restaurant: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  restaurantName: {
    type: String,
    required: true
  },
  restaurantImage: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: [
      'pending', 
      'payment_processing',
      'confirmed', 
      'preparing',
      'ready_for_pickup', 
      'picked_up', 
      'in_delivery', 
      'delivered', 
      'cancelled',
      'refunded'
    ],
    default: 'pending'
  },
  statusLogs: [OrderStatusLogSchema],
  items: [OrderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryFee: {
    type: Number,
    required: true,
    min: 0
  },
  serviceFee: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    required: true
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: {
    type: String
  },
  transactionId: {
    type: String
  },
  deliveryAddress: {
    type: String,
    required: true
  },
  deliveryLocationCoordinates: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  deliveryLocationHistory: [DeliveryLocationSchema],
  deliveryNotes: {
    type: String
  },
  specialInstructions: {
    type: String
  },
  estimatedDeliveryTime: {
    type: String,
    required: true
  },
  actualDeliveryTime: {
    type: Date
  },
  rider: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  riderDetails: {
    name: {
      type: String
    },
    phone: {
      type: String
    },
    photo: {
      type: String
    },
    currentLocation: {
      latitude: {
        type: Number
      },
      longitude: {
        type: Number
      }
    }
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
 * Generate unique order number
 */
FoodOrderSchema.statics.generateOrderNumber = async function() {
  const today = new Date();
  const datePrefix = 
    today.getFullYear().toString().substr(-2) +
    ('0' + (today.getMonth() + 1)).slice(-2) +
    ('0' + today.getDate()).slice(-2);
  
  // Find highest order number with today's prefix
  const highestOrder = await this.findOne(
    { orderNumber: new RegExp('^' + datePrefix) },
    { orderNumber: 1 },
    { sort: { orderNumber: -1 } }
  );
  
  let sequenceNumber = 1;
  if (highestOrder && highestOrder.orderNumber) {
    const sequence = parseInt(highestOrder.orderNumber.substring(6));
    if (!isNaN(sequence)) {
      sequenceNumber = sequence + 1;
    }
  }
  
  // Format: YYMMDD####
  return datePrefix + ('0000' + sequenceNumber).slice(-4);
};

/**
 * Add status log
 */
FoodOrderSchema.methods.addStatusLog = function(status, description = '') {
  this.status = status;
  this.statusLogs.push({
    status,
    description,
    timestamp: new Date()
  });
};

/**
 * Update rider location
 */
FoodOrderSchema.methods.updateRiderLocation = function(latitude, longitude) {
  if (this.riderDetails) {
    this.riderDetails.currentLocation = {
      latitude,
      longitude
    };
  }
  
  this.deliveryLocationHistory.push({
    coordinates: {
      latitude,
      longitude
    },
    timestamp: new Date()
  });
};

/**
 * Calculate total prices
 */
FoodOrderSchema.methods.calculateTotals = function() {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((total, item) => total + item.totalPrice, 0);
  
  // Add fees
  const taxRate = 0.05; // 5% tax
  const serviceFeeRate = 0.10; // 10% service fee
  
  this.tax = parseFloat((this.subtotal * taxRate).toFixed(2));
  this.serviceFee = parseFloat((this.subtotal * serviceFeeRate).toFixed(2));
  
  // Calculate total
  this.total = this.subtotal + this.tax + this.serviceFee + this.deliveryFee;
};

/**
 * Pre-save hook
 */
FoodOrderSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  
  // Generate order number if new
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = await this.constructor.generateOrderNumber();
  }
  
  // Add initial status log if new
  if (this.isNew && (!this.statusLogs || this.statusLogs.length === 0)) {
    this.statusLogs = [{
      status: this.status,
      timestamp: new Date(),
      description: 'Order created'
    }];
  }
  
  // Calculate totals
  this.calculateTotals();
  
  next();
});

/**
 * Create indexes
 */
FoodOrderSchema.index({ user: 1, createdAt: -1 });
FoodOrderSchema.index({ restaurant: 1, createdAt: -1 });
FoodOrderSchema.index({ rider: 1, status: 1 });
FoodOrderSchema.index({ status: 1, createdAt: -1 });
FoodOrderSchema.index({ orderNumber: 1 }, { unique: true });

const FoodOrder = mongoose.model('FoodOrder', FoodOrderSchema);

module.exports = FoodOrder;
