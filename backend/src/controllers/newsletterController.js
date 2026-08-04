const { Newsletter } = require('../models');

async function subscribeNewsletter(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'E-posta adresi gereklidir.' });
    }

    // Abone kaydet
    await Newsletter.create({ email });

    // Başarıyla abone olunca indirim kodu 'BULTEN10' döner
    return res.status(201).json({
      message: 'Bültene başarıyla abone olundu! 🎉',
      couponCode: 'BULTEN10',
      discountInfo: '%10 İndirim'
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Bu e-posta adresi zaten bültene kayıtlı!' });
    }
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error('Bülten abonelik hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası.' });
  }
}

module.exports = {
  subscribeNewsletter
};
