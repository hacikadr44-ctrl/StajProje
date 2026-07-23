<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api/axios'
import ProductCard from '../components/ProductCard.vue'

const route = useRoute()
const router = useRouter()

// ---- VERİ & FİLTRELEME DEĞİŞKENLERİ ----
const products = ref([])
const featuredProducts = ref([])
const categories = ref([])
const filterOptions = ref({ brands: [], minPrice: 0, maxPrice: 0 })

const search = ref('')
const selectedCategory = ref('')
const selectedBrand = ref('')
const minPrice = ref('')
const maxPrice = ref('')
const loading = ref(true)
const currentPage = ref(1)
const itemsPerPage = 28

const categoryIcons = {
  'Telefon': '📱',
  'Laptop': '💻',
  'Monitör': '🖥️',
  'Akıllı Saat': '⌚',
  'Mouse': '🖱️',
  'Klavye': '⌨️',
  'Oyun': '🎮',
  'Kamera': '📷',
  'Drone': '🚁',
  'Ses': '🔊',
  'Depolama': '💾',
  'Kulaklık': '🎧',
  'Televizyon': '📺',
}

function getCategoryIcon(name) {
  return categoryIcons[name] || '📦'
}

// ---- URL İLE STATE SENKRONİZASYONU ----
let isSyncing = false

function syncFromRoute() {
  isSyncing = true
  search.value = route.query.search || ''
  selectedCategory.value = route.query.categoryId ? Number(route.query.categoryId) : ''
  selectedBrand.value = route.query.brand || ''
  minPrice.value = route.query.minPrice || ''
  maxPrice.value = route.query.maxPrice || ''
  currentPage.value = route.query.page ? Number(route.query.page) : 1
  setTimeout(() => { isSyncing = false }, 50)
}

watch(() => route.query, () => {
  syncFromRoute()
}, { deep: true })

function updateQueryParams(resetPage = false) {
  const query = { ...route.query }

  if (resetPage) {
    currentPage.value = 1
    delete query.page
  } else if (currentPage.value > 1) {
    query.page = currentPage.value
  } else {
    delete query.page
  }

  if (search.value) query.search = search.value
  else delete query.search

  if (selectedCategory.value) query.categoryId = selectedCategory.value
  else delete query.categoryId

  if (selectedBrand.value) query.brand = selectedBrand.value
  else delete query.brand

  if (minPrice.value) query.minPrice = minPrice.value
  else delete query.minPrice

  if (maxPrice.value) query.maxPrice = maxPrice.value
  else delete query.maxPrice

  router.replace({ query })
}

// ---- FİLTRELENMİŞ ÜRÜNLER ----
const filteredProducts = computed(() => {
  return products.value.filter((p) => {
    // 1. Arama Filtresi (Çoklu kelime & Türkçe harf duyarlı arama)
    if (search.value && search.value.trim() !== '') {
      const q = search.value.trim().toLowerCase()
      const qTr = search.value.trim().toLocaleLowerCase('tr-TR')

      const nameStr = (p.name || '') + ' ' + (p.name || '').toLocaleLowerCase('tr-TR')
      const brandStr = (p.brand || '') + ' ' + (p.brand || '').toLocaleLowerCase('tr-TR')
      const descStr = (p.description || '') + ' ' + (p.description || '').toLocaleLowerCase('tr-TR')

      const searchTerms = q.split(/\s+/).concat(qTr.split(/\s+/))
      const match = searchTerms.some(term => 
        nameStr.toLowerCase().includes(term) ||
        brandStr.toLowerCase().includes(term) ||
        descStr.toLowerCase().includes(term)
      )

      if (!match) return false
    }

    // 2. Kategori Filtresi
    if (selectedCategory.value) {
      if (Number(p.categoryId) !== Number(selectedCategory.value)) return false
    }

    // 3. Marka Filtresi
    if (selectedBrand.value) {
      if (p.brand !== selectedBrand.value) return false
    }

    // 4. Fiyat Aralığı Filtresi
    const price = Number(p.price) || 0
    if (minPrice.value !== '' && minPrice.value !== null) {
      if (price < Number(minPrice.value)) return false
    }
    if (maxPrice.value !== '' && maxPrice.value !== null) {
      if (price > Number(maxPrice.value)) return false
    }

    return true
  })
})

// ---- SAYFALAMA ----
const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredProducts.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredProducts.value.length / itemsPerPage) || 1
})

