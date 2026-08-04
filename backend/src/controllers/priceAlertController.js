const { PriceAlert, Product } = require('../models');

// GET /api/price-alerts - Kullanıcının tüm fiyat alarmlarını getir
async function getMyAlerts(req, res) {
  try {
    const alerts = await PriceAlert.findAll({
      where: { userId: req.user.id, isActive: true },
      include: [{ model: Product, attributes: ['id', 'name', 'price', 'imageUrl', 'brand'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(alerts);
  } catch (err) {
    console.error('Fiyat alarmları getirilemedi:', err);
    res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
}

// POST /api/price-alerts - Yeni fiyat alarmı oluştur
async function createAlert(req, res) {
  try {
    const { productId, targetPrice } = req.body;

    if (!productId || !targetPrice) {
      return res.status(400).json({ message: 'Ürün ve hedef fiyat zorunludur.' });
    }

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: 'Ürün bulunamadı.' });
    }

    if (Number(targetPrice) >= Number(product.price)) {
      return res.status(400).json({ message: 'Hedef fiyat, mevcut fiyattan düşük olmalıdır.' });
    }

    // Aynı ürün için mevcut alarm varsa güncelle
    const existing = await PriceAlert.findOne({ where: { userId: req.user.id, productId, isActive: true } });
    if (existing) {
      await existing.update({ targetPrice });
      return res.json({ message: 'Fiyat alarmınız güncellendi!', alert: existing });
    }

    const alert = await PriceAlert.create({ userId: req.user.id, productId, targetPrice });
    res.status(201).json({ message: 'Fiyat alarmı başarıyla oluşturuldu!', alert });
  } catch (err) {
    console.error('Fiyat alarmı oluşturulamadı:', err);
    res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
}

// DELETE /api/price-alerts/:id - Alarmı sil (deaktif et)
async function deleteAlert(req, res) {
  try {
    const alert = await PriceAlert.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!alert) {
      return res.status(404).json({ message: 'Alarm bulunamadı.' });
    }
    await alert.update({ isActive: false });
    res.json({ message: 'Fiyat alarmı kaldırıldı.' });
  } catch (err) {
    console.error('Alarm silinemedi:', err);
    res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
}

module.exports = { getMyAlerts, createAlert, deleteAlert };
