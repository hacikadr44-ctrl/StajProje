<script setup>
import { computed } from 'vue'
import { useCompareStore } from '../stores/compare'
import { useCartStore } from '../stores/cart'
import { useFavoritesStore } from '../stores/favorites'
import { formatCurrency } from '../utils/format'

const compareStore = useCompareStore()
const cartStore = useCartStore()
const favoritesStore = useFavoritesStore()

// Initialize stores to have latest cart/favorite items
cartStore.fetchCart()
favoritesStore.fetchFavorites()

// Tüm ürünlerdeki teknik özellik anahtarlarının birleşimi (bir ürün RAM içermiyorsa "-" gösterilecek)
const allSpecKeys = computed(() => {
  const keys = new Set()
  compareStore.products.forEach((p) => {
    Object.keys(p.specs || {}).forEach((k) => keys.add(k))
  })
  return Array.from(keys)
})

// En ucuz ürünü tespit etme
const minPrice = computed(() => {
  if (compareStore.products.length <= 1) return null
  return Math.min(...compareStore.products.map((p) => Number(p.price)))
})
</script>

<template>
  <div class="compare-page container">
    <div class="compare-header-row">
      <h1 class="compare-title">⚖️ Ürün Karşılaştırma</h1>
      <button v-if="compareStore.products.length > 0" class="clear-btn" @click="compareStore.clear()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-icon">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        <span>Tümünü Temizle</span>
      </button>
    </div>

    <!-- Empty state design -->
    <div v-if="compareStore.products.length === 0" class="empty-state-card card">
      <div class="empty-icon">⚖️</div>
      <h2>Karşılaştırma Listesi Boş</h2>
      <p>Kıyaslama yapmak için ürün detay veya liste sayfalarından en fazla 3 ürün seçip karşılaştırma listesine ekleyin.</p>
      <RouterLink to="/" class="btn-primary back-home-btn">Alışverişe Başla</RouterLink>
    </div>

    <!-- Active comparison table -->
    <div v-else class="compare-wrapper card">
      <div class="compare-scroll-container">
        <table class="compare-table">
          <thead>
            <tr>
              <th class="sticky-col-header first-th">
                <div class="compare-intro-box">
                  <span class="badge badge-volt">Siber Kıyas</span>
                  <p>Teknik detayları ve en iyi fiyat avantajını yan yana görün.</p>
                </div>
              </th>
              <th v-for="p in compareStore.products" :key="p.id" class="compare-th">
                <div class="product-compare-card">
                  <!-- Favorite Toggle button -->
                  <button 
                    class="fav-toggle-btn" 
                    @click="favoritesStore.toggleFavorite(p.id)" 
                    :title="favoritesStore.isFavorite(p.id) ? 'Favorilerden Çıkar' : 'Favorilere Ekle'"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      :fill="favoritesStore.isFavorite(p.id) ? '#ff4757' : 'none'" 
                      :stroke="favoritesStore.isFavorite(p.id) ? '#ff4757' : 'currentColor'" 
                      stroke-width="2" 
                      stroke-linecap="round" 
                      stroke-linejoin="round" 
                      class="heart-icon"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                  </button>

                  <!-- Product Image with cheapest badge overlay -->
                  <div class="img-wrapper">
                    <img :src="p.imageUrl" :alt="p.name" />
                    <span v-if="minPrice && Number(p.price) === minPrice" class="cheapest-badge">En Ucuz</span>
                  </div>
                  
                  <p class="product-name" :title="p.name">{{ p.name }}</p>
                  
                  <!-- Actions (Add to Cart & Remove Compare) -->
                  <div class="actions-group">
                    <button class="add-to-cart-btn" @click="cartStore.addToCart(p.id)">
                      <span>Sepete Ekle</span>
                    </button>
                    <button class="remove-btn-icon" @click="compareStore.toggleCompare(p)" title="Listeden Kaldır">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="trash-icon">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr class="compare-tr">
              <td class="row-label">Marka</td>
              <td v-for="p in compareStore.products" :key="p.id" class="val-td font-semibold">
                {{ p.brand || '-' }}
              </td>
            </tr>
            <tr class="compare-tr">
              <td class="row-label">Fiyat</td>
              <td v-for="p in compareStore.products" :key="p.id" class="val-td price-td" :class="{ 'highlight-cheapest': minPrice && Number(p.price) === minPrice }">
                <span class="price-val">{{ formatCurrency(p.price) }} TL</span>
              </td>
            </tr>
            <tr class="compare-tr">
              <td class="row-label">Stok</td>
              <td v-for="p in compareStore.products" :key="p.id" class="val-td">
                <div class="stock-status">
                  <span class="stock-dot" :class="p.stock > 10 ? 'in-stock' : (p.stock > 0 ? 'low-stock' : 'no-stock')"></span>
                  <span class="stock-text" :class="p.stock > 10 ? 'text-in-stock' : (p.stock > 0 ? 'text-low-stock' : 'text-no-stock')">
                    {{ p.stock > 10 ? 'Stokta Var' : (p.stock > 0 ? `Son ${p.stock} Ürün!` : 'Tükendi') }}
                  </span>
                </div>
              </td>
            </tr>
            <tr class="compare-tr" v-for="key in allSpecKeys" :key="key">
              <td class="row-label">{{ key }}</td>
              <td v-for="p in compareStore.products" :key="p.id" class="val-td text-slate">
                {{ (p.specs && p.specs[key]) || '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.compare-page {
  padding: 40px 0;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 70vh;
}

.compare-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.compare-title {
  font-size: 1.8rem;
  font-weight: 800;
  color: white;
  margin: 0;
}

/* Clear Button */
.clear-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 71, 87, 0.08);
  color: #ff4757;
  border: 1.5px solid rgba(255, 71, 87, 0.25);
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: #ff4757;
  color: white;
  border-color: #ff4757;
  box-shadow: 0 0 15px rgba(255, 71, 87, 0.4);
}

