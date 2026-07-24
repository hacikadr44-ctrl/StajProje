const BaseRepository = require('./BaseRepository');
const { Favorite, Product, Category } = require('../models');

class FavoriteRepository extends BaseRepository {
  constructor() {
    super(Favorite);
  }

  async findUserFavorites(userId) {
    return await this.findAll({
      where: { userId },
      include: [{ model: Product, include: [{ model: Category, attributes: ['id', 'name'] }] }],
    });
  }

  async findOrCreateFavorite(userId, productId) {
    return await this.model.findOrCreate({
      where: { userId, productId },
    });
  }

  async removeFavorite(userId, productId) {
    return await this.delete({ userId, productId });
  }
}

module.exports = new FavoriteRepository();
