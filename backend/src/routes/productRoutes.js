const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getProducts,
  getFeaturedProducts,
  getFilterOptions,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { getReviews, createReview } = require('../controllers/reviewController');

// ÖNEMLİ: sabit yollar (/featured, /filters) /: id yolundan ÖNCE tanımlanmalı,
// yoksa Express "featured" kelimesini bir ürün id'si sanıp getProductById'e yönlendirir.
const { addRecentlyViewed, getRecentlyViewed } = require('../controllers/recentlyViewedController');

router.get('/featured', getFeaturedProducts);
router.get('/filters', getFilterOptions);
router.get('/viewed', protect, getRecentlyViewed);
router.post('/viewed', protect, addRecentlyViewed);

router.get('/', getProducts);
router.get('/:id', getProductById);
router.get('/:id/reviews', getReviews);
router.post('/:id/reviews', protect, createReview);

// Sadece admin
router.post('/', protect, adminOnly, createProduct);
router.put('/:id', protect, adminOnly, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

module.exports = router;
