const { productRepository } = require('../repositories');
const { Op } = require('sequelize');

// ---- GÜVENLİK: Input sanitizasyon yardımcısı ----
function sanitize(str) {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/[<>"'`;]/g, '').trim();
}

// GET /api/products?search=&categoryId=&brand=&minPrice=&maxPrice=
async function getProducts(req, res) {
  try {
    const { search, categoryId, brand, minPrice, maxPrice } = req.query;
    const where = {};

    if (search) {
      const safe = sanitize(search);
      where[Op.or] = [
        { name: { [Op.like]: `%${safe}%` } },
        { brand: { [Op.like]: `%${safe}%` } },
        { description: { [Op.like]: `%${safe}%` } },
      ];
    }
    if (categoryId) {
      const catId = parseInt(categoryId, 10);
      if (!isNaN(catId)) where.categoryId = catId;
    }
    if (brand) {
      where.brand = sanitize(brand);
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) {
        const min = parseFloat(minPrice);
        if (!isNaN(min)) where.price[Op.gte] = min;
      }
      if (maxPrice) {
        const max = parseFloat(maxPrice);
        if (!isNaN(max)) where.price[Op.lte] = max;
      }
    }

    const products = await productRepository.findWithFilters(where);

    // Her ürün için ortalama puan ve yorum sayısını ekliyoruz
    const result = products.map((p) => {
      const json = p.toJSON();
      const ratings = json.Reviews.map((r) => r.rating);
      json.avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
      json.reviewCount = ratings.length;
      delete json.Reviews;
      return json;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Ürünler alınırken hata oluştu.', error: err.message });
  }
}

// GET /api/products/featured -> ana sayfa "Öne Çıkanlar" bölümü için
async function getFeaturedProducts(req, res) {
  try {
    const products = await productRepository.findFeatured();

    const result = products.map((p) => {
      const json = p.toJSON();
      const ratings = json.Reviews.map((r) => r.rating);
      json.avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
      json.reviewCount = ratings.length;
      delete json.Reviews;
      return json;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Öne çıkan ürünler alınırken hata oluştu.', error: err.message });
  }
}

// GET /api/products/filters -> filtre seçeneklerini doldurmak için (marka listesi, fiyat aralığı)
async function getFilterOptions(req, res) {
  try {
    const brands = await productRepository.getDistinctBrands();
    const prices = await productRepository.getPriceMinMax();

    res.json({
      brands: brands.map((b) => b.brand).filter(Boolean).sort(),
      minPrice: prices[0]?.minPrice || 0,
      maxPrice: prices[0]?.maxPrice || 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Filtre seçenekleri alınırken hata oluştu.', error: err.message });
  }
}

// GET /api/products/:id
async function getProductById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Geçersiz ürün ID.' });

    const product = await productRepository.findByIdWithDetails(id);
    if (!product) {
      return res.status(404).json({ message: 'Ürün bulunamadı.' });
    }

    const json = product.toJSON();
    const ratings = json.Reviews.map((r) => r.rating);
    json.avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    json.reviewCount = ratings.length;

    res.json(json);
  } catch (err) {
    res.status(500).json({ message: 'Ürün alınırken hata oluştu.', error: err.message });
  }
}

// POST /api/products (sadece admin)
async function createProduct(req, res) {
  try {
    const { name, brand, description, price, originalPrice, stock, imageUrl, images, specs, categoryId, isFeatured } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: 'Ürün adı ve fiyatı zorunludur.' });
    }

    if (typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ message: 'Geçerli bir fiyat giriniz.' });
    }

    const product = await productRepository.create({
      name: sanitize(name),
      brand: brand ? sanitize(brand) : null,
      description: description ? sanitize(description) : null,
      price,
      originalPrice: originalPrice || null,
      stock: Math.max(0, parseInt(stock, 10) || 0),
      imageUrl,
      images,
      specs,
      categoryId: categoryId || null,
      isFeatured: !!isFeatured,
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: 'Ürün eklenirken hata oluştu.', error: err.message });
  }
}

// PUT /api/products/:id (sadece admin)
async function updateProduct(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Geçersiz ürün ID.' });

    const product = await productRepository.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Ürün bulunamadı.' });
    }
    await product.update(req.body);
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Ürün güncellenirken hata oluştu.', error: err.message });
  }
}

// DELETE /api/products/:id (sadece admin)
async function deleteProduct(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Geçersiz ürün ID.' });

    const product = await productRepository.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Ürün bulunamadı.' });
    }
    await product.destroy();
    res.json({ message: 'Ürün silindi.' });
  } catch (err) {
    res.status(500).json({ message: 'Ürün silinirken hata oluştu.', error: err.message });
  }
}

module.exports = {
  getProducts,
  getFeaturedProducts,
  getFilterOptions,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
