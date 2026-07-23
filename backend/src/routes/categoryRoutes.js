const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getCategories, createCategory, deleteCategory } = require('../controllers/categoryController');

router.get('/', getCategories);
router.post('/', protect, adminOnly, createCategory);
router.delete('/:id', protect, adminOnly, deleteCategory);

module.exports = router;