function changePage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  updateQueryParams(false)

  const target = document.querySelector('.filters') || document.querySelector('#kampanyalar')
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' })
  }
}

// ---- API ÇAĞRILARI ----
async function fetchCategories() {
  try {
    const res = await api.get('/categories')
    categories.value = res.data
  } catch (err) {
    console.error('Kategoriler çekilirken hata oluştu:', err)
  }
}

async function fetchFilterOptions() {
  try {
    const res = await api.get('/products/filters')
    filterOptions.value = res.data
  } catch (err) {
    console.error('Filtre seçenekleri çekilirken hata oluştu:', err)
  }
}

async function fetchFeatured() {
  try {
    const res = await api.get('/products/featured')
    featuredProducts.value = res.data
  } catch (err) {
    console.error('Öne çıkan ürünler çekilirken hata oluştu:', err)
  }
}

async function fetchProducts() {
  loading.value = true
  try {
    const res = await api.get('/products')
    products.value = res.data
  } catch (err) {
    console.error('Ürünler çekilirken hata oluştu:', err)
  } finally {
    loading.value = false
  }
}

function selectCategory(catId) {
  if (selectedCategory.value === catId) {
    selectedCategory.value = ''
  } else {
    selectedCategory.value = catId
  }
  const el = document.getElementById('kampanyalar')
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

function clearFilters() {
  search.value = ''
  selectedCategory.value = ''
  selectedBrand.value = ''
  minPrice.value = ''
  maxPrice.value = ''
  currentPage.value = 1
  router.replace({ query: {} })
}

// ---- ÜRÜNLERİ KATEGORİYE GÖRE GRUPLAMA ----
const productsByCategory = computed(() => {
  const map = {}
  for (const p of products.value) {
    if (!map[p.categoryId]) map[p.categoryId] = []
    map[p.categoryId].push(p)
  }
  return map
})

// ---- BANNER SLIDER ----
const currentSlide = ref(0)
let autoSlideInterval = null

const heroSlides = ref([
  {
    id: 1,
    title: 'MSI PRO Z890-A WIFI',
    description: 'Yeni nesil Intel LGA 1851 soket, DDR5 ve Wi-Fi 7 teknolojisi.',
    badge: 'Anakart & Donanım',
    image: '/hero-banners/pro-z890-a-wifi.png',
    productName: 'MSI PRO Z890-A WIFI'
  },
  {
    id: 2,
    title: 'Autel Robotics EVO Max 4N',
    description: 'Gece görüş kamerası, 48MP sensör ve 42 dakika uçuş süresi.',
    badge: 'Drone & Hava Fotoğrafçılığı',
    image: '/hero-banners/robotics-evo-max-4n.png',
    productName: 'Autel Robotics EVO Max 4N'
  },
  {
    id: 3,
    title: 'LG XBOOM CK43 Ses Sistemi',
    description: '300W RMS güç, derin baslar ve CD/Bluetooth bağlantısı.',
    badge: 'Ses & Hi-Fi',
    image: '/hero-banners/ck43-x-boom.png',
    productName: 'LG XBOOM CK43'
  },
  {
    id: 4,
    title: 'Insta360 X4 Aksiyon Kamerası',
    description: '8K 360° video kaydı ve FlowState sarsıntısız çekim.',
    badge: 'Aksiyon & Çekim',
    image: '/hero-banners/x4-air-bundle.png',
    productName: 'Insta360 X4 Aksiyon Kamerası'
  },
  {
    id: 5,
    title: 'LG QNED MiniLED 86" TV',
    description: 'Devasa 86 inç Mini LED ekran, α7 AI Gen7 işlemci ve Dolby Atmos.',
    badge: 'Televizyon & Ev Sineması',
    image: '/hero-banners/lg-65qned87b6a.png',
    productName: 'LG QNED MiniLED 86" TV'
  },
  {
    id: 6,
    title: 'ASUS ZenScreen Fold OLED',
    description: 'Katlanabilir 17.3 inç OLED taşınabilir monitör teknolojisi.',
    badge: 'Monitör & Ekran',
    image: '/hero-banners/zenscreen-fold.png',
    productName: 'ASUS ZenScreen Fold OLED'
  },
  {
    id: 7,
    title: 'Mercury V60 Pro HE',
    description: 'Şeffaf tasarım, manyetik Hall Effect tuşlar ile özel mekanik klavye.',
    badge: 'Klavye & Ekipman',
    image: '/hero-banners/mercury-v60-pro.png',
    productName: 'Mercury V60 Pro HE'
  },
  {
    id: 8,
    title: 'Razer Basilisk V3 Pro 35K',
    description: 'Focus Pro 35K sensör, HyperScroll çark ve 13 programlanabilir tuş.',
    badge: 'Mouse & Gaming',
    image: '/hero-banners/basilisk-v3-pro.png',
    productName: 'Razer Basilisk V3 Pro 35K'
  },
  {
    id: 9,
    title: 'Apple Watch Series 10',
    description: 'En ince Apple Watch tasarımı, 46mm OLED ekran ve uyku apnesi algılama.',
    badge: 'Akıllı Saat',
    image: '/hero-banners/watch-series-10.png',
    productName: 'Apple Watch Series 10'
  },
  {
    id: 10,
    title: 'Acer Nitro V15 Oyuncu Laptopu',
    description: 'RTX 4060 ekran kartı, Intel i7 işlemci ve 144Hz IPS ekran.',
    badge: 'Laptop & Bilgisayar',
    image: '/hero-banners/nitro-v15.png',
    productName: 'Acer Nitro V15'
  },
  {
    id: 11,
    title: 'OPPO Find X8 Pro',
    description: 'Hasselblad kamera sistemi, Dimensity 9400 ve 5910 mAh dev batarya.',
    badge: 'Telefon & Mobil',
    image: '/hero-banners/find-x9-pro.png',
    productName: 'OPPO Find X8 Pro'
  },
  {
    id: 12,
    title: 'My Arcade Atari Retro Konsol',
    description: '200+ nostaljik klasik atari oyunu ve HDMI 720p çıkış.',
    badge: 'Retro Gaming',
    image: '/hero-banners/gamestation-atari.png',
    productName: 'My Arcade Atari Retro Konsol'
  },
  {
    id: 13,
    title: 'Sony WH-1000XM5 Kulaklık',
    description: 'Sektör lideri gürültü engelleme, 30 saat pil ve LDAC Hi-Res ses.',
    badge: 'Kulaklık & Ses',
    image: '/hero-banners/wh-1000xm5.png',
    productName: 'Sony WH-1000XM5'
  }
])

function goToSlideTarget(slide) {
  const matchedProduct = products.value.find((p) => p.name === slide.productName)
  if (matchedProduct) {
    router.push(`/urun/${matchedProduct.id}`)
  } else {
    router.push({ path: '/', hash: '#kampanyalar' })
  }
}

const nextSlide = () => {
  currentSlide.value = (currentSlide.value + 1) % heroSlides.value.length
}
const prevSlide = () => {
  currentSlide.value = (currentSlide.value - 1 + heroSlides.value.length) % heroSlides.value.length
}
const goToSlide = (index) => {
  currentSlide.value = index
}

function startHeroRotation() {
  autoSlideInterval = setInterval(nextSlide, 5000)
}
function stopHeroRotation() {
  if (autoSlideInterval) clearInterval(autoSlideInterval)
}

// ---- HAFTANIN FIRSATI ----
const dealProduct = computed(() => products.value.find((p) => p.originalPrice) || null)

// ---- EN ÇOK SATANLAR ----
const bestSellers = computed(() => {
  const seconds = Object.values(productsByCategory.value).map((arr) => arr[1]).filter(Boolean)
  return seconds.slice(0, 6)
})

// ---- GERİ SAYIM ----
const countdown = ref({ h: 5, m: 59, s: 59 })
let countdownEndsAt = Date.now() + 6 * 60 * 60 * 1000
let countdownTimer = null

function tickCountdown() {
  const diff = Math.max(0, countdownEndsAt - Date.now())
  countdown.value = {
    h: Math.floor(diff / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  }
}
function pad(n) {
  return String(n).padStart(2, '0')
}

onMounted(() => {
  syncFromRoute()
  fetchCategories()
  fetchFilterOptions()
  fetchFeatured()
  fetchProducts()
  startHeroRotation()
  tickCountdown()
  countdownTimer = setInterval(tickCountdown, 1000)
})

onUnmounted(() => {
  stopHeroRotation()
  clearInterval(countdownTimer)
})

let debounceTimer
watch([search, selectedCategory, selectedBrand, minPrice, maxPrice], () => {
  if (isSyncing) return
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    updateQueryParams(true)
  }, 300)
})

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
  <div class="home-page-container">
    <!-- ============ HERO SLIDER ============ -->
    <section class="hero-full-container">
      <div class="hero-slider-wrapper">
        <div 
          class="slider-track" 
          :style="{ transform: `translateX(-${currentSlide * 100}%)` }"
        >
          <div 
            v-for="slide in heroSlides" 
            :key="slide.id" 
            class="slide-item"
          >
            <!-- Arka Plan Yarı Şeffaf Görsel -->
            <div class="slide-bg-image" :style="{ backgroundImage: `url(${slide.image})` }"></div>

            <div class="slide-overlay">
              <div class="banner-content-center">
                <span class="hero-badge">{{ slide.badge }}</span>
                <h1 class="hero-title">{{ slide.title }}</h1>
                <p class="hero-sub">{{ slide.description }}</p>

                <button class="btn-itopya-examine" @click="goToSlideTarget(slide)">
                  İncele & Satın Al →
                </button>
              </div>
            </div>
          </div>
        </div>

        <button class="slider-arrow prev" @click="prevSlide" aria-label="Önceki">❮</button>
        <button class="slider-arrow next" @click="nextSlide" aria-label="Sonraki">❯</button>

        <div class="slider-dots">
          <button
            v-for="(slide, i) in heroSlides"
            :key="'dot-' + slide.id"
            class="slider-dot"
            :class="{ active: i === currentSlide }"
            @click="goToSlide(i)"
          ></button>
        </div>
      </div>
    </section>

    <!-- ============ 13 KATEGORİ GRID SHOWCASE ============ -->
    <section class="category-grid-section">
      <div class="section-heading">
        <h2>Kategoriler</h2>
        <span class="eyebrow">13 Teknoloji Kategorisi</span>
      </div>
      <div class="categories-grid">
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="category-card"
          :class="{ active: selectedCategory === cat.id }"
          @click="selectCategory(cat.id)"
        >
          <span class="cat-card-icon">{{ getCategoryIcon(cat.name) }}</span>
          <span class="cat-card-title">{{ cat.name }}</span>
          <span class="cat-card-count">10 Ürün</span>
        </div>
      </div>
    </section>

    <!-- ============ ALT TARAF: 2 EŞİT PARÇA KARTLAR ============ -->
    <section class="hero-bottom-cards">
      <a href="#kampanyalar" class="promo-card-wide">
        <div class="promo-info">
          <span class="promo-eyebrow">KAMPANYA</span>
          <strong>%25'e Varan İndirimler</strong>
          <p>Seçili teknoloji ürünlerinde geçerli özel fırsatları kaçırmayın.</p>
        </div>
        <span class="promo-link">Alışverişe Başla →</span>
      </a>

      <RouterLink v-if="dealProduct" :to="`/urun/${dealProduct.id}`" class="deal-card-wide">
        <div class="deal-header">
          <span class="promo-eyebrow deal-eyebrow">HAFTANIN FIRSATI</span>
          <p class="deal-name">{{ dealProduct.name }}</p>
          <p class="deal-price">
            {{ Number(dealProduct.price).toFixed(2) }} TL
            <span v-if="dealProduct.originalPrice" class="deal-old">
              {{ Number(dealProduct.originalPrice).toFixed(2) }} TL
            </span>
          </p>
        </div>
        <div class="deal-img-box">
          <img :src="dealProduct.imageUrl" :alt="dealProduct.name" />
        </div>
      </RouterLink>
    </section>

    <!-- ============ GÜVEN ROZETLERİ ============ -->
    <section class="trust-row">
      <div class="trust-item"><span class="trust-icon">🚚</span><div><strong>Ücretsiz Kargo</strong><p>750 TL üzeri alışverişlerde</p></div></div>
      <div class="trust-item"><span class="trust-icon">⚡</span><div><strong>Hızlı Teslimat</strong><p>Aynı gün kargo imkanı</p></div></div>
      <div class="trust-item"><span class="trust-icon">🔒</span><div><strong>Güvenli Ödeme</strong><p>256-bit SSL ile korumalı</p></div></div>
      <div class="trust-item"><span class="trust-icon">↩️</span><div><strong>Kolay İade</strong><p>14 gün içinde iade hakkı</p></div></div>
      <div class="trust-item"><span class="trust-icon">🎧</span><div><strong>7/24 Destek</strong><p>Canlı destek hizmeti</p></div></div>
    </section>

    <!-- ============ ÖNE ÇIKANLAR + EN ÇOK SATANLAR ============ -->
    <section class="section-block">
      <div class="featured-row">
        <div class="featured-main tracking-light-box" @mousemove="updateMouseTracking">
          <div class="light-beam"></div>
          <div class="mouse-glow"></div>
          <div class="light-content featured-content-inner">
            <div class="section-heading tracking-heading">
              <div class="heading-title-group">
                <span class="tracking-pulse-dot"></span>
                <h2>Öne Çıkan Ürünler</h2>
              </div>
              <span class="countdown eyebrow">
                Kampanya bitimine: {{ pad(countdown.h) }}:{{ pad(countdown.m) }}:{{ pad(countdown.s) }}
              </span>
            </div>
            <div class="grid">
              <ProductCard v-for="product in featuredProducts" :key="'f-' + product.id" :product="product" />
            </div>
          </div>
        </div>

        <aside class="bestsellers tracking-light-box" @mousemove="updateMouseTracking">
          <div class="light-beam"></div>
          <div class="mouse-glow"></div>
          <div class="light-content bestsellers-content-inner">
            <div class="section-heading"><h2>En Çok Satanlar</h2></div>
            <RouterLink v-for="(p, i) in bestSellers" :key="p.id" :to="`/urun/${p.id}`" class="bestseller-row">
              <span class="rank">{{ i + 1 }}</span>
              <div class="bestseller-img-box">
                <img :src="p.imageUrl" :alt="p.name" />
              </div>
              <div class="bestseller-info">
                <p class="bs-name">{{ p.name }}</p>
                <p class="bs-price price-mono">{{ Number(p.price).toFixed(2) }} TL</p>
              </div>
            </RouterLink>
          </div>
        </aside>
      </div>
    </section>

    <!-- ============ TÜM ÜRÜNLER (Filtreler & Sayfalama) ============ -->
    <section id="kampanyalar" class="section-block">
      <div class="section-heading tracking-light-heading tracking-light-box" @mousemove="updateMouseTracking">
        <div class="light-beam"></div>
        <div class="mouse-glow"></div>
        <div class="light-content heading-content-inner">
          <div class="heading-title-group">
            <span class="tracking-pulse-dot"></span>
            <h2>Tüm Ürünler</h2>
          </div>
          <span class="eyebrow">{{ filteredProducts.length }} ürün</span>
        </div>
      </div>

      <!-- TÜM ÜRÜNLER KISMININ HEMEN ALTINDAKİ ÜRÜN ARAMA ALANI -->
      <div class="filters card tracking-light-box search-filter-container" @mousemove="updateMouseTracking">
        <div class="light-beam"></div>
        <div class="mouse-glow"></div>
        <div class="light-content filters-content-inner">
          <div class="search-input-wrapper tracking-light-input">
            <span class="search-icon-glow">🔍</span>
            <input v-model="search" type="text" placeholder="Ürün, marka veya özellik ara..." class="tracking-search-field" />
          </div>
          <select v-model="selectedCategory" class="tracking-select-field">
            <option value="">Tüm Kategoriler (13)</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ getCategoryIcon(cat.name) }} {{ cat.name }}</option>
          </select>
          <select v-model="selectedBrand" class="tracking-select-field">
            <option value="">Tüm Markalar</option>
            <option v-for="brand in filterOptions.brands" :key="brand" :value="brand">{{ brand }}</option>
          </select>
          <input v-model="minPrice" type="number" :placeholder="`Min TL (${filterOptions.minPrice || 0})`" class="tracking-price-field" />
          <input v-model="maxPrice" type="number" :placeholder="`Max TL (${filterOptions.maxPrice || 0})`" class="tracking-price-field" />
          <button class="clear-btn tracking-clear-btn" @click="clearFilters">Temizle</button>
        </div>
      </div>

      <p v-if="loading" class="loading-text">Ürünler yükleniyor...</p>
      <p v-else-if="filteredProducts.length === 0" class="empty-text">Aramanıza uygun ürün bulunamadı.</p>
      <div v-else>
        <div class="grid">
          <ProductCard v-for="product in paginatedProducts" :key="product.id" :product="product" />
        </div>

        <!-- SAYFALAMA GEÇİŞ BUTONLARI -->
        <div v-if="totalPages > 1" class="pagination-container">
          <button 
            :disabled="currentPage === 1" 
            @click="changePage(currentPage - 1)" 
            class="page-btn"
          >
            ← Önceki
          </button>

          <button 
            v-for="page in totalPages" 
            :key="page" 
            @click="changePage(page)"
            class="page-btn"
            :class="{ active: currentPage === page }"
          >
            {{ page }}
          </button>

          <button 
            :disabled="currentPage === totalPages" 
            @click="changePage(currentPage + 1)" 
            class="page-btn"
          >
            Sonraki →
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page-container {
  width: 100%;
  max-width: 1850px;
  margin: 0 auto;
  padding: 0;
}

