const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  getAdminStats,
} = require('../controllers/orderController');

router.use(protect);

router.post('/', createOrder);
router.get('/my', getMyOrders);
router.get('/stats', adminOnly, getAdminStats);
router.get('/', adminOnly, getAllOrders);
router.get('/:id', getOrderById);
router.put('/:id/cancel', cancelOrder);
router.put('/:id/status', adminOnly, updateOrderStatus);

module.exports = router;
