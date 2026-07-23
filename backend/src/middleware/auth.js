const jwt = require('jsonwebtoken');

// Bu middleware, isteğin header'ında geçerli bir JWT token olup olmadığını kontrol eder.
// Token geçerliyse, req.user içine kullanıcı bilgisini koyar ve isteğe devam eder.
function protect(req, res, next) {
  const authHeader = req.headers.authorization; // "Bearer <token>" formatında gelir

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Giriş yapmanız gerekiyor.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token geçersiz veya süresi dolmuş.' });
  }
}

// Bu middleware, protect'ten SONRA kullanılır ve sadece admin'lerin geçmesine izin verir.
function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Bu işlem için admin yetkisi gerekiyor.' });
  }
}

module.exports = { protect, adminOnly };