/* BANNER & SLIDER */
.hero-full-container {
  width: 100vw !important;
  position: relative !important;
  left: 50% !important;
  right: 50% !important;
  margin-left: -50vw !important;
  margin-right: -50vw !important;
  margin-bottom: 24px;
  box-sizing: border-box;
}

.hero-slider-wrapper {
  position: relative;
  width: 100%;
  height: 480px;
  overflow: hidden;
  background: #05070c;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.slider-track {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
}

.slide-item {
  min-width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.slide-bg-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center right;
  background-repeat: no-repeat;
  opacity: 0.45;
  filter: contrast(1.15) brightness(0.9);
  transition: transform 6s ease-out;
}

.slide-item:hover .slide-bg-image {
  transform: scale(1.04);
}

.slide-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg, 
    rgba(5, 7, 12, 0.92) 0%, 
    rgba(5, 7, 12, 0.6) 50%, 
    rgba(5, 7, 12, 0.2) 100%
  );
  display: flex;
  align-items: center;
  padding: 0 8%;
}

.banner-content-center {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  z-index: 2;
  max-width: 650px;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.9);
}

.hero-badge {
  background: var(--color-volt);
  color: #000;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 4px 14px;
  border-radius: 4px;
  margin-bottom: 14px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  box-shadow: 0 0 10px rgba(68, 214, 44, 0.4);
}

