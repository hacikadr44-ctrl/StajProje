const { RecentlyViewed, Product } = require('../models');

async function addRecentlyViewed(req, res) {
  try {
    const { productId } = req.body;
    const userId = req.user.id;

    if (!productId) {
      return res.status(400).json({ message: 'productId gereklidir.' });
    }

    // Daha önce bu ürünü incelemiş mi kontrol et
    let record = await RecentlyViewed.findOne({
      where: { userId, productId }
    });

    if (record) {
      // Varsa izlenme tarihini güncelle
      record.viewedAt = new Date();
      await record.save();
    } else {
      // Yoksa yeni kayıt oluştur
      await RecentlyViewed.create({ userId, productId });
    }

    // Kullanıcıya ait tüm incelenen ürünleri en yeniden en eskiye sırala
    const list = await RecentlyViewed.findAll({
      where: { userId },
      order: [['viewedAt', 'DESC']]
    });

    // Eğer 10 üründen fazla varsa, eski olanları sil (Son 10 ürünü tut)
    if (list.length > 10) {
      const toDelete = list.slice(10);
      for (const item of toDelete) {
        await item.destroy();
      }
    }

    return res.status(200).json({ message: 'İncelenen ürün başarıyla kaydedildi.' });
  } catch (err) {
    console.error('RecentlyViewed eklenirken hata:', err);
    return res.status(500).json({ message: 'Sunucu hatası.' });
  }
}

async function getRecentlyViewed(req, res) {
  try {
    const userId = req.user.id;

    const list = await RecentlyViewed.findAll({
      where: { userId },
      order: [['viewedAt', 'DESC']],
      limit: 10,
      include: [
        {
          model: Product,
          attributes: ['id', 'name', 'price', 'imageUrl', 'stock']
        }
      ]
    });

    // Sadece ürün nesnelerini çıkarıp listele
    const products = list.map(item => item.Product).filter(Boolean);

    return res.status(200).json(products);
  } catch (err) {
    console.error('RecentlyViewed çekilirken hata:', err);
    return res.status(500).json({ message: 'Sunucu hatası.' });
  }
}

module.exports = {
  addRecentlyViewed,
  getRecentlyViewed
};
