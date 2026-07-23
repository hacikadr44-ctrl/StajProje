const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const addressRoutes = require('./routes/addressRoutes');

const app = express();

// ---- GÜVENLİK: CORS sadece frontend origin'e açık ----
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}));

// ---- GÜVENLİK: Temel HTTP güvenlik header'ları ----
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '10mb' })); // JSON body parse etmek için (10MB limit)

// ---- GÜVENLİK: Basit rate limiting (bellek tabanlı) ----
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 dakika
const RATE_LIMIT_MAX = 200; // dakikada max 200 istek

setInterval(() => requestCounts.clear(), RATE_LIMIT_WINDOW);

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const count = requestCounts.get(ip) || 0;
  if (count >= RATE_LIMIT_MAX) {
    return res.status(429).json({ message: 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.' });
  }
  requestCounts.set(ip, count + 1);
  next();
});

// Route'ları bağla
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/addresses', addressRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'E-Ticaret API çalışıyor 🚀' });
});

// ---- 404 handler ----
app.use((req, res) => {
  res.status(404).json({ message: 'Sayfa bulunamadı.' });
});

// ---- Global hata yakalayıcı ----
app.use((err, req, res, next) => {
  console.error('❌ Sunucu hatası:', err.message);
  res.status(500).json({ message: 'Sunucu hatası oluştu.' });
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Veritabanına bağlanıldı.');

    await sequelize.sync({ alter: true });
    console.log('✅ Tablolar senkronize edildi.');

    app.listen(PORT, () => {
      console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor`);
    });
  } catch (err) {
    console.error('❌ Sunucu başlatılamadı:', err.message);
  }
}

start();