const BaseRepository = require('./BaseRepository');
const { Address } = require('../models');

class AddressRepository extends BaseRepository {
  constructor() {
    super(Address);
  }

  async findUserAddresses(userId) {
    return await this.findAll({
      where: { userId },
      order: [['isDefault', 'DESC'], ['createdAt', 'DESC']],
    });
  }

  async findUserAddressById(id, userId) {
    return await this.findOne({ where: { id, userId } });
  }

  async resetUserDefaultAddresses(userId) {
    return await this.update({ isDefault: false }, { userId });
  }
}

module.exports = new AddressRepository();
