<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFavoritesStore } from '../stores/favorites'
import { useCartStore } from '../stores/cart'
import ProductCard from '../components/ProductCard.vue'
import { formatCurrency } from '../utils/format'
import api from '../api/axios'

const favoritesStore = useFavoritesStore()
const cartStore = useCartStore()

const isAddingAll = ref(false)
const bulkAddMessage = ref('')
const isClearing = ref(false)
const priceDropNotify = ref(true)

onMounted(() => {
  favoritesStore.fetchFavorites()
})

// İSTATİSTİKLER
const totalValue = computed(() => {
  return favoritesStore.items.reduce((acc, item) => acc + (Number(item.Product?.price) || 0), 0)
})

const discountedItemsCount = computed(() => {
  return favoritesStore.items.filter(item => {
    const p = item.Product
    return p && p.originalPrice && Number(p.originalPrice) > Number(p.price)
  }).length
})

const totalSavings = computed(() => {
  return favoritesStore.items.reduce((acc, item) => {
    const p = item.Product
    if (p && p.originalPrice && Number(p.originalPrice) > Number(p.price)) {
      return acc + (Number(p.originalPrice) - Number(p.price))
    }
    return acc
  }, 0)
})

function hasDiscount(product) {
  return product && product.originalPrice && Number(product.originalPrice) > Number(product.price)
}

// TOPLU SEPETE EKLE
async function addAllToCart() {
  if (favoritesStore.items.length === 0) return
  isAddingAll.value = true
  bulkAddMessage.value = ''
  try {
    for (const item of favoritesStore.items) {
      if (item.Product?.id) {
        await cartStore.addToCart(item.Product.id, 1)
      }
    }
    bulkAddMessage.value = 'Tüm favori ürünleriniz başarıyla sepete eklendi! 🎉'
    setTimeout(() => { bulkAddMessage.value = '' }, 4000)
  } catch (err) {
    console.error('Sepete eklenirken hata oluştu:', err)
  } finally {
    isAddingAll.value = false
  }
}

// FAVORİLERİ TEMİZLE
async function clearAllFavorites() {
  if (!confirm('Tüm favorilerinizi kaldırmak istediğinize emin misiniz?')) return
  isClearing.value = true
  try {
    for (const item of favoritesStore.items) {
      if (item.productId) {
        await api.delete(`/favorites/${item.productId}`)
      }
    }
    await favoritesStore.fetchFavorites()
  } catch (err) {
    console.error('Favoriler temizlenirken hata oluştu:', err)
  } finally {
    isClearing.value = false
  }
}

function updateMouseTracking(e) {
  const el = e.currentTarget
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  el.style.setProperty('--mouse-x', `${x}px`)
  el.style.setProperty('--mouse-y', `${y}px`)
}
</script>

