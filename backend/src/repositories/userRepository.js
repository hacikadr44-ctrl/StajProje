const BaseRepository = require('./BaseRepository');
const { User } = require('../models');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email) {
    return await this.findOne({ where: { email } });
  }

  async findByResetToken(resetToken) {
    return await this.findOne({ where: { resetToken } });
  }

  async findByResetCode(code) {
    return await this.findOne({ where: { resetCode: code } });
  }
}

module.exports = new UserRepository();
