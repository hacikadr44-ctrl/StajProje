const { favoriteRepository } = require('../repositories');

// GET /api/favorites -> giriş yapan kullanıcının favori ürünleri
async function getFavorites(req, res) {
  try {
    const favorites = await favoriteRepository.findUserFavorites(req.user.id);
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ message: 'Favoriler alınırken hata oluştu.', error: err.message });
  }
}

// POST /api/favorites { productId }
async function addFavorite(req, res) {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ message: 'productId zorunludur.' });

    const [favorite] = await favoriteRepository.findOrCreateFavorite(req.user.id, productId);
    res.status(201).json(favorite);
  } catch (err) {
    res.status(500).json({ message: 'Favorilere eklenirken hata oluştu.', error: err.message });
  }
}

// DELETE /api/favorites/:productId
async function removeFavorite(req, res) {
  try {
    await favoriteRepository.removeFavorite(req.user.id, req.params.productId);
    res.json({ message: 'Favorilerden kaldırıldı.' });
  } catch (err) {
    res.status(500).json({ message: 'Favorilerden kaldırılırken hata oluştu.', error: err.message });
  }
}

module.exports = { getFavorites, addFavorite, removeFavorite };
