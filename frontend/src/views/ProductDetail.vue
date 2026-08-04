<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api/axios'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { useFavoritesStore } from '../stores/favorites'
import { useCompareStore } from '../stores/compare'
import ProductCard from '../components/ProductCard.vue'
import { formatCurrency } from '../utils/format'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()
const favoritesStore = useFavoritesStore()
const compareStore = useCompareStore()

const product = ref(null)
const reviews = ref([])
const quantity = ref(1)
const message = ref('')
const activeImage = ref('')
const hasPurchased = ref(false)

const reviewRating = ref(5)
const reviewComment = ref('')
const reviewError = ref('')
const reviewSubmitting = ref(false)

const hasDiscount = computed(() => product.value?.originalPrice && product.value.originalPrice > product.value.price)
const discountPercent = computed(() => {
  if (!hasDiscount.value) return 0
  return Math.round(100 - (product.value.price / product.value.originalPrice) * 100)
})

const allImages = computed(() => {
  if (!product.value) return []
  return [product.value.imageUrl, ...(product.value.images || [])].filter(Boolean)
})

const installmentOptions = computed(() => {
  if (!product.value) return []
  return [2, 3, 6, 9, 12].map((count) => ({
    count,
    monthly: formatCurrency(Number(product.value.price) / count),
  }))
})

const specsEntries = computed(() => {
  if (!product.value?.specs) return []
  return Object.entries(product.value.specs)
})

// ---- BENZER ÜRÜNLER ----
const similarProducts = ref([])
const similarScrollRef = ref(null)

// ---- DİNAMİK TESLİMAT & CANLI İZLEYİCİ ----
const timeLeftToShip = ref('')
const liveViewersCount = ref(Math.floor(Math.random() * 18) + 8)
let timerId = null
let viewersInterval = null

function updateShipCountdown() {
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay() // 0 = Pazar, 6 = Cumartesi

  // Hafta içi ve saat 17:00'den önceyse
  if (day !== 0 && day !== 6 && hour < 17) {
    const cutoff = new Date()
    cutoff.setHours(17, 0, 0, 0)
    const diffMs = cutoff - now
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000)
    
    const pad = (n) => String(n).padStart(2, '0')
    timeLeftToShip.value = `${pad(diffHrs)}:${pad(diffMins)}:${pad(diffSecs)}`
  } else {
    timeLeftToShip.value = ''
  }
}

function startLiveViewers() {
  viewersInterval = setInterval(() => {
    const change = Math.random() > 0.5 ? Math.floor(Math.random() * 2) + 1 : -(Math.floor(Math.random() * 2) + 1)
    liveViewersCount.value = Math.max(5, Math.min(45, liveViewersCount.value + change))
  }, 6000)
}

async function fetchSimilarProducts() {
  if (!product.value?.categoryId) return
  try {
    const res = await api.get('/products', { params: { categoryId: product.value.categoryId } })
    similarProducts.value = res.data.filter((p) => p.id !== product.value.id).slice(0, 9)
  } catch (e) {
    console.error('Benzer ürünler yüklenemedi:', e)
  }
}

function scrollSimilar(dir) {
  const el = similarScrollRef.value
  if (el) el.scrollBy({ left: dir * 280, behavior: 'smooth' })
}

async function fetchProduct() {
  const res = await api.get(`/products/${route.params.id}`)
  product.value = res.data
  activeImage.value = res.data.imageUrl
  fetchSimilarProducts()

  // Son incelenen ürün kaydı (giriş yapmış kullanıcı için)
  if (authStore.isLoggedIn) {
    try {
      await api.post('/products/viewed', { productId: product.value.id })
    } catch (e) {
      console.error('İncelenen ürün kaydedilemedi:', e)
    }
  }
}
async function fetchReviews() {
  const res = await api.get(`/products/${route.params.id}/reviews`)
  reviews.value = res.data
}
async function checkPurchaseStatus() {
  if (!authStore.isLoggedIn) return
  const res = await api.get('/orders/my')
  hasPurchased.value = res.data.some(
    (order) =>
      order.status === 'tamamlandi' &&
      order.OrderItems?.some((item) => item.productId === Number(route.params.id))
  )
}