<template>
  <div class="favorites-page-container container py-5">
    <!-- Sayfa Başlığı (Mouse Glow Efektli) -->
    <div class="section-heading tracking-light-heading tracking-light-box" @mousemove="updateMouseTracking">
      <div class="light-beam"></div>
      <div class="mouse-glow"></div>
      <div class="light-content heading-content-inner">
        <div class="heading-title-group">
          <span class="tracking-pulse-dot" style="background: var(--color-volt);"></span>
          <h2>Kişisel Favori Listem</h2>
        </div>
        <span class="eyebrow">Alışveriş Paneli</span>
      </div>
    </div>

    <!-- Boş Liste Durumu -->
    <div v-if="favoritesStore.items.length === 0" class="empty-favorites card tracking-light-box" @mousemove="updateMouseTracking">
      <div class="light-beam"></div>
      <div class="mouse-glow"></div>
      <div class="light-content empty-content-inner">
        <div class="broken-heart-glow">💖</div>
        <h3>Favori Listeniz Boş</h3>
        <p>Henüz favori listenize ürün eklemediniz. En yeni ve indirimli teknolojik ürünleri keşfetmeye başlayın!</p>
        <RouterLink to="/" class="btn-explore">Alışverişe Başla</RouterLink>
      </div>
    </div>

    <!-- Dolu Liste Durumu -->
    <div v-else class="favorites-active-section">
      <!-- 📊 İstatistik Paneli (Wishlist Dashboard) -->
      <div class="favorites-dashboard">
        <!-- Kart 1: Toplam Ürün -->
        <div class="dash-card card">
          <div class="dash-icon">💖</div>
          <div class="dash-details">
            <span class="dash-title">Toplam Ürün</span>
            <span class="dash-value">{{ favoritesStore.items.length }} Adet</span>
            <span class="dash-desc">Listenizdeki ürün sayısı</span>
          </div>
        </div>

        <!-- Kart 2: Toplam Değer -->
        <div class="dash-card card">
          <div class="dash-icon">💰</div>
          <div class="dash-details">
            <span class="dash-title">Toplam Değer</span>
            <span class="dash-value price-mono">{{ formatCurrency(totalValue) }} TL</span>
            <span class="dash-desc">Listenizin toplam maliyeti</span>
          </div>
        </div>

        <!-- Kart 3: İndirim Fırsatları -->
        <div class="dash-card card">
          <div class="dash-icon text-volt">📉</div>
          <div class="dash-details">
            <span class="dash-title">İndirim Fırsatı</span>
            <span class="dash-value" :class="{ 'text-volt': discountedItemsCount > 0 }">{{ discountedItemsCount }} Ürün</span>
            <span class="dash-desc">
              {{ totalSavings > 0 ? `Toplam kazancınız: ${formatCurrency(totalSavings)} TL` : 'İndirimdeki ürün sayısı' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 🛍️ Toplu İşlemler ve Bildirim Barı -->
      <div class="action-bar-container card">
        <div class="action-buttons">
          <button @click="addAllToCart" class="btn-bulk-add" :disabled="isAddingAll">
            <span v-if="isAddingAll" class="spinner">⏳</span>
            <span v-else>🛍️ Tümünü Sepete Ekle</span>
          </button>
          
          <button @click="clearAllFavorites" class="btn-bulk-clear" :disabled="isClearing">
            <span>🗑️ Favorileri Temizle</span>
          </button>
        </div>

        <div class="notify-toggle-box">
          <span class="bell-icon" :class="{ 'ringing': priceDropNotify }">🔔</span>
          <div class="notify-texts">
            <span class="notify-title">Fiyat Düşüşü Bildirimleri</span>
            <span class="notify-desc">Ürünlerin fiyatı düştüğünde anlık bilgilendirme al</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="priceDropNotify">
            <span class="slider round"></span>
          </label>
        </div>
      </div>

      <!-- Başarı/Hata Mesajları -->
      <Transition name="fade">
        <div v-if="bulkAddMessage" class="bulk-feedback-msg success-box mt-3">
          <span class="msg-icon">🎉</span>
          <p>{{ bulkAddMessage }}</p>
        </div>
      </Transition>

      <!-- Ürün Gridi -->
      <div class="favorites-grid">
        <div 
          v-for="item in favoritesStore.items" 
          :key="item.id" 
          class="favorite-card-container"
        >
          <ProductCard :product="item.Product" />
          
          <!-- Fiyatı Düştü Pulsing Rozeti -->
          <div v-if="hasDiscount(item.Product)" class="price-drop-badge">
            <span>📉 Fiyatı Düştü!</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.favorites-page-container {
  min-height: 80vh;
  color: white;
}

/* Boş Liste */
.empty-favorites {
  padding: 4px;
}

.empty-content-inner {
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.broken-heart-glow {
  font-size: 4rem;
  margin-bottom: 20px;
  animation: pulse-glow 2.5s infinite ease-in-out;
}

.empty-content-inner h3 {
  font-size: 1.6rem;
  font-weight: 800;
  margin-bottom: 12px;
}

.empty-content-inner p {
  color: var(--color-slate);
  font-size: 0.95rem;
  max-width: 460px;
  margin: 0 auto 24px;
  line-height: 1.6;
}

.btn-explore {
  background: var(--color-volt);
  color: #0a0c14;
  padding: 12px 30px;
  border-radius: 8px;
  font-weight: 800;
  text-decoration: none;
  font-size: 0.95rem;
  transition: all 0.3s;
  box-shadow: 0 0 15px rgba(68, 214, 44, 0.2);
}

.btn-explore:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 25px rgba(68, 214, 44, 0.45);
}

/* Dashboard Panel */
.favorites-dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 25px;
}

.dash-card {
  padding: 24px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-line);
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.25s ease;
}

