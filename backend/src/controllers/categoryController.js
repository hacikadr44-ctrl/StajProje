const { Category } = require('../models');

// GET /api/categories
async function getCategories(req, res) {
  try {
    const categories = await Category.findAll({ order: [['name', 'ASC']] });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Kategoriler alınırken hata oluştu.', error: err.message });
  }
}

// POST /api/categories (sadece admin)
async function createCategory(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Kategori adı zorunludur.' });

    const category = await Category.create({ name });
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: 'Kategori eklenirken hata oluştu.', error: err.message });
  }
}

// DELETE /api/categories/:id (sadece admin)
async function deleteCategory(req, res) {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Kategori bulunamadı.' });

    await category.destroy();
    res.json({ message: 'Kategori silindi.' });
  } catch (err) {
    res.status(500).json({ message: 'Kategori silinirken hata oluştu.', error: err.message });
  }
}

module.exports = { getCategories, createCategory, deleteCategory };