onMounted(() => {
  fetchProduct()
  fetchReviews()
  checkPurchaseStatus()
  if (authStore.isLoggedIn) favoritesStore.fetchFavorites()
  
  updateShipCountdown()
  timerId = setInterval(updateShipCountdown, 1000)
  startLiveViewers()
})

onUnmounted(() => {
  if (timerId) clearInterval(timerId)
  if (viewersInterval) clearInterval(viewersInterval)
})
watch(
  () => route.params.id,
  () => {
    fetchProduct()
    fetchReviews()
    checkPurchaseStatus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
)

async function handleAddToCart() {
  if (!authStore.isLoggedIn) {
    router.push('/giris')
    return
  }
  await cartStore.addToCart(product.value.id, quantity.value)
  message.value = 'Ürün sepete eklendi ✅'
  setTimeout(() => (message.value = ''), 2000)
}
function handleToggleFavorite() {
  if (!authStore.isLoggedIn) {
    router.push('/giris')
    return
  }
  favoritesStore.toggleFavorite(product.value.id)
}
function handleToggleCompare() {
  compareStore.toggleCompare(product.value)
}
async function submitReview() {
  reviewError.value = ''
  reviewSubmitting.value = true
  try {
    await api.post(`/products/${route.params.id}/reviews`, {
      rating: reviewRating.value,
      comment: reviewComment.value,
    })
    reviewComment.value = ''
    reviewRating.value = 5
    await fetchReviews()
    await fetchProduct()
  } catch (err) {
    reviewError.value = err.response?.data?.message || 'Yorum eklenemedi.'
  } finally {
    reviewSubmitting.value = false
  }
}
const zoomStyle = ref({})
function handleZoomMove(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  zoomStyle.value = { transformOrigin: `${x}% ${y}%`, transform: 'scale(2)' }
}
function resetZoom() {
  zoomStyle.value = {}
}

const showLightbox = ref(false)
const lightboxIndex = ref(0)
function openLightbox() {
  const idx = allImages.value.indexOf(activeImage.value)
  lightboxIndex.value = idx > -1 ? idx : 0
  showLightbox.value = true
}
function closeLightbox() {
  showLightbox.value = false
}
function nextLightbox() {
  lightboxIndex.value = (lightboxIndex.value + 1) % allImages.value.length
}
function prevLightbox() {
  lightboxIndex.value = (lightboxIndex.value - 1 + allImages.value.length) % allImages.value.length
}

const view360 = ref(false)
const isDragging = ref(false)
const dragStartX = ref(0)
const drag360Index = ref(0)

function toggle360() {
  view360.value = !view360.value
  if (view360.value) {
    drag360Index.value = Math.max(allImages.value.indexOf(activeImage.value), 0)
  }
}
function getClientX(e) {
  return e.touches ? e.touches[0].clientX : e.clientX
}
function start360Drag(e) {
  if (!view360.value) return
  isDragging.value = true
  dragStartX.value = getClientX(e)
}
function on360Drag(e) {
  if (!view360.value || !isDragging.value || allImages.value.length < 2) return
  const clientX = getClientX(e)
  const delta = clientX - dragStartX.value
  if (Math.abs(delta) > 35) {
    const dir = delta > 0 ? -1 : 1
    drag360Index.value = (drag360Index.value + dir + allImages.value.length) % allImages.value.length
    activeImage.value = allImages.value[drag360Index.value]
    dragStartX.value = clientX
  }
}
function end360Drag() {
  isDragging.value = false
}

function handleImageError(e) {
  e.target.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80'
}

function increaseQty() {
  if (quantity.value < product.value.stock) quantity.value++
}
function decreaseQty() {
  if (quantity.value > 1) quantity.value--
}

// ---- FIYAT ALARMI ----
const showAlertModal = ref(false)
const alertTargetPrice = ref('')
const alertMsg = ref('')
const alertError = ref('')
const alertLoading = ref(false)

function openAlertModal() {
  if (!authStore.isLoggedIn) { router.push('/giris'); return }
  alertMsg.value = ''
  alertError.value = ''
  alertTargetPrice.value = ''
  showAlertModal.value = true
}

async function submitPriceAlert() {
  alertMsg.value = ''
  alertError.value = ''
  const target = Number(alertTargetPrice.value)
  if (!target || target <= 0) {
    alertError.value = 'Geçerli bir hedef fiyat giriniz.'
    return
  }
  if (target >= Number(product.value.price)) {
    alertError.value = `Hedef fiyat mevcut fiyattan (${formatCurrency(product.value.price)} TL) düşük olmalıdır.`
    return
  }
  alertLoading.value = true
  try {
    const res = await api.post('/price-alerts', { productId: product.value.id, targetPrice: target })
    alertMsg.value = res.data.message || 'Fiyat alarmı oluşturuldu! 🔔'
    setTimeout(() => { showAlertModal.value = false }, 2200)
  } catch (err) {
    alertError.value = err.response?.data?.message || 'Alarm oluşturulamadı.'
  } finally {
    alertLoading.value = false
  }
}
</script>

<template>
  <div v-if="product" class="product-detail-page">
    <!-- Breadcrumb -->
    <nav class="breadcrumb">
      <RouterLink to="/">Ana Sayfa</RouterLink>
      <span class="sep">›</span>
      <RouterLink v-if="product.Category" :to="{ path: '/', query: { categoryId: product.categoryId } }">{{ product.Category.name }}</RouterLink>
      <span v-if="product.Category" class="sep">›</span>
      <span class="current">{{ product.name }}</span>
    </nav>

    <div class="detail card">
      <div class="gallery">
        <div
          class="main-image-wrapper"
          :class="{ spinnable: view360 }"
          @mousemove="view360 ? on360Drag($event) : handleZoomMove($event)"
          @mouseleave="resetZoom(); end360Drag()"
          @mousedown="start360Drag($event)"
          @mouseup="end360Drag"
          @touchstart="start360Drag($event)"
          @touchmove="on360Drag($event)"
          @touchend="end360Drag"
          @click="!view360 && openLightbox()"
        >
          <img
            class="main-image"
            :src="activeImage || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80'"
            :alt="product.name"
            :style="!view360 ? zoomStyle : {}"
            @error="handleImageError"
          />
          <span class="hint" v-if="!view360">🔍 Üzerine gel: büyüteç · Tıkla: büyük resim</span>
          <span class="hint" v-else>↔️ Sürükleyerek döndür</span>
        </div>

        <div class="gallery-controls">
          <div class="thumbnails" v-if="allImages.length > 1">
            <img
              v-for="(img, i) in allImages"
              :key="i"
              :src="img"
              :class="{ active: img === activeImage }"
              @click="activeImage = img"
              @error="handleImageError"
            />
          </div>
          <button v-if="allImages.length > 1" class="view360-toggle" @click="toggle360">
            {{ view360 ? '✕ 360° Kapat' : '🔄 360° Görünüm' }}
          </button>
        </div>
      </div>

      <div class="info">
        <p class="brand" v-if="product.brand">{{ product.brand }}</p>
        <h1>{{ product.name }}</h1>
        <p class="category-tag" v-if="product.Category">
          <RouterLink :to="{ path: '/', query: { categoryId: product.categoryId } }">{{ product.Category.name }}</RouterLink>
        </p>

        <p class="rating" v-if="product.avgRating">
          ⭐ {{ product.avgRating.toFixed(1) }} <span class="review-count">({{ product.reviewCount }} değerlendirme)</span>
        </p>

        <p class="description">{{ product.description }}</p>

        <div class="price-row">
          <span v-if="hasDiscount" class="old-price">{{ formatCurrency(product.originalPrice) }} TL</span>
          <span class="price">{{ formatCurrency(product.price) }} TL</span>
          <span v-if="hasDiscount" class="discount-badge">%{{ discountPercent }} indirim</span>
        </div>

        <div class="stock-status-wrapper">
          <p class="stock-info" :class="{ low: product.stock === 0 }">
            <span class="stock-dot" :class="{ 'in-stock': product.stock > 0 }"></span>
            {{ product.stock > 0 ? `Stokta ${product.stock} adet var` : 'Stokta yok' }}
          </p>
          <!-- Stok Durumu Progress Bar -->
          <div v-if="product.stock > 0" class="stock-progress-container">
            <div class="stock-progress-bar" :style="{ width: `${Math.min(product.stock * 4, 100)}%` }" :class="{ 'low-stock': product.stock <= 5 }"></div>
            <span class="stock-progress-text" v-if="product.stock <= 5">⚠️ Acele edin! Son {{ product.stock }} ürün kaldı.</span>
            <span class="stock-progress-text" v-else>✅ Stok durumu: Güvenli seviyede</span>
          </div>
        </div>

        <div v-if="product.stock > 0" class="add-to-cart">
          <div class="qty-control">
            <button class="qty-btn" @click="decreaseQty" :disabled="quantity <= 1">−</button>
            <input type="number" v-model.number="quantity" min="1" :max="product.stock" readonly />
            <button class="qty-btn" @click="increaseQty" :disabled="quantity >= product.stock">+</button>
          </div>
          <button class="btn-primary add-btn" @click="handleAddToCart">🛒 Sepete Ekle</button>
        </div>

        <div class="action-buttons">
          <button @click="handleToggleFavorite" :class="{ active: favoritesStore.isFavorite(product.id) }">
            ♥ {{ favoritesStore.isFavorite(product.id) ? 'Favorilerde' : 'Favorilere Ekle' }}
          </button>
          <button @click="handleToggleCompare" :class="{ active: compareStore.isInCompare(product.id) }">
            ⇄ {{ compareStore.isInCompare(product.id) ? 'Karşılaştırmada' : 'Karşılaştırmaya Ekle' }}
          </button>
          <button class="price-alert-btn" @click="openAlertModal">
            🔔 Fiyat Alarmı Kur
          </button>
        </div>

        <!-- Canlı İnceleme & Kargo Detayları -->
        <div class="product-highlights">
          <!-- Live Viewers -->
          <div class="live-viewers-badge">
            <span class="pulse-dot"></span>
            <span>Bu ürünü şu anda <strong>{{ liveViewersCount }}</strong> kişi inceliyor.</span>
          </div>

          <!-- Kargo Kartları -->
          <div class="shipping-info-box">
            <div class="shipping-info-item">
              <span class="shipping-icon">🚚</span>
              <div class="shipping-details">
                <strong>Aynı Gün Kargo Fırsatı!</strong>
                <p v-if="timeLeftToShip" class="ship-countdown">
                  Önümüzdeki <span class="countdown-timer">{{ timeLeftToShip }}</span> içinde sipariş verirseniz bugün kargoda!
                </p>
                <p v-else>Siparişiniz hızlıca kargoya teslim edilecektir.</p>
              </div>
            </div>
            <div class="shipping-info-item" v-if="product.price >= 750">
              <span class="shipping-icon">🎉</span>
              <div class="shipping-details">
                <strong>Ücretsiz Kargo</strong>
                <p>Bu ürün 750 TL üzeri olduğu için kargo tamamen ücretsizdir!</p>
              </div>
            </div>
          </div>
        </div>

        <p v-if="message" class="success">{{ message }}</p>
      </div>
    </div>

    <!-- Lightbox -->
    <div v-if="showLightbox" class="lightbox-backdrop" @click.self="closeLightbox">
      <button class="lightbox-close" @click="closeLightbox">✕</button>
      <button v-if="allImages.length > 1" class="lightbox-nav prev" @click="prevLightbox">‹</button>
      <img :src="allImages[lightboxIndex]" class="lightbox-image" :alt="product.name" />
      <button v-if="allImages.length > 1" class="lightbox-nav next" @click="nextLightbox">›</button>
    </div>

    <!-- Fiyat Alarmı Modalı -->
    <Transition name="modal-fade">
      <div v-if="showAlertModal" class="alert-modal-backdrop" @click.self="showAlertModal = false">
        <div class="alert-modal-box">
          <button class="alert-modal-close" @click="showAlertModal = false">✕</button>
          <div class="alert-modal-icon">🔔</div>
          <h3>Fiyat Alarmı Kur</h3>
          <p class="alert-modal-desc">
            <strong>{{ product.name }}</strong> için hedef fiyatınızı belirleyin.<br/>
            Ürün bu fiyata düştüğünde sizi anında bilgilendireceğiz.
          </p>
          <div class="alert-current-price">
            <span class="alert-price-label">Mevcut Fiyat:</span>
            <span class="alert-price-value">{{ formatCurrency(product.price) }} TL</span>
          </div>
          <div class="alert-form">
            <label>Hedef Fiyatınız (TL)</label>
            <input
              v-model="alertTargetPrice"
              type="number"
              :placeholder="`Örn: ${Math.floor(product.price * 0.85)}`"
              min="1"
              @keyup.enter="submitPriceAlert"
            />
          </div>
          <div v-if="alertMsg" class="alert-feedback success-feedback">🎉 {{ alertMsg }}</div>
          <div v-if="alertError" class="alert-feedback error-feedback">⚠️ {{ alertError }}</div>
          <button class="btn-primary alert-submit-btn" @click="submitPriceAlert" :disabled="alertLoading">
            {{ alertLoading ? 'Kaydediliyor...' : '🔔 Alarmı Kur' }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- Taksit Seçenekleri -->
    <div class="card section">
      <div class="section-title">
        <h3>💳 Taksit Seçenekleri</h3>
      </div>
      <table class="simple-table">
        <thead><tr><th>Taksit</th><th>Aylık Tutar</th></tr></thead>
        <tbody>
          <tr><td>Tek Çekim</td><td class="price-mono">{{ formatCurrency(product.price) }} TL</td></tr>
          <tr v-for="opt in installmentOptions" :key="opt.count">
            <td>{{ opt.count }} Taksit</td>
            <td class="price-mono">{{ opt.monthly }} TL</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Teknik Özellikler -->
    <div class="card section" v-if="specsEntries.length > 0">
      <div class="section-title">
        <h3>📋 Teknik Özellikler</h3>
      </div>
      <table class="specs-table">
        <tbody>
          <tr v-for="([key, value], i) in specsEntries" :key="key" :class="{ 'zebra': i % 2 === 0 }">
            <td class="spec-key">{{ key }}</td>
            <td class="spec-val">{{ value }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Değerlendirmeler -->
    <div class="card section">
      <div class="section-title">
        <h3>⭐ Değerlendirmeler ({{ reviews.length }})</h3>
      </div>

      <p v-if="reviews.length === 0" class="empty-text">Henüz değerlendirme yapılmamış.</p>
      <div v-for="review in reviews" :key="review.id" class="review">
        <div class="review-header">
          <strong>{{ review.User?.name }}</strong>
          <span class="stars">{{ '⭐'.repeat(review.rating) }}</span>
        </div>
        <p v-if="review.comment">{{ review.comment }}</p>
      </div>

      <div v-if="authStore.isLoggedIn && hasPurchased" class="review-form">
        <h4>Değerlendirme Yap</h4>
        <p v-if="reviewError" class="error-message">{{ reviewError }}</p>
        <select v-model.number="reviewRating">
          <option v-for="n in 5" :key="n" :value="n">{{ n }} Yıldız</option>
        </select>
        <textarea v-model="reviewComment" rows="2" placeholder="Yorumunuz (opsiyonel)"></textarea>
        <button class="btn-primary" :disabled="reviewSubmitting" @click="submitReview">
          {{ reviewSubmitting ? 'Gönderiliyor...' : 'Gönder' }}
        </button>
      </div>
      <p v-else-if="authStore.isLoggedIn" class="hint-text">Bu ürünü satın aldıktan sonra değerlendirme yapabilirsiniz.</p>
    </div>

    <!-- ═══════════ BENZER ÜRÜNLER (Carousel) ═══════════ -->
    <div class="card section" v-if="similarProducts.length > 0">
      <div class="section-title">
        <h3>🔗 Benzer Ürünler</h3>
        <div class="carousel-nav" v-if="similarProducts.length > 4">
          <button class="carousel-btn" @click="scrollSimilar(-1)">❮</button>
          <button class="carousel-btn" @click="scrollSimilar(1)">❯</button>
        </div>
      </div>
      <div class="similar-carousel" ref="similarScrollRef">
        <ProductCard v-for="sp in similarProducts" :key="sp.id" :product="sp" class="similar-card" />
      </div>
    </div>
  </div>
  <p v-else class="loading-text">Yükleniyor...</p>
</template>

<style scoped>
.product-detail-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 16px;
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  font-size: 0.82rem;
  color: var(--color-slate);
  flex-wrap: wrap;
}
.breadcrumb a {
  color: var(--color-slate);
  text-decoration: none;
  transition: color 0.2s;
}
.breadcrumb a:hover {
  color: var(--color-volt);
}
.breadcrumb .sep {
  color: rgba(255, 255, 255, 0.2);
}
.breadcrumb .current {
  color: var(--color-ink);
  font-weight: 500;
}

/* Main Detail */
.detail {
  display: flex;
  gap: 36px;
}
.gallery {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 420px;
  flex-shrink: 0;
}
.main-image-wrapper {
  position: relative;
  width: 420px;
  height: 420px;
  overflow: hidden;
  border-radius: var(--radius);
  background: radial-gradient(circle at center, #161b2c 0%, #0a0c14 100%);
  cursor: zoom-in;
  border: 1px solid var(--color-line);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
}
.main-image-wrapper.spinnable {
  cursor: grab;
}
.main-image-wrapper.spinnable:active {
  cursor: grabbing;
}
.main-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  image-rendering: -webkit-optimize-contrast;
  transition: transform 0.06s ease-out;
  user-select: none;
  pointer-events: none;
}
.hint {
  position: absolute;
  bottom: 8px;
  left: 8px;
  right: 8px;
  background: rgba(16, 21, 43, 0.7);
  backdrop-filter: blur(4px);
  color: white;
  font-size: 0.7rem;
  text-align: center;
  padding: 5px 8px;
  border-radius: var(--radius-sm);
  pointer-events: none;
}
.gallery-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.thumbnails {
  display: flex;
  gap: 8px;
}
.thumbnails img {
  width: 60px;
  height: 60px;
  object-fit: contain;
  padding: 4px;
  background: #0a0c14;
  border-radius: var(--radius-sm);
  cursor: pointer;
  opacity: 0.5;
  border: 2px solid var(--color-line);
  transition: all 0.2s;
  image-rendering: -webkit-optimize-contrast;
}
.thumbnails img:hover {
  opacity: 0.8;
  border-color: rgba(68, 214, 44, 0.5);
}
.thumbnails img.active {
  opacity: 1;
  border-color: var(--color-volt);
  box-shadow: 0 0 10px rgba(68, 214, 44, 0.3);
}
.view360-toggle {
  background: var(--color-surface);
  border: 1.5px solid var(--color-line);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.78rem;
  color: var(--color-slate);
  white-space: nowrap;
  transition: all 0.2s;
}
.view360-toggle:hover {
  border-color: var(--color-volt);
  color: var(--color-volt);
}

/* Lightbox */
.lightbox-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 15, 0.95);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lightbox-image {
  max-width: 85vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: var(--radius-sm);
}
.lightbox-close {
  position: absolute;
  top: 20px;
  right: 24px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: none;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.2);
}
.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: none;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  font-size: 1.8rem;
  cursor: pointer;
  transition: background 0.2s;
}
.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.2);
}
.lightbox-nav.prev { left: 24px; }
.lightbox-nav.next { right: 24px; }