.btn-icon {
  width: 16px;
  height: 16px;
}

/* Empty State Card */
.empty-state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 64px 32px;
  border: 1.5px dashed var(--color-line);
  background: rgba(20, 24, 36, 0.4);
  border-radius: var(--radius-lg);
  margin-top: 40px;
}

.empty-icon {
  font-size: 3.5rem;
  margin-bottom: 20px;
}

.empty-state-card h2 {
  font-size: 1.5rem;
  color: white;
  margin-bottom: 10px;
}

.empty-state-card p {
  color: var(--color-slate);
  max-width: 480px;
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 28px;
}

.back-home-btn {
  padding: 10px 28px;
  font-size: 0.9rem;
  border-radius: 30px;
  text-decoration: none;
  font-weight: 700;
  display: inline-block;
}

/* Compare Wrapper & Container */
.compare-wrapper {
  background: rgba(16, 20, 30, 0.6);
  backdrop-filter: blur(12px);
  border: 1.5px solid var(--color-line);
  border-radius: 12px;
  overflow: hidden;
  padding: 0;
}

.compare-scroll-container {
  overflow-x: auto;
  width: 100%;
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
}

/* Header Cells (Sticky card design) */
.compare-table th, .compare-table td {
  padding: 18px 16px;
  border: 1.5px solid var(--color-line);
  vertical-align: middle;
}

.first-th {
  width: 250px;
  background: rgba(10, 12, 20, 0.9) !important;
}

.compare-table th {
  background: rgba(10, 12, 20, 0.7);
  vertical-align: top;
  text-align: left;
}

.compare-th {
  min-width: 220px;
}

/* Sticky row header card wrapper */
.sticky-col-header {
  border-right: 2px solid var(--color-line);
}

.compare-intro-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
}

.compare-intro-box p {
  font-size: 0.8rem;
  color: var(--color-slate);
  line-height: 1.5;
  margin: 0;
}

.badge-volt {
  align-self: flex-start;
  background: rgba(68, 214, 44, 0.1);
  color: var(--color-volt);
  border: 1px solid rgba(68, 214, 44, 0.25);
  font-size: 0.72rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

/* Product Card Area in Header */
.product-compare-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 10px 0;
}

.fav-toggle-btn {
  position: absolute;
  top: -5px;
  right: 0;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 5;
}

.fav-toggle-btn:hover {
  background: rgba(255, 71, 87, 0.15);
  border-color: rgba(255, 71, 87, 0.3);
}