.hero-title {
  color: #ffffff;
  font-size: 2.6rem;
  font-weight: 900;
  line-height: 1.2;
  margin: 0 0 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.hero-sub {
  color: #cbd5e1;
  margin: 0 0 24px;
  font-size: 1.05rem;
  font-weight: 500;
  line-height: 1.5;
}

.btn-itopya-examine {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--color-volt);
  color: #0b0f19;
  font-weight: 800;
  font-size: 0.95rem;
  padding: 12px 36px;
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s ease;
  box-shadow: 0 0 20px rgba(68, 214, 44, 0.4);
  cursor: pointer;
  border: none;
}

.btn-itopya-examine:hover {
  background: var(--color-volt-dark);
  transform: translateY(-2px);
}

.slider-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(15, 23, 42, 0.6);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: all 0.3s ease;
  z-index: 10;
  backdrop-filter: blur(4px);
}

.slider-arrow:hover {
  background: var(--color-volt);
  color: #000;
  border-color: var(--color-volt);
}

.slider-arrow.prev { left: 24px; }
.slider-arrow.next { right: 24px; }

.slider-dots {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 10;
}

.slider-dot {
  width: 20px;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.slider-dot.active {
  background-color: var(--color-volt);
  width: 36px;
}

/* KATEGORİ GRID SHOWCASE */
.category-grid-section {
  width: 99%;
  margin: 0 auto 28px;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.category-card {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  padding: 14px 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.category-card:hover {
  border-color: var(--color-volt);
  transform: translateY(-3px);
  background: rgba(68, 214, 44, 0.06);
}

.category-card.active {
  background: rgba(68, 214, 44, 0.15);
  border-color: var(--color-volt);
  box-shadow: 0 0 12px rgba(68, 214, 44, 0.3);
}

.cat-card-icon {
  font-size: 1.8rem;
}

.cat-card-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-ink);
}

.cat-card-count {
  font-size: 0.68rem;
  color: var(--color-slate);
}

/* ALT KARTLAR */
.hero-bottom-cards {
  width: 100vw !important;
  position: relative !important;
  left: 50% !important;
  right: 50% !important;
  margin-left: -50vw !important;
  margin-right: -50vw !important;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  padding: 0 20px;
  margin-bottom: 28px;
  box-sizing: border-box;
}

.promo-card-wide, .deal-card-wide {
  width: 99%;
  box-sizing: border-box;
  border-radius: var(--radius);
  padding: 22px 28px;
  text-decoration: none;
  background: #0b0f19;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.promo-card-wide:hover, .deal-card-wide:hover {
  transform: translateY(-3px);
  border-color: var(--color-volt);
}

.promo-info { max-width: 70%; }

.promo-eyebrow {
  display: block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-volt);
  font-weight: 800;
  margin-bottom: 6px;
}

