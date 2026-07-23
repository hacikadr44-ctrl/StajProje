const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getCart, addToCart, updateCartItem, removeFromCart } = require('../controllers/cartController');

// Sepet işlemlerinin hepsi giriş gerektirir
router.use(protect);

router.get('/', getCart);
router.post('/', addToCart);
router.put('/:id', updateCartItem);
router.delete('/:id', removeFromCart);

module.exports = router;
