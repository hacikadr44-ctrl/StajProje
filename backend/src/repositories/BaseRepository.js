class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findAll(options = {}) {
    return await this.model.findAll(options);
  }

  async findById(id, options = {}) {
    return await this.model.findByPk(id, options);
  }

  async findOne(options = {}) {
    return await this.model.findOne(options);
  }

  async create(data, options = {}) {
    return await this.model.create(data, options);
  }

  async update(data, where, options = {}) {
    return await this.model.update(data, { where, ...options });
  }

  async delete(where, options = {}) {
    return await this.model.destroy({ where, ...options });
  }

  async count(options = {}) {
    return await this.model.count(options);
  }
}

module.exports = BaseRepository;
