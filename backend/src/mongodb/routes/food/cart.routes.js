const express = require('express');
const foodCartController = require('../../controllers/food-cart.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

const router = express.Router();

/**
 * All cart routes require authentication
 */
router.use(authMiddleware.authenticate);

// GET /api/food/cart - Get user's cart
router.get('/', foodCartController.getCart);

// POST /api/food/cart - Add item to cart
router.post('/', foodCartController.addToCart);

// PUT /api/food/cart/items/:itemId - Update cart item quantity
router.put('/items/:itemId', foodCartController.updateCartItemQuantity);

// DELETE /api/food/cart/items - Remove item from cart
router.delete('/items', foodCartController.removeFromCart);

// DELETE /api/food/cart - Clear cart
router.delete('/', foodCartController.clearCart);

module.exports = router;