/* Info */
.info {
  flex: 1;
}
.brand {
  color: var(--color-volt);
  font-family: var(--font-mono);
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  font-weight: 600;
  margin: 0 0 4px;
}
h1 {
  font-size: 1.6rem;
  margin: 0 0 8px;
  line-height: 1.3;
}
.category-tag a {
  display: inline-block;
  color: var(--color-slate);
  text-decoration: none;
  background: rgba(255, 255, 255, 0.05);
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.78rem;
  transition: all 0.2s;
}
.category-tag a:hover {
  background: rgba(68, 214, 44, 0.1);
  color: var(--color-volt);
}
.rating {
  color: #f59e0b;
  margin: 8px 0;
}
.review-count {
  color: #94a3b8;
  font-size: 0.85rem;
}
.description {
  color: var(--color-slate);
  line-height: 1.6;
  margin: 12px 0;
}
.price-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin: 16px 0 8px;
}
.old-price {
  text-decoration: line-through;
  color: #6b7280;
  font-family: var(--font-mono);
  font-size: 1rem;
}
.price {
  font-family: var(--font-mono);
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--color-ink);
}
.discount-badge {
  background: linear-gradient(135deg, rgba(255, 46, 99, 0.15), rgba(255, 46, 99, 0.08));
  color: var(--color-ember);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid rgba(255, 46, 99, 0.2);
}
.stock-info {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-success);
  font-size: 0.85rem;
}
.stock-info.low {
  color: var(--color-danger);
}
.stock-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-danger);
}
.stock-dot.in-stock {
  background: var(--color-success);
  box-shadow: 0 0 8px rgba(68, 214, 44, 0.5);
}
.add-to-cart {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  align-items: center;
}
.qty-control {
  display: flex;
  align-items: center;
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.qty-btn {
  background: var(--color-surface);
  border: none;
  width: 36px;
  height: 38px;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--color-ink);
  transition: all 0.15s;
}
.qty-btn:hover:not(:disabled) {
  background: rgba(68, 214, 44, 0.1);
  color: var(--color-volt);
}
.qty-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.qty-control input {
  width: 48px;
  text-align: center;
  border: none;
  border-left: 1px solid var(--color-line);
  border-right: 1px solid var(--color-line);
  border-radius: 0;
  padding: 8px 4px;
  font-weight: 600;
}
.add-btn {
  padding: 11px 28px;
  font-size: 1rem;
}
.action-buttons {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
.action-buttons button {
  background: var(--color-surface);
  border: 1.5px solid var(--color-line);
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.85rem;
}
.action-buttons button:hover {
  border-color: var(--color-volt);
  color: var(--color-volt);
}
.action-buttons button.active {
  background: rgba(68, 214, 44, 0.12);
  border-color: var(--color-volt);
  color: var(--color-volt);
}
.success {
  color: var(--color-success);
  margin-top: 10px;
  font-weight: 600;
}

/* Sections */
.section {
  margin-top: 24px;
}
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-line);
}
.section-title h3 {
  margin: 0;
  font-size: 1.1rem;
}