.promo-card-wide strong {
  display: block;
  font-size: 1.25rem;
  color: #f8fafc;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 6px;
}

.promo-card-wide p {
  margin: 0;
  font-size: 0.85rem;
  color: #94a3b8;
}

.promo-link {
  display: inline-block;
  font-weight: 700;
  font-size: 0.82rem;
  color: #0b0f19;
  background: var(--color-volt);
  padding: 8px 16px;
  border-radius: 4px;
  white-space: nowrap;
}

.deal-header { max-width: 70%; }

.deal-name {
  margin: 4px 0;
  font-size: 0.95rem;
  color: #f8fafc;
  font-weight: 600;
  line-height: 1.3;
}

.deal-price {
  margin: 0;
  font-family: var(--font-mono);
  font-weight: 700;
  color: #44d62c;
  font-size: 1.05rem;
}

.deal-old {
  text-decoration: line-through;
  color: #64748b;
  font-weight: 400;
  font-size: 0.8rem;
  margin-left: 6px;
}

.deal-img-box {
  width: 75px;
  height: 75px;
  background: #1e293b;
  border-radius: var(--radius-sm);
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.deal-img-box img {
  max-width: 99%;
  max-height: 99%;
  object-fit: contain;
}

.trust-row {
  width: 99%;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius);
  padding: 18px;
  margin-bottom: 28px;
  margin-left: auto;
  margin-right: auto;
}
.trust-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.trust-icon { font-size: 1.4rem; }
.trust-item strong { display: block; font-size: 0.85rem; }
.trust-item p { margin: 2px 0 0; font-size: 0.75rem; color: var(--color-slate); }

