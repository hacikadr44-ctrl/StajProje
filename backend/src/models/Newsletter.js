const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Newsletter = sequelize.define('Newsletter', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      msg: 'Bu e-posta adresi zaten bültene kayıtlı!'
    },
    validate: {
      isEmail: {
        msg: 'Geçerli bir e-posta adresi giriniz!'
      },
    },
  },
  subscribedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = Newsletter;