/* Tables */
.simple-table {
  width: 100%;
  border-collapse: collapse;
}
.simple-table td, .simple-table th {
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-line);
  text-align: left;
}
.simple-table th {
  color: var(--color-slate);
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.specs-table {
  width: 100%;
  border-collapse: collapse;
}
.specs-table tr {
  transition: background 0.15s;
}
.specs-table tr.zebra {
  background: rgba(255, 255, 255, 0.02);
}
.specs-table tr:hover {
  background: rgba(68, 214, 44, 0.04);
}
.specs-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-line);
}
.spec-key {
  color: var(--color-slate);
  font-weight: 500;
  width: 40%;
  font-size: 0.9rem;
}
.spec-val {
  font-weight: 500;
}

/* Reviews */
.review {
  border-bottom: 1px solid var(--color-line);
  padding: 12px 0;
}
.review-header {
  display: flex;
  justify-content: space-between;
}
.review-form {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 400px;
}
.hint-text, .empty-text {
  color: #94a3b8;
  font-size: 0.9rem;
}
.loading-text {
  text-align: center;
  padding: 60px 0;
  color: var(--color-slate);
}

/* ═══════════ BENZER ÜRÜNLER CAROUSEL ═══════════ */
.carousel-nav {
  display: flex;
  gap: 6px;
}
.carousel-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  color: var(--color-ink);
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.carousel-btn:hover {
  background: var(--color-volt);
  color: #0b0f19;
  border-color: var(--color-volt);
}
.similar-carousel {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-behavior: smooth;
  padding-bottom: 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}
