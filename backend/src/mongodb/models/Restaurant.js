const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Menu item option choice schema
 */
const FoodOptionChoiceSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
}, { _id: true });

/**
 * Menu item option schema
 */
const FoodOptionSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  required: {
    type: Boolean,
    default: false,
  },
  multiSelect: {
    type: Boolean,
    default: false,
  },
  choices: [FoodOptionChoiceSchema],
}, { _id: true });

/**
 * Menu item schema
 */
const MenuItemSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  image: {
    type: String,
    required: true,
  },
  isPopular: {
    type: Boolean,
    default: false,
  },
  isVegetarian: {
    type: Boolean,
    default: false,
  },
  options: [FoodOptionSchema],
}, { _id: true });

/**
 * Menu category schema
 */
const MenuCategorySchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  items: [MenuItemSchema],
}, { _id: true });

/**
 * Restaurant menu schema
 */
const MenuSchema = new Schema({
  categories: [MenuCategorySchema],
});

/**
 * Operating hours schema
 */
const OperatingHoursSchema = new Schema({
  day: {
    type: String,
    required: true,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  },
  isOpen: {
    type: Boolean,
    default: true,
  },
  openTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: props => `${props.value} is not a valid time format (HH:MM)!`
    }
  },
  closeTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: props => `${props.value} is not a valid time format (HH:MM)!`
    }
  },
});

/**
 * Restaurant schema
 */
const RestaurantSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  cuisineType: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  image: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  deliveryTime: {
    type: String,
    required: true,
    trim: true,
  },
  deliveryFee: {
    type: Number,
    required: true,
    min: 0,
  },
  minOrderAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  isOpen: {
    type: Boolean,
    default: true,
  },
  isPartner: {
    type: Boolean,
    default: false,
  },
  coordinates: {
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
  },
  operatingHours: [OperatingHoursSchema],
  menu: {
    type: MenuSchema,
    required: true,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
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

/**
 * Calculate distance between restaurant and user
 * Using Haversine formula to calculate distance between two coordinates
 * @param {number} userLat - User latitude
 * @param {number} userLng - User longitude
 * @returns {number} Distance in kilometers
 */
RestaurantSchema.methods.calculateDistance = function(userLat, userLng) {
  const restaurantLat = this.coordinates.latitude;
  const restaurantLng = this.coordinates.longitude;
  
  const toRadians = (degree) => degree * (Math.PI / 180);
  
  const R = 6371; // Radius of Earth in kilometers
  const dLat = toRadians(userLat - restaurantLat);
  const dLng = toRadians(userLng - restaurantLng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(restaurantLat)) * Math.cos(toRadians(userLat)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  
  return parseFloat(distance.toFixed(2));
};

/**
 * Update timestamps on save
 */
RestaurantSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Restaurant = mongoose.model('Restaurant', RestaurantSchema);

module.exports = Restaurant;