.dash-card:hover {
  transform: translateY(-3px);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.dash-icon {
  font-size: 2.2rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  width: 60px;
  height: 60px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dash-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dash-title {
  font-size: 0.8rem;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--color-slate);
  letter-spacing: 0.05em;
}

.dash-value {
  font-size: 1.4rem;
  font-weight: 900;
}

.dash-desc {
  font-size: 0.76rem;
  color: var(--color-slate);
}

/* Aksiyon Barı */
.action-bar-container {
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  background: var(--color-surface);
  border: 1.5px solid var(--color-line);
  border-radius: 12px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-bulk-add {
  background: var(--color-volt);
  color: #0a0c14;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: 0 0 10px rgba(68, 214, 44, 0.1);
}

.btn-bulk-add:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 18px rgba(68, 214, 44, 0.35);
}

.btn-bulk-clear {
  background: rgba(255, 38, 38, 0.05);
  border: 1.5px solid rgba(255, 38, 38, 0.2);
  color: #ff5252;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.25s;
}

.btn-bulk-clear:hover {
  background: rgba(255, 38, 38, 0.1);
  border-color: #ff2626;
  transform: translateY(-2px);
}

.notify-toggle-box {
  display: flex;
  align-items: center;
  gap: 14px;
}

.bell-icon {
  font-size: 1.4rem;
  transition: transform 0.2s;
}

.bell-icon.ringing {
  animation: ring-bell 1.5s infinite alternate ease-in-out;
}

@keyframes ring-bell {
  0% { transform: rotate(0); }
  15% { transform: rotate(12deg); }
  30% { transform: rotate(-12deg); }
  45% { transform: rotate(8deg); }
  60% { transform: rotate(-8deg); }
  75% { transform: rotate(0); }
}

.notify-texts {
  display: flex;
  flex-direction: column;
}

.notify-title {
  font-size: 0.85rem;
  font-weight: 700;
}

.notify-desc {
  font-size: 0.74rem;
  color: var(--color-slate);
}

/* Switch Toggle Button */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.08);
  border: 1.5px solid var(--color-line);
  transition: 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.slider::before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 2.5px;
  background-color: #94a3b8;
  transition: 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

input:checked + .slider {
  background-color: rgba(68, 214, 44, 0.1);
  border-color: var(--color-volt);
}

input:checked + .slider::before {
  transform: translateX(23px);
  background-color: var(--color-volt);
  box-shadow: 0 0 8px rgba(68, 214, 44, 0.6);
}

.slider.round {
  border-radius: 34px;
}

.slider.round::before {
  border-radius: 50%;
}

/* Feedback Box */
.bulk-feedback-msg {
  padding: 12px 18px;
  animation: slide-down 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

@keyframes slide-down {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Ürün Gridi */
.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
  margin-top: 25px;
}

.favorite-card-container {
  position: relative;
}

/* Fiyatı Düştü Rozeti */
.price-drop-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  background: linear-gradient(135deg, var(--color-danger), #f53b57);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(245, 59, 87, 0.4), 0 0 8px rgba(245, 59, 87, 0.2);
  pointer-events: none;
  animation: badge-pulse 2s infinite ease-in-out;
}

@keyframes badge-pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 4px 12px rgba(245, 59, 87, 0.4), 0 0 8px rgba(245, 59, 87, 0.2);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 4px 18px rgba(245, 59, 87, 0.65), 0 0 14px rgba(245, 59, 87, 0.35);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 4px 12px rgba(245, 59, 87, 0.4), 0 0 8px rgba(245, 59, 87, 0.2);
  }
}

@keyframes pulse-glow {
  0% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(245, 59, 87, 0.2)); }
  50% { transform: scale(1.08); filter: drop-shadow(0 0 15px rgba(245, 59, 87, 0.6)); }
  100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(245, 59, 87, 0.2)); }
}

@media (max-width: 768px) {
  .action-bar-container {
    flex-direction: column;
    align-items: stretch;
  }
  .notify-toggle-box {
    justify-content: space-between;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    padding-top: 15px;
  }
  .action-buttons {
    width: 100%;
  }
  .btn-bulk-add, .btn-bulk-clear {
    flex: 1;
    text-align: center;
  }
}
</style>