.similar-carousel::-webkit-scrollbar {
  height: 4px;
}
.similar-carousel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}
.similar-card {
  min-width: 220px;
  max-width: 220px;
  flex-shrink: 0;
}

@media (max-width: 700px) {
  .detail { flex-direction: column; }
  .gallery, .main-image-wrapper { width: 100%; }
  .main-image-wrapper { height: 300px; }
  .price { font-size: 1.4rem; }
  .add-to-cart { flex-direction: column; }
  .similar-card { min-width: 180px; max-width: 180px; }
}

/* YENİ ÜRÜN DETAY ELEMANLARI */
.stock-status-wrapper {
  margin-bottom: 16px;
}

.stock-progress-container {
  margin-top: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  height: 6px;
  position: relative;
  overflow: visible;
  max-width: 320px;
}

.stock-progress-bar {
  background: var(--color-success);
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.stock-progress-bar.low-stock {
  background: var(--color-danger);
  box-shadow: 0 0 6px var(--color-danger);
}

.stock-progress-text {
  display: block;
  font-size: 0.75rem;
  color: var(--color-slate);
  margin-top: 5px;
  font-weight: 500;
}

/* Canlı İnceleme ve Kargo Alanı */
.product-highlights {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 420px;
}

.live-viewers-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(68, 214, 44, 0.05);
  border: 1px solid rgba(68, 214, 44, 0.15);
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  color: #38bdf8;
}

