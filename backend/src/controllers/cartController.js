const { cartRepository, productRepository } = require('../repositories');

// GET /api/cart -> giriş yapmış kullanıcının sepetini getirir
async function getCart(req, res) {
  try {
    const items = await cartRepository.findByUserId(req.user.id);
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Sepet alınırken hata oluştu.', error: err.message });
  }
}

// POST /api/cart { productId, quantity }
async function addToCart(req, res) {
  try {
    const { productId, quantity } = req.body;
    if (!productId) return res.status(400).json({ message: 'productId zorunludur.' });

    const product = await productRepository.findById(productId);
    if (!product) return res.status(404).json({ message: 'Ürün bulunamadı.' });

    let cartItem = await cartRepository.findUserItem(req.user.id, productId);

    if (cartItem) {
      cartItem.quantity += quantity || 1;
      await cartItem.save();
    } else {
      cartItem = await cartRepository.create({
        userId: req.user.id,
        productId,
        quantity: quantity || 1,
      });
    }

    res.status(201).json(cartItem);
  } catch (err) {
    res.status(500).json({ message: 'Sepete eklenirken hata oluştu.', error: err.message });
  }
}

// PUT /api/cart/:id { quantity }
async function updateCartItem(req, res) {
  try {
    const cartItem = await cartRepository.findUserItemById(req.params.id, req.user.id);
    if (!cartItem) return res.status(404).json({ message: 'Sepet öğesi bulunamadı.' });

    cartItem.quantity = req.body.quantity;
    await cartItem.save();
    res.json(cartItem);
  } catch (err) {
    res.status(500).json({ message: 'Sepet güncellenirken hata oluştu.', error: err.message });
  }
}

// DELETE /api/cart/:id
async function removeFromCart(req, res) {
  try {
    const cartItem = await cartRepository.findUserItemById(req.params.id, req.user.id);
    if (!cartItem) return res.status(404).json({ message: 'Sepet öğesi bulunamadı.' });

    await cartItem.destroy();
    res.json({ message: 'Ürün sepetten kaldırıldı.' });
  } catch (err) {
    res.status(500).json({ message: 'Sepetten silinirken hata oluştu.', error: err.message });
  }
}

module.exports = { getCart, addToCart, updateCartItem, removeFromCart };
