const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Kullanıcının bir ürün için belirlediği hedef fiyat alarmı
const PriceAlert = sequelize.define('PriceAlert', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  targetPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

module.exports = PriceAlert;
