const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Sipariş verildiği andaki ürün fiyatını burada saklıyoruz.
// Çünkü ürünün fiyatı ileride değişebilir, ama geçmiş siparişte o anki fiyat görünmeli.
const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  priceAtPurchase: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
});

module.exports = OrderItem;