.live-viewers-badge strong {
  color: var(--color-volt);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-volt);
  box-shadow: 0 0 0 0 rgba(68, 214, 44, 0.7);
  animation: pulse 1.6s infinite;
  flex-shrink: 0;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(68, 214, 44, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 8px rgba(68, 214, 44, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(68, 214, 44, 0);
  }
}

.shipping-info-box {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--color-line);
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shipping-info-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.shipping-icon {
  font-size: 1.2rem;
  line-height: 1;
}

.shipping-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shipping-details strong {
  font-size: 0.82rem;
  color: white;
}

.shipping-details p {
  margin: 0;
  font-size: 0.78rem;
  color: var(--color-slate);
  line-height: 1.3;
}

.countdown-timer {
  font-family: var(--font-mono);
  color: var(--color-volt);
  font-weight: 700;
  background: rgba(68, 214, 44, 0.1);
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid rgba(68, 214, 44, 0.2);
}

/* ============ FİYAT ALARMI BUTONU ============ */
.price-alert-btn {
  background: rgba(255, 170, 0, 0.06);
  border: 1.5px solid rgba(255, 170, 0, 0.25);
  color: #ffaa00;
  padding: 10px 18px;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s;
}

.price-alert-btn:hover {
  background: rgba(255, 170, 0, 0.12);
  border-color: #ffaa00;
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(255, 170, 0, 0.2);
}

