const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const RecentlyViewed = sequelize.define('RecentlyViewed', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  viewedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = RecentlyViewed;
