const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  originalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    // MariaDB, JSON alanlarını bazen düz metin olarak döndürüyor.
    // Bu fonksiyon, veri okunurken metin gelirse otomatik olarak diziye çeviriyor.
    get() {
      const raw = this.getDataValue('images');
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch (e) {
          return [];
        }
      }
      return raw || [];
    },
  },
  specs: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    // Aynı sorun teknik özellikler için de geçerli - metin gelirse objeye çeviriyoruz.
    get() {
      const raw = this.getDataValue('specs');
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch (e) {
          return {};
        }
      }
      return raw || {};
    },
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

module.exports = Product;