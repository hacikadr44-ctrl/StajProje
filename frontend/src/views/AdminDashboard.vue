<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import api from '../api/axios'

const activeTab = ref('dashboard') // 'dashboard' | 'products' | 'categories' | 'orders'

// ---------- İSTATİSTİKLER (DASHBOARD) ----------
const stats = ref({
  totalOrders: 0,
  totalRevenue: 0,
  monthlyOrders: 0,
  totalUsers: 0,
  totalProducts: 0,
  categoryStats: [],
  monthlyTrend: [],
})
const statsLoading = ref(true)

async function fetchStats() {
  try {
    statsLoading.value = true
    const res = await api.get('/orders/stats')
    stats.value = res.data
  } catch (err) {
    console.error('İstatistikler alınamadı:', err)
  } finally {
    statsLoading.value = false
  }
}

// Pasta / Donut Grafik Renk Haritası
const chartColors = ['#44d62c', '#38bdf8', '#a855f7', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6']

// Category Donut calculations
const categoryPiePaths = computed(() => {
  const data = stats.value.categoryStats || []
  const total = data.reduce((sum, item) => sum + item.count, 0)
  if (total === 0) return []

  let accumulatedAngle = 0
  return data.map((item, idx) => {
    const percentage = item.count / total
    const angle = percentage * 360
    const startAngle = accumulatedAngle
    const endAngle = accumulatedAngle + angle
    accumulatedAngle += angle

    // SVG Donut slice math
    const x1 = 50 + 40 * Math.cos((Math.PI * (startAngle - 90)) / 180)
    const y1 = 50 + 40 * Math.sin((Math.PI * (startAngle - 90)) / 180)
    const x2 = 50 + 40 * Math.cos((Math.PI * (endAngle - 90)) / 180)
    const y2 = 50 + 40 * Math.sin((Math.PI * (endAngle - 90)) / 180)
    const largeArcFlag = angle > 180 ? 1 : 0

    const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`
    return {
      category: item.category,
      count: item.count,
      percentage: (percentage * 100).toFixed(1),
      color: chartColors[idx % chartColors.length],
      d: pathData,
    }
  })
})

const maxMonthlyCount = computed(() => {
  const trend = stats.value.monthlyTrend || []
  if (trend.length === 0) return 1
  const max = Math.max(...trend.map(t => t.count))
  return max > 0 ? max : 1
})

// ---------- ÜRÜNLER ----------
const products = ref([])
const categories = ref([])
const editingProduct = ref(null)
const productForm = reactive({
  name: '',
  brand: '',
  description: '',
  price: '',
  originalPrice: '',
  stock: '',
  imageUrl: '',
  imagesText: '',
  categoryId: '',
  isFeatured: false,
})

const specRows = ref([{ key: '', value: '' }])

function addSpecRow() {
  specRows.value.push({ key: '', value: '' })
}
function removeSpecRow(index) {
  specRows.value.splice(index, 1)
  if (specRows.value.length === 0) specRows.value.push({ key: '', value: '' })
}

async function fetchProducts() {
  const res = await api.get('/products')
  products.value = res.data
}
async function fetchCategories() {
  const res = await api.get('/categories')
  categories.value = res.data
}

function resetProductForm() {
  editingProduct.value = null
  Object.assign(productForm, {
    name: '', brand: '', description: '', price: '', originalPrice: '', stock: '',
    imageUrl: '', imagesText: '', categoryId: '', isFeatured: false,
  })
  specRows.value = [{ key: '', value: '' }]
}

function startEditProduct(product) {
  editingProduct.value = product.id
  Object.assign(productForm, {
    name: product.name,
    brand: product.brand || '',
    description: product.description || '',
    price: product.price,
    originalPrice: product.originalPrice || '',
    stock: product.stock,
    imageUrl: product.imageUrl || '',
    imagesText: (product.images || []).join('\n'),
    categoryId: product.categoryId || '',
    isFeatured: product.isFeatured || false,
  })

  const entries = Object.entries(product.specs || {})
  specRows.value = entries.length > 0 ? entries.map(([key, value]) => ({ key, value })) : [{ key: '', value: '' }]
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function saveProduct() {
  const specs = {}
  specRows.value.forEach((row) => {
    if (row.key.trim() && row.value.trim()) {
      specs[row.key.trim()] = row.value.trim()
    }
  })

  const payload = {
    name: productForm.name,
    brand: productForm.brand || null,
    description: productForm.description,
    price: productForm.price,
    originalPrice: productForm.originalPrice || null,
    stock: productForm.stock,
    imageUrl: productForm.imageUrl,
    images: productForm.imagesText.split('\n').map((s) => s.trim()).filter(Boolean),
    specs,
    categoryId: productForm.categoryId || null,
    isFeatured: productForm.isFeatured,
  }

  if (editingProduct.value) {
    await api.put(`/products/${editingProduct.value}`, payload)
  } else {
    await api.post('/products', payload)
  }
  resetProductForm()
  fetchProducts()
  fetchStats()
}

async function deleteProduct(id) {
  if (!confirm('Bu ürünü silmek istediğine emin misin?')) return
  await api.delete(`/products/${id}`)
  fetchProducts()
  fetchStats()
}

// ---------- KATEGORİLER ----------
const newCategoryName = ref('')

async function addCategory() {
  if (!newCategoryName.value.trim()) return
  await api.post('/categories', { name: newCategoryName.value })
  newCategoryName.value = ''
  fetchCategories()
}

async function deleteCategory(id) {
  if (!confirm('Bu kategoriyi silmek istediğine emin misin?')) return
  await api.delete(`/categories/${id}`)
  fetchCategories()
}

// ---------- SİPARİŞLER ----------
const orders = ref([])
const statusOptions = ['beklemede', 'hazirlaniyor', 'kargoda', 'tamamlandi', 'iptal']

async function fetchOrders() {
  const res = await api.get('/orders')
  orders.value = res.data
}

async function changeStatus(orderId, status) {
  await api.put(`/orders/${orderId}/status`, { status })
  fetchOrders()
  fetchStats()
}

onMounted(() => {
  fetchStats()
  fetchProducts()
  fetchCategories()
  fetchOrders()
})
</script>

<template>
  <div class="admin-dashboard-page">
    <div class="admin-header">
      <h1>⚡ Admin Yönetim Paneli</h1>
      <p class="sub-text">Sistem istatistikleri, ürün yönetimi ve sipariş durum takibi.</p>
    </div>

    <!-- TABS -->
    <div class="tabs">
      <button :class="{ active: activeTab === 'dashboard' }" @click="activeTab = 'dashboard'">
        📈 Genel İstatistikler
      </button>
      <button :class="{ active: activeTab === 'products' }" @click="activeTab = 'products'">
        📦 Ürün Yönetimi ({{ products.length }})
      </button>
      <button :class="{ active: activeTab === 'categories' }" @click="activeTab = 'categories'">
        🏷️ Kategoriler ({{ categories.length }})
      </button>
      <button :class="{ active: activeTab === 'orders' }" @click="activeTab = 'orders'">
        🛍️ Siparişler ({{ orders.length }})
      </button>
    </div>

    <!-- TAB 1: İSTATİSTİKLER & DASHBOARD -->
    <div v-if="activeTab === 'dashboard'" class="tab-panel">
      <div v-if="statsLoading" class="loading-box">İstatistikler hesaplanıyor...</div>

      <template v-else>
        <!-- METRİK KARTLARI -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon green">💰</div>
            <div class="metric-info">
              <span class="metric-title">Toplam Ciro</span>
              <strong class="metric-value">{{ Number(stats.totalRevenue).toFixed(2) }} TL</strong>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon blue">📅</div>
            <div class="metric-info">
              <span class="metric-title">Bu Ayki Sipariş</span>
              <strong class="metric-value">{{ stats.monthlyOrders }} Adet</strong>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon purple">🛍️</div>
            <div class="metric-info">
              <span class="metric-title">Toplam Sipariş</span>
              <strong class="metric-value">{{ stats.totalOrders }} Adet</strong>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon amber">👥</div>
            <div class="metric-info">
              <span class="metric-title">Kayıtlı Kullanıcı</span>
              <strong class="metric-value">{{ stats.totalUsers }} Üye</strong>
            </div>
          </div>
        </div>

        <!-- GRAFİK BÖLÜMÜ -->
        <div class="charts-grid">
          <!-- KATEGORİ SATIŞ DAĞILIMI (SVG DONUT) -->
          <div class="chart-card card">
            <h3>🍩 Kategori Bazlı Satış Dağılımı</h3>
            <p class="chart-sub">Siparişlerde en çok tercih edilen ürün kategorileri.</p>

            <div v-if="categoryPiePaths.length === 0" class="empty-chart">
              Henüz satış verisi bulunmuyor.
            </div>
            <div v-else class="donut-wrapper">
              <svg viewBox="0 0 100 100" class="donut-chart">
                <path
                  v-for="(slice, idx) in categoryPiePaths"
                  :key="idx"
                  :d="slice.d"
                  :fill="slice.color"
                  class="donut-slice"
                >
                  <title>{{ slice.category }}: %{{ slice.percentage }} ({{ slice.count }} Adet)</title>
                </path>
                <circle cx="50" cy="50" r="24" fill="var(--color-surface)" />
              </svg>

              <!-- LEGEND -->
              <div class="donut-legend">
                <div v-for="(slice, idx) in categoryPiePaths" :key="idx" class="legend-item">
                  <span class="legend-color" :style="{ background: slice.color }"></span>
                  <span class="legend-name">{{ slice.category }}</span>
                  <span class="legend-val">%{{ slice.percentage }} ({{ slice.count }})</span>
                </div>
              </div>
            </div>
          </div>

          <!-- AYLIK SİPARİŞ TRENDİ (SVG BAR) -->
          <div class="chart-card card">
            <h3>📊 Son Ayların Sipariş Trendi</h3>
            <p class="chart-sub">Son 6 aya ait tamamlanan sipariş ivmesi.</p>

            <div class="bar-chart-wrapper">
              <div class="bar-chart">
                <div
                  v-for="(trend, idx) in stats.monthlyTrend"
                  :key="idx"
                  class="bar-column"
                >
                  <div class="bar-fill-container">
                    <div
                      class="bar-fill"
                      :style="{ height: `${(trend.count / maxMonthlyCount) * 100}%` }"
                      :title="`${trend.month}: ${trend.count} sipariş`"
                    >
                      <span v-if="trend.count > 0" class="bar-count-tooltip">{{ trend.count }}</span>
                    </div>
                  </div>
                  <span class="bar-label">{{ trend.month }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- TAB 2: ÜRÜNLER SEKMESİ -->
    <div v-else-if="activeTab === 'products'" class="tab-panel">
      <div class="card form-card">
        <h3>{{ editingProduct ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle' }}</h3>

        <form @submit.prevent="saveProduct" class="product-form">
          <input v-model="productForm.name" placeholder="Ürün adı" required />
          <input v-model="productForm.brand" placeholder="Marka (örn. Samsung)" />
          <input v-model="productForm.price" type="number" step="0.01" placeholder="Fiyat" required />
          <input v-model="productForm.originalPrice" type="number" step="0.01" placeholder="İndirimsiz fiyat (opsiyonel)" />
          <input v-model="productForm.stock" type="number" placeholder="Stok" required />
          <select v-model="productForm.categoryId">
            <option value="">Kategori seç</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>

          <!-- KAPAK GÖRSELİ + CANLI ÖNİZLEME -->
          <div class="full-width image-field">
            <label class="small-label">Kapak görsel URL</label>
            <div class="image-input-row">
              <input v-model="productForm.imageUrl" placeholder="https://..." class="image-url-input" />
              <div class="image-preview-box">
                <img v-if="productForm.imageUrl" :src="productForm.imageUrl" alt="Ürün görsel önizleme" />
                <span v-else class="no-image">Görsel yok</span>
              </div>
            </div>
          </div>

          <textarea v-model="productForm.description" placeholder="Açıklama" rows="2" class="full-width"></textarea>

          <!-- GALERİ GÖRSELLERİ -->
          <div class="full-width">
            <label class="small-label">Galeri görselleri (her satıra bir URL)</label>
            <textarea v-model="productForm.imagesText" rows="2" placeholder="https://...&#10;https://..."></textarea>
            <div class="gallery-preview" v-if="productForm.imagesText.trim()">
              <img
                v-for="(url, i) in productForm.imagesText.split('\n').map(s => s.trim()).filter(Boolean)"
                :key="i"
                :src="url"
                alt="Galeri önizleme"
              />
            </div>
          </div>

          <!-- TEKNİK ÖZELLİKLER -->
          <div class="full-width">
            <label class="small-label">Teknik Özellikler</label>
            <div class="spec-rows">
              <div v-for="(row, index) in specRows" :key="index" class="spec-row">
                <input v-model="row.key" placeholder="Özellik (örn. RAM)" />
                <input v-model="row.value" placeholder="Değer (örn. 8 GB)" />
                <button type="button" class="remove-spec-btn" @click="removeSpecRow(index)">✕</button>
              </div>
            </div>
            <button type="button" class="add-spec-btn" @click="addSpecRow">+ Özellik Ekle</button>
          </div>

          <label class="checkbox-label full-width">
            <input type="checkbox" v-model="productForm.isFeatured" />
            Ana sayfada "Öne Çıkanlar" bölümünde göster
          </label>

          <div class="form-buttons">
            <button class="btn-primary" type="submit">{{ editingProduct ? 'Güncelle' : 'Ekle' }}</button>
            <button v-if="editingProduct" type="button" class="cancel-btn" @click="resetProductForm">İptal</button>
          </div>
        </form>
      </div>

      <div class="table-responsive">
        <table>
          <thead>
            <tr><th></th><th>Ad</th><th>Marka</th><th>Fiyat</th><th>Stok</th><th>Kategori</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="p in products" :key="p.id">
              <td><img :src="p.imageUrl" class="table-thumb" alt="" /></td>
              <td>{{ p.name }}</td>
              <td>{{ p.brand || '-' }}</td>
              <td>{{ Number(p.price).toFixed(2) }} TL</td>
              <td>{{ p.stock }}</td>
              <td>{{ p.Category?.name || '-' }}</td>
              <td class="actions">
                <button @click="startEditProduct(p)">Düzenle</button>
                <button class="danger" @click="deleteProduct(p.id)">Sil</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 3: KATEGORİLER SEKMESİ -->
    <div v-else-if="activeTab === 'categories'" class="tab-panel">
      <div class="card form-card">
        <h3>Yeni Kategori Ekle</h3>
        <form @submit.prevent="addCategory" class="inline-form">
          <input v-model="newCategoryName" placeholder="Kategori adı" required />
          <button class="btn-primary" type="submit">Ekle</button>
        </form>
      </div>

      <div class="table-responsive">
        <table>
          <thead><tr><th>Ad</th><th></th></tr></thead>
          <tbody>
            <tr v-for="cat in categories" :key="cat.id">
              <td>{{ cat.name }}</td>
              <td class="actions"><button class="danger" @click="deleteCategory(cat.id)">Sil</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 4: SİPARİŞLER SEKMESİ -->
    <div v-else-if="activeTab === 'orders'" class="tab-panel">
      <div class="table-responsive">
        <table>
          <thead>
            <tr><th>#</th><th>Müşteri</th><th>Adres</th><th>Toplam</th><th>Durum</th></tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order.id">
              <td>#{{ order.id }}</td>
              <td>{{ order.User?.name }} <br/><small>{{ order.User?.email }}</small></td>
              <td>{{ order.district }} / {{ order.city }}</td>
              <td><strong>{{ Number(order.totalPrice).toFixed(2) }} TL</strong></td>
              <td>
                <select :value="order.status" @change="changeStatus(order.id, $event.target.value)" class="status-select">
                  <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-dashboard-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px;
}

.admin-header {
  margin-bottom: 24px;
}

.admin-header h1 {
  font-size: 1.8rem;
  margin: 0 0 4px 0;
}

.sub-text {
  color: var(--color-slate);
  font-size: 0.9rem;
  margin: 0;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.tabs button {
  padding: 10px 18px;
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  color: var(--color-slate);
  border-radius: var(--radius-sm);
  cursor: pointer;
  white-space: nowrap;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.tabs button.active {
  background: var(--color-volt);
  color: #0b0f19;
  border-color: var(--color-volt);
}

/* METRİK KARTLARI */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.metric-card {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  padding: 20px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: 16px;
}

.metric-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
}
.metric-icon.green { background: rgba(68, 214, 44, 0.15); }
.metric-icon.blue { background: rgba(56, 189, 248, 0.15); }
.metric-icon.purple { background: rgba(168, 85, 247, 0.15); }
.metric-icon.amber { background: rgba(245, 158, 11, 0.15); }

.metric-info {
  display: flex;
  flex-direction: column;
}

.metric-title {
  font-size: 0.8rem;
  color: var(--color-slate);
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 800;
  margin-top: 2px;
}

/* GRAFİK BÖLÜMÜ */
.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-card {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  padding: 24px;
  border-radius: var(--radius-md);
}

.chart-card h3 {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
}

.chart-sub {
  color: var(--color-slate);
  font-size: 0.82rem;
  margin-bottom: 20px;
}

.empty-chart {
  color: var(--color-slate);
  padding: 40px;
  text-align: center;
}

/* DONUT GRAFİK */
.donut-wrapper {
  display: flex;
  align-items: center;
  gap: 24px;
}

.donut-chart {
  width: 140px;
  height: 140px;
  flex-shrink: 0;
}

.donut-slice {
  transition: opacity 0.2s;
  cursor: pointer;
}

.donut-slice:hover {
  opacity: 0.8;
}

.donut-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

.legend-name {
  flex: 1;
}

.legend-val {
  font-size: 0.78rem;
  color: var(--color-slate);
  font-weight: 600;
}

/* BAR GRAFİK */
.bar-chart-wrapper {
  height: 180px;
  display: flex;
  align-items: flex-end;
  padding-top: 20px;
}

.bar-chart {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  width: 100%;
  height: 100%;
  gap: 12px;
}

.bar-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.bar-fill-container {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
}

.bar-fill {
  width: 70%;
  max-width: 36px;
  background: linear-gradient(180deg, var(--color-volt), #2dd4bf);
  border-radius: 4px 4px 0 0;
  position: relative;
  transition: height 0.4s ease;
  min-height: 4px;
}

.bar-count-tooltip {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-volt);
}

.bar-label {
  font-size: 0.75rem;
  color: var(--color-slate);
  margin-top: 8px;
}

/* MOBİL TABLO KAPSAYICI */
.table-responsive {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid var(--color-line);
}

/* FORM VE TABLO STİLLERİ */
.form-card {
  margin-bottom: 20px;
  background: var(--color-surface);
  padding: 20px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-line);
}
.product-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.product-form textarea,
.full-width {
  grid-column: span 2;
}
.small-label {
  display: block;
  font-size: 0.8rem;
  color: var(--color-slate);
  margin-bottom: 4px;
}

.image-input-row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.image-url-input {
  flex: 1;
}
.image-preview-box {
  width: 90px;
  height: 90px;
  border: 1.5px dashed var(--color-volt);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  background: #0a0c14;
  padding: 4px;
}
.image-preview-box img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.no-image {
  font-size: 0.68rem;
  color: var(--color-slate);
  text-align: center;
}

.gallery-preview {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.gallery-preview img {
  width: 56px;
  height: 56px;
  object-fit: contain;
  background: #0a0c14;
  padding: 3px;
  border-radius: 6px;
  border: 1px solid var(--color-line);
}

.spec-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}
.spec-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
}
.remove-spec-btn {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: none;
  border-radius: var(--radius-sm);
  width: 36px;
  cursor: pointer;
  font-size: 0.85rem;
}
.add-spec-btn {
  background: var(--color-cloud);
  border: 1.5px dashed var(--color-line);
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-slate);
  font-size: 0.85rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}
.form-buttons {
  grid-column: span 2;
  display: flex;
  gap: 10px;
}
.cancel-btn {
  background: transparent;
  border: 1px solid var(--color-line);
  color: white;
  padding: 11px 20px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.inline-form {
  display: flex;
  gap: 10px;
}
table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface);
}
th, td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-line);
  font-size: 0.9rem;
}
.table-thumb {
  width: 48px;
  height: 48px;
  object-fit: contain;
  padding: 3px;
  border-radius: 6px;
  background: #0a0c14;
  border: 1px solid var(--color-line);
}
.actions {
  display: flex;
  gap: 8px;
}
.actions button {
  border: 1px solid var(--color-line);
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
  color: white;
}
.actions .danger {
  background: rgba(255, 71, 87, 0.12);
  border-color: var(--color-danger);
  color: var(--color-danger);
}
.status-select {
  padding: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-line);
  color: white;
  border-radius: 4px;
}

@media (max-width: 800px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
  .product-form {
    grid-template-columns: 1fr;
  }
  .product-form textarea,
  .full-width {
    grid-column: span 1;
  }
}
</style>