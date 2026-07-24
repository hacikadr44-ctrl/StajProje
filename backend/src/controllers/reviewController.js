const { reviewRepository } = require('../repositories');

// GET /api/products/:id/reviews
async function getReviews(req, res) {
  try {
    const reviews = await reviewRepository.findProductReviews(req.params.id);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Yorumlar alınırken hata oluştu.', error: err.message });
  }
}

// POST /api/products/:id/reviews { rating, comment } (giriş yapmış kullanıcı)
async function createReview(req, res) {
  try {
    const productId = req.params.id;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Puan 1 ile 5 arasında olmalıdır.' });
    }

    // Kullanıcı bu ürünü gerçekten satın almış VE siparişi "tamamlandı" olmuş mu kontrol ediyoruz.
    const hasPurchased = await reviewRepository.checkUserPurchasedProduct(req.user.id, productId);

    if (!hasPurchased) {
      return res.status(403).json({ message: 'Bu ürünü satın almadan yorum yapamazsınız.' });
    }

    // Kullanıcı bu ürüne daha önce yorum yaptıysa, yeni yorum yerine mevcut yorumu güncelliyoruz
    const existingReview = await reviewRepository.findUserReviewForProduct(req.user.id, productId);

    let review;
    if (existingReview) {
      existingReview.rating = rating;
      existingReview.comment = comment;
      review = await existingReview.save();
    } else {
      review = await reviewRepository.create({ userId: req.user.id, productId, rating, comment });
    }

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: 'Yorum eklenirken hata oluştu.', error: err.message });
  }
}

module.exports = { getReviews, createReview };
