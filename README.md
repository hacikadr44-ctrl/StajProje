# E-Ticaret Sitesi (Staj Projesi)

Vue 3 + Node.js/Express + MySQL ile geliştirilmiş, tam işlevsel bir e-ticaret sitesi.

## Genel Mimari

```
Kullanıcı (tarayıcı)
       │
       ▼
  Vue 3 Frontend  (http://localhost:5173)
       │  Axios ile HTTP istekleri (JSON)
       ▼
  Express Backend API  (http://localhost:5000)
       │  Sequelize ORM
       ▼
     MySQL Veritabanı
```

Frontend ve backend birbirinden tamamen bağımsız iki ayrı proje. İkisi de kendi
`npm install` / `npm run dev` komutlarıyla ayrı ayrı çalıştırılır. Aralarındaki
tek bağlantı HTTP istekleridir (REST API).

## Hızlı Başlangıç

1. **Veritabanı**: MySQL'de `eticaret_db` adında boş bir veritabanı oluştur.
2. **Backend**: `backend/README.md` dosyasındaki adımları izle (önce bu, çünkü frontend backend'e ihtiyaç duyar).
3. **Frontend**: `frontend/README.md` dosyasındaki adımları izle.
4. Tarayıcıda `http://localhost:5173` adresini aç.

## Veritabanı Şeması (Özet)

- **users** — kullanıcılar (name, email, password [hash'li], role: user/admin)
- **categories** — ürün kategorileri
- **products** — ürünler (name, price, stock, categoryId)
- **cart_items** — kullanıcıların sepetleri (userId, productId, quantity)
- **orders** — siparişler (userId, totalPrice, status, address)
- **order_items** — bir siparişteki ürün satırları (orderId, productId, quantity, priceAtPurchase)

İlişkiler: bir kategori → çok ürün, bir kullanıcı → çok sepet ürünü / çok sipariş,
bir sipariş → çok sipariş kalemi.

## Sonraki Adımlar / Geliştirme Fikirleri
Bu proje çalışan bir MVP+ seviyesinde. Süren kalırsa şunları ekleyebilirsin:
- Ürün görselleri için gerçek dosya yükleme (şu an sadece URL giriliyor)
- Sipariş durumu değiştiğinde kullanıcıya e-posta bildirimi
- Ürün yorumları/puanlama
- Sayfalama (pagination) — ürün sayısı artarsa
- Gerçek ödeme entegrasyonu (iyzico gibi Türkiye'de yaygın bir sağlayıcı)

## Sorun Yaşarsan
- Backend başlamıyorsa: `.env` dosyasındaki MySQL bilgilerini kontrol et, MySQL servisinin çalıştığından emin ol.
- Frontend'de "Network Error" görüyorsan: backend'in çalıştığından ve portların (5000/5173) boş olduğundan emin ol.
- CORS hatası alırsan: backend'de `cors()` zaten aktif, ama backend adresini değiştirdiysen `frontend/src/api/axios.js` içindeki `baseURL`'i güncellemeyi unutma.
