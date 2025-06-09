const Restaurant = require('../models/Restaurant');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

/**
 * Restaurant controller for handling restaurant-related API endpoints
 */
const restaurantController = {
  /**
   * Get all restaurants with optional filtering
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getAllRestaurants: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        sort = 'rating',
        cuisineType,
        latitude,
        longitude,
        isOpen,
        minRating,
        maxDeliveryFee,
        search
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      const query = {};

      // Filter by cuisine type
      if (cuisineType) {
        query.cuisineType = { $regex: new RegExp(cuisineType, 'i') };
      }

      // Filter by open status
      if (isOpen === 'true') {
        query.isOpen = true;
      }

      // Filter by minimum rating
      if (minRating) {
        query.rating = { $gte: parseFloat(minRating) };
      }

      // Filter by maximum delivery fee
      if (maxDeliveryFee) {
        query.deliveryFee = { $lte: parseFloat(maxDeliveryFee) };
      }

      // Search by name or description
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { name: { $regex: searchRegex } },
          { description: { $regex: searchRegex } }
        ];
      }

      // Determine sort field
      let sortField = {};
      switch (sort) {
        case 'rating':
          sortField = { rating: -1 };
          break;
        case 'deliveryTime':
          sortField = { deliveryTime: 1 };
          break;
        case 'deliveryFee':
          sortField = { deliveryFee: 1 };
          break;
        case 'name':
          sortField = { name: 1 };
          break;
        default:
          sortField = { rating: -1 };
      }

      // Get count of total documents that match the query
      const totalCount = await Restaurant.countDocuments(query);
      
      // Get restaurants
      let restaurants = await Restaurant.find(query)
        .sort(sortField)
        .skip(skip)
        .limit(limitNum)
        .select('-menu'); // Exclude menu for list view
        
      // Calculate distance if coordinates are provided
      if (latitude && longitude) {
        restaurants = restaurants.map(restaurant => {
          const distance = restaurant.calculateDistance(parseFloat(latitude), parseFloat(longitude));
          const restaurantObj = restaurant.toObject();
          restaurantObj.distance = distance;
          return restaurantObj;
        });
        
        // Sort by distance if requested
        if (sort === 'distance') {
          restaurants.sort((a, b) => a.distance - b.distance);
        }
      }

      res.status(200).json({
        restaurants,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
      });
    } catch (error) {
      console.error('Error getting restaurants:', error);
      res.status(500).json({ message: 'Error getting restaurants', error: error.message });
    }
  },

  /**
   * Get featured restaurants
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getFeaturedRestaurants: async (req, res) => {
    try {
      const { latitude, longitude, limit = 10 } = req.query;
      const limitNum = parseInt(limit);

      // Get restaurants with highest ratings
      let restaurants = await Restaurant.find({ isOpen: true, rating: { $gte: 4 } })
        .sort({ rating: -1 })
        .limit(limitNum)
        .select('-menu'); // Exclude menu for list view

      // Calculate distance if coordinates are provided
      if (latitude && longitude) {
        restaurants = restaurants.map(restaurant => {
          const distance = restaurant.calculateDistance(parseFloat(latitude), parseFloat(longitude));
          const restaurantObj = restaurant.toObject();
          restaurantObj.distance = distance;
          return restaurantObj;
        });
      }

      res.status(200).json({ restaurants });
    } catch (error) {
      console.error('Error getting featured restaurants:', error);
      res.status(500).json({ message: 'Error getting featured restaurants', error: error.message });
    }
  },

  /**
   * Get restaurant by ID
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getRestaurantById: async (req, res) => {
    try {
      const { id } = req.params;
      const { latitude, longitude } = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid restaurant ID' });
      }

      let restaurant = await Restaurant.findById(id);

      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      // Calculate distance if coordinates are provided
      if (latitude && longitude) {
        const distance = restaurant.calculateDistance(parseFloat(latitude), parseFloat(longitude));
        restaurant = restaurant.toObject();
        restaurant.distance = distance;
      } else {
        restaurant = restaurant.toObject();
      }

      res.status(200).json({ restaurant });
    } catch (error) {
      console.error('Error getting restaurant:', error);
      res.status(500).json({ message: 'Error getting restaurant', error: error.message });
    }
  },

  /**
   * Search restaurants
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  searchRestaurants: async (req, res) => {
    try {
      const {
        query,
        latitude,
        longitude,
        page = 1,
        limit = 10
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      if (!query) {
        return res.status(400).json({ message: 'Search query is required' });
      }

      const searchRegex = new RegExp(query, 'i');
      const searchQuery = {
        $or: [
          { name: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
          { cuisineType: { $regex: searchRegex } },
          { 'menu.categories.name': { $regex: searchRegex } },
          { 'menu.categories.items.name': { $regex: searchRegex } }
        ]
      };

      // Get count of total documents that match the query
      const totalCount = await Restaurant.countDocuments(searchQuery);
      
      // Get restaurants
      let restaurants = await Restaurant.find(searchQuery)
        .sort({ rating: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-menu'); // Exclude menu for list view

      // Calculate distance if coordinates are provided
      if (latitude && longitude) {
        restaurants = restaurants.map(restaurant => {
          const distance = restaurant.calculateDistance(parseFloat(latitude), parseFloat(longitude));
          const restaurantObj = restaurant.toObject();
          restaurantObj.distance = distance;
          return restaurantObj;
        });
      }

      res.status(200).json({
        restaurants,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
      });
    } catch (error) {
      console.error('Error searching restaurants:', error);
      res.status(500).json({ message: 'Error searching restaurants', error: error.message });
    }
  },

  /**
   * Get restaurant categories (cuisine types)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getRestaurantCategories: async (req, res) => {
    try {
      // Get distinct cuisine types
      const cuisineTypes = await Restaurant.distinct('cuisineType');
      const sortedCategories = cuisineTypes.sort();
      
      res.status(200).json({ categories: sortedCategories });
    } catch (error) {
      console.error('Error getting restaurant categories:', error);
      res.status(500).json({ message: 'Error getting restaurant categories', error: error.message });
    }
  },

  /**
   * Create a new restaurant
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  createRestaurant: async (req, res) => {
    try {
      const {
        name,
        description,
        cuisineType,
        address,
        phone,
        email,
        image,
        deliveryTime,
        deliveryFee,
        minOrderAmount,
        coordinates,
        operatingHours,
        menu
      } = req.body;

      // Basic validation
      if (!name || !description || !cuisineType || !address || !phone || !email) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Create restaurant with owner (if authenticated user is restaurant owner)
      const restaurant = new Restaurant({
        name,
        description,
        cuisineType,
        address,
        phone,
        email,
        image: image || 'https://via.placeholder.com/300x200?text=Restaurant',
        deliveryTime: deliveryTime || '30-45 min',
        deliveryFee: deliveryFee || 2.99,
        minOrderAmount: minOrderAmount || 10.0,
        isOpen: true,
        coordinates: coordinates || { latitude: 6.5244, longitude: 3.3792 },
        operatingHours: operatingHours || [
          { day: 'monday', isOpen: true, openTime: '09:00', closeTime: '21:00' },
          { day: 'tuesday', isOpen: true, openTime: '09:00', closeTime: '21:00' },
          { day: 'wednesday', isOpen: true, openTime: '09:00', closeTime: '21:00' },
          { day: 'thursday', isOpen: true, openTime: '09:00', closeTime: '21:00' },
          { day: 'friday', isOpen: true, openTime: '09:00', closeTime: '22:00' },
          { day: 'saturday', isOpen: true, openTime: '10:00', closeTime: '22:00' },
          { day: 'sunday', isOpen: true, openTime: '10:00', closeTime: '20:00' }
        ],
        menu: menu || { categories: [] },
        // If user is authenticated and has restaurant owner role
        owner: req.user && req.user.role === 'restaurant_owner' ? req.user._id : null
      });

      await restaurant.save();

      res.status(201).json({
        message: 'Restaurant created successfully',
        restaurant
      });
    } catch (error) {
      console.error('Error creating restaurant:', error);
      res.status(500).json({ message: 'Error creating restaurant', error: error.message });
    }
  },

  /**
   * Update restaurant details
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  updateRestaurant: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid restaurant ID' });
      }

      // Find restaurant
      const restaurant = await Restaurant.findById(id);

      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      // Check if user is authorized (admin or restaurant owner)
      if (req.user && (req.user.role === 'admin' || 
          (req.user.role === 'restaurant_owner' && restaurant.owner && 
           restaurant.owner.toString() === req.user._id.toString()))) {
        
        // Update restaurant fields
        Object.keys(updateData).forEach(key => {
          // Don't allow updating owner directly
          if (key !== 'owner') {
            restaurant[key] = updateData[key];
          }
        });

        await restaurant.save();

        res.status(200).json({
          message: 'Restaurant updated successfully',
          restaurant
        });
      } else {
        res.status(403).json({ message: 'Not authorized to update this restaurant' });
      }
    } catch (error) {
      console.error('Error updating restaurant:', error);
      res.status(500).json({ message: 'Error updating restaurant', error: error.message });
    }
  },

  /**
   * Add a menu category to a restaurant
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  addMenuCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid restaurant ID' });
      }

      if (!name) {
        return res.status(400).json({ message: 'Category name is required' });
      }

      // Find restaurant
      const restaurant = await Restaurant.findById(id);

      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      // Check if user is authorized (admin or restaurant owner)
      if (req.user && (req.user.role === 'admin' || 
          (req.user.role === 'restaurant_owner' && restaurant.owner && 
           restaurant.owner.toString() === req.user._id.toString()))) {
        
        // Add new category
        restaurant.menu.categories.push({
          name,
          items: []
        });

        await restaurant.save();

        res.status(201).json({
          message: 'Menu category added successfully',
          category: restaurant.menu.categories[restaurant.menu.categories.length - 1]
        });
      } else {
        res.status(403).json({ message: 'Not authorized to update this restaurant' });
      }
    } catch (error) {
      console.error('Error adding menu category:', error);
      res.status(500).json({ message: 'Error adding menu category', error: error.message });
    }
  },

  /**
   * Add a menu item to a category
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  addMenuItem: async (req, res) => {
    try {
      const { id, categoryId } = req.params;
      const { name, description, price, image, isPopular, isVegetarian, options } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid restaurant ID' });
      }

      if (!name || !description || !price) {
        return res.status(400).json({ message: 'Name, description, and price are required' });
      }

      // Find restaurant
      const restaurant = await Restaurant.findById(id);

      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      // Find category
      const category = restaurant.menu.categories.id(categoryId);

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      // Check if user is authorized (admin or restaurant owner)
      if (req.user && (req.user.role === 'admin' || 
          (req.user.role === 'restaurant_owner' && restaurant.owner && 
           restaurant.owner.toString() === req.user._id.toString()))) {
        
        // Add new item
        category.items.push({
          name,
          description,
          price,
          image: image || 'https://via.placeholder.com/300x200?text=Food',
          isPopular: isPopular || false,
          isVegetarian: isVegetarian || false,
          options: options || []
        });

        await restaurant.save();

        res.status(201).json({
          message: 'Menu item added successfully',
          item: category.items[category.items.length - 1]
        });
      } else {
        res.status(403).json({ message: 'Not authorized to update this restaurant' });
      }
    } catch (error) {
      console.error('Error adding menu item:', error);
      res.status(500).json({ message: 'Error adding menu item', error: error.message });
    }
  },

  /**
   * Update a menu item
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  updateMenuItem: async (req, res) => {
    try {
      const { id, categoryId, itemId } = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid restaurant ID' });
      }

      // Find restaurant
      const restaurant = await Restaurant.findById(id);

      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      // Find category
      const category = restaurant.menu.categories.id(categoryId);

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      // Find item
      const item = category.items.id(itemId);

      if (!item) {
        return res.status(404).json({ message: 'Menu item not found' });
      }

      // Check if user is authorized (admin or restaurant owner)
      if (req.user && (req.user.role === 'admin' || 
          (req.user.role === 'restaurant_owner' && restaurant.owner && 
           restaurant.owner.toString() === req.user._id.toString()))) {
        
        // Update item fields
        Object.keys(updateData).forEach(key => {
          item[key] = updateData[key];
        });

        await restaurant.save();

        res.status(200).json({
          message: 'Menu item updated successfully',
          item
        });
      } else {
        res.status(403).json({ message: 'Not authorized to update this restaurant' });
      }
    } catch (error) {
      console.error('Error updating menu item:', error);
      res.status(500).json({ message: 'Error updating menu item', error: error.message });
    }
  },

  /**
   * Delete a menu item
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  deleteMenuItem: async (req, res) => {
    try {
      const { id, categoryId, itemId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid restaurant ID' });
      }

      // Find restaurant
      const restaurant = await Restaurant.findById(id);

      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      // Find category
      const category = restaurant.menu.categories.id(categoryId);

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      // Check if user is authorized (admin or restaurant owner)
      if (req.user && (req.user.role === 'admin' || 
          (req.user.role === 'restaurant_owner' && restaurant.owner && 
           restaurant.owner.toString() === req.user._id.toString()))) {
        
        // Remove item
        category.items.id(itemId).remove();
        await restaurant.save();

        res.status(200).json({
          message: 'Menu item deleted successfully'
        });
      } else {
        res.status(403).json({ message: 'Not authorized to update this restaurant' });
      }
    } catch (error) {
      console.error('Error deleting menu item:', error);
      res.status(500).json({ message: 'Error deleting menu item', error: error.message });
    }
  }
};

module.exports = restaurantController;
