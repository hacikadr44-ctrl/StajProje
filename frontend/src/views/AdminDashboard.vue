<script setup>
import { ref, onMounted, onUnmounted, reactive, computed } from 'vue'
import api from '../api/axios'

const activeTab = ref('dashboard') // 'dashboard' | 'products' | 'categories' | 'orders'

function formatCurrency(val) {
  if (val === undefined || val === null || isNaN(Number(val))) return '0,00'
  return Number(val).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

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

const topSellingProducts = computed(() => {
  const productMap = {}
  orders.value.forEach(order => {
    if (order.status !== 'iptal' && order.OrderItems) {
      order.OrderItems.forEach(item => {
        if (!item.Product) return
        const pId = item.Product.id
        if (!productMap[pId]) {
          productMap[pId] = {
            id: pId,
            name: item.Product.name,
            imageUrl: item.Product.imageUrl,
            brand: item.Product.brand,
            soldCount: 0,
            totalRevenue: 0
          }
        }
        productMap[pId].soldCount += item.quantity
        productMap[pId].totalRevenue += Number(item.priceAtPurchase) * item.quantity
      })
    }
  })
  return Object.values(productMap)
    .sort((a, b) => b.soldCount - a.soldCount)
    .slice(0, 5)
})

const recentOrders = computed(() => {
  return orders.value.slice(0, 5)
})

function formatOrderDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

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

function exportStatsCSV() {
  let csvContent = "\uFEFF"; // UTF-8 BOM
  csvContent += "TEKNOMARKT YÖNETİM PANELİ - İSTATİSTİK RAPORU\n";
  csvContent += `Rapor Tarihi:;${new Date().toLocaleString('tr-TR')}\n\n`;

  csvContent += "GENEL METRİKLER\n";
  csvContent += `Toplam Ciro:;${formatCurrency(stats.value.totalRevenue)} TL\n`;
  csvContent += `Bu Ayki Sipariş:;${stats.value.monthlyOrders} Adet\n`;
  csvContent += `Toplam Sipariş:;${stats.value.totalOrders} Adet\n`;
  csvContent += `Kayıtlı Kullanıcı:;${stats.value.totalUsers} Üye\n\n`;

  csvContent += "KATEGORİ BAZLI SATIŞ DAĞILIMI\n";
  csvContent += "Kategori;Sipariş Adedi;Oran (%)\n";
  const catData = categoryPiePaths.value || []
  catData.forEach(item => {
    csvContent += `${item.category};${item.count};%${item.percentage}\n`;
  })
  csvContent += "\n";

  csvContent += "AYLIK SİPARİŞ TRENDİ\n";
  csvContent += "Ay;Sipariş Sayısı\n";
  const trendData = stats.value.monthlyTrend || []
  trendData.forEach(item => {
    csvContent += `${item.month};${item.count}\n`;
  })

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `teknomarkt_istatistik_raporu_${new Date().toISOString().slice(0,10)}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
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

// ---------- KAPAK GÖRSELİ GİZLEME / DÜZENLEME ----------
const isEditingCover = ref(false)
const editCoverUrl = ref('')
const isAddingCover = ref(false)
const newCoverUrl = ref('')

function openEditCover() {
  isEditingCover.value = true
  editCoverUrl.value = productForm.imageUrl
}

function saveEditCover() {
  productForm.imageUrl = editCoverUrl.value.trim()
  isEditingCover.value = false
  editCoverUrl.value = ''
}

function removeCover() {
  productForm.imageUrl = ''
  isEditingCover.value = false
  editCoverUrl.value = ''
}

function addCover() {
  const url = newCoverUrl.value.trim()
  if (url) {
    productForm.imageUrl = url
    newCoverUrl.value = ''
    isAddingCover.value = false
  }
}

// ---------- İNTERAKTİF GALERİ GÖRSELLERİ (LİNK GİZLEME / DÜZENLEME) ----------
const galleryImages = ref([])
const activeEditIndex = ref(null)
const editImageUrl = ref('')
const isAddingNew = ref(false)
const newImageUrl = ref('')

function openEditImage(index) {
  activeEditIndex.value = index
  editImageUrl.value = galleryImages.value[index]
}

function saveEditImage() {
  if (activeEditIndex.value !== null) {
    if (editImageUrl.value.trim()) {
      galleryImages.value[activeEditIndex.value] = editImageUrl.value.trim()
    } else {
      galleryImages.value.splice(activeEditIndex.value, 1)
    }
    activeEditIndex.value = null
    editImageUrl.value = ''
  }
}

function removeEditImage() {
  if (activeEditIndex.value !== null) {
    galleryImages.value.splice(activeEditIndex.value, 1)
    activeEditIndex.value = null
    editImageUrl.value = ''
  }
}

function addNewImage() {
  const url = newImageUrl.value.trim()
  if (url) {
    galleryImages.value.push(url)
    newImageUrl.value = ''
    isAddingNew.value = false
  }
}



// ---------- CANLI ÖNİZLEME & AKILLI ÖNERİLER ----------
const quickSpecSuggestions = [
  'RAM', 'Depolama', 'İşlemci', 'Ekran Boyutu', 'Çözünürlük',
  'İşletim Sistemi', 'Batarya', 'Garanti Süresi', 'Ağırlık', 'Kamera'
]

function addSuggestedSpec(specName) {
  const lastRow = specRows.value[specRows.value.length - 1]
  if (lastRow && !lastRow.key.trim()) {
    lastRow.key = specName
  } else {
    specRows.value.push({ key: specName, value: '' })
  }
}

const previewHasDiscount = computed(() => {
  const p = Number(productForm.price)
  const op = Number(productForm.originalPrice)
  return op > 0 && op > p
})

const previewDiscountPercent = computed(() => {
  if (!previewHasDiscount.value) return 0
  const p = Number(productForm.price)
  const op = Number(productForm.originalPrice)
  return Math.round(100 - (p / op) * 100)
})

const zoomImage = ref(null)

function handleZoom(e) {
  const img = zoomImage.value
  if (!img) return
  const rect = e.currentTarget.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  img.style.transformOrigin = `${x}% ${y}%`
  img.style.transform = 'scale(2.2)'
}

function resetZoom() {
  const img = zoomImage.value
  if (!img) return
  img.style.transformOrigin = 'center center'
  img.style.transform = 'scale(1)'
}

// ---------- SAYFALAMA & FİLTRE ----------
const currentPage = ref(1)
const itemsPerPage = ref(10)
const filterCategoryId = ref('')
const searchQuery = ref('')

const filteredProducts = computed(() => {
  let list = products.value

  // Kategori filtresi
  if (filterCategoryId.value) {
    list = list.filter(p => String(p.categoryId) === String(filterCategoryId.value))
  }

  // Arama filtresi
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(p =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q))
    )
  }

  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredProducts.value.length / itemsPerPage.value)))

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredProducts.value.slice(start, start + itemsPerPage.value)
})

const visiblePageNumbers = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const pages = []
  const maxVisible = 5

  let startPage = Math.max(1, current - Math.floor(maxVisible / 2))
  let endPage = Math.min(total, startPage + maxVisible - 1)

  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1)
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }
  return pages
})

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

function resetFilters() {
  filterCategoryId.value = ''
  searchQuery.value = ''
  currentPage.value = 1
}

// Filtre değiştiğinde ilk sayfaya dön
function onFilterChange() {
  currentPage.value = 1
}

// ---------- LIGHTBOX (GÖRSEL ÖNİZLEME) ----------
const lightboxUrl = ref('')
const lightboxOpen = ref(false)

function openLightbox(url) {
  if (!url) return
  lightboxUrl.value = url
  lightboxOpen.value = true
}

function closeLightbox() {
  lightboxOpen.value = false
  lightboxUrl.value = ''
}

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
  isEditingCover.value = false
  isAddingCover.value = false
  galleryImages.value = []
  specRows.value = [{ key: '', value: '' }]
}

function startEditProduct(product) {
  editingProduct.value = product.id
  Object.assign(productForm, {
    name: product.name,
    brand: product.brand || '',
    description: product.description || '',
    price: product.price ? parseFloat(product.price) : '',
    originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : '',
    stock: product.stock,
    imageUrl: product.imageUrl || '',
    imagesText: '',
    categoryId: product.categoryId || '',
    isFeatured: product.isFeatured || false,
  })
  galleryImages.value = product.images ? [...product.images] : []

  const entries = Object.entries(product.specs || {})
  specRows.value = entries.length > 0 ? entries.map(([key, value]) => ({ key, value })) : [{ key: '', value: '' }]
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function duplicateProduct(product) {
  editingProduct.value = null
  Object.assign(productForm, {
    name: `${product.name} (Kopya)`,
    brand: product.brand || '',
    description: product.description || '',
    price: product.price ? parseFloat(product.price) : '',
    originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : '',
    stock: product.stock,
    imageUrl: product.imageUrl || '',
    imagesText: '',
    categoryId: product.categoryId || '',
    isFeatured: product.isFeatured || false,
  })
  galleryImages.value = product.images ? [...product.images] : []

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
    images: galleryImages.value.map((s) => s.trim()).filter(Boolean),
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
const categorySearchQuery = ref('')
const categoryFilterId = ref('')
const editingCategoryId = ref(null)
const editingCategoryName = ref('')

const filteredCategories = computed(() => {
  let list = categories.value

  // Dropdown filtresi (belirli bir kategori seçilmişse)
  if (categoryFilterId.value) {
    list = list.filter(cat => String(cat.id) === String(categoryFilterId.value))
  }

  // Metin araması
  if (categorySearchQuery.value.trim()) {
    const q = categorySearchQuery.value.trim().toLowerCase()
    list = list.filter(cat => cat.name.toLowerCase().includes(q))
  }

  return list
})

function resetCategoryFilters() {
  categorySearchQuery.value = ''
  categoryFilterId.value = ''
  catCurrentPage.value = 1
}

// ---------- KATEGORİ SAYFALAMA ----------
const catCurrentPage = ref(1)
const catItemsPerPage = ref(10)

const catTotalPages = computed(() => Math.max(1, Math.ceil(filteredCategories.value.length / catItemsPerPage.value)))

const paginatedCategories = computed(() => {
  const start = (catCurrentPage.value - 1) * catItemsPerPage.value
  return filteredCategories.value.slice(start, start + catItemsPerPage.value)
})

const catVisiblePages = computed(() => {
  const total = catTotalPages.value
  const current = catCurrentPage.value
  const pages = []
  const maxVisible = 5
  let startPage = Math.max(1, current - Math.floor(maxVisible / 2))
  let endPage = Math.min(total, startPage + maxVisible - 1)
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1)
  }
  for (let i = startPage; i <= endPage; i++) pages.push(i)
  return pages
})

function goToCatPage(page) {
  if (page >= 1 && page <= catTotalPages.value) catCurrentPage.value = page
}

async function addCategory() {
  if (!newCategoryName.value.trim()) return
  await api.post('/categories', { name: newCategoryName.value })
  newCategoryName.value = ''
  fetchCategories()
}

function startEditCategory(cat) {
  editingCategoryId.value = cat.id
  editingCategoryName.value = cat.name
}

function cancelEditCategory() {
  editingCategoryId.value = null
  editingCategoryName.value = ''
}

async function updateCategory(id) {
  if (!editingCategoryName.value.trim()) return
  await api.put(`/categories/${id}`, { name: editingCategoryName.value.trim() })
  cancelEditCategory()
  fetchCategories()
}

async function deleteCategory(id) {
  if (!confirm('Bu kategoriyi silmek istediğine emin misin?')) return
  await api.delete(`/categories/${id}`)
  fetchCategories()
}

const orders = ref([])
const statusOptions = ['beklemede', 'hazirlaniyor', 'kargoda', 'tamamlandi', 'iptal']

const orderSearchQuery = ref('')
const orderStatusFilter = ref('')
const selectedOrder = ref(null)
const showOrderModal = ref(false)

const filteredOrders = computed(() => {
  let list = orders.value

  if (orderStatusFilter.value) {
    list = list.filter(o => o.status === orderStatusFilter.value)
  }

  if (orderSearchQuery.value.trim()) {
    const q = orderSearchQuery.value.trim().toLowerCase()
    list = list.filter(o => 
      String(o.id).includes(q) ||
      (o.User?.name && o.User.name.toLowerCase().includes(q)) ||
      (o.User?.email && o.User.email.toLowerCase().includes(q)) ||
      (o.district && o.district.toLowerCase().includes(q)) ||
      (o.city && o.city.toLowerCase().includes(q))
    )
  }

  return list
})

function openOrderDetails(order) {
  selectedOrder.value = order
  showOrderModal.value = true
}

function closeOrderDetails() {
  selectedOrder.value = null
  showOrderModal.value = false
}

async function fetchOrders() {
  const res = await api.get('/orders')
  orders.value = res.data
}

async function changeStatus(orderId, status) {
  await api.put(`/orders/${orderId}/status`, { status })
  fetchOrders()
  fetchStats()
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    if (lightboxOpen.value) {
      closeLightbox()
    } else if (showOrderModal.value) {
      closeOrderDetails()
    }
  }
}

onMounted(() => {
  fetchStats()
  fetchProducts()
  fetchCategories()
  fetchOrders()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
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
        <!-- İstatistik Kontrol Satırı -->
        <div class="dashboard-controls-row">
          <h3 class="dashboard-section-title">📊 Satış Raporları & Analiz</h3>
          <button class="btn-secondary export-btn" @click="exportStatsCSV">
            📥 CSV Raporu İndir
          </button>
        </div>
        <!-- METRİK KARTLARI -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon green">💰</div>
            <div class="metric-info">
              <span class="metric-title">Toplam Ciro</span>
              <strong class="metric-value">{{ formatCurrency(stats.totalRevenue) }} TL</strong>
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

        <!-- DASHBOARD ALT BİLGİ ALANI -->
        <div class="dashboard-bottom-grid mt-20">
          <!-- EN ÇOK SATAN ÜRÜNLER -->
          <div class="card bottom-card">
            <h3 class="bottom-card-title">🏆 En Çok Satan Ürünler</h3>
            <p class="bottom-card-sub">Toplam satış adedine göre en popüler 5 ürün.</p>
            
            <div v-if="topSellingProducts.length === 0" class="empty-list-msg">
              Henüz satış verisi bulunmuyor.
            </div>
            <div v-else class="top-products-list">
              <div v-for="(prod, index) in topSellingProducts" :key="prod.id" class="top-product-row">
                <div class="top-product-rank" :class="'rank-' + (index + 1)">{{ index + 1 }}</div>
                <img :src="prod.imageUrl || 'https://via.placeholder.com/50'" class="top-product-img" alt="" />
                <div class="top-product-info">
                  <span class="top-product-brand">{{ prod.brand }}</span>
                  <h4 class="top-product-name">{{ prod.name }}</h4>
                </div>
                <div class="top-product-stats">
                  <span class="stat-count">{{ prod.soldCount }} Adet</span>
                  <span class="stat-rev">{{ formatCurrency(prod.totalRevenue) }} TL</span>
                </div>
              </div>
            </div>
          </div>

          <!-- SON SİPARİŞLER AKIŞI -->
          <div class="card bottom-card">
            <h3 class="bottom-card-title">⚡ Son Siparişler Akışı</h3>
            <p class="bottom-card-sub">Sistemde gerçekleşen son 5 sipariş.</p>
            
            <div v-if="recentOrders.length === 0" class="empty-list-msg">
              Sistemde henüz sipariş bulunmuyor.
            </div>
            <div v-else class="recent-orders-flow">
              <div v-for="order in recentOrders" :key="order.id" class="recent-order-flow-row" @click="activeTab = 'orders'; openOrderDetails(order)" title="Detayı görmek için tıkla">
                <div class="recent-order-badge-wrap">
                  <span :class="'status-badge-' + order.status" class="recent-order-status-dot"></span>
                </div>
                <div class="recent-order-flow-info">
                  <div class="flow-header-row">
                    <strong>#{{ order.id }} - {{ order.User?.name || 'Misafir' }}</strong>
                    <span class="flow-time">{{ formatOrderDate(order.createdAt) }}</span>
                  </div>
                  <div class="flow-footer-row">
                    <span>{{ order.district }} / {{ order.city }}</span>
                    <strong class="color-volt-text">{{ formatCurrency(order.totalPrice) }} TL</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- TAB 2: ÜRÜNLER SEKMESİ -->
    <div v-else-if="activeTab === 'products'" class="tab-panel">
      <div class="admin-products-layout">
        <!-- FORM SÜTUNU -->
        <div class="card form-card product-form-col">
          <h3>{{ editingProduct ? '✏️ Ürünü Düzenle' : '➕ Yeni Ürün Ekle' }}</h3>

          <form @submit.prevent="saveProduct" class="product-form-split">
            <!-- BÖLÜM 1: Temel Bilgiler -->
            <div class="form-section">
              <h4 class="form-section-title">📌 Temel Bilgiler</h4>
              <div class="form-grid-2">
                <div class="input-group">
                  <label class="small-label">Ürün Adı *</label>
                  <input v-model="productForm.name" placeholder="Ürün adı" required />
                </div>
                <div class="input-group">
                  <label class="small-label">Marka</label>
                  <input v-model="productForm.brand" placeholder="Marka (örn. Samsung)" />
                </div>
              </div>
              <div class="form-grid-2 mt-10">
                <div class="input-group">
                  <label class="small-label">Kategori *</label>
                  <select v-model="productForm.categoryId">
                    <option value="">Kategori seç</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                  </select>
                </div>
                <div class="input-group checkbox-group-wrap">
                  <label class="checkbox-label mt-24">
                    <input type="checkbox" v-model="productForm.isFeatured" />
                    Öne Çıkanlar'da göster
                  </label>
                </div>
              </div>
              <div class="input-group full-width mt-10">
                <label class="small-label">Ürün Açıklaması</label>
                <textarea v-model="productForm.description" placeholder="Açıklama girin..." rows="3"></textarea>
              </div>
            </div>

            <!-- BÖLÜM 2: Fiyatlandırma & Stok -->
            <div class="form-section">
              <h4 class="form-section-title">💰 Fiyatlandırma & Stok</h4>
              <div class="form-grid-3">
                <div class="input-group">
                  <label class="small-label">Satış Fiyatı (TL) *</label>
                  <input v-model="productForm.price" type="number" step="any" placeholder="Fiyat" required />
                </div>
                <div class="input-group">
                  <label class="small-label">İndirimsiz Fiyat (Opsiyonel)</label>
                  <input v-model="productForm.originalPrice" type="number" step="any" placeholder="İndirimsiz fiyat" />
                </div>
                <div class="input-group">
                  <label class="small-label">Stok Adedi *</label>
                  <input v-model="productForm.stock" type="number" placeholder="Stok" required />
                </div>
              </div>
            </div>

            <!-- BÖLÜM 3: Medya & Görseller -->
            <div class="form-section">
              <h4 class="form-section-title">🖼️ Medya & Görseller</h4>
              
              <!-- Kapak Görseli Görsel Yöneticisi -->
              <div class="input-group full-width">
                <label class="small-label">Kapak Görseli (Görsele tıklayarak URL'yi düzenleyebilirsiniz)</label>
                
                <div class="cover-visual-manager">
                  <div class="gallery-thumbs-row">
                    <!-- Cover Image Thumbnail Card -->
                    <div 
                      v-if="productForm.imageUrl" 
                      class="visual-thumb-card cover-card"
                      @click="openEditCover"
                      title="Kapak URL düzenlemek için tıkla"
                    >
                      <img :src="productForm.imageUrl" alt="Kapak görseli" />
                      <div class="visual-thumb-hover">✏️ Düzenle</div>
                      
                      <!-- Magnifier button on hover -->
                      <button 
                        type="button" 
                        class="thumb-zoom-btn" 
                        @click.stop="openLightbox(productForm.imageUrl)" 
                        title="Büyüt (Lightbox)"
                      >
                        🔍
                      </button>
                    </div>
                    
                    <!-- Plus Card if empty -->
                    <button 
                      v-else-if="!isAddingCover" 
                      type="button" 
                      class="visual-thumb-add-card" 
                      @click="isAddingCover = true"
                    >
                      ➕ Kapak Resmi Ekle
                    </button>
                  </div>

                  <!-- Inline Add Cover URL Form -->
                  <div v-if="isAddingCover" class="gallery-inline-form card mt-10">
                    <label class="small-label">Kapak Görsel URL Yapıştır</label>
                    <div class="inline-input-group">
                      <input v-model="newCoverUrl" placeholder="https://..." @keydown.enter.prevent="addCover" />
                      <button type="button" class="btn-primary btn-sm" @click="addCover">Ekle</button>
                      <button type="button" class="cancel-btn btn-sm" @click="isAddingCover = false">İptal</button>
                    </div>
                  </div>

                  <!-- Inline Edit Cover URL Form -->
                  <div v-if="isEditingCover" class="gallery-inline-form card mt-10 editing-card-border">
                    <label class="small-label">Kapak Görsel URL Düzenle</label>
                    <div class="inline-input-group">
                      <input v-model="editCoverUrl" placeholder="https://..." @keydown.enter.prevent="saveEditCover" />
                      <button type="button" class="btn-primary btn-sm" @click="saveEditCover">Kaydet</button>
                      <button type="button" class="danger-btn btn-sm" @click="removeCover">Sil/Temizle</button>
                      <button type="button" class="cancel-btn btn-sm" @click="isEditingCover = false">İptal</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Galeri Görsel Yöneticisi -->
              <div class="input-group full-width mt-15">
                <label class="small-label">Galeri Görselleri (Görsellere tıklayarak URL'leri düzenleyebilirsiniz)</label>
                
                <div class="gallery-visual-manager">
                  <!-- Thumbnail List -->
                  <div class="gallery-thumbs-row">
                    <div 
                      v-for="(url, idx) in galleryImages" 
                      :key="idx" 
                      class="visual-thumb-card"
                      @click="openEditImage(idx)"
                      title="Görsel URL düzenlemek için tıkla"
                    >
                      <img :src="url" alt="Galeri görseli" />
                      <div class="visual-thumb-hover">✏️ Düzenle</div>
                      
                      <!-- Magnifier button on hover -->
                      <button 
                        type="button" 
                        class="thumb-zoom-btn" 
                        @click.stop="openLightbox(url)" 
                        title="Büyüt (Lightbox)"
                      >
                        🔍
                      </button>
                    </div>
                    
                    <!-- Plus Card -->
                    <button 
                      v-if="!isAddingNew" 
                      type="button" 
                      class="visual-thumb-add-card" 
                      @click="isAddingNew = true"
                    >
                      ➕ Yeni Ekle
                    </button>
                  </div>

                  <!-- Inline Add URL Form -->
                  <div v-if="isAddingNew" class="gallery-inline-form card mt-10">
                    <label class="small-label">Yeni Görsel URL Yapıştır</label>
                    <div class="inline-input-group">
                      <input v-model="newImageUrl" placeholder="https://... (Görsel URL)" @keydown.enter.prevent="addNewImage" />
                      <button type="button" class="btn-primary btn-sm" @click="addNewImage">Ekle</button>
                      <button type="button" class="cancel-btn btn-sm" @click="isAddingNew = false">İptal</button>
                    </div>
                  </div>

                  <!-- Inline Edit URL Form -->
                  <div v-if="activeEditIndex !== null" class="gallery-inline-form card mt-10 editing-card-border">
                    <label class="small-label">Görsel URL Düzenle (#{{ activeEditIndex + 1 }})</label>
                    <div class="inline-input-group">
                      <input v-model="editImageUrl" placeholder="https://..." @keydown.enter.prevent="saveEditImage" />
                      <button type="button" class="btn-primary btn-sm" @click="saveEditImage">Kaydet</button>
                      <button type="button" class="danger-btn btn-sm" @click="removeEditImage">Sil</button>
                      <button type="button" class="cancel-btn btn-sm" @click="activeEditIndex = null">İptal</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- BÖLÜM 4: Teknik Özellikler -->
            <div class="form-section">
              <h4 class="form-section-title">⚙️ Teknik Özellikler</h4>
              
              <!-- Akıllı Öneriler Badgeleri -->
              <div class="spec-suggestions">
                <span class="suggestion-label">Hızlı Ekle:</span>
                <button
                  v-for="s in quickSpecSuggestions"
                  :key="s"
                  type="button"
                  class="spec-badge"
                  @click="addSuggestedSpec(s)"
                >+ {{ s }}</button>
              </div>

              <div class="spec-rows mt-10">
                <div v-for="(row, index) in specRows" :key="index" class="spec-row">
                  <input v-model="row.key" placeholder="Özellik (örn. RAM)" />
                  <input v-model="row.value" placeholder="Değer (örn. 8 GB)" />
                  <button type="button" class="remove-spec-btn" @click="removeSpecRow(index)">✕</button>
                </div>
              </div>
              <button type="button" class="add-spec-btn" @click="addSpecRow">+ Özellik Ekle</button>
            </div>

            <div class="form-buttons">
              <button class="btn-primary" type="submit">{{ editingProduct ? 'Güncelle' : 'Ekle' }}</button>
              <button v-if="editingProduct" type="button" class="cancel-btn" @click="resetProductForm">İptal</button>
            </div>
          </form>
        </div>

        <!-- ÖNİZLEME SÜTUNU -->
        <div class="product-preview-col">
          <div class="preview-sticky-card card">
            <h3 class="preview-title">✨ Canlı Kart Önizlemesi</h3>
            <p class="preview-subtitle">Ürünün sitede görüneceği halidir.</p>

            <div class="mock-product-card">
              <div class="mock-inner-wrapper">
                <div class="mock-image-wrapper zoomed-wrapper" @mousemove="handleZoom" @mouseleave="resetZoom">
                  <img :src="productForm.imageUrl || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80'" alt="Önizleme görseli" ref="zoomImage" class="mock-zoom-img" />
                  <span v-if="previewHasDiscount" class="mock-discount-badge">%{{ previewDiscountPercent }}</span>
                  <button class="mock-favorite-btn" type="button">♥</button>
                  <div class="mock-zoom-badge">🔍 Yakınlaştır</div>
                  <div class="mock-quick-actions">
                    <button class="mock-quick-btn" type="button">👁️</button>
                    <button class="mock-quick-btn" type="button">⇄</button>
                  </div>
                </div>
                <div class="mock-card-body">
                  <p class="mock-brand">{{ productForm.brand || 'Marka Girilmedi' }}</p>
                  <h3 class="mock-name">{{ productForm.name || 'Yeni Ürün Başlığı' }}</h3>
                  <p class="mock-rating">⭐ 5.0 <span class="mock-review-count">(1)</span></p>
                  
                  <div class="mock-price-row">
                    <span v-if="previewHasDiscount" class="mock-old-price">{{ formatCurrency(productForm.originalPrice) }} TL</span>
                    <span class="mock-price">{{ formatCurrency(productForm.price || 0) }} TL</span>
                  </div>
                  
                  <div class="mock-card-footer">
                    <p class="mock-stock" :class="{ low: Number(productForm.stock) === 0 }">
                      <span class="mock-stock-dot" :class="{ 'in-stock': Number(productForm.stock) > 0 }"></span>
                      {{ Number(productForm.stock) > 0 ? `Stokta: ${productForm.stock}` : 'Stokta yok' }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- FİLTRE BÖLÜMÜ -->
      <div class="filter-bar card">
        <div class="filter-bar-inner">
          <div class="filter-group">
            <label class="filter-label">🔍 Ürün Ara</label>
            <input
              v-model="searchQuery"
              @input="onFilterChange"
              placeholder="Ürün adı veya marka..."
              class="filter-input"
            />
          </div>
          <div class="filter-group">
            <label class="filter-label">🏷️ Kategori</label>
            <select v-model="filterCategoryId" @change="onFilterChange" class="filter-select">
              <option value="">Tüm Kategoriler</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
          <div class="filter-group filter-actions-group">
            <button class="filter-reset-btn" @click="resetFilters" :disabled="!filterCategoryId && !searchQuery">
              ✕ Filtreleri Temizle
            </button>
          </div>
        </div>
        <div class="filter-result-info">
          <span v-if="filterCategoryId || searchQuery">
            🎯 <strong>{{ filteredProducts.length }}</strong> ürün bulundu
            <span v-if="filteredProducts.length !== products.length">(toplam {{ products.length }} ürün)</span>
          </span>
          <span v-else>📦 Toplam <strong>{{ products.length }}</strong> ürün</span>
        </div>
      </div>

      <div class="table-responsive">
        <table>
          <thead>
            <tr><th></th><th>Ad</th><th>Marka</th><th>Fiyat</th><th>Stok</th><th>Kategori</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-if="paginatedProducts.length === 0">
              <td colspan="7" class="empty-table-msg">Aramanıza uygun ürün bulunamadı.</td>
            </tr>
            <tr v-for="p in paginatedProducts" :key="p.id">
              <td><img :src="p.imageUrl" class="table-thumb" alt="" /></td>
              <td>{{ p.name }}</td>
              <td>{{ p.brand || '-' }}</td>
              <td>{{ formatCurrency(p.price) }} TL</td>
              <td>{{ p.stock }}</td>
              <td>{{ p.Category?.name || '-' }}</td>
              <td class="actions">
                <button class="copy-btn" @click="duplicateProduct(p)" title="Benzer Ürün Olarak Çoğalt">Çoğalt</button>
                <button @click="startEditProduct(p)">Düzenle</button>
                <button class="danger" @click="deleteProduct(p.id)">Sil</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SAYFALAMA -->
      <div v-if="totalPages > 1" class="pagination-bar">
        <div class="pagination-info">
          Sayfa <strong>{{ currentPage }}</strong> / {{ totalPages }}
          <span class="pagination-range">(
            {{ (currentPage - 1) * itemsPerPage + 1 }}–{{ Math.min(currentPage * itemsPerPage, filteredProducts.length) }}
            arası gösteriliyor
          )</span>
        </div>
        <div class="pagination-controls">
          <button
            class="page-btn page-arrow"
            :disabled="currentPage === 1"
            @click="goToPage(1)"
            title="İlk sayfa"
          >«</button>
          <button
            class="page-btn page-arrow"
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
            title="Önceki sayfa"
          >‹</button>
          <button
            v-for="page in visiblePageNumbers"
            :key="page"
            class="page-btn"
            :class="{ active: page === currentPage }"
            @click="goToPage(page)"
          >{{ page }}</button>
          <button
            class="page-btn page-arrow"
            :disabled="currentPage === totalPages"
            @click="goToPage(currentPage + 1)"
            title="Sonraki sayfa"
          >›</button>
          <button
            class="page-btn page-arrow"
            :disabled="currentPage === totalPages"
            @click="goToPage(totalPages)"
            title="Son sayfa"
          >»</button>
        </div>
      </div>
    </div>

    <!-- TAB 3: KATEGORİLER SEKMESİ -->
    <div v-else-if="activeTab === 'categories'" class="tab-panel">
      <div class="card form-card">
        <h3>{{ editingCategoryId ? '✏️ Kategori Düzenle' : '➕ Yeni Kategori Ekle' }}</h3>
        <form v-if="!editingCategoryId" @submit.prevent="addCategory" class="inline-form">
          <input v-model="newCategoryName" placeholder="Kategori adı" required />
          <button class="btn-primary" type="submit">Ekle</button>
        </form>
        <form v-else @submit.prevent="updateCategory(editingCategoryId)" class="inline-form">
          <input v-model="editingCategoryName" placeholder="Yeni kategori adı" required />
          <button class="btn-primary" type="submit">Kaydet</button>
          <button type="button" class="cancel-btn" @click="cancelEditCategory">İptal</button>
        </form>
      </div>

      <!-- Kategori Arama & Filtreleme -->
      <div class="filter-bar card">
        <div class="filter-bar-inner">
          <div class="filter-group">
            <label class="filter-label">🔍 Kategori Ara</label>
            <input
              v-model="categorySearchQuery"
              placeholder="Kategori adı veya anahtar kelime..."
              class="filter-input"
            />
          </div>
          <div class="filter-group">
            <label class="filter-label">🏷️ Kategoriler</label>
            <select v-model="categoryFilterId" class="filter-select">
              <option value="">Tüm Kategoriler</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
          <div class="filter-group filter-actions-group">
            <button class="filter-reset-btn" @click="resetCategoryFilters" :disabled="!categorySearchQuery && !categoryFilterId">
              ✕ Filtreleri Temizle
            </button>
          </div>
        </div>
        <div class="filter-result-info">
          <span v-if="categorySearchQuery || categoryFilterId">
            🎯 <strong>{{ filteredCategories.length }}</strong> kategori bulundu
            <span v-if="filteredCategories.length !== categories.length">(toplam {{ categories.length }} kategori)</span>
          </span>
          <span v-else>🏷️ Toplam <strong>{{ categories.length }}</strong> kategori</span>
        </div>
      </div>

      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Kategori Adı</th>
              <th>Ürün Sayısı</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="paginatedCategories.length === 0">
              <td colspan="3" class="empty-table-msg">Aramanıza uygun kategori bulunamadı.</td>
            </tr>
            <tr v-for="cat in paginatedCategories" :key="cat.id" :class="{ 'editing-row': editingCategoryId === cat.id }">
              <td>
                <span class="category-name-cell">
                  <span class="category-icon">🏷️</span>
                  {{ cat.name }}
                </span>
              </td>
              <td>
                <span class="product-count-badge">
                  {{ products.filter(p => String(p.categoryId) === String(cat.id)).length }} ürün
                </span>
              </td>
              <td class="actions">
                <button @click="startEditCategory(cat)">Düzenle</button>
                <button class="danger" @click="deleteCategory(cat.id)">Sil</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- KATEGORİ SAYFALAMA -->
      <div v-if="catTotalPages > 1" class="pagination-bar">
        <div class="pagination-info">
          Sayfa <strong>{{ catCurrentPage }}</strong> / {{ catTotalPages }}
          <span class="pagination-range">(
            {{ (catCurrentPage - 1) * catItemsPerPage + 1 }}–{{ Math.min(catCurrentPage * catItemsPerPage, filteredCategories.length) }}
            arası gösteriliyor
          )</span>
        </div>
        <div class="pagination-controls">
          <button class="page-btn page-arrow" :disabled="catCurrentPage === 1" @click="goToCatPage(1)" title="İlk sayfa">«</button>
          <button class="page-btn page-arrow" :disabled="catCurrentPage === 1" @click="goToCatPage(catCurrentPage - 1)" title="Önceki sayfa">‹</button>
          <button
            v-for="page in catVisiblePages"
            :key="page"
            class="page-btn"
            :class="{ active: page === catCurrentPage }"
            @click="goToCatPage(page)"
          >{{ page }}</button>
          <button class="page-btn page-arrow" :disabled="catCurrentPage === catTotalPages" @click="goToCatPage(catCurrentPage + 1)" title="Sonraki sayfa">›</button>
          <button class="page-btn page-arrow" :disabled="catCurrentPage === catTotalPages" @click="goToCatPage(catTotalPages)" title="Son sayfa">»</button>
        </div>
      </div>
    </div>

    <!-- TAB 4: SİPARİŞLER SEKMESİ -->
    <div v-else-if="activeTab === 'orders'" class="tab-panel">
      <!-- SİPARİŞ FİLTRE BAR -->
      <div class="filter-bar card">
        <div class="filter-bar-inner">
          <div class="filter-group">
            <label class="filter-label">🔍 Sipariş Ara</label>
            <input
              v-model="orderSearchQuery"
              placeholder="Sipariş no, müşteri, il/ilçe..."
              class="filter-input"
            />
          </div>
          <div class="filter-group">
            <label class="filter-label">🚦 Durum</label>
            <select v-model="orderStatusFilter" class="filter-select">
              <option value="">Tüm Siparişler</option>
              <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="filter-group filter-actions-group">
            <button class="filter-reset-btn" @click="orderSearchQuery = ''; orderStatusFilter = ''" :disabled="!orderSearchQuery && !orderStatusFilter">
              ✕ Filtreleri Temizle
            </button>
          </div>
        </div>
        <div class="filter-result-info">
          <span>🛍️ Toplam <strong>{{ filteredOrders.length }}</strong> sipariş listeleniyor</span>
        </div>
      </div>

      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Müşteri</th>
              <th>Adres</th>
              <th>Toplam</th>
              <th>Durum</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredOrders.length === 0">
              <td colspan="6" class="empty-table-msg">Aranan kritere uygun sipariş bulunamadı.</td>
            </tr>
            <tr v-for="order in filteredOrders" :key="order.id">
              <td>#{{ order.id }}</td>
              <td>{{ order.User?.name }} <br/><small>{{ order.User?.email }}</small></td>
              <td>{{ order.district }} / {{ order.city }}</td>
              <td><strong>{{ formatCurrency(order.totalPrice) }} TL</strong></td>
              <td>
                <select :value="order.status" @change="changeStatus(order.id, $event.target.value)" :class="'status-select-' + order.status" class="status-select-badge">
                  <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
                </select>
              </td>
              <td class="actions">
                <button class="detail-btn" @click="openOrderDetails(order)" title="Sipariş detaylarını göster">🔍 Detay</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- LIGHTBOX MODAL -->
    <Teleport to="body">
      <Transition name="lightbox-fade">
        <div v-if="lightboxOpen" class="lightbox-overlay" @click.self="closeLightbox" @keydown.esc="closeLightbox">
          <button class="lightbox-close" @click="closeLightbox" title="Kapat">&times;</button>
          <img :src="lightboxUrl" class="lightbox-image" alt="Görsel önizleme" />
        </div>
      </Transition>
    </Teleport>

    <!-- SİPARİŞ DETAY MODALI -->
    <Teleport to="body">
      <Transition name="lightbox-fade">
        <div v-if="showOrderModal && selectedOrder" class="order-details-modal-overlay" @click.self="closeOrderDetails">
          <div class="order-details-modal-content card fade-in-up">
            <div class="modal-header">
              <h3>📋 Sipariş Detayı (#{{ selectedOrder.id }})</h3>
              <button class="modal-close-btn" @click="closeOrderDetails">&times;</button>
            </div>
            
            <div class="modal-body">
              <!-- Müşteri & Kargo Özeti -->
              <div class="modal-info-grid">
                <div class="info-group">
                  <strong>👤 Müşteri Bilgileri</strong>
                  <p>{{ selectedOrder.User?.name }}</p>
                  <p class="email-sub">{{ selectedOrder.User?.email }}</p>
                </div>
                <div class="info-group">
                  <strong>📍 Teslimat Adresi</strong>
                  <p>{{ selectedOrder.district }} / {{ selectedOrder.city }}</p>
                  <p class="address-sub">{{ selectedOrder.address }}</p>
                </div>
                <div class="info-group">
                  <strong>💳 Ödeme & Durum</strong>
                  <p>Genel Toplam: <strong class="color-volt-text">{{ formatCurrency(selectedOrder.totalPrice) }} TL</strong></p>
                  <div class="status-wrap">
                    <span>Durum:</span> 
                    <span :class="'status-badge-' + selectedOrder.status" class="status-display-badge">
                      {{ selectedOrder.status }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Ürünler Listesi -->
              <h4 class="items-title">🛍️ Sipariş Edilen Ürünler ({{ selectedOrder.OrderItems?.length || 0 }})</h4>
              <div class="order-items-list">
                <div v-for="item in selectedOrder.OrderItems" :key="item.id" class="order-item-card">
                  <img :src="item.Product?.imageUrl || 'https://via.placeholder.com/80'" class="order-item-thumb" alt="" />
                  <div class="order-item-details">
                    <h5>{{ item.Product?.name || 'Ürün Bilgisi Yok' }}</h5>
                    <p class="order-item-price-qty">
                      {{ formatCurrency(item.priceAtPurchase) }} TL x {{ item.quantity }} adet
                    </p>
                  </div>
                  <div class="order-item-subtotal">
                    {{ formatCurrency(Number(item.priceAtPurchase) * item.quantity) }} TL
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-primary" @click="closeOrderDetails">Kapat</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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
  white-space: nowrap;
  text-align: right;
}
.actions button {
  border: 1px solid var(--color-line);
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
  color: white;
  margin-left: 6px;
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

/* FİLTRE BÖLÜMÜ */
.filter-bar {
  margin-bottom: 20px;
  background: var(--color-surface);
  padding: 18px 20px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-line);
}

.filter-bar-inner {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 180px;
}

.filter-actions-group {
  flex: 0;
  min-width: auto;
}

.filter-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-slate);
  letter-spacing: 0.3px;
}

.filter-input {
  padding: 10px 14px;
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.04);
  color: white;
  font-size: 0.88rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.filter-input:focus {
  border-color: var(--color-volt);
  box-shadow: 0 0 0 3px rgba(68, 214, 44, 0.12);
  outline: none;
}

.filter-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.filter-select {
  padding: 10px 14px;
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.04);
  color: white;
  font-size: 0.88rem;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%239ca3af' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

.filter-select:focus {
  border-color: var(--color-volt);
  box-shadow: 0 0 0 3px rgba(68, 214, 44, 0.12);
  outline: none;
}

.filter-select option {
  background: #1a1d2e;
  color: white;
}

.filter-reset-btn {
  padding: 10px 16px;
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-sm);
  background: rgba(255, 71, 87, 0.08);
  color: #f87171;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.filter-reset-btn:hover:not(:disabled) {
  background: rgba(255, 71, 87, 0.18);
  border-color: var(--color-danger);
}

.filter-reset-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.filter-result-info {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--color-line);
  font-size: 0.84rem;
  color: var(--color-slate);
}

.filter-result-info strong {
  color: var(--color-volt);
}

.empty-table-msg {
  text-align: center;
  padding: 40px 20px !important;
  color: var(--color-slate);
  font-size: 0.92rem;
}

/* SAYFALAMA */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding: 14px 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  flex-wrap: wrap;
  gap: 12px;
}

.pagination-info {
  font-size: 0.84rem;
  color: var(--color-slate);
}

.pagination-info strong {
  color: white;
}

.pagination-range {
  font-size: 0.78rem;
  opacity: 0.7;
}

.pagination-controls {
  display: flex;
  gap: 4px;
}

.page-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-line);
  background: transparent;
  color: var(--color-slate);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled):not(.active) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.15);
  color: white;
}

.page-btn.active {
  background: var(--color-volt);
  color: #0b0f19;
  border-color: var(--color-volt);
  box-shadow: 0 0 12px rgba(68, 214, 44, 0.3);
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-arrow {
  font-size: 1rem;
  font-weight: 700;
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
  .filter-bar-inner {
    flex-direction: column;
    gap: 12px;
  }
  .filter-group {
    min-width: 100%;
  }
  .pagination-bar {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }
  .pagination-controls {
    justify-content: center;
  }
}
/* LIGHTBOX */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}

.lightbox-image {
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
  animation: lightbox-pop 0.25s ease;
}

@keyframes lightbox-pop {
  from {
    transform: scale(0.85);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.lightbox-close {
  position: absolute;
  top: 20px;
  right: 28px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 2rem;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10000;
}

.lightbox-close:hover {
  background: rgba(255, 71, 87, 0.4);
  border-color: var(--color-danger);
  transform: rotate(90deg);
}

.lightbox-fade-enter-active,
.lightbox-fade-leave-active {
  transition: opacity 0.25s ease;
}

.lightbox-fade-enter-from,
.lightbox-fade-leave-to {
  opacity: 0;
}

/* Clickable preview styles */
.clickable-preview {
  cursor: zoom-in;
  position: relative;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.clickable-preview:hover {
  border-color: var(--color-volt);
  box-shadow: 0 0 10px rgba(68, 214, 44, 0.2);
}

.preview-zoom-icon {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 0.7rem;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  padding: 2px 4px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.preview-zoom-icon.small {
  font-size: 0.6rem;
  bottom: 2px;
  right: 2px;
}

.clickable-preview:hover .preview-zoom-icon,
.gallery-thumb-wrap:hover .preview-zoom-icon {
  opacity: 1;
}

.gallery-thumb-wrap {
  position: relative;
  cursor: zoom-in;
  border-radius: 6px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.gallery-thumb-wrap:hover {
  transform: scale(1.08);
  box-shadow: 0 0 12px rgba(68, 214, 44, 0.25);
}

.gallery-thumb-wrap img {
  width: 56px;
  height: 56px;
  object-fit: contain;
  background: #0a0c14;
  padding: 3px;
  border-radius: 6px;
  border: 1px solid var(--color-line);
  display: block;
}

/* KATEGORİ TABLOSU */
.category-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}

.category-icon {
  font-size: 1.1rem;
}

.product-count-badge {
  display: inline-block;
  background: rgba(68, 214, 44, 0.1);
  color: var(--color-volt);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
  border: 1px solid rgba(68, 214, 44, 0.2);
}

.editing-row {
  background: rgba(68, 214, 44, 0.06) !important;
  border-left: 3px solid var(--color-volt);
}

.inline-form .cancel-btn {
  background: transparent;
  border: 1px solid var(--color-line);
  color: white;
  padding: 10px 18px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.88rem;
  transition: all 0.2s;
}

.inline-form .cancel-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.2);
}

/* YENİ ÜRÜN EKLE - DÜZENLE MODERN KART & SPLIT LAYOUT */
.admin-products-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;
  margin-bottom: 30px;
  align-items: start;
}

.product-form-col {
  padding: 24px;
}

.product-form-split {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-section {
  border-bottom: 1px solid var(--color-line);
  padding-bottom: 20px;
}

.form-section:last-of-type {
  border-bottom: none;
  padding-bottom: 0;
}

.form-section-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-volt);
  margin: 0 0 16px 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
}

.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.checkbox-group-wrap {
  justify-content: flex-end;
}

.mt-10 {
  margin-top: 10px;
}

.mt-24 {
  margin-top: 24px;
}

.flex-1 {
  flex: 1;
}

/* Teknik Özellik Önerileri */
.spec-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.suggestion-label {
  font-size: 0.78rem;
  color: var(--color-slate);
  margin-right: 6px;
  font-weight: 600;
}

.spec-badge {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-line);
  color: var(--color-ink);
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.spec-badge:hover {
  background: rgba(68, 214, 44, 0.12);
  border-color: var(--color-volt);
  color: var(--color-volt);
  transform: translateY(-1px);
}

/* PREVIEW COLUMN */
.product-preview-col {
  position: sticky;
  top: 20px;
}

.preview-sticky-card {
  padding: 20px;
  text-align: center;
  background: #11141e;
  border-color: rgba(255, 255, 255, 0.08);
}

.preview-title {
  font-size: 1.1rem;
  margin: 0;
  font-weight: 700;
  color: white;
}

.preview-subtitle {
  font-size: 0.78rem;
  color: var(--color-slate);
  margin: 4px 0 20px 0;
}

/* Mock Card Mimic from ProductCard.vue */
.mock-product-card {
  width: 100%;
  max-width: 280px;
  margin: 0 auto;
  border-radius: 12px;
  background: #11141e;
  padding: 2px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  border: 1.5px solid var(--color-line);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.mock-inner-wrapper {
  background: #11141e;
  border-radius: 10px;
  padding: 14px;
  text-align: left;
  display: flex;
  flex-direction: column;
}

.mock-image-wrapper {
  position: relative;
  margin: -14px -14px 12px -14px;
  height: 180px;
  background: var(--color-surface);
  overflow: hidden;
  border-radius: 10px 10px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mock-image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.15s ease-out;
}

.zoomed-wrapper {
  cursor: zoom-in;
}

.mock-zoom-badge {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
  color: white;
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 0.65rem;
  font-weight: 600;
  pointer-events: none;
  opacity: 0.85;
  transition: opacity 0.2s;
  z-index: 3;
}

.zoomed-wrapper:hover .mock-zoom-badge {
  opacity: 0;
}

.mock-discount-badge {
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

.mock-favorite-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(21, 23, 31, 0.7);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  cursor: pointer;
  color: #9aa0b4;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
}

.mock-quick-actions {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  z-index: 3;
}

.mock-quick-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(21, 23, 31, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
  font-size: 0.78rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mock-card-body {
  display: flex;
  flex-direction: column;
}

.mock-brand {
  color: var(--color-slate);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.mock-name {
  margin: 4px 0;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 2.6em;
}

.mock-rating {
  font-size: 0.75rem;
  margin: 2px 0;
  color: #f59e0b;
}

.mock-review-count {
  color: #94a3b8;
}

.mock-price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 8px 0 4px;
}

.mock-old-price {
  text-decoration: line-through;
  color: #6b7280;
  font-size: 0.78rem;
  font-family: var(--font-mono);
}

.mock-price {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--color-volt);
  font-size: 1rem;
}

.mock-card-footer {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--color-line);
}

.mock-stock {
  font-size: 0.72rem;
  color: var(--color-success);
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0;
}

.mock-stock.low {
  color: var(--color-danger);
}

.mock-stock-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-danger);
}

.mock-stock-dot.in-stock {
  background: var(--color-success);
  box-shadow: 0 0 6px rgba(68, 214, 44, 0.5);
}

@media (max-width: 992px) {
  .admin-products-layout {
    grid-template-columns: 1fr;
  }
  .product-preview-col {
    position: static;
  }
}

/* İstatistik Sayfası Kontrolleri */
.dashboard-controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
  border-bottom: 1px solid var(--color-line);
  padding-bottom: 14px;
}

.dashboard-section-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
  color: white;
}

/* Çoğalt / Kopyala Butonu */
.actions .copy-btn {
  background: rgba(56, 189, 248, 0.12);
  border-color: #38bdf8;
  color: #38bdf8;
}

.actions .copy-btn:hover {
  background: rgba(56, 189, 248, 0.25);
  border-color: #0ea5e9;
  color: #38bdf8;
}

/* GÖRSEL GALERİ YÖNETİCİSİ */
.gallery-visual-manager {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gallery-thumbs-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.visual-thumb-card {
  width: 90px;
  height: 90px;
  border-radius: 8px;
  border: 1.5px solid var(--color-line);
  background: #090b11;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.visual-thumb-card img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.visual-thumb-card:hover {
  border-color: var(--color-volt);
  box-shadow: 0 0 10px rgba(68, 214, 44, 0.2);
}

.visual-thumb-hover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.72rem;
  font-weight: 700;
  opacity: 0;
  transition: opacity 0.2s;
}

.visual-thumb-card:hover .visual-thumb-hover {
  opacity: 1;
}

.visual-thumb-add-card {
  width: 90px;
  height: 90px;
  border-radius: 8px;
  border: 1.5px dashed var(--color-line);
  background: rgba(255, 255, 255, 0.02);
  color: var(--color-slate);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.visual-thumb-add-card:hover {
  border-color: var(--color-volt);
  color: var(--color-volt);
  background: rgba(68, 214, 44, 0.05);
}

.gallery-inline-form {
  padding: 16px;
  background: #11141e;
  border: 1px solid var(--color-line);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.editing-card-border {
  border-color: var(--color-volt) !important;
  box-shadow: 0 0 12px rgba(68, 214, 44, 0.15) !important;
}

.inline-input-group {
  display: flex;
  gap: 8px;
}

.inline-input-group input {
  flex: 1;
  padding: 8px 12px;
}

.inline-input-group button {
  padding: 8px 14px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  border-radius: var(--radius-sm);
  border: none;
  transition: all 0.2s ease;
}

.inline-input-group .cancel-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
}

.inline-input-group .cancel-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.inline-input-group .danger-btn {
  background: var(--color-danger);
  color: white;
}

.inline-input-group .danger-btn:hover {
  background: #e03d4f;
  box-shadow: 0 0 10px rgba(255, 71, 87, 0.3);
}

.btn-sm {
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumb-zoom-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
  z-index: 5;
}

.visual-thumb-card:hover .thumb-zoom-btn {
  opacity: 1;
}

.thumb-zoom-btn:hover {
  background: var(--color-volt);
  color: black;
  border-color: var(--color-volt);
  transform: scale(1.1);
}

/* SİPARİŞ DURUM ROZETLERİ */
.status-select-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
  border: 1px solid transparent;
  cursor: pointer;
  outline: none;
  width: auto;
  text-transform: capitalize;
  transition: all 0.2s ease;
}

.status-select-badge:focus {
  box-shadow: none;
}

.status-select-beklemede, .status-badge-beklemede {
  background: rgba(245, 158, 11, 0.15) !important;
  color: #f59e0b !important;
  border-color: rgba(245, 158, 11, 0.3) !important;
}

.status-select-hazirlaniyor, .status-badge-hazirlaniyor {
  background: rgba(56, 189, 248, 0.15) !important;
  color: #38bdf8 !important;
  border-color: rgba(56, 189, 248, 0.3) !important;
}

.status-select-kargoda, .status-badge-kargoda {
  background: rgba(168, 85, 247, 0.15) !important;
  color: #a855f7 !important;
  border-color: rgba(168, 85, 247, 0.3) !important;
}

.status-select-tamamlandi, .status-badge-tamamlandi {
  background: rgba(68, 214, 44, 0.15) !important;
  color: var(--color-success) !important;
  border-color: rgba(68, 214, 44, 0.3) !important;
}

.status-select-iptal, .status-badge-iptal {
  background: rgba(255, 71, 87, 0.15) !important;
  color: var(--color-danger) !important;
  border-color: rgba(255, 71, 87, 0.3) !important;
}

/* SİPARİŞ DETAY MODALI CSS */
.order-details-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(5, 5, 8, 0.85);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.order-details-modal-content {
  width: 100%;
  max-width: 650px;
  background: #11141e;
  border: 1px solid var(--color-line);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 12px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-line);
  padding: 16px 20px;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: white;
}

.modal-close-btn {
  background: transparent;
  border: none;
  color: var(--color-slate);
  font-size: 1.6rem;
  cursor: pointer;
  line-height: 1;
}

.modal-close-btn:hover {
  color: white;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.modal-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--color-line);
  padding: 16px;
  border-radius: var(--radius-sm);
}

.info-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-group strong {
  font-size: 0.8rem;
  color: var(--color-slate);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.info-group p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-ink);
}

.info-group .email-sub, .info-group .address-sub {
  font-size: 0.78rem;
  color: var(--color-slate);
}

.color-volt-text {
  color: var(--color-volt);
}

.status-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 0.9rem;
}

.status-display-badge {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Modal Ürünler Tablosu */
.items-title {
  font-size: 1rem;
  margin: 0 0 12px 0;
  border-bottom: 1px solid var(--color-line);
  padding-bottom: 8px;
  color: white;
}

.order-items-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 250px;
  overflow-y: auto;
  padding-right: 6px;
}

.order-item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--color-line);
  padding: 10px;
  border-radius: 6px;
}

.order-item-thumb {
  width: 50px;
  height: 50px;
  object-fit: contain;
  background: #090b11;
  border-radius: 4px;
  border: 1px solid var(--color-line);
}

.order-item-details {
  flex: 1;
}

.order-item-details h5 {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: white;
}

.order-item-price-qty {
  margin: 4px 0 0 0;
  font-size: 0.78rem;
  color: var(--color-slate);
  font-family: var(--font-mono);
}

.order-item-subtotal {
  font-family: var(--font-mono);
  font-weight: 700;
  color: white;
  font-size: 0.88rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--color-line);
  padding: 14px 20px;
}

.actions .detail-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--color-line);
  color: white;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.actions .detail-btn:hover {
  background: rgba(68, 214, 44, 0.15);
  border-color: var(--color-volt);
  color: var(--color-volt);
}

.empty-table-msg {
  text-align: center;
  padding: 24px !important;
  color: var(--color-slate);
  font-style: italic;
}

/* DASHBOARD ALT BİLGİ ALANI CSS */
.dashboard-bottom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px;
}

.bottom-card {
  display: flex;
  flex-direction: column;
}

.bottom-card-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  color: white;
}

.bottom-card-sub {
  font-size: 0.8rem;
  color: var(--color-slate);
  margin: 4px 0 16px 0;
}

.empty-list-msg {
  font-size: 0.85rem;
  color: var(--color-slate);
  font-style: italic;
  padding: 24px;
  text-align: center;
  background: rgba(255, 255, 255, 0.01);
  border: 1px dashed var(--color-line);
  border-radius: var(--radius-sm);
  margin: auto 0;
}

/* En Çok Satan Ürünler Satırı */
.top-products-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.top-product-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--color-line);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.top-product-row:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.15);
}

.top-product-rank {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-slate);
}

.top-product-rank.rank-1 {
  background: #f59e0b;
  color: black;
}
.top-product-rank.rank-2 {
  background: #94a3b8;
  color: black;
}
.top-product-rank.rank-3 {
  background: #b45309;
  color: white;
}

.top-product-img {
  width: 42px;
  height: 42px;
  object-fit: contain;
  background: #090b11;
  border-radius: 4px;
  border: 1px solid var(--color-line);
}

.top-product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.top-product-brand {
  font-size: 0.72rem;
  color: var(--color-slate);
  text-transform: uppercase;
}

.top-product-name {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: white;
}

.top-product-stats {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-count {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-volt);
}

.stat-rev {
  font-size: 0.78rem;
  color: var(--color-slate);
  font-family: var(--font-mono);
}

/* Son Siparişler Akışı Satırı */
.recent-orders-flow {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recent-order-flow-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--color-line);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.recent-order-flow-row:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--color-volt);
  box-shadow: 0 0 10px rgba(68, 214, 44, 0.1);
}

.recent-order-badge-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}

.recent-order-status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.recent-order-flow-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.flow-header-row, .flow-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.flow-header-row strong {
  color: white;
}

.flow-time {
  font-size: 0.75rem;
  color: var(--color-slate);
}

.flow-footer-row span {
  font-size: 0.78rem;
  color: var(--color-slate);
}
</style>