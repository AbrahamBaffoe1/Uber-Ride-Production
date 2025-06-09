const FoodCart = require('../models/FoodCart');
const Restaurant = require('../models/Restaurant');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

/**
 * Food cart controller for handling cart-related API endpoints
 */
const foodCartController = {
  /**
   * Get user's cart
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getCart: async (req, res) => {
    try {
      const userId = req.user._id;

      // Get cart or create if doesn't exist
      let cart = await FoodCart.findOne({ user: userId });
      
      if (!cart) {
        cart = new FoodCart({
          user: userId,
          items: [],
          subtotal: 0
        });
        await cart.save();
      }

      // If cart has a restaurant, populate restaurant details
      if (cart.restaurant) {
        const restaurant = await Restaurant.findById(cart.restaurant)
          .select('name image deliveryFee minOrderAmount deliveryTime');
        
        res.status(200).json({
          cart: {
            id: cart._id,
            items: cart.items,
            subtotal: cart.subtotal,
            restaurantId: cart.restaurant,
            restaurant: restaurant ? {
              id: restaurant._id,
              name: restaurant.name,
              image: restaurant.image,
              deliveryFee: restaurant.deliveryFee,
              minOrderAmount: restaurant.minOrderAmount,
              deliveryTime: restaurant.deliveryTime
            } : null
          }
        });
      } else {
        res.status(200).json({
          cart: {
            id: cart._id,
            items: cart.items,
            subtotal: cart.subtotal,
            restaurantId: null,
            restaurant: null
          }
        });
      }
    } catch (error) {
      console.error('Error getting cart:', error);
      res.status(500).json({ message: 'Error getting cart', error: error.message });
    }
  },

  /**
   * Add item to cart
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  addToCart: async (req, res) => {
    try {
      const userId = req.user._id;
      const { restaurantId, foodItemId, quantity = 1, options = [], clearExisting = false } = req.body;

      if (!restaurantId || !foodItemId) {
        return res.status(400).json({ message: 'Restaurant ID and food item ID are required' });
      }

      if (!mongoose.Types.ObjectId.isValid(restaurantId) || !mongoose.Types.ObjectId.isValid(foodItemId)) {
        return res.status(400).json({ message: 'Invalid restaurant ID or food item ID' });
      }

      // Find restaurant
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      // Find food item in restaurant menu
      let foodItem = null;
      let categoryId = null;

      for (const category of restaurant.menu.categories) {
        const item = category.items.id(foodItemId);
        if (item) {
          foodItem = item;
          categoryId = category._id;
          break;
        }
      }

      if (!foodItem) {
        return res.status(404).json({ message: 'Food item not found in restaurant menu' });
      }

      // Find or create user's cart
      let cart = await FoodCart.findOne({ user: userId });
      
      if (!cart) {
        cart = new FoodCart({
          user: userId,
          restaurant: restaurantId,
          items: [],
          subtotal: 0
        });
      } else if (cart.restaurant && cart.restaurant.toString() !== restaurantId.toString()) {
        // If cart has items from a different restaurant and clearExisting is true, clear the cart
        if (clearExisting) {
          cart.restaurant = restaurantId;
          cart.items = [];
          cart.subtotal = 0;
        } else {
          return res.status(400).json({
            message: 'Cart contains items from another restaurant',
            currentRestaurantId: cart.restaurant
          });
        }
      } else if (!cart.restaurant) {
        // If cart is new/empty, set the restaurant
        cart.restaurant = restaurantId;
      }

      // Process options
      const validOptions = [];
      let optionsTotal = 0;

      if (options && options.length > 0) {
        for (const option of options) {
          const { optionId, choiceId } = option;
          
          // Find option in food item
          const foodOption = foodItem.options.find(opt => opt._id.toString() === optionId);
          
          if (foodOption) {
            // Find choice in option
            const choice = foodOption.choices.find(ch => ch._id.toString() === choiceId);
            
            if (choice) {
              validOptions.push({
                optionId,
                name: foodOption.name,
                choiceId,
                choice: choice.name,
                price: choice.price
              });
              
              optionsTotal += choice.price;
            }
          }
        }
      }

      // Calculate total price for this item
      const itemTotal = (foodItem.price + optionsTotal) * quantity;

      // Create cart item
      const cartItem = {
        foodItem: foodItemId,
        name: foodItem.name,
        price: foodItem.price,
        quantity,
        options: validOptions,
        totalPrice: itemTotal
      };

      // Check if similar item already exists in cart (same item + same options)
      const existingItemIndex = cart.items.findIndex(item => {
        if (item.foodItem.toString() !== foodItemId.toString()) return false;
        
        // Check if options match exactly
        if (item.options.length !== validOptions.length) return false;
        
        // Check each option
        const optionsMatch = validOptions.every(option => {
          return item.options.some(itemOption => 
            itemOption.optionId === option.optionId && 
            itemOption.choiceId === option.choiceId
          );
        });
        
        return optionsMatch;
      });

      if (existingItemIndex >= 0) {
        // Update existing item
        cart.items[existingItemIndex].quantity += quantity;
        cart.items[existingItemIndex].totalPrice += itemTotal;
      } else {
        // Add new item to cart
        cart.items.push(cartItem);
      }

      // Save cart
      await cart.save();

      // Get restaurant details for response
      const restaurantDetails = {
        id: restaurant._id,
        name: restaurant.name,
        image: restaurant.image,
        deliveryFee: restaurant.deliveryFee,
        minOrderAmount: restaurant.minOrderAmount,
        deliveryTime: restaurant.deliveryTime
      };

      res.status(200).json({
        message: 'Item added to cart successfully',
        cart: {
          id: cart._id,
          items: cart.items,
          subtotal: cart.subtotal,
          restaurantId: cart.restaurant,
          restaurant: restaurantDetails
        }
      });
    } catch (error) {
      console.error('Error adding item to cart:', error);
      res.status(500).json({ message: 'Error adding item to cart', error: error.message });
    }
  },

  /**
   * Update cart item quantity
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  updateCartItemQuantity: async (req, res) => {
    try {
      const userId = req.user._id;
      const { itemId } = req.params;
      const { quantity } = req.body;

      if (!itemId || !quantity) {
        return res.status(400).json({ message: 'Item ID and quantity are required' });
      }

      if (quantity < 1) {
        return res.status(400).json({ message: 'Quantity must be at least 1' });
      }

      // Find user's cart
      const cart = await FoodCart.findOne({ user: userId });

      if (!cart) {
        return res.status(404).json({ message: 'Cart not found' });
      }

      // Find item in cart
      const item = cart.items.id(itemId);

      if (!item) {
        return res.status(404).json({ message: 'Item not found in cart' });
      }

      // Calculate new price based on quantity change
      const pricePerUnit = item.totalPrice / item.quantity;
      item.quantity = quantity;
      item.totalPrice = pricePerUnit * quantity;

      // Save cart
      await cart.save();

      // Get restaurant details for response
      let restaurantDetails = null;
      if (cart.restaurant) {
        const restaurant = await Restaurant.findById(cart.restaurant)
          .select('name image deliveryFee minOrderAmount deliveryTime');
        
        if (restaurant) {
          restaurantDetails = {
            id: restaurant._id,
            name: restaurant.name,
            image: restaurant.image,
            deliveryFee: restaurant.deliveryFee,
            minOrderAmount: restaurant.minOrderAmount,
            deliveryTime: restaurant.deliveryTime
          };
        }
      }

      res.status(200).json({
        message: 'Cart item quantity updated successfully',
        cart: {
          id: cart._id,
          items: cart.items,
          subtotal: cart.subtotal,
          restaurantId: cart.restaurant,
          restaurant: restaurantDetails
        }
      });
    } catch (error) {
      console.error('Error updating cart item quantity:', error);
      res.status(500).json({ message: 'Error updating cart item quantity', error: error.message });
    }
  },

  /**
   * Remove item from cart
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  removeFromCart: async (req, res) => {
    try {
      const userId = req.user._id;
      const { cartItemId } = req.body;

      if (!cartItemId) {
        return res.status(400).json({ message: 'Cart item ID is required' });
      }

      // Find user's cart
      const cart = await FoodCart.findOne({ user: userId });

      if (!cart) {
        return res.status(404).json({ message: 'Cart not found' });
      }

      // Find and remove item
      const item = cart.items.id(cartItemId);

      if (!item) {
        return res.status(404).json({ message: 'Item not found in cart' });
      }

      item.remove();

      // If cart is now empty, remove restaurant reference
      if (cart.items.length === 0) {
        cart.restaurant = null;
      }

      // Save cart
      await cart.save();

      // Get restaurant details for response
      let restaurantDetails = null;
      if (cart.restaurant) {
        const restaurant = await Restaurant.findById(cart.restaurant)
          .select('name image deliveryFee minOrderAmount deliveryTime');
        
        if (restaurant) {
          restaurantDetails = {
            id: restaurant._id,
            name: restaurant.name,
            image: restaurant.image,
            deliveryFee: restaurant.deliveryFee,
            minOrderAmount: restaurant.minOrderAmount,
            deliveryTime: restaurant.deliveryTime
          };
        }
      }

      res.status(200).json({
        message: 'Item removed from cart successfully',
        cart: {
          id: cart._id,
          items: cart.items,
          subtotal: cart.subtotal,
          restaurantId: cart.restaurant,
          restaurant: restaurantDetails
        }
      });
    } catch (error) {
      console.error('Error removing item from cart:', error);
      res.status(500).json({ message: 'Error removing item from cart', error: error.message });
    }
  },

  /**
   * Clear cart
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  clearCart: async (req, res) => {
    try {
      const userId = req.user._id;

      // Find user's cart
      let cart = await FoodCart.findOne({ user: userId });

      if (!cart) {
        // Create empty cart if doesn't exist
        cart = new FoodCart({
          user: userId,
          items: [],
          subtotal: 0
        });
      } else {
        // Clear existing cart
        cart.restaurant = null;
        cart.items = [];
        cart.subtotal = 0;
      }

      // Save cart
      await cart.save();

      res.status(200).json({
        message: 'Cart cleared successfully',
        cart: {
          id: cart._id,
          items: [],
          subtotal: 0,
          restaurantId: null,
          restaurant: null
        }
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      res.status(500).json({ message: 'Error clearing cart', error: error.message });
    }
  }
};

module.exports = foodCartController;
