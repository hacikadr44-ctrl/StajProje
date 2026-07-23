const { Sequelize } = require('sequelize');
require('dotenv').config();

// Sequelize, veritabanı ile JS kodu arasında köprü kuran bir ORM'dir.
// Yani SQL sorgularını elle yazmak yerine JS objeleriyle çalışırız.
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false, // true yaparsan çalışan SQL sorgularını konsolda görürsün
  }
);

module.exports = sequelize;
