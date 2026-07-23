# E-Ticaret Backend (Node.js + Express + MySQL)

## 1. Gereksinimler
- Node.js (v18 veya üzeri) — https://nodejs.org
- MySQL (XAMPP, WAMP veya doğrudan MySQL Server kurabilirsin)

## 2. Kurulum Adımları

### Adım 1 — Veritabanını oluştur
MySQL'e bağlan (phpMyAdmin veya MySQL Workbench ile) ve şu komutu çalıştır:
```sql
CREATE DATABASE eticaret_db;
```
Sadece boş bir veritabanı oluşturman yeterli — tablolar otomatik oluşacak.

### Adım 2 — Ortam değişkenlerini ayarla
`.env.example` dosyasını kopyalayıp `.env` adıyla kaydet, içindeki bilgileri kendi MySQL bilgilerinle doldur:
```bash
cp .env.example .env
```

### Adım 3 — Paketleri yükle
```bash
cd backend
npm install
```

### Adım 4 — (Opsiyonel ama önerilir) Örnek veri ekle
Bu komut sana hazır bir admin kullanıcı ve birkaç örnek ürün oluşturur:
```bash
node src/seed.js
```
Admin giriş bilgileri: `admin@example.com` / `admin123`

### Adım 5 — Sunucuyu başlat
```bash
npm run dev
```
Sunucu `http://localhost:5000` adresinde çalışacak. Tarayıcıda açtığında
`{ "message": "E-Ticaret API çalışıyor 🚀" }` görürsen her şey doğru kurulmuş demektir.

## 3. API Uç Noktaları (Endpoints)

| Metod | Yol                        | Açıklama                          | Yetki       |
|-------|----------------------------|------------------------------------|-------------|
| POST  | /api/auth/register         | Kayıt ol                           | Herkese açık |
| POST  | /api/auth/login            | Giriş yap                          | Herkese açık |
| GET   | /api/products               | Ürünleri listele (?search=&categoryId=) | Herkese açık |
| GET   | /api/products/:id           | Ürün detayı                        | Herkese açık |
| POST  | /api/products                | Ürün ekle                          | Admin       |
| PUT   | /api/products/:id            | Ürün güncelle                      | Admin       |
| DELETE| /api/products/:id            | Ürün sil                           | Admin       |
| GET   | /api/categories              | Kategorileri listele                | Herkese açık |
| POST  | /api/categories               | Kategori ekle                      | Admin       |
| GET   | /api/cart                    | Sepeti getir                        | Giriş gerekli |
| POST  | /api/cart                    | Sepete ürün ekle                    | Giriş gerekli |
| PUT   | /api/cart/:id                 | Sepetteki miktarı güncelle          | Giriş gerekli |
| DELETE| /api/cart/:id                 | Sepetten ürün çıkar                 | Giriş gerekli |
| POST  | /api/orders                   | Sipariş oluştur (sepetten)          | Giriş gerekli |
| GET   | /api/orders/my                | Kendi siparişlerim                  | Giriş gerekli |
| GET   | /api/orders                   | Tüm siparişler                      | Admin       |
| PUT   | /api/orders/:id/status         | Sipariş durumunu güncelle           | Admin       |

Giriş gerektiren isteklerde header'a şunu eklemelisin:
```
Authorization: Bearer <login'de dönen token>
```

## 4. Proje Yapısı Neden Böyle?
- **models/** → Veritabanı tablolarının JS karşılığı (Sequelize modelleri)
- **controllers/** → Asıl iş mantığı (örn: "sipariş oluştur" ne yapmalı?)
- **routes/** → Hangi URL'e istek gelince hangi controller fonksiyonunun çalışacağını söyler
- **middleware/** → İstek controller'a ulaşmadan önce araya giren kontroller (örn: giriş yapılmış mı?)

Bu ayrım "MVC benzeri" bir mimari — kodun büyüdükçe dağınıklaşmaması için endüstri standardı bir yöntem.
