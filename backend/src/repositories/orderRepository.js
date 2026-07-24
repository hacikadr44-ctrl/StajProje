const BaseRepository = require('./BaseRepository');
const { Order, OrderItem, Product, User, Category } = require('../models');

class OrderRepository extends BaseRepository {
  constructor() {
    super(Order);
  }

  async findUserOrders(userId) {
    return await this.findAll({
      where: { userId },
      include: [{ model: OrderItem, include: [Product] }],
      order: [['createdAt', 'DESC']],
    });
  }

  async findOrderById(whereCondition, transaction) {
    return await this.findOne({
      where: whereCondition,
      include: [
        { model: OrderItem, include: [Product] },
        { model: User, attributes: ['id', 'name', 'email'] },
      ],
      ...(transaction ? { transaction } : {}),
    });
  }

  async findAllOrders() {
    return await this.findAll({
      include: [{ model: OrderItem, include: [Product] }, { model: User, attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
    });
  }

  async createOrderItem(data, options = {}) {
    return await OrderItem.create(data, options);
  }

  async findAllForStats() {
    return await this.findAll({
      include: [{ model: OrderItem, include: [{ model: Product, include: [Category] }] }],
    });
  }
}

module.exports = new OrderRepository();