/* ============ FİYAT ALARMI MODALİ ============ */
.alert-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.alert-modal-box {
  background: var(--color-surface);
  border: 1.5px solid rgba(255, 170, 0, 0.25);
  border-radius: 16px;
  padding: 36px 32px;
  max-width: 420px;
  width: 100%;
  position: relative;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(255, 170, 0, 0.08);
  animation: modal-slide-in 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

@keyframes modal-slide-in {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.alert-modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--color-line);
  color: var(--color-slate);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.alert-modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.alert-modal-icon {
  font-size: 2.4rem;
  text-align: center;
  margin-bottom: 14px;
  animation: bell-ring 1s ease-in-out;
}

@keyframes bell-ring {
  0%, 100% { transform: rotate(0); }
  20% { transform: rotate(15deg); }
  40% { transform: rotate(-12deg); }
  60% { transform: rotate(8deg); }
  80% { transform: rotate(-5deg); }
}

.alert-modal-box h3 {
  text-align: center;
  font-size: 1.3rem;
  font-weight: 800;
  margin: 0 0 10px;
}

.alert-modal-desc {
  text-align: center;
  color: var(--color-slate);
  font-size: 0.87rem;
  line-height: 1.6;
  margin-bottom: 18px;
}

.alert-modal-desc strong {
  color: white;
}

.alert-current-price {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-line);
  border-radius: 8px;
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.alert-price-label {
  font-size: 0.82rem;
  color: var(--color-slate);
}

.alert-price-value {
  font-family: var(--font-mono);
  font-weight: 800;
  font-size: 1rem;
  color: white;
}

.alert-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.alert-form label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-slate);
}

.alert-form input {
  padding: 12px 16px;
  font-size: 1rem;
  background: rgba(255, 170, 0, 0.04);
  border: 1.5px solid rgba(255, 170, 0, 0.2);
  color: white;
  border-radius: var(--radius-sm);
  transition: border-color 0.2s;
}

.alert-form input:focus {
  outline: none;
  border-color: #ffaa00;
  box-shadow: 0 0 10px rgba(255, 170, 0, 0.15);
}

.alert-feedback {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.83rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.success-feedback {
  background: rgba(68, 214, 44, 0.08);
  border: 1px solid rgba(68, 214, 44, 0.2);
  color: var(--color-volt);
}

.error-feedback {
  background: rgba(255, 59, 59, 0.06);
  border: 1px solid rgba(255, 59, 59, 0.2);
  color: var(--color-danger);
}

.alert-submit-btn {
  width: 100%;
  padding: 13px;
  font-size: 0.95rem;
}

/* Modal Transition */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.25s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>