.heart-icon {
  width: 16px;
  height: 16px;
  color: var(--color-slate);
  transition: transform 0.2s ease;
}

.fav-toggle-btn:hover .heart-icon {
  color: #ff4757;
  transform: scale(1.1);
}

.img-wrapper {
  position: relative;
  width: 110px;
  height: 110px;
  background: #0d0f17;
  border-radius: 10px;
  border: 1.5px solid var(--color-line);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  transition: all 0.3s ease;
}

.img-wrapper img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.product-compare-card:hover .img-wrapper {
  transform: translateY(-3px);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 10px 20px rgba(0,0,0,0.4);
}

.cheapest-badge {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-volt);
  color: black;
  font-size: 0.65rem;
  font-weight: 900;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  box-shadow: 0 4px 10px rgba(68, 214, 44, 0.3);
  z-index: 2;
  white-space: nowrap;
}

.product-name {
  margin: 16px 0 12px 0;
  font-weight: 800;
  font-size: 0.85rem;
  color: white;
  line-height: 1.4;
  height: 2.8em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  max-width: 180px;
}

/* Actions Group */
.actions-group {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 180px;
}

.add-to-cart-btn {
  flex: 1;
  background: var(--color-volt);
  color: black;
  border: none;
  font-weight: 800;
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 0 10px rgba(68, 214, 44, 0.1);
}

.add-to-cart-btn:hover {
  background: #55efc4;
  box-shadow: 0 0 15px rgba(85, 239, 196, 0.3);
}

.remove-btn-icon {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-line);
  color: var(--color-slate);
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.remove-btn-icon:hover {
  background: rgba(255, 71, 87, 0.1);
  border-color: rgba(255, 71, 87, 0.3);
  color: #ff4757;
}

.trash-icon {
  width: 14px;
  height: 14px;
}

/* Table body row labels & values */
.row-label {
  font-weight: 800;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(10, 12, 20, 0.4);
  color: var(--color-slate);
  text-align: left;
  border-right: 2px solid var(--color-line);
  width: 250px;
}

.val-td {
  font-size: 0.85rem;
  color: white;
  text-align: center;
}

.font-semibold {
  font-weight: 600;
}

.text-slate {
  color: var(--color-slate);
}

/* Highlight Cheapest Column cell */
.price-td.highlight-cheapest {
  background: rgba(68, 214, 44, 0.03) !important;
  border-color: rgba(68, 214, 44, 0.25) !important;
}

.price-td.highlight-cheapest .price-val {
  color: var(--color-volt);
  font-weight: 900;
  text-shadow: 0 0 10px rgba(68, 214, 44, 0.2);
}

.price-val {
  font-weight: 700;
  font-size: 0.95rem;
}

/* Stock Status Indicators */
.stock-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(0,0,0,0.15);
  padding: 4px 10px;
  border-radius: 20px;
}

.stock-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.stock-dot.in-stock {
  background: var(--color-volt);
  box-shadow: 0 0 6px var(--color-volt);
}

.stock-dot.low-stock {
  background: #ff9f43;
  box-shadow: 0 0 6px #ff9f43;
}

.stock-dot.no-stock {
  background: #ff4757;
  box-shadow: 0 0 6px #ff4757;
}

.stock-text {
  font-size: 0.72rem;
  font-weight: 700;
}

.text-in-stock {
  color: var(--color-volt);
}

.text-low-stock {
  color: #ff9f43;
}

.text-no-stock {
  color: #ff4757;
}

/* Table Row Hover animations */
.compare-tr {
  transition: all 0.2s ease;
}

.compare-tr:hover {
  background: rgba(255, 255, 255, 0.02) !important;
}

.compare-tr:hover td:not(.row-label) {
  color: white;
}

/* Scrollbar customization */
.compare-scroll-container::-webkit-scrollbar {
  height: 8px;
}

.compare-scroll-container::-webkit-scrollbar-track {
  background: rgba(10, 12, 20, 0.5);
}

.compare-scroll-container::-webkit-scrollbar-thumb {
  background: var(--color-line);
  border-radius: 4px;
}

.compare-scroll-container::-webkit-scrollbar-thumb:hover {
  background: var(--color-slate);
}
</style>