#kampanyalar { scroll-margin-top: 90px; }
.section-block { width: 99%; margin-bottom: 34px; }
.section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 6px;
}
.section-heading h2 { margin: 0; }
.countdown {
  background: rgba(255, 46, 99, 0.15);
  color: var(--color-ember);
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid rgba(255, 46, 99, 0.2);
}

.featured-row {
  display: grid;
  grid-template-columns: 2.3fr 1fr;
  gap: 20px;
  align-items: start;
}
.bestsellers {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius);
  padding: 16px;
}
.bestseller-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-line);
  text-decoration: none;
  color: inherit;
  transition: background 0.15s;
}
.bestseller-row:hover {
  background: rgba(68, 214, 44, 0.04);
}
.bestseller-row:last-child { border-bottom: none; }
.rank {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--color-slate);
  width: 18px;
}

.bestseller-img-box {
  width: 48px;
  height: 48px;
  background: var(--color-cloud);
  border-radius: var(--radius-sm);
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bestseller-img-box img {
  max-width: 99%;
  max-height: 99%;
  object-fit: contain;
}

.bs-name { margin: 0; font-size: 0.8rem; line-height: 1.3; }
.bs-price { margin: 2px 0 0; font-size: 0.8rem; color: var(--color-ink); }

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}
.filters input, .filters select {
  flex: 1;
  min-width: 140px;
}
.clear-btn {
  background: var(--color-cloud);
  border: 1.5px solid var(--color-line);
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-slate);
  transition: all 0.2s;
}
.clear-btn:hover {
  border-color: var(--color-volt);
  color: var(--color-volt);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 18px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 30px;
}
.page-btn {
  background: var(--color-surface);
  border: 1.5px solid var(--color-line);
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-ink);
  font-weight: 500;
  transition: all 0.2s ease;
}
.page-btn:hover:not(:disabled) {
  background: var(--color-cloud);
  border-color: var(--color-slate);
}
.page-btn.active {
  background: var(--color-volt) !important;
  color: #000000 !important;
  border-color: var(--color-volt) !important;
  font-weight: 700;
}
.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-text, .empty-text {
  text-align: center;
  padding: 40px 0;
  color: var(--color-slate);
}

