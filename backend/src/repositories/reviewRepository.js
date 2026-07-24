const BaseRepository = require('./BaseRepository');
const { Review, User, Order, OrderItem } = require('../models');

class ReviewRepository extends BaseRepository {
  constructor() {
    super(Review);
  }

  async findProductReviews(productId) {
    return await this.findAll({
      where: { productId },
      include: [{ model: User, attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
    });
  }

  async findUserReviewForProduct(userId, productId) {
    return await this.findOne({ where: { userId, productId } });
  }

  async checkUserPurchasedProduct(userId, productId) {
    return await OrderItem.findOne({
      where: { productId },
      include: [
        {
          model: Order,
          where: { userId, status: 'tamamlandi' },
          required: true,
        },
      ],
    });
  }
}

module.exports = new ReviewRepository();
