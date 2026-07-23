const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Kullanıcı-ürün arasında sadece "favoriledi mi" bilgisini tutan basit bir ara tablo (N-N ilişki).
const Favorite = sequelize.define('Favorite', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
});

module.exports = Favorite;
