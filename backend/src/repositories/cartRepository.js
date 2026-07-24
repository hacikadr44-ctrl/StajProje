const BaseRepository = require('./BaseRepository');
const { CartItem, Product } = require('../models');

class CartRepository extends BaseRepository {
  constructor() {
    super(CartItem);
  }

  async findByUserId(userId, options = {}) {
    return await this.findAll({
      where: { userId },
      include: [{ model: Product }],
      ...options,
    });
  }

  async findUserItem(userId, productId) {
    return await this.findOne({ where: { userId, productId } });
  }

  async findUserItemById(id, userId) {
    return await this.findOne({ where: { id, userId } });
  }

  async clearCart(userId, options = {}) {
    return await this.delete({ userId }, options);
  }
}

module.exports = new CartRepository();