@media (max-width: 800px) {
  .hero-bottom-cards { grid-template-columns: 1fr; }
  .featured-row { grid-template-columns: 1fr; }
  .hero-title { font-size: 1.8rem; }
  .slider-arrow { display: none; }
  .hero-slider-wrapper { height: 380px; }
  .categories-grid { grid-template-columns: repeat(3, 1fr); }
}

/* ============================================================
   TAKİP EDEN IŞIK (TRACKING LIGHT BORDER BEAM & GLOW EFFECT)
   ============================================================ */
.tracking-light-box {
  position: relative !important;
  z-index: 1 !important;
  border-radius: var(--radius) !important;
  background: var(--color-surface) !important;
  overflow: hidden !important;
  padding: 2px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
}

.tracking-light-box .light-beam {
  position: absolute !important;
  top: -70% !important;
  left: -70% !important;
  width: 240% !important;
  height: 240% !important;
  background: conic-gradient(
    transparent 0deg,
    transparent 260deg,
    rgba(68, 214, 44, 0.3) 290deg,
    #44d62c 325deg,
    #00ffff 348deg,
    #44d62c 360deg
  ) !important;
  animation: spinTrackingLightBeam 3.5s linear infinite !important;
  z-index: 0 !important;
  filter: drop-shadow(0 0 12px rgba(68, 214, 44, 0.9)) !important;
}

