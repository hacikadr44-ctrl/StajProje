const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING, // burada hash'lenmiş şifre tutulur, düz metin değil
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user',
  },
  resetCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resetCodeExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

module.exports = User;
