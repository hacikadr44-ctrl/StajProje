const BaseRepository = require('./BaseRepository');
const { Product, Category, Review, User } = require('../models');
const { Op } = require('sequelize');

class ProductRepository extends BaseRepository {
  constructor() {
    super(Product);
  }

  async findWithFilters(where) {
    return await this.findAll({
      where,
      include: [
        { model: Category, attributes: ['id', 'name'] },
        { model: Review, attributes: ['rating'] },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async findFeatured() {
    return await this.findAll({
      where: { isFeatured: true },
      include: [
        { model: Category, attributes: ['id', 'name'] },
        { model: Review, attributes: ['rating'] },
      ],
      limit: 5,
    });
  }

  async findByIdWithDetails(id) {
    return await this.model.findByPk(id, {
      include: [
        { model: Category, attributes: ['id', 'name'] },
        { model: Review, include: [{ model: User, attributes: ['id', 'name'] }] },
      ],
    });
  }

  async getDistinctBrands() {
    return await this.findAll({
      attributes: [[Product.sequelize.fn('DISTINCT', Product.sequelize.col('brand')), 'brand']],
      where: { brand: { [Op.ne]: null } },
      raw: true,
    });
  }

  async getPriceMinMax() {
    return await this.findAll({
      attributes: [
        [Product.sequelize.fn('MIN', Product.sequelize.col('price')), 'minPrice'],
        [Product.sequelize.fn('MAX', Product.sequelize.col('price')), 'maxPrice'],
      ],
      raw: true,
    });
  }
}

module.exports = new ProductRepository();
