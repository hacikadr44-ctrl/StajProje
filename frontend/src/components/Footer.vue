<template>
  <footer class="footer">
    <div class="footer-content">
      <!-- Newsletter -->
      <div class="newsletter-section">
        <div class="newsletter-left">
          <h3>🔔 Kampanyalardan Haberdar Olun</h3>
          <p>En yeni ürünler ve özel indirimleri e-posta ile takip edin.</p>
        </div>
        <form class="newsletter-form" @submit.prevent>
          <input type="email" placeholder="E-posta adresiniz" />
          <button type="submit" class="btn-primary">Abone Ol</button>
        </form>
      </div>

      <div class="footer-grid">
        <!-- MARKA -->
        <div class="footer-col brand-col">
          <p class="brand"><span class="brand-mark">⚡</span> TeknoMarkt</p>
          <p class="tagline">Telefon, laptop, oyun, kamera ve daha fazlası — Türkiye'nin premium teknoloji mağazası.</p>
          <div class="social-icons">
            <a href="#" aria-label="Instagram" class="social-btn">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a href="#" aria-label="Facebook" class="social-btn">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                <path d="M13.5 21v-7.5h2.5l.5-3h-3V8.4c0-.87.24-1.46 1.5-1.46H16V4.34C15.71 4.3 14.73 4.2 13.6 4.2c-2.36 0-3.97 1.44-3.97 4.08V10.5H7v3h2.63V21h3.87z" />
              </svg>
            </a>
            <a href="#" aria-label="X (Twitter)" class="social-btn">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                <path d="M18.9 2H22l-7.4 8.4L23 22h-6.8l-5.3-6.9L5 22H2l7.9-9L2 2h6.9l4.8 6.4L18.9 2zm-1.2 18h1.9L7.4 4H5.4l12.3 16z" />
              </svg>
            </a>
            <a href="#" aria-label="YouTube" class="social-btn">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                <path d="M22 12s0-3.4-.44-5a2.8 2.8 0 0 0-2-2C17.9 4.5 12 4.5 12 4.5s-5.9 0-7.56.5a2.8 2.8 0 0 0-2 2C2 8.6 2 12 2 12s0 3.4.44 5a2.8 2.8 0 0 0 2 2C6.1 19.5 12 19.5 12 19.5s5.9 0 7.56-.5a2.8 2.8 0 0 0 2-2c.44-1.6.44-5 .44-5zM10 15.5v-7l6 3.5-6 3.5z" />
              </svg>
            </a>
          </div>
        </div>

        <!-- KURUMSAL -->
        <div class="footer-col">
          <h4>Kurumsal</h4>
          <a href="#">Hakkımızda</a>
          <a href="#">İletişim</a>
          <a href="#">Blog</a>
          <a href="#">Kariyer</a>
        </div>

        <!-- MÜŞTERİ HİZMETLERİ -->
        <div class="footer-col">
          <h4>Müşteri Hizmetleri</h4>
          <a href="#">Sık Sorulan Sorular</a>
          <a href="#">Kargo Bilgileri</a>
          <a href="#">İade Koşulları</a>
          <a href="#">Garanti Şartları</a>
          <a href="#">Sipariş Takibi</a>
        </div>

        <!-- YASAL -->
        <div class="footer-col">
          <h4>Yasal</h4>
          <a href="#">KVKK Aydınlatma Metni</a>
          <a href="#">Mesafeli Satış Sözleşmesi</a>
          <a href="#">Gizlilik Politikası</a>
          <a href="#">Çerez Politikası</a>
        </div>
      </div>

      <!-- Ödeme Yöntemleri -->
      <div class="payment-section">
        <span class="payment-label">Güvenli Ödeme Yöntemleri</span>
        <div class="payment-icons">
          <span class="payment-badge">💳 Visa</span>
          <span class="payment-badge">💳 Mastercard</span>
          <span class="payment-badge">🏦 Havale/EFT</span>
          <span class="payment-badge">🚪 Kapıda Ödeme</span>
        </div>
      </div>

      <div class="footer-bottom">
        <p>&copy; {{ new Date().getFullYear() }} TeknoMarkt. Tüm hakları saklıdır.</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background: var(--color-chrome);
  color: #8991b3;
  margin-top: 50px;
  padding: 0;
  border-top: 3px solid transparent;
  border-image: linear-gradient(90deg, var(--color-volt), #38bdf8, var(--color-ember)) 1;
}
.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Newsletter */
.newsletter-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 32px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-wrap: wrap;
}
.newsletter-left h3 {
  color: white;
  margin: 0 0 4px;
  font-size: 1.1rem;
}
.newsletter-left p {
  margin: 0;
  font-size: 0.85rem;
}
.newsletter-form {
  display: flex;
  gap: 8px;
  min-width: 300px;
}
.newsletter-form input {
  flex: 1;
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
  color: white;
}
.newsletter-form .btn-primary {
  white-space: nowrap;
  padding: 10px 20px;
}

/* Grid */
.footer-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr;
  gap: 30px;
  padding: 30px 0;
}
.footer-col h4 {
  color: white;
  font-size: 0.9rem;
  margin: 0 0 14px;
  position: relative;
  padding-bottom: 10px;
}
.footer-col h4::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 24px;
  height: 2px;
  background: var(--color-volt);
  border-radius: 1px;
}
.footer-col > a {
  display: block;
  color: #cbd5e1;
  text-decoration: none;
  font-size: 0.85rem;
  margin-bottom: 10px;
  transition: color 0.15s, padding-left 0.15s;
}
.footer-col > a:hover {
  color: var(--color-volt);
  padding-left: 4px;
}
.brand {
  color: white;
  font-family: var(--font-display);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
}
.brand-mark {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--color-volt), #2dd4bf);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
}
.tagline {
  font-size: 0.85rem;
  margin: 0 0 16px;
  line-height: 1.5;
}
.social-icons {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.social-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: #c7cbe0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.social-btn svg {
  display: block;
  width: 16px;
  height: 16px;
}
.social-btn:hover {
  background: var(--color-volt);
  color: #0b0f19;
  border-color: var(--color-volt);
  transform: translateY(-2px);
}

/* Ödeme */
.payment-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-wrap: wrap;
}
.payment-label {
  font-size: 0.78rem;
  color: var(--color-slate);
  white-space: nowrap;
}
.payment-icons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.payment-badge {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 0.72rem;
  color: #d1d5db;
  white-space: nowrap;
}

/* Bottom */
.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: 16px 0;
  text-align: center;
  font-size: 0.78rem;
}
.footer-bottom p {
  margin: 0;
}

@media (max-width: 700px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
  }
  .newsletter-section {
    flex-direction: column;
    align-items: stretch;
  }
  .newsletter-form {
    min-width: 0;
  }
}
</style>