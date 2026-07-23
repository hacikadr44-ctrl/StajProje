const { CartItem, Product, Order, OrderItem, User, Category } = require('../models');
const sequelize = require('../config/db');

// POST /api/orders  { city, district, address }
async function createOrder(req, res) {
  const t = await sequelize.transaction();
  try {
    const { city, district, address } = req.body;
    if (!city || !district || !address) {
      await t.rollback();
      return res.status(400).json({ message: 'İl, ilçe ve açık adres zorunludur.' });
    }

    const cartItems = await CartItem.findAll({
      where: { userId: req.user.id },
      include: [{ model: Product }],
      transaction: t,
    });

    if (cartItems.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'Sepetiniz boş.' });
    }

    // Stok kontrolü
    for (const item of cartItems) {
      if (item.Product.stock < item.quantity) {
        await t.rollback();
        return res.status(400).json({ message: `${item.Product.name} için yeterli stok yok.` });
      }
    }

    const totalPrice = cartItems.reduce(
      (sum, item) => sum + Number(item.Product.price) * item.quantity,
      0
    );

    const order = await Order.create(
      { userId: req.user.id, totalPrice, city, district, address, status: 'beklemede' },
      { transaction: t }
    );

    for (const item of cartItems) {
      await OrderItem.create(
        {
          orderId: order.id,
          productId: item.Product.id,
          quantity: item.quantity,
          priceAtPurchase: item.Product.price,
        },
        { transaction: t }
      );

      // Stoktan düş
      item.Product.stock -= item.quantity;
      await item.Product.save({ transaction: t });
    }

    // Sepeti temizle
    await CartItem.destroy({ where: { userId: req.user.id }, transaction: t });

    await t.commit();
    res.status(201).json(order);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: 'Sipariş oluşturulurken hata oluştu.', error: err.message });
  }
}

// GET /api/orders/my  -> giriş yapan kullanıcının kendi siparişleri
async function getMyOrders(req, res) {
  try {
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      include: [{ model: OrderItem, include: [Product] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Siparişler alınırken hata oluştu.', error: err.message });
  }
}

// GET /api/orders/:id -> Tekil sipariş detayı
async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const whereCondition = req.user.role === 'admin' ? { id } : { id, userId: req.user.id };
    const order = await Order.findOne({
      where: whereCondition,
      include: [
        { model: OrderItem, include: [Product] },
        { model: User, attributes: ['id', 'name', 'email'] },
      ],
    });
    if (!order) {
      return res.status(404).json({ message: 'Sipariş bulunamadı.' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Sipariş detayı alınırken hata oluştu.', error: err.message });
  }
}

// PUT /api/orders/:id/cancel -> Sipariş İptali
async function cancelOrder(req, res) {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const order = await Order.findOne({
      where: { id, userId: req.user.id },
      include: [{ model: OrderItem, include: [Product] }],
      transaction: t,
    });

    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: 'Sipariş bulunamadı.' });
    }

    if (order.status !== 'beklemede') {
      await t.rollback();
      return res.status(400).json({ message: 'Sadece "beklemede" statüsündeki siparişler iptal edilebilir.' });
    }

    // Stokları geri iade et
    for (const item of order.OrderItems) {
      if (item.Product) {
        item.Product.stock += item.quantity;
        await item.Product.save({ transaction: t });
      }
    }

    order.status = 'iptal';
    await order.save({ transaction: t });

    await t.commit();
    res.json({ message: 'Siparişiniz başarıyla iptal edildi.', order });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: 'Sipariş iptal edilirken hata oluştu.', error: err.message });
  }
}

// GET /api/orders  (sadece admin) -> tüm siparişler
async function getAllOrders(req, res) {
  try {
    const orders = await Order.findAll({
      include: [{ model: OrderItem, include: [Product] }, { model: User, attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Siparişler alınırken hata oluştu.', error: err.message });
  }
}

// PUT /api/orders/:id/status  (sadece admin) { status }
async function updateOrderStatus(req, res) {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı.' });

    order.status = req.body.status;
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Sipariş güncellenirken hata oluştu.', error: err.message });
  }
}

// GET /api/orders/stats (sadece admin) -> İstatistik ve Dashboard verileri
async function getAdminStats(req, res) {
  try {
    const allOrders = await Order.findAll({
      include: [{ model: OrderItem, include: [{ model: Product, include: [Category] }] }],
    });

    const totalOrders = allOrders.length;
    let totalRevenue = 0;
    let monthlyOrders = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const categorySales = {};
    const monthlyTrendMap = {};

    // Son 6 ayın trend verisini hazırlayalım
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('tr-TR', { month: 'short' });
      monthlyTrendMap[label] = 0;
    }

    allOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
        monthlyOrders++;
      }

      const monthLabel = orderDate.toLocaleDateString('tr-TR', { month: 'short' });
      if (monthlyTrendMap[monthLabel] !== undefined) {
        monthlyTrendMap[monthLabel] += 1;
      }

      if (order.status !== 'iptal') {
        totalRevenue += Number(order.totalPrice) || 0;

        if (order.OrderItems) {
          order.OrderItems.forEach(item => {
            const catName = item.Product?.Category?.name || 'Genel';
            categorySales[catName] = (categorySales[catName] || 0) + item.quantity;
          });
        }
      }
    });

    const totalUsers = await User.count();
    const totalProducts = await Product.count();

    const categoryStats = Object.keys(categorySales).map(category => ({
      category,
      count: categorySales[category],
    })).sort((a, b) => b.count - a.count);

    const monthlyTrend = Object.keys(monthlyTrendMap).map(month => ({
      month,
      count: monthlyTrendMap[month],
    }));

    res.json({
      totalOrders,
      totalRevenue,
      monthlyOrders,
      totalUsers,
      totalProducts,
      categoryStats,
      monthlyTrend,
    });
  } catch (err) {
    res.status(500).json({ message: 'İstatistikler alınırken hata oluştu.', error: err.message });
  }
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  getAdminStats,
};
