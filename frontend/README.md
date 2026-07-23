# E-Ticaret Frontend (Vue 3 + Vite)

## Kurulum
```bash
cd frontend
npm install
npm run dev
```
Uygulama `http://localhost:5173` adresinde açılacak.

**ÖNEMLİ:** Backend'in `http://localhost:5000` adresinde çalışıyor olması gerekiyor
(bkz. backend/README.md). Backend adresini değiştirirsen `src/api/axios.js`
dosyasındaki `baseURL` değerini de güncelle.

## Klasör Yapısı
- **views/** → Sayfalar (Home, Login, Cart, AdminDashboard vb.) — router bunlara yönlendirir
- **components/** → Sayfalar arasında tekrar kullanılan parçalar (Navbar, ProductCard)
- **stores/** → Pinia store'ları — uygulama genelinde paylaşılan durum (kullanıcı giriş bilgisi, sepet)
- **router/** → Hangi URL'in hangi sayfayı göstereceği + yetki kontrolü (giriş/admin gerekliliği)
- **api/axios.js** → Backend'e istek atmak için merkezi Axios ayarı (token'ı otomatik ekler)

## Neden Pinia?
Vue'da component'ler arasında veri paylaşmak (örn. "sepetteki ürün sayısı" hem Navbar'da
hem Sepet sayfasında görünmeli) prop ile zorlaşır. Pinia, bu veriyi merkezi bir yerde tutup
her component'in ihtiyaç duyduğunda erişmesini sağlar.

## Sayfalar
| Yol | Sayfa | Açıklama |
|-----|-------|----------|
| / | Home | Ürün listesi, arama, kategori filtresi |
| /urun/:id | ProductDetail | Ürün detayı, sepete ekleme |
| /sepet | Cart | Sepet içeriği, miktar güncelleme |
| /giris, /kayit | Login, Register | Kullanıcı girişi/kaydı |
| /odeme | Checkout | Adres girip siparişi tamamlama |
| /siparislerim | MyOrders | Geçmiş siparişler |
| /admin | AdminDashboard | Ürün/kategori/sipariş yönetimi (sadece admin) |
