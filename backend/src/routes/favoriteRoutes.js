const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getFavorites, addFavorite, removeFavorite } = require('../controllers/favoriteController');

router.use(protect); // favoriler her zaman giriş gerektirir

router.get('/', getFavorites);
router.post('/', addFavorite);
router.delete('/:productId', removeFavorite);

module.exports = router;
