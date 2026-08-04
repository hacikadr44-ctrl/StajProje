const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getMyAlerts, createAlert, deleteAlert } = require('../controllers/priceAlertController');

router.use(protect); // Tüm alarm işlemleri giriş gerektirir

router.get('/', getMyAlerts);
router.post('/', createAlert);
router.delete('/:id', deleteAlert);

module.exports = router;
