const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || 'secretkey',
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'İsim, e-posta ve şifre zorunludur.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Şifre en az 6 karakter olmalıdır.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Geçerli bir e-posta adresi giriniz.' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu e-posta zaten kayıtlı.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'user',
    });

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: 'Kayıt sırasında hata oluştu.', error: err.message });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'E-posta veya şifre hatalı.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'E-posta veya şifre hatalı.' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: 'Giriş sırasında hata oluştu.', error: err.message });
  }
}

// GET /api/auth/profile
async function getProfile(req, res) {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'role', 'createdAt'],
    });
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Profil alınırken hata oluştu.', error: err.message });
  }
}

// PUT /api/auth/profile
async function updateProfile(req, res) {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Ad ve e-posta zorunludur.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Geçerli bir e-posta adresi giriniz.' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    if (email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ message: 'Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor.' });
      }
    }

    user.name = name;
    user.email = email;
    await user.save();

    const token = generateToken(user);
    res.json({
      message: 'Profil başarıyla güncellendi.',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: 'Profil güncellenirken hata oluştu.', error: err.message });
  }
}

// PUT /api/auth/password
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Mevcut şifre ve yeni şifre zorunludur.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Yeni şifre en az 6 karakter olmalıdır.' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mevcut şifreniz yanlış.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Şifreniz başarıyla değiştirildi.' });
  } catch (err) {
    res.status(500).json({ message: 'Şifre güncellenirken hata oluştu.', error: err.message });
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'E-posta adresi giriniz.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Güvenlik gereği kullanıcı yoksa bile genel bir mesaj veriyoruz veya demo bildirimi yapıyoruz
      return res.json({
        message: 'Eğer bu e-posta adresiyle kayıtlı bir hesap varsa, şifre sıfırlama talimatları ve doğrulama kodu gönderildi.',
        demoCode: '123456',
      });
    }

    // 6 haneli rastgele kod üret
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 dakika geçerli

    user.resetCode = resetCode;
    user.resetCodeExpires = resetCodeExpires;
    await user.save();

    res.json({
      message: 'Şifre sıfırlama koda e-posta adresinize gönderildi (Demo Akışı).',
      demoCode: resetCode, // Demo gösterim kolaylığı için koda response'ta da yer veriyoruz
    });
  } catch (err) {
    res.status(500).json({ message: 'İşlem sırasında hata oluştu.', error: err.message });
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res) {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'E-posta, doğrulama kodu ve yeni şifre zorunludur.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Yeni şifre en az 6 karakter olmalıdır.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Geçersiz e-posta veya doğrulama kodu.' });
    }

    if (!user.resetCode || user.resetCode !== code) {
      return res.status(400).json({ message: 'Doğrulama kodu hatalı.' });
    }

    if (user.resetCodeExpires && new Date() > new Date(user.resetCodeExpires)) {
      return res.status(400).json({ message: 'Doğrulama kodunun süresi dolmuş.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    res.json({ message: 'Şifreniz başarıyla sıfırlandı. Yeni şifrenizle giriş yapabilirsiniz.' });
  } catch (err) {
    res.status(500).json({ message: 'Şifre sıfırlanırken hata oluştu.', error: err.message });
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
};
