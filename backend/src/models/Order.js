const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('beklemede', 'hazirlaniyor', 'kargoda', 'tamamlandi', 'iptal'),
    defaultValue: 'beklemede',
  },
  paymentMethod: {
    type: DataTypes.ENUM('kapida_odeme', 'online_odeme'),
    allowNull: false,
    defaultValue: 'kapida_odeme',
  },
  city: {
    type: DataTypes.STRING, // il
    allowNull: false,
  },
  district: {
    type: DataTypes.STRING, // ilçe
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING, // açık adres (mahalle, sokak, no vb.)
    allowNull: false,
  },
});

module.exports = Order;