const BaseRepository = require('./BaseRepository');
const { Category } = require('../models');

class CategoryRepository extends BaseRepository {
  constructor() {
    super(Category);
  }

  async findAllOrderedByName() {
    return await this.findAll({ order: [['name', 'ASC']] });
  }
}

module.exports = new CategoryRepository();
