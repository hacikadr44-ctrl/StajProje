<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useFavoritesStore } from '../stores/favorites'
import { useCompareStore } from '../stores/compare'

const props = defineProps({
  product: { type: Object, required: true },
})

const router = useRouter()
const authStore = useAuthStore()
const favoritesStore = useFavoritesStore()
const compareStore = useCompareStore()

const hasDiscount = computed(() => props.product.originalPrice && props.product.originalPrice > props.product.price)
const discountPercent = computed(() => {
  if (!hasDiscount.value) return 0
  return Math.round(100 - (props.product.price / props.product.originalPrice) * 100)
})

function handleFavoriteClick(e) {
  e.preventDefault()
  if (!authStore.isLoggedIn) {
    router.push('/giris')
    return
  }
  favoritesStore.toggleFavorite(props.product.id)
}

function handleCompareClick(e) {
  e.preventDefault()
  compareStore.toggleCompare(props.product)
}

function handleImageError(e) {
  e.target.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80'
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
  <RouterLink 
    :to="`/urun/${product.id}`" 
    class="product-card tracking-light-card"
    @mousemove="updateMouseTracking"
  >
    <div class="light-beam"></div>
    <div class="mouse-glow"></div>
    
    <div class="card-inner-wrapper">
      <div class="image-wrapper">
        <img :src="product.imageUrl || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80'" :alt="product.name" loading="lazy" @error="handleImageError" />
        <span v-if="hasDiscount" class="discount-badge">%{{ discountPercent }}</span>
        <button
          class="favorite-btn"
          :class="{ active: favoritesStore.isFavorite(product.id) }"
          @click="handleFavoriteClick"
          title="Favorilere ekle"
        >♥</button>
        <!-- Quick actions overlay -->
        <div class="quick-actions">
          <button class="quick-btn" @click.prevent.stop title="Hızlı İncele">👁️</button>
          <button class="quick-btn compare-btn" :class="{ active: compareStore.isInCompare(product.id) }" @click="handleCompareClick" title="Karşılaştır">⇄</button>
        </div>
      </div>

      <div class="card-body">
        <p class="brand" v-if="product.brand">{{ product.brand }}</p>
        <h3>{{ product.name }}</h3>

        <p class="rating" v-if="product.avgRating">
          ⭐ {{ product.avgRating.toFixed(1) }} <span class="review-count">({{ product.reviewCount }})</span>
        </p>

        <div class="price-row">
          <span v-if="hasDiscount" class="old-price">{{ Number(product.originalPrice).toFixed(2) }} TL</span>
          <span class="price">{{ Number(product.price).toFixed(2) }} TL</span>
        </div>

        <div class="card-footer">
          <p class="stock" :class="{ low: product.stock === 0 }">
            <span class="stock-dot" :class="{ 'in-stock': product.stock > 0 }"></span>
            {{ product.stock > 0 ? `Stokta: ${product.stock}` : 'Stokta yok' }}
          </p>
        </div>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
/* ============================================================
   TAKİP EDEN IŞIK (TRACKING LIGHT CARD BORDER BEAM & GLOW)
   ============================================================ */
.tracking-light-card {
  position: relative !important;
  z-index: 1 !important;
  border-radius: var(--radius) !important;
  background: var(--color-surface) !important;
  overflow: hidden !important;
  padding: 2px !important;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease, box-shadow 0.3s ease !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
}

.tracking-light-card:hover {
  transform: translateY(-6px) !important;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(68, 214, 44, 0.25) !important;
}

/* Dönerek Kenarları Takip Eden Lazer Işık */
.tracking-light-card .light-beam {
  position: absolute !important;
  top: -80% !important;
  left: -80% !important;
  width: 260% !important;
  height: 260% !important;
  background: conic-gradient(
    transparent 0deg,
    transparent 260deg,
    rgba(68, 214, 44, 0.3) 290deg,
    #44d62c 325deg,
    #00ffff 348deg,
    #44d62c 360deg
  ) !important;
  animation: spinCardTrackingBeam 3.5s linear infinite !important;
  z-index: 0 !important;
  filter: drop-shadow(0 0 10px rgba(68, 214, 44, 0.9)) !important;
}

/* Fareyi Takip Eden Işık Spot Işığı */
.tracking-light-card .mouse-glow {
  position: absolute !important;
  inset: 0 !important;
  border-radius: inherit !important;
  background: radial-gradient(
    250px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    rgba(68, 214, 44, 0.35),
    rgba(0, 255, 255, 0.15) 40%,
    transparent 75%
  ) !important;
  opacity: 0.85 !important;
  transition: opacity 0.3s ease !important;
  pointer-events: none !important;
  z-index: 1 !important;
}

.card-inner-wrapper {
  position: relative !important;
  background: #11141e !important;
  border-radius: calc(var(--radius) - 2px) !important;
  z-index: 2 !important;
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  padding: 16px !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
}

@keyframes spinCardTrackingBeam {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.image-wrapper {
  position: relative;
  margin: -16px -16px 12px -16px;
  overflow: hidden;
  height: 200px;
  background: var(--color-surface);
}

.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;
}

.tracking-light-card:hover .image-wrapper img {
  transform: scale(1.06);
}

.discount-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: linear-gradient(135deg, var(--color-ember), #ff6b6b);
  color: white;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(255, 46, 99, 0.4);
  z-index: 3;
}

.favorite-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(21, 23, 31, 0.7);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  width: 34px;
  height: 34px;
  cursor: pointer;
  color: #9aa0b4;
  font-size: 1rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
}

.favorite-btn:hover {
  color: var(--color-ember);
  background: rgba(21, 23, 31, 0.9);
  transform: scale(1.1);
}

.favorite-btn.active {
  color: var(--color-ember);
  background: rgba(255, 46, 99, 0.15);
  border-color: rgba(255, 46, 99, 0.3);
}

/* Quick actions overlay */
.quick-actions {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%) translateY(10px);
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: all 0.3s ease;
  z-index: 3;
}

.tracking-light-card:hover .quick-actions {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.quick-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(21, 23, 31, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.quick-btn:hover {
  background: var(--color-volt);
  border-color: var(--color-volt);
  transform: scale(1.1);
}

.quick-btn.compare-btn.active {
  background: rgba(68, 214, 44, 0.2);
  border-color: var(--color-volt);
}

.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.brand {
  color: var(--color-slate);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  margin: 2px 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

h3 {
  margin: 4px 0;
  font-size: 0.95rem;
  font-family: var(--font-body);
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rating {
  font-size: 0.78rem;
  margin: 2px 0;
  color: #f59e0b;
}

.review-count {
  color: #94a3b8;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 8px 0 4px;
}

.old-price {
  text-decoration: line-through;
  color: #6b7280;
  font-size: 0.78rem;
  font-family: var(--font-mono);
}

.price {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--color-ink);
  font-size: 1.05rem;
}

.card-footer {
  margin-top: auto;
  padding-top: 8px;
}

.stock {
  font-size: 0.75rem;
  color: var(--color-success);
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0;
}

.stock.low {
  color: var(--color-danger);
}

.stock-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-danger);
}

.stock-dot.in-stock {
  background: var(--color-success);
  box-shadow: 0 0 6px rgba(68, 214, 44, 0.5);
}
</style>