.tracking-light-box .mouse-glow {
  position: absolute !important;
  inset: 0 !important;
  border-radius: inherit !important;
  background: radial-gradient(
    320px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    rgba(68, 214, 44, 0.4),
    rgba(0, 255, 255, 0.18) 40%,
    transparent 75%
  ) !important;
  opacity: 0.85 !important;
  transition: opacity 0.3s ease !important;
  pointer-events: none !important;
  z-index: 1 !important;
}

.tracking-light-box .light-content {
  position: relative !important;
  background: #11141e !important;
  border-radius: calc(var(--radius) - 2px) !important;
  z-index: 2 !important;
  width: 100% !important;
  height: 100% !important;
  box-sizing: border-box !important;
}

.featured-content-inner, .bestsellers-content-inner, .filters-content-inner {
  padding: 18px !important;
}

.heading-content-inner {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 14px 22px !important;
}

.tracking-light-heading {
  margin-bottom: 18px !important;
}

.heading-title-group {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
}

.tracking-pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #44d62c;
  box-shadow: 0 0 12px #44d62c, 0 0 20px #44d62c;
  animation: pulseTrackingDot 1.5s infinite alternate;
}

@keyframes pulseTrackingDot {
  0% { transform: scale(0.9); opacity: 0.7; box-shadow: 0 0 6px #44d62c; }
  100% { transform: scale(1.3); opacity: 1; box-shadow: 0 0 16px #44d62c, 0 0 24px #00ffff; }
}

@keyframes spinTrackingLightBeam {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* URUN ARAMA & FILTRE ALANI GÖRSEL IŞIK EFEKTLERİ */
.filters-content-inner {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 12px !important;
  align-items: center !important;
}

.search-input-wrapper {
  position: relative !important;
  flex: 2 !important;
  min-width: 220px !important;
  display: flex !important;
  align-items: center !important;
}

.search-icon-glow {
  position: absolute !important;
  left: 14px !important;
  z-index: 4 !important;
  font-size: 1.1rem !important;
  pointer-events: none !important;
  filter: drop-shadow(0 0 8px #44d62c) !important;
}

.tracking-search-field {
  width: 100% !important;
  padding-left: 44px !important;
  background: rgba(10, 12, 20, 0.85) !important;
  border: 1.5px solid rgba(68, 214, 44, 0.35) !important;
  color: var(--color-ink) !important;
  border-radius: var(--radius-sm) !important;
  transition: all 0.3s ease !important;
  font-size: 0.95rem !important;
}

.tracking-search-field:focus {
  border-color: #44d62c !important;
  background: rgba(15, 20, 32, 0.95) !important;
  box-shadow: 0 0 22px rgba(68, 214, 44, 0.5), inset 0 0 10px rgba(68, 214, 44, 0.15) !important;
}

.tracking-select-field, .tracking-price-field {
  background: rgba(10, 12, 20, 0.85) !important;
  border: 1.5px solid rgba(255, 255, 255, 0.1) !important;
  transition: all 0.3s ease !important;
}

.tracking-select-field:focus, .tracking-price-field:focus {
  border-color: #44d62c !important;
  box-shadow: 0 0 14px rgba(68, 214, 44, 0.35) !important;
}

.tracking-clear-btn {
  background: rgba(68, 214, 44, 0.12) !important;
  border: 1.5px solid rgba(68, 214, 44, 0.45) !important;
  color: #44d62c !important;
  font-weight: 700 !important;
  transition: all 0.25s ease !important;
}

.tracking-clear-btn:hover {
  background: #44d62c !important;
  color: #0b0f19 !important;
  box-shadow: 0 0 18px rgba(68, 214, 44, 0.6) !important;
  transform: translateY(-1px) !important;
}
</style>