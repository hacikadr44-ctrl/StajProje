<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api/axios'
import ProductCard from '../components/ProductCard.vue'
import { formatCurrency } from '../utils/format'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
let timerInterval = null

// ---- VERİ & FİLTRELEME DEĞİŞKENLERİ ----
const products = ref([])
const featuredProducts = ref([])
const categoryOrderList = [
  'Akıllı Saat',
  'Depolama',
  'Drone',
  'Kamera',
  'Klavye',
  'Kulaklık',
  'Laptop',
  'Monitör',
  'Mouse',
  'Oyun',
  'Ses',
  'Telefon',
  'Televizyon'
]

const defaultCategoryList = categoryOrderList.map((name, index) => ({
  id: index + 1,
  name
}))

const categories = ref(defaultCategoryList)

const sortedCategories = computed(() => {
  if (!categories.value || categories.value.length === 0) return defaultCategoryList
  return [...categories.value].sort((a, b) => {
    const ia = categoryOrderList.indexOf(a.name)
    const ib = categoryOrderList.indexOf(b.name)
    if (ia !== -1 && ib !== -1) return ia - ib
    return a.name.localeCompare(b.name)
  })
})
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
  'Telefon': '/icons/categories/telefon.svg',
  'Laptop': '/icons/categories/laptop.svg',
  'Monitör': '/icons/categories/monitor.svg',
  'Akıllı Saat': '/icons/categories/akilli-saat.svg',
  'Mouse': '/icons/categories/mouse.svg',
  'Klavye': '/icons/categories/klavye.svg',
  'Oyun': '/icons/categories/oyun.svg',
  'Kamera': '/icons/categories/kamera.svg',
  'Drone': '/icons/categories/drone.svg',
  'Ses': '/icons/categories/ses.svg',
  'Depolama': '/icons/categories/depolama.svg',
  'Kulaklık': '/icons/categories/kulaklik.svg',
  'Televizyon': '/icons/categories/televizyon.svg',
}

const categoryEmojis = {
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
  return categoryIcons[name] || '/icons/categories/depolama.svg'
}

function getCategoryEmoji(name) {
  return categoryEmojis[name] || '📦'
}

// ---- CUSTOM CATEGORY DROPDOWN STATE ----
const isCategoryDropdownOpen = ref(false)

function getCategoryObj(catId) {
  if (!catId) return null
  return categories.value.find(c => Number(c.id) === Number(catId))
}

function selectCategoryDropdown(catId) {
  selectedCategory.value = catId
  isCategoryDropdownOpen.value = false
}

function handleGlobalClick(e) {
  const dropdown = document.querySelector('.custom-category-dropdown')
  if (dropdown && !dropdown.contains(e.target)) {
    isCategoryDropdownOpen.value = false
  }
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
    if (res.data && res.data.length > 0) {
      categories.value = res.data
    }
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
    title: 'OPPO Find X9 Pro',
    description: 'Hasselblad kamera sistemi, Dimensity 9400 ve 5910 mAh dev batarya.',
    badge: 'Telefon & Mobil',
    image: '/hero-banners/find-x9-pro.png',
    productName: 'OPPO Find X9 Pro'
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

// ---- SON İNCELENEN ÜRÜNLER (RECENTLY VIEWED) ----
const recentlyViewedProducts = ref([])
const recentlyViewedScrollRef = ref(null)

async function fetchRecentlyViewed() {
  if (!authStore.isLoggedIn) {
    recentlyViewedProducts.value = []
    return
  }
  try {
    const res = await api.get('/products/viewed')
    recentlyViewedProducts.value = res.data
  } catch (err) {
    console.error('Son incelenen ürünler yüklenemedi:', err)
  }
}

function scrollRecentlyViewed(dir) {
  const el = recentlyViewedScrollRef.value
  if (el) {
    el.scrollBy({ left: dir * 280, behavior: 'smooth' })
  }
}



// ---- DİNAMİK BLOG ÜRÜN EŞLEŞTİRMELERİ ----
const blogProductRehber = computed(() => {
  let prod = products.value.find(p => p.name.toLowerCase().includes('odyssey') || p.name.toLowerCase().includes('ultragear'))
  if (!prod && products.value.length > 0) {
    prod = products.value.find(p => {
      const cat = categories.value.find(c => c.name === 'Monitör')
      return cat && Number(p.categoryId) === Number(cat.id)
    })
  }
  return prod || null
})

const blogProductDonanim = computed(() => {
  let prod = products.value.find(p => p.name.toLowerCase().includes('rog strix') || p.name.toLowerCase().includes('raider') || p.name.toLowerCase().includes('nitro'))
  if (!prod && products.value.length > 0) {
    prod = products.value.find(p => {
      const cat = categories.value.find(c => c.name === 'Laptop')
      return cat && Number(p.categoryId) === Number(cat.id)
    })
  }
  return prod || null
})

const blogProductEkipman = computed(() => {
  let prod = products.value.find(p => p.name.toLowerCase().includes('apex pro') || p.name.toLowerCase().includes('mercury v60') || p.name.toLowerCase().includes('huntsman'))
  if (!prod && products.value.length > 0) {
    prod = products.value.find(p => {
      const cat = categories.value.find(c => c.name === 'Klavye')
      return cat && Number(p.categoryId) === Number(cat.id)
    })
  }
  return prod || null
})


onMounted(() => {
  syncFromRoute()
  fetchCategories()
  fetchFilterOptions()
  fetchFeatured()
  fetchProducts()
  startHeroRotation()
  tickCountdown()
  fetchRecentlyViewed() // Son incelenenleri çek
  countdownTimer = setInterval(tickCountdown, 1000)
  document.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  stopHeroRotation()
  clearInterval(countdownTimer)
  if (timerInterval) {
    clearInterval(timerInterval)
  }
  document.removeEventListener('click', handleGlobalClick)
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

// ---- ŞANS ÇARKLI İNDİRİM SİSTEMİ ----
const showWheelModal = ref(false)
const isSpinning = ref(false)
const wheelRotation = ref(0)
const hasSpun = ref(false)
const wonItem = ref(null)
const couponCopied = ref(false)
const remainingTimeText = ref('')

const wheelItems = [
  { label: '%10 İndirim', code: 'TEKNO10', color: '#ff7675' },
  { label: 'Kargo Bedava', code: 'BEDAVAKARGO', color: '#74b9ff' },
  { label: '%5 İndirim', code: 'TEKNO5', color: '#55efc4' },
  { label: 'Tekrar Dene', code: '', color: '#ffeaa7' },
  { label: '%15 İndirim', code: 'TEKNO15', color: '#a29bfe' },
  { label: 'Sürpriz Hediye', code: 'SURPRIZ', color: '#fd79a8' },
  { label: '%8 İndirim', code: 'TEKNO8', color: '#00cec9' },
  { label: 'Pas', code: '', color: '#fdcb6e' }
]

const checkSpinStatus = () => {
  const lastSpinTime = localStorage.getItem('lastSpinTime')
  const savedCode = localStorage.getItem('wonCouponCode')
  const savedLabel = localStorage.getItem('wonCouponLabel')

  if (lastSpinTime && savedCode) {
    const timeDiff = Date.now() - Number(lastSpinTime)
    const hours24 = 24 * 60 * 60 * 1000
    if (timeDiff < hours24) {
      hasSpun.value = true
      wonItem.value = { code: savedCode, label: savedLabel }
    } else {
      // 24 saat geçti, sıfırla!
      hasSpun.value = false
      wonItem.value = null
      localStorage.removeItem('wonCouponCode')
      localStorage.removeItem('wonCouponLabel')
      localStorage.removeItem('lastSpinTime')
    }
  } else if (savedCode) {
    hasSpun.value = true
    wonItem.value = { code: savedCode, label: savedLabel }
    localStorage.setItem('lastSpinTime', Date.now().toString())
  } else {
    hasSpun.value = false
    wonItem.value = null
  }
}

const updateRemainingTime = () => {
  const lastSpinTime = localStorage.getItem('lastSpinTime')
  if (!lastSpinTime) {
    remainingTimeText.value = ''
    return
  }
  const timeDiff = Date.now() - Number(lastSpinTime)
  const hours24 = 24 * 60 * 60 * 1000
  const remainingMs = hours24 - timeDiff
  if (remainingMs <= 0) {
    remainingTimeText.value = ''
    checkSpinStatus()
    return
  }
  const hours = Math.floor(remainingMs / (1000 * 60 * 60))
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000)
  remainingTimeText.value = `Yeni çevirme hakkına kalan süre: ${hours} sa ${minutes} dk ${seconds} sn`
}

onMounted(() => {
  checkSpinStatus()
})

function openWheelModal() {
  checkSpinStatus()
  updateRemainingTime()
  showWheelModal.value = true
  if (hasSpun.value && !timerInterval) {
    timerInterval = setInterval(updateRemainingTime, 1000)
  }
}

function closeWheelModal() {
  if (isSpinning.value) return // Dönerken kapattırma
  showWheelModal.value = false
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function spinWheel() {
  if (isSpinning.value || hasSpun.value) return
  isSpinning.value = true
  couponCopied.value = false

  // Biased winner index: Pas (7) veya Tekrar Dene (3) gelmesin, hediye gelsin
  const prizeIndices = [0, 1, 2, 4, 5, 6]
  const winnerIdx = prizeIndices[Math.floor(Math.random() * prizeIndices.length)]
  wonItem.value = wheelItems[winnerIdx]

  // Dönüş hesaplama: 5 tam tur (1800 derece) + ilgili dilimin açısı
  const targetRotation = 360 * 5 + (360 - (winnerIdx * 45 + 22.5))
  wheelRotation.value = targetRotation

  setTimeout(() => {
    isSpinning.value = false
    hasSpun.value = true
    
    // Save to LocalStorage to prevent multiple entries
    localStorage.setItem('wonCouponCode', wonItem.value.code)
    localStorage.setItem('wonCouponLabel', wonItem.value.label)
    localStorage.setItem('lastSpinTime', Date.now().toString())

    updateRemainingTime()
    if (showWheelModal.value && !timerInterval) {
      timerInterval = setInterval(updateRemainingTime, 1000)
    }
  }, 4000)
}

function copyCoupon() {
  if (!wonItem.value?.code) return
  navigator.clipboard.writeText(wonItem.value.code)
  couponCopied.value = true
  setTimeout(() => {
    couponCopied.value = false
  }, 2000)
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
          <span class="cat-card-icon"><img :src="getCategoryIcon(cat.name)" :alt="cat.name" class="cat-icon-img" /></span>
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
            {{ formatCurrency(dealProduct.price) }} TL
            <span v-if="dealProduct.originalPrice" class="deal-old">
              {{ formatCurrency(dealProduct.originalPrice) }} TL
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
      <div class="trust-item card-truck">
        <div class="trust-icon-wrapper">
          <svg class="trust-svg-icon" viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg">
            <path style="fill:#B4E66E;" d="M358.614,102.079H50.772c-4.722,0-8.551,3.829-8.551,8.551v179.574h25.653c9.445,0,17.102,7.656,17.102,17.102c0,9.445-7.658,17.102-17.102,17.102H42.221v25.653c0,4.722,3.829,8.551,8.551,8.551h316.393V110.63C367.165,105.908,363.336,102.079,358.614,102.079z"/>
            <path style="fill:#FFDC64;" d="M469.779,238.898H367.165v119.716h136.818v-85.512C503.983,254.212,488.669,238.898,469.779,238.898z"/>
            <path style="fill:#FFC850;" d="M367.165,264.551h92.638c9.446,0,17.102,7.656,17.102,17.102v76.96h-109.74V264.551z"/>
            <path style="fill:#FFDC64;" d="M435.574,136.284h-68.409v34.205h94.063v-8.551C461.228,147.769,449.742,136.284,435.574,136.284z"/>
            <polygon style="fill:#B4E6FF;" points="469.779,238.898 452.676,170.489 367.165,170.489 367.165,238.898"/>
            <path style="fill:#F1F4FB;" d="M469.779,273.102h34.205v34.205h-17.102c-9.446,0-17.102-7.656-17.102-17.102V273.102z"/>
            <path style="fill:#E1A546;" d="M427.023,298.756c-25.772,0-48.194,14.265-59.858,35.317v24.541h127.676C490.624,324.877,461.902,298.756,427.023,298.756z"/>
            <path style="fill:#FFC850;" d="M476.904,320.412v38.202h17.937C493.005,343.925,486.518,330.686,476.904,320.412z"/>
            <circle style="fill:#5B5D6E;" cx="427.023" cy="367.165" r="42.756"/>
            <path style="fill:#9BD6FF;" d="M401.37,196.142h57.72l-6.413-25.653h-85.511v68.409h25.653v-34.205C392.818,199.971,396.647,196.142,401.37,196.142z"/>
            <path style="fill:#A0D755;" d="M144.835,298.756c-21.593,0-40.819,10.028-53.355,25.653H67.875H42.221v25.653c0,4.722,3.829,8.551,8.551,8.551h316.393v-34.205H198.19C185.654,308.784,166.428,298.756,144.835,298.756z"/>
            <circle style="fill:#5B5D6E;" cx="144.835" cy="367.165" r="42.756"/>
            <path d="M476.158,231.363l-13.259-53.035c3.625-0.77,6.345-3.986,6.345-7.839v-8.551c0-18.566-15.105-33.67-33.67-33.67h-60.392V110.63c0-9.136-7.432-16.568-16.568-16.568H50.772c-9.136,0-16.568,7.432-16.568,16.568V256c0,4.427,3.589,8.017,8.017,8.017s8.017-3.589,8.017-8.017V110.63c0-0.295,0.239-0.534,0.534-0.534h307.841c0.295,0,0.534,0.239,0.534,0.534v145.372c0,4.427,3.589,8.017,8.017,8.017c4.427,0,8.017-3.589,8.017-8.017v-9.088h94.569c0.007,0,0.014,0.002,0.021,0.002c0.007,0,0.015-0.001,0.022-0.001c11.637,0.007,21.518,7.646,24.912,18.171h-24.928c-4.427,0-8.017,3.589-8.017,8.017v17.102c0,13.851,11.268,25.119,25.119,25.119h9.086v35.273h-20.962c-6.886-19.882-25.787-34.205-47.982-34.205s-41.097,14.322-47.982,34.205h-3.86v-60.392c0-4.427-3.589-8.017-8.017-8.017c-4.427,0-8.017,3.589-8.017,8.017v60.391H192.817c-6.886-19.883-25.787-34.205-47.982-34.205s-41.097,14.322-47.982,34.205H50.772c-0.295,0-0.534-0.239-0.534-0.534v-17.637h34.739c4.427,0,8.017-3.589,8.017-8.017c0-4.427-3.589-8.017-8.017-8.017H8.017c-4.427,0-8.017,3.589-8.017,8.017c0,4.427,3.589,8.017,8.017,8.017h26.188v17.637c0,9.136,7.432,16.568,16.568,16.568h43.304c-0.002,0.178-0.014,0.355-0.014,0.534c0,27.996,22.777,50.772,50.772,50.772s50.772-22.776,50.772-50.772c0-0.18-0.012-0.356-0.014-0.534h180.67c-0.002,0.178-0.014,0.355-0.014,0.534c0,27.996,22.777,50.772,50.772,50.772c27.995,0,50.772-22.776,50.772-50.772c0-0.18-0.012-0.356-0.014-0.534h26.203c4.427,0,8.017-3.589,8.017-8.017v-85.512C512,251.99,496.423,234.448,476.158,231.363z M375.182,178.505h71.235l13.094,52.376h-84.329V178.505z M435.574,144.301c9.725,0,17.637,7.912,17.637,17.637v0.534h-78.029v-18.171H435.574z M144.835,401.904c-19.155,0-34.739-15.583-34.739-34.739c0-19.156,15.584-34.739,34.739-34.739c19.155,0,34.739,15.583,34.739,34.739C179.574,386.321,163.99,401.904,144.835,401.904z M427.023,401.904c-19.155,0-34.739-15.583-34.739-34.739c0-19.156,15.584-34.739,34.739-34.739c19.155,0,34.739,15.583,34.739,34.739C461.762,386.321,446.178,401.904,427.023,401.904z M486.881,299.29c-5.01,0-9.086-4.076-9.086-9.086v-9.086h18.171v18.171H486.881z"/>
            <path d="M144.835,350.597c-9.136,0-16.568,7.432-16.568,16.568c0,9.136,7.432,16.568,16.568,16.568c9.136,0,16.568-7.432,16.568-16.568C161.403,358.029,153.971,350.597,144.835,350.597z"/>
            <path d="M427.023,350.597c-9.136,0-16.568,7.432-16.568,16.568c0,9.136,7.432,16.568,16.568,16.568s16.568-7.432,16.568-16.568C443.591,358.029,436.159,350.597,427.023,350.597z"/>
            <path d="M205.228,324.409c0,4.427,3.589,8.017,8.017,8.017H332.96c4.427,0,8.017-3.589,8.017-8.017c0-4.427-3.589-8.017-8.017-8.017H213.244C208.817,316.392,205.228,319.982,205.228,324.409z"/>
            <path d="M25.119,298.221h102.614c4.427,0,8.017-3.589,8.017-8.017c0-4.427-3.589-8.017-8.017-8.017H25.119c-4.427,0-8.017,3.589-8.017,8.017C17.102,294.632,20.692,298.221,25.119,298.221z"/>
            <path d="M267.434,173.371l-71.292,71.291l-37.087-37.087c-3.131-3.131-8.207-3.131-11.337,0c-3.131,3.131-3.131,8.206,0,11.337l42.756,42.756c1.565,1.566,3.617,2.348,5.668,2.348s4.103-0.782,5.668-2.348l76.96-76.96c3.131-3.131,3.131-8.206,0-11.337C275.641,170.241,270.564,170.241,267.434,173.371z"/>
          </svg>
        </div>
        <div class="trust-content">
          <strong>Ücretsiz Kargo</strong>
          <p>750 TL üzeri alışverişlerde</p>
        </div>
      </div>
      
      <div class="trust-item card-speed">
        <div class="trust-icon-wrapper">
          <svg class="trust-svg-icon" viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(0 -1028.4)">
              <g>
                <path d="m7 1028.4-5 12h8l-4 10 14-14h-9l6-8z" fill="#f1c40f"/>
                <path fill="#f39c12" d="m7 1028.4-5 12h3l5-12zm3 12-4 10 3-3 4-7z"/>
                <path fill="#e67e22" d="m10 1040.4-0.4062 1h2.9062l0.5-1h-3z"/>
              </g>
            </g>
          </svg>
        </div>
        <div class="trust-content">
          <strong>Hızlı Teslimat</strong>
          <p>Aynı gün kargo imkanı</p>
        </div>
      </div>

      <div class="trust-item card-secure">
        <div class="trust-icon-wrapper">
          <svg class="trust-svg-icon" viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg">
            <path style="fill:#FF6991;" d="M455.111,379.259H18.963C8.489,379.259,0,370.77,0,360.296V75.852c0-10.473,8.489-18.963,18.963-18.963h436.148c10.473,0,18.963,8.489,18.963,18.963v284.444C474.074,370.77,465.585,379.259,455.111,379.259z"/>
            <path style="fill:#FF507D;" d="M379.259,312.889c-20.946,0-37.926,16.98-37.926,37.926v28.444h113.778c10.472,0,18.963-8.491,18.963-18.963v-47.407H379.259z"/>
            <path style="fill:#FFC850;" d="M142.222,199.111H66.37c-5.236,0-9.481-4.245-9.481-9.481v-56.889c0-5.236,4.245-9.481,9.481-9.481h75.852c5.236,0,9.481,4.245,9.481,9.481v56.889C151.704,194.866,147.458,199.111,142.222,199.111z"/>
            <path style="fill:#E4EAF8;" d="M407.704,334.222H56.889c-6.546,0-11.852-5.306-11.852-11.852c0-6.546,5.306-11.852,11.852-11.852h350.815c6.546,0,11.852,5.306,11.852,11.852C419.556,328.916,414.25,334.222,407.704,334.222z"/>
            <path style="fill:#E1A546;" d="M123.259,151.704h-18.963v-28.444H85.333v75.852h18.963v-28.444h18.963c5.236,0,9.481-4.245,9.481-9.481C132.741,155.949,128.495,151.704,123.259,151.704z"/>
            <circle style="fill:#FF507D;" cx="317.63" cy="156.444" r="42.667"/>
            <circle style="fill:#FFC850;" cx="374.519" cy="156.444" r="42.667"/>
            <path style="fill:#FF8C66;" d="M331.852,156.444c0,12.587,5.553,23.784,14.222,31.593c8.67-7.809,14.222-19.007,14.222-31.593c0-12.587-5.553-23.784-14.222-31.593C337.404,132.66,331.852,143.858,331.852,156.444z"/>
            <path style="fill:#E4EAF8;" d="M113.778,277.333H56.889c-6.546,0-11.852-5.306-11.852-11.852s5.306-11.852,11.852-11.852h56.889c6.546,0,11.852,5.306,11.852,11.852S120.324,277.333,113.778,277.333z"/>
            <path style="fill:#E4EAF8;" d="M407.704,277.333h-56.889c-6.546,0-11.852-5.306-11.852-11.852s5.306-11.852,11.852-11.852h56.889c6.546,0,11.852,5.306,11.852,11.852S414.25,277.333,407.704,277.333z"/>
            <path style="fill:#E4EAF8;" d="M309.732,277.333h-56.889c-6.546,0-11.852-5.306-11.852-11.852s5.306-11.852,11.852-11.852h56.889c6.546,0,11.852,5.306,11.852,11.852S316.277,277.333,309.732,277.333z"/>
            <path style="fill:#E4EAF8;" d="M211.75,277.333h-56.889c-6.546,0-11.852-5.306-11.852-11.852s5.306-11.852,11.852-11.852h56.889c6.546,0,11.852,5.306,11.852,11.852S218.297,277.333,211.75,277.333z"/>
            <path style="fill:#D5DCED;" d="M345.307,334.222h62.396c6.546,0,11.852-5.306,11.852-11.852c0-3.982-2.092-7.333-5.103-9.481h-35.193C364.294,312.889,351.476,321.632,345.307,334.222z"/>
            <path style="fill:#E1A546;" d="M502.519,341.333h-18.963v-56.889c0-26.139-21.268-47.407-47.407-47.407s-47.407,21.268-47.407,47.407v56.889h-18.963v-56.889c0-36.593,29.778-66.37,66.37-66.37s66.37,29.778,66.37,66.37V341.333z"/>
            <path style="fill:#FFDC64;" d="M493.037,455.111H379.259c-10.474,0-18.963-8.489-18.963-18.963v-85.333c0-10.473,8.489-18.963,18.963-18.963h113.778c10.473,0,18.963,8.489,18.963,18.963v85.333C512,446.622,503.511,455.111,493.037,455.111z"/>
            <path style="fill:#464655;" d="M455.111,384c0-10.473-8.491-18.963-18.963-18.963c-10.472,0-18.963,8.489-18.963,18.963c0,7.001,3.838,13.048,9.481,16.333v10.271c0,5.241,4.241,9.481,9.482,9.481c5.241,0,9.481-4.241,9.481-9.481v-10.271C451.273,397.048,455.111,391.001,455.111,384z"/>
            <path style="fill:#FFC850;" d="M398.222,398.222v-66.37h-18.963c-10.474,0-18.963,8.489-18.963,18.963v85.333c0,10.473,8.489,18.963,18.963,18.963h113.778c10.472,0,18.963-8.491,18.963-18.963h-75.852C415.202,436.148,398.222,419.168,398.222,398.222z"/>
          </svg>
        </div>
        <div class="trust-content">
          <strong>Güvenli Ödeme</strong>
          <p>256-bit SSL ile korumalı</p>
        </div>
      </div>

      <div class="trust-item card-refund">
        <div class="trust-icon-wrapper">
          <svg class="trust-svg-icon" viewBox="0 0 300.005 300.005" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            <g>
              <g>
                <path d="M150,0C67.159,0,0.002,67.159,0.002,150c0,82.838,67.157,150.005,149.997,150.005S300.003,232.841,300.003,150 C300,67.159,232.841,0,150,0z M235.661,168.822c-6.756,42.93-43.939,73.662-86.101,73.662c-4.487,0-9.028-0.35-13.598-1.066 c-47.497-7.485-80.063-52.215-72.593-99.707c3.621-23.011,15.985-43.236,34.814-56.946c16.21-11.801,35.538-17.543,55.286-16.607 l-14.527-13.834l9.521-9.991l22.29,21.239l0.005-0.003l9.97,9.513l-9.513,9.991l-0.005-0.008l-21.237,22.295l-9.98-9.521 l13.456-14.112c-16.457-0.934-32.605,3.789-46.107,13.619c-15.471,11.264-25.628,27.879-28.603,46.784 c-6.134,39.019,20.622,75.768,59.643,81.915c39.019,6.131,75.765-20.617,81.904-59.641c4.054-25.76-6.225-51.72-26.834-67.751 l9.56-12.281C228.083,105.877,240.595,137.47,235.661,168.822z M121.096,175.443l-0.511-1.196l12.823-5.436l0.506,1.198 c2.039,4.84,9.088,8.489,16.394,8.489c3.284,0,13.995-0.599,13.995-8.339c0-4.054-4.58-6.481-14.415-7.641 c-11.036-1.237-26.162-2.928-26.162-19.587c0-10.214,7.641-17.354,20.508-19.255v-7.851h13.821v7.885 c5.973,1.05,13.855,3.652,18.251,12.644l0.584,1.19l-11.804,5.46l-0.597-0.993c-2.067-3.413-8.147-6.092-13.834-6.092 c-3.836,0-12.755,0.685-12.755,7.011c0,4.547,5.747,5.594,13.264,6.494c11.752,1.447,27.84,3.429,27.84,20.733 c0,12.735-10.328,19.439-20.946,20.627v8.953H144.24v-8.523C133.09,189.903,124.893,184.329,121.096,175.443z"/>
              </g>
            </g>
          </svg>
        </div>
        <div class="trust-content">
          <strong>Kolay İade</strong>
          <p>14 gün içinde iade hakkı</p>
        </div>
      </div>

      <div class="trust-item card-support">
        <div class="trust-icon-wrapper">
          <svg class="trust-svg-icon" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            <path d="M16,2C9.4,2,4,7.3,4,13.9v3.5c0,0.1,0,0.1,0,0.2c0,0.1,0,0.3,0,0.4c0,2.8,2.2,5,5,5c0.6,0,1-0.4,1-1v-8c0-0.6-0.4-1-1-1 c-1.1,0-2.2,0.4-3,1v-0.2C6,8.4,10.5,4,16,4s10,4.4,10,9.9V14c-0.8-0.6-1.9-1-3-1c-0.6,0-1,0.4-1,1v8c0,0.6,0.4,1,1,1 c0.7,0,1.4-0.2,2-0.4c-1,2.1-2.8,3.7-5,4.6c0-0.1,0-0.1,0-0.2c0-0.6-0.4-1-1-1h-3c-0.6,0-1,0.4-1,1v2c0,0.6,0.4,1,1,1 c6.6,0,12-5.2,12-11.6v-1V15v-1.1C28,7.3,22.6,2,16,2z"/>
          </svg>
        </div>
        <div class="trust-content">
          <strong>7/24 Destek</strong>
          <p>Canlı destek hizmeti</p>
        </div>
      </div>
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
                <p class="bs-price price-mono">{{ formatCurrency(p.price) }} TL</p>
              </div>
            </RouterLink>
          </div>
        </aside>
      </div>
    </section>

    <!-- ============ SON İNCELENEN ÜRÜNLER (Recently Viewed) ============ -->
    <section v-if="authStore.isLoggedIn && recentlyViewedProducts.length > 0" class="section-block recently-viewed-block">
      <div class="section-heading tracking-light-heading tracking-light-box" @mousemove="updateMouseTracking">
        <div class="light-beam"></div>
        <div class="mouse-glow"></div>
        <div class="light-content heading-content-inner recently-viewed-header">
          <div class="heading-title-group">
            <span class="tracking-pulse-dot" style="background: var(--color-success);"></span>
            <h2>Son İncelediğiniz Ürünler</h2>
          </div>
          <div class="rv-carousel-nav" v-if="recentlyViewedProducts.length > 4">
            <button class="rv-carousel-btn" @click="scrollRecentlyViewed(-1)">‹</button>
            <button class="rv-carousel-btn" @click="scrollRecentlyViewed(1)">›</button>
          </div>
        </div>
      </div>
      <div class="recently-viewed-carousel" ref="recentlyViewedScrollRef">
        <ProductCard 
          v-for="product in recentlyViewedProducts" 
          :key="'r-' + product.id" 
          :product="product" 
          class="recently-viewed-card" 
        />
      </div>
    </section>



    <!-- ============ POPÜLER MARKALAR (Brands Slider) ============ -->
    <section class="section-block brands-section">
      <div class="brands-wrapper tracking-light-box" @mousemove="updateMouseTracking">
        <div class="light-beam"></div>
        <div class="mouse-glow"></div>
        <div class="light-content brands-container">
          <div class="brands-title">
            <span>YETKİLİ DİSTRİBÜTÖRÜ OLDUĞUMUZ MARKALAR</span>
          </div>
          <div class="brands-slider">
            <div class="brands-track">
              <template v-for="i in 4" :key="i">
                <!-- Set 1 -->
                <!-- Apple -->
              <div class="brand-item" title="Apple">
                <svg viewBox="0 0 24 24" class="brand-logo-svg" xmlns="http://www.w3.org/2000/svg">
                  <path fill="currentColor" d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
                </svg>
                <span class="brand-name">Apple</span>
              </div>
              <!-- Samsung -->
              <div class="brand-item" title="Samsung">
                <svg viewBox="0 0 512 512" class="brand-logo-svg sq-logo" xmlns="http://www.w3.org/2000/svg">
                  <rect width="512" height="512" rx="15%" fill="#034ea2"/>
                  <path fill="#ffffff" d="m72,224c-16 0-23 5-22 20 3 12 25 19 27 23l0 4c0 2-1 4-5 4-4 0-6-3-6-5l0-5-16 0c-1 16 11 21 22 21 14 0 21-4 21-17 1-19-24-20-26-28 0 -1 0-1 0-3 0-1 1-4 5-4 4 0 5 3 5 5l0 4 15 0 0-4c0-13-12-15-20-15zm353,15 0,33c1,21 39,17 39,0 l 0-20-17 0 0 8 5 0 0 11c-1 5-13 5-13 0 0-11 0-21 0-31 0-5 11-5 12 0l0 5 13 0 0-6c-1-20-39-17-39 0zm-160-15c-16 0-23 5-22 20 3 12 25 19 27 23l0 4c0 2-1 4-5 4-4 0-6-3-6-5l0-5-16 0c-1 16 11 21 22 21 14 0 21-4 21-17 1-19-24-20-26-28 0 -1 0-1 0-3 0-1 1-4 5-4 4 0 5 3 5 5l0 4 15 0 0-4c0-13-12-15-20-15zm-100 1-1 59 15 0 0-53 11 53 15 0 9-53 0 53 15 0-1-59-24 0-7 45-7-45-24 0zm135 0 0 43c0 1 0 3 0 2 1 11 9 15 21 15 11 0 20-4 20-15 0 0 0-3 0,-4l0-41-15 0 0 43c0 1 0 1 0 3 0 1-1 4-7 4-4 0-5-3-5-4 0 0 0-1 0-3l0-43zm-185 0-11 59 16 0 8-53 8 53 16 0-11-59zm243 0 0 59 15 0 0-48 15 48 21 0 0-59-15 0 0 47-13-47z"/>
                </svg>
                <span class="brand-name">Samsung</span>
              </div>
              <!-- Sony -->
              <div class="brand-item" title="Sony">
                <svg viewBox="0 0 192.744 192.744" class="brand-logo-svg wide">
                  <g fill-rule="evenodd" clip-rule="evenodd" fill="currentColor">
                    <path d="M187.035 106.442a2.852 2.852 0 1 0 0 5.703 2.847 2.847 0 0 0 2.844-2.858 2.844 2.844 0 0 0-2.844-2.845zm0 5.36a2.505 2.505 0 0 1-2.508-2.515 2.502 2.502 0 0 1 2.508-2.501 2.5 2.5 0 0 1 2.5 2.501 2.503 2.503 0 0 1-2.5 2.515z"/>
                    <path d="M188.498 108.54c0-.269-.119-.552-.357-.687-.24-.142-.508-.156-.777-.156h-1.389v3.187h.389v-1.47h.717l.91 1.47h.463l-.963-1.47c.568-.016 1.007-.247 1.007-.874zm-1.537.567h-.598v-1.127h.91c.396 0 .83.06.83.553.001.649-.695.574-1.142.574zM170.32 93.132l5.83-6.225c.338-.457.506-.777.506-1.051 0-.457-.393-.64-1.629-.64h-1.471v-3.93h15.922v3.93h-2.092c-2.416 0-2.865.365-6.236 4.615l-9.223 9.96v6.078c0 1.555.785 2.102 3.033 2.102h3.482v3.792h-22.301v-3.792h3.482c2.246 0 3.033-.547 3.033-2.102v-6.078l-10.863-12.017c-1.795-2.101-1.547-2.558-6.545-2.558v-3.93h20.168v3.93h-1.436c-1.461 0-2.08.274-2.08.822 0 .458.449.823.73 1.188l5.496 5.99c.653.679 1.45.767 2.194-.084zM35.003 81.285h4.865v10.966h-4.493c-.398-2.192-1.77-3.045-3.021-4.195-2.257-2.074-7.145-3.801-11.256-3.801-5.306 0-9.784 1.646-9.784 4.066 0 6.718 30.345 1.372 30.345 14.074 0 6.625-6.5 10.326-18.173 10.326-4.041 0-10.156-1.254-13.764-3.17-1.131-.653-1.611.618-1.823 2.211H2.911V100.43h4.512c.995 2.879 2.366 3.472 3.627 4.615 2.188 2.011 7.396 3.474 12.172 3.427 7.201-.071 9.677-1.645 9.677-3.93 0-2.284-2.449-2.833-10.34-4.066l-6.7-1.097c-7.561-1.143-13.066-2.833-13.066-8.864 0-6.26 6.964-10.19 17.975-10.19 4.64 0 8.522.62 12.248 2.726 1.032.671 2 .751 1.987-1.766zM129.947 99.645l.096-12.188c0-1.599-.832-2.147-3.209-2.147h-2.793v-3.792h17.77v3.792h-2.316c-2.379 0-3.211.549-3.211 2.147v24.537l-6.955-.055-22.524-21.329v15.49c0 1.554.832 2.147 3.209 2.147h3.092v3.747H94.651v-3.747h3.058c2.377 0 3.209-.594 3.209-2.147V87.457c0-1.599-.832-2.147-3.209-2.147h-3.058v-3.792h15.956l19.34 18.127zM70.424 80.095c-14.162 0-23.027 6.261-23.027 16.312 0 9.871 8.742 16.084 22.595 16.084 14.714 0 23.273-6.122 23.273-16.586.001-9.412-9.235-15.81-22.841-15.81zm-.322 28.422c-7.839 0-12.345-4.524-12.345-12.338 0-7.63 4.702-12.154 12.737-12.154 7.708 0 12.214 4.616 12.214 12.475 0 7.676-4.572 12.017-12.606 12.017z"/>
                  </g>
                </svg>
                <span class="brand-name">Sony</span>
              </div>
              <!-- LG -->
              <div class="brand-item" title="LG Electronics">
                <svg viewBox="0 0 192.756 192.756" class="brand-logo-svg wide">
                  <path d="M52.979 135.844c21.796 0 39.467-17.67 39.467-39.466s-17.67-39.466-39.467-39.466-39.467 17.67-39.467 39.466 17.67 39.466 39.467 39.466z" fill="#a70b52"/>
                  <path fill="#ffffff" d="M62.589 110.267h-8.173v-30.89h-3.031v33.938h3.031v-.02h8.173z"/>
                  <path d="M82.989 97.642H62.637v-3.031H85.97c.031.586.046 1.173.046 1.767 0 18.247-14.792 33.038-33.038 33.038S19.94 114.625 19.94 96.378 34.732 63.34 52.979 63.34c.481 0 .961.01 1.438.031l-.004 3.008a31.023 31.023 0 0 0-1.434-.033c-16.586 0-30.033 13.446-30.033 30.032 0 16.587 13.446 30.032 30.033 30.032 16.134 0 29.296-12.722 30.002-28.683l.008-.085z" fill="#ffffff"/>
                  <path d="M40.655 88.521a4.642 4.642 0 1 0 0-9.285 4.642 4.642 0 0 0 0 9.285z" fill="#ffffff"/>
                  <path fill="#808183" d="M112.043 115.75h28.201v-8.517h-17.847V76.735h-10.354zM174.317 79.482c-3.233-2.505-7.396-3.775-12.364-3.775-5.899 0-10.828 1.812-14.255 5.236-3.577 3.579-5.471 8.851-5.471 15.246 0 6.832 2.002 12.597 5.637 16.229 2.854 2.853 6.656 4.358 11.007 4.358 9.551 0 11.748-5.725 11.748-5.725V115.748h8.625V93.714h-17.169v6.895H169.977s.076 8.681-8.08 8.681c-2.072 0-3.918-.752-5.338-2.172-2.213-2.211-3.383-5.937-3.383-10.767 0-8 3.18-12.776 8.504-12.776 3.326 0 5.826 2.042 6.467 5.137h10.984c-.569-4.497-1.803-6.841-4.814-9.23z"/>
                </svg>
                <span class="brand-name">LG</span>
              </div>
              <!-- MSI -->
              <div class="brand-item" title="MSI">
                <svg viewBox="0 0 1886.832 440.865" class="brand-logo-svg wide" xmlns="http://www.w3.org/2000/svg">
                  <g fill="#005DAA">
                    <path d="M1603.571 440.835l120.68-332.82s-90.207 0-180.424 18.104l-114.084 314.715h173.828v.001zm-20.59-422.726l-23.162 63.932c90.762-18.13 180.41-18.13 180.41-18.13L1763.397 0c.008.011-90.194.011-180.416 18.109zM931.614 422.719c61.294 11.871 124.617 18.115 189.4 18.115h.021c102.809 0 145.068-10.227 198.406-37.449 45.443-23.244 75.313-47.902 88.152-90.371 11.004-36.393-3.057-70.74-35.672-92.595-32.629-21.85-64.232-32.179-101.754-52.88-32.83-18.093-50.725-31.731-48.535-50.709 4.605-39.815 47.168-52.92 105.818-52.92 57.158 0 113.082 5.175 167.342 15.065l22.088-60.867C1455.586 6.252 1392.235 0 1327.451 0c-102.814 0-145.055 10.226-198.4 37.465-45.457 23.235-75.324 47.893-88.166 90.385-10.996 36.386 3.057 70.712 35.701 92.563 32.602 21.847 64.189 32.189 101.75 52.919 32.807 18.086 50.73 31.713 48.498 50.689-4.613 39.828-47.17 52.877-105.797 52.877h-.029c-57.123 0-113.055-5.158-167.334-15.068l-22.06 60.889zM865.47 440.835l111.885-308.6c9.096-25.018 9.684-70.1-15.447-94.741C936.757 12.759 906.805.01 851.448.01c-55.353-.018-100.295 14.517-136.407 28.668-19.416 7.561-48.241 22.348-80.851 42.094-3.15-12.511-8.896-24.242-18.086-33.271C590.937 12.767 560.988.018 505.643.018 450.269.003 405.365 14.535 369.229 28.686c-19.407 7.56-48.24 22.347-80.85 42.093-3.145-12.511-8.896-24.241-18.086-33.271C245.133 12.775 215.19.026 159.824.026L-.001 440.864h173.85l79.924-220.445c14.486-39.979 53.912-78.051 75.555-94.774 27.532-21.263 150.738-55.112 117.175 37.469L345.818 440.835h173.857l79.917-220.46c14.501-39.965 53.919-78.014 75.546-94.729 27.532-21.263 150.739-55.112 117.168 37.469l-100.684 277.72H865.47z"/>
                    <g>
                      <path d="M1845.68 6.449h-10.41v26.838h-8.58V6.449h-10.4/01h29.385v6.439h.005zM1886.832 33.288h-8.566v-22.28l-6.156 14.45h-5.891l-6.148-14.45v22.28h-8.064V.011h9.91l7.477 16.684L1876.83.011h10.006v33.277h-.004z"/>
                    </g>
                  </g>
                </svg>
                <span class="brand-name">MSI</span>
              </div>
              <!-- Asus -->
              <div class="brand-item" title="ASUS">
                <svg viewBox="0 0 24 24" class="brand-logo-svg wide">
                  <path fill="currentColor" d="M23.904 10.788V9.522h-4.656c-.972 0-1.41.6-1.482 1.182v.018-1.2h-1.368v1.266h1.362zm-6.144.456l-1.368-.078v1.458c0 .456-.228.594-1.02.594H14.28c-.654 0-.93-.186-.93-.594v-1.596l-1.386-.102v1.812h-.03c-.078-.528-.276-1.14-1.596-1.23L6 11.22c0 .666.474 1.062 1.218 1.14l3.024.306c.24.018.414.09.414.288 0 .216-.18.24-.456.24H5.946V11.22l-1.386-.09v3.348h5.646c1.26 0 1.662-.654 1.722-1.2h.03c.156.864.912 1.2 2.19 1.2h1.41c1.494 0 2.202-.456 2.202-1.524zm4.398.258l-4.338-.258c0 .666.438 1.11 1.182 1.17l3.09.24c.24.018.384.078.384.276 0 .186-.168.258-.516.258h-4.212v1.29h4.302c1.356 0 1.95-.474 1.95-1.554 0-.972-.534-1.338-1.842-1.422zm-10.194-1.98h1.386v1.266h-1.386zM3.798 11.07l-1.506-.15L0 14.478h1.686zm7.914-1.548h-4.23c-.984 0-1.416.612-1.518 1.2v-1.2H3.618c-.33 0-.486.102-.642.33l-.648.936h9.384Z"/>
                </svg>
                <span class="brand-name">ASUS</span>
              </div>
              <!-- Xiaomi -->
              <div class="brand-item" title="Xiaomi">
                <svg viewBox="0 0 1024 1024" class="brand-logo-svg">
                  <circle cx="512" cy="512" r="512" style="fill:#ff6900"/>
                  <path d="M512 256c-85 0-154.54 5.44-202.82 53.67S256 427.37 256 512.26s4.91 154.35 53.21 202.6S427 768 512 768s154.52-4.91 202.79-53.14S768 597.12 768 512.26s-5-154.52-53.38-202.75S596.86 256 512 256zM360.66 414h120c31.36 0 64.15 1.45 80.3 17.64 15.91 15.91 17.64 47.64 17.71 78.42v96.85a3.2 3.2 0 0 1-3.27 3.09h-41.53a3.2 3.2 0 0 1-3.24-3.16v-98.5c0-17.19-1-34.86-9.9-43.75-7.64-7.68-21.89-9.41-36.69-9.77H408.7a3.2 3.2 0 0 0-3.22 3.14v148.93a3.2 3.2 0 0 1-3.24 3.16h-41.58a3.2 3.2 0 0 1-3.2-3.16V417.15a3.2 3.2 0 0 1 3.2-3.15zm258.79 0H661a3.2 3.2 0 0 1 3.2 3.2v189.7a3.2 3.2 0 0 1-3.2 3.1h-41.54a3.2 3.2 0 0 1-3.22-3.16V417.15a3.2 3.2 0 0 1 3.22-3.18zm-173.16 75.56h43.65a3.17 3.17 0 0 1 3.2 3.14v114.17a3.2 3.2 0 0 1-3.2 3.16h-43.65a3.2 3.2 0 0 1-3.24-3.16V492.69a3.2 3.2 0 0 1 3.24-3.13z" style="fill:#fff"/>
                </svg>
                <span class="brand-name">Xiaomi</span>
              </div>
              <!-- Logitech -->
              <div class="brand-item" title="Logitech">
                <svg viewBox="0 0 24 24" class="brand-logo-svg wide">
                  <path fill="currentColor" d="M24 5.098a1.35 1.35 0 0 1-1.35 1.35 1.35 1.35 0 0 1-1.352-1.35 1.35 1.35 0 0 1 1.351-1.351A1.35 1.35 0 0 1 24 5.097zM16.549 18.31a2.289 2.289 0 0 1-2.322-2.322H12.2c0 2.449 1.9 4.264 4.306 4.264s4.348-1.857 4.348-4.264H18.87c-.043 1.351-1.056 2.322-2.322 2.322zm5.108-2.828h1.984V7.377h-1.984zM0 15.483h1.984V4H0v11.483zm7.135-8.359c-2.449 0-4.307 1.858-4.307 4.264a4.27 4.27 0 0 0 4.307 4.306c2.406 0 4.306-1.858 4.306-4.264S9.583 7.124 7.135 7.124zm0 6.628c-1.31 0-2.322-1.013-2.322-2.364a2.289 2.289 0 0 1 2.322-2.322 2.289 2.289 0 0 1 2.321 2.322c0 1.309-.97 2.364-2.321 2.364zm13.635-4.77V7.377h-2.828c-.464-.21-.929-.253-1.393-.253-2.449 0-4.348 1.858-4.348 4.306 0 2.449 1.9 4.264 4.306 4.264s4.306-1.858 4.306-4.264c0-.844-.254-1.604-.676-2.195zm-4.221 4.77c-1.309 0-2.322-1.013-2.322-2.364a2.289 2.289 0 0 1 2.322-2.322 2.289 2.289 0 0 1 2.322 2.322c0 1.309-1.056 2.364-2.322 2.364Z" />
                </svg>
                <span class="brand-name">Logitech</span>
              </div>

              </template>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ TEKNOLOJİ REHBERİ & BLOG (Tech News) ============ -->
    <section class="section-block blog-section">
      <div class="section-heading tracking-light-heading tracking-light-box" @mousemove="updateMouseTracking">
        <div class="light-beam"></div>
        <div class="mouse-glow"></div>
        <div class="light-content heading-content-inner">
          <div class="heading-title-group">
            <span class="tracking-pulse-dot" style="background: var(--color-volt);"></span>
            <h2>Teknoloji Dünyasından İpuçları</h2>
          </div>
          <span class="eyebrow">Alışverişinizden Önce Göz Atın</span>
        </div>
      </div>

      <div class="blog-grid">
        <!-- Blog Card 1 (Rehber - Monitör) -->
        <article v-if="blogProductRehber" class="blog-card card tracking-light-box" @mousemove="updateMouseTracking">
          <div class="light-beam"></div>
          <div class="mouse-glow"></div>
          <RouterLink :to="`/rehber/${blogProductRehber.id}`" class="blog-card-inner">
            <div class="blog-image-wrapper">
              <img :src="blogProductRehber.imageUrl" :alt="blogProductRehber.name" class="blog-img" />
              <span class="blog-tag">Monitör Tavsiyesi</span>
            </div>
            <div class="blog-body">
              <div class="blog-meta">
                <span class="blog-brand">⚡ {{ blogProductRehber.brand }}</span>
                <span class="blog-price price-mono">{{ formatCurrency(blogProductRehber.price) }} TL</span>
              </div>
              <h3 class="blog-title">{{ blogProductRehber.name }}</h3>
              <p class="blog-excerpt">{{ blogProductRehber.description }}</p>

              <div class="blog-read-btn">
                <span>Ürünü İncele</span>
                <span class="arrow">→</span>
              </div>
            </div>
          </RouterLink>
        </article>

        <!-- Blog Card 2 (Donanım - Laptop) -->
        <article v-if="blogProductDonanim" class="blog-card card tracking-light-box" @mousemove="updateMouseTracking">
          <div class="light-beam"></div>
          <div class="mouse-glow"></div>
          <RouterLink :to="`/rehber/${blogProductDonanim.id}`" class="blog-card-inner">
            <div class="blog-image-wrapper">
              <img :src="blogProductDonanim.imageUrl" :alt="blogProductDonanim.name" class="blog-img" />
              <span class="blog-tag">Donanım Canavarı</span>
            </div>
            <div class="blog-body">
              <div class="blog-meta">
                <span class="blog-brand">⚡ {{ blogProductDonanim.brand }}</span>
                <span class="blog-price price-mono">{{ formatCurrency(blogProductDonanim.price) }} TL</span>
              </div>
              <h3 class="blog-title">{{ blogProductDonanim.name }}</h3>
              <p class="blog-excerpt">{{ blogProductDonanim.description }}</p>

              <div class="blog-read-btn">
                <span>Ürünü İncele</span>
                <span class="arrow">→</span>
              </div>
            </div>
          </RouterLink>
        </article>

        <!-- Blog Card 3 (Ekipman - Klavye) -->
        <article v-if="blogProductEkipman" class="blog-card card tracking-light-box" @mousemove="updateMouseTracking">
          <div class="light-beam"></div>
          <div class="mouse-glow"></div>
          <RouterLink :to="`/rehber/${blogProductEkipman.id}`" class="blog-card-inner">
            <div class="blog-image-wrapper">
              <img :src="blogProductEkipman.imageUrl" :alt="blogProductEkipman.name" class="blog-img" />
              <span class="blog-tag">Profesyonel Ekipman</span>
            </div>
            <div class="blog-body">
              <div class="blog-meta">
                <span class="blog-brand">⚡ {{ blogProductEkipman.brand }}</span>
                <span class="blog-price price-mono">{{ formatCurrency(blogProductEkipman.price) }} TL</span>
              </div>
              <h3 class="blog-title">{{ blogProductEkipman.name }}</h3>
              <p class="blog-excerpt">{{ blogProductEkipman.description }}</p>

              <div class="blog-read-btn">
                <span>Ürünü İncele</span>
                <span class="arrow">→</span>
              </div>
            </div>
          </RouterLink>
        </article>
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

      <!-- TÜM ÜRÜNLER KISMININ HEMEN ALTINDAKİ ÜRÜN ARAMA & FİLTRELEME ALANI -->
      <div class="filters card tracking-light-box search-filter-container" @mousemove="updateMouseTracking">
        <div class="light-beam"></div>
        <div class="mouse-glow"></div>
        <div class="light-content filters-content-inner">
          
          <!-- 1. ARAMA GİRDİSİ -->
          <div class="search-input-wrapper tracking-light-input">
            <span class="search-icon-glow">🔍</span>
            <input v-model="search" type="text" placeholder="Ürün, marka veya özellik ara..." class="tracking-search-field" />
          </div>

          <!-- 2. KATEGORİ DROPDOWN (TÜM MARKALAR YANINDA - TIKLANDIĞINDA 13 KATEGORİ SVG İKONUYLA AÇILIR) -->
          <div class="custom-category-dropdown">
            <button 
              type="button" 
              class="custom-dropdown-trigger tracking-select-field" 
              @click.stop="isCategoryDropdownOpen = !isCategoryDropdownOpen"
            >
              <div class="selected-cat-info">
                <img 
                  v-if="selectedCategory && getCategoryObj(selectedCategory)" 
                  :src="getCategoryIcon(getCategoryObj(selectedCategory).name)" 
                  :alt="getCategoryObj(selectedCategory).name" 
                  class="dropdown-cat-svg-icon" 
                />
                <span v-else class="dropdown-all-icon">⚡</span>
                <span class="selected-cat-text">
                  {{ selectedCategory && getCategoryObj(selectedCategory) ? getCategoryObj(selectedCategory).name : 'Tüm Kategoriler (13)' }}
                </span>
              </div>
              <span class="dropdown-arrow-icon" :class="{ open: isCategoryDropdownOpen }">▾</span>
            </button>

            <!-- AÇILAN 13 KATEGORİ LİSTESİ -->
            <div v-if="isCategoryDropdownOpen" class="custom-dropdown-menu">
              <div 
                class="dropdown-item dropdown-header-item" 
                :class="{ selected: selectedCategory === '' }" 
                @click="selectCategoryDropdown('')"
              >
                <span class="dropdown-all-icon">⚡</span>
                <span>Tüm Kategoriler (13)</span>
              </div>

              <div class="dropdown-divider"></div>

              <!-- 13 KATEGORİ İSMİ VE YENİ SVG İKONLARI (GÜNCEL SIRALAMA) -->
              <div 
                v-for="cat in sortedCategories" 
                :key="cat.id" 
                class="dropdown-item" 
                :class="{ selected: Number(selectedCategory) === Number(cat.id) }" 
                @click="selectCategoryDropdown(cat.id)"
              >
                <img :src="getCategoryIcon(cat.name)" :alt="cat.name" class="dropdown-cat-svg-img" />
                <span>{{ cat.name }}</span>
              </div>
            </div>
          </div>

          <!-- 3. TÜM MARKALAR -->
          <select v-model="selectedBrand" class="tracking-select-field">
            <option value="">Tüm Markalar</option>
            <option v-for="brand in filterOptions.brands" :key="brand" :value="brand">{{ brand }}</option>
          </select>

          <!-- 4. MİN TL -->
          <input v-model="minPrice" type="number" :placeholder="`Min TL (${filterOptions.minPrice || 0})`" class="tracking-price-field" />

          <!-- 5. MAX TL -->
          <input v-model="maxPrice" type="number" :placeholder="`Max TL (${filterOptions.maxPrice || 0})`" class="tracking-price-field" />

          <!-- 6. TEMİZLE BUTONU -->
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

    <!-- Floating Wheel Floater Button -->
    <div class="spin-wheel-floater" @click="openWheelModal" title="Hediye Çarkı ile İndirim Kazan!">
      <div class="floater-pulse"></div>
      <span class="floater-icon">🎁</span>
      <span class="floater-text">Şans Çarkı</span>
    </div>

    <!-- SHANS CARKI MODAL -->
    <Teleport to="body">
      <Transition name="wheel-fade">
        <div v-if="showWheelModal" class="wheel-modal-overlay" @click.self="closeWheelModal">
          <div class="wheel-modal-content card">
            <button class="wheel-modal-close" @click="closeWheelModal" :disabled="isSpinning">&times;</button>
            
            <div class="wheel-modal-header">
              <h2>🎁 Şans Çarkı - İndirim Kazan!</h2>
              <p>Çarkı çevirerek alışverişinizde geçerli sürpriz indirim kodu kazanın.</p>
            </div>

            <div class="wheel-modal-body">
              <!-- The Wheel Area -->
              <div class="wheel-wrapper">
                <div class="wheel-pointer">▼</div>
                <div 
                  class="wheel-outer" 
                  :style="{ transform: `rotate(${wheelRotation}deg)`, transition: isSpinning ? 'transform 4s cubic-bezier(0.1, 0.8, 0.1, 1)' : 'none' }"
                >
                  <svg viewBox="0 0 200 200" class="wheel-svg">
                    <!-- Outer stroke -->
                    <circle cx="100" cy="100" r="95" fill="#11141e" stroke="var(--color-volt)" stroke-width="4" />
                    <!-- Slices -->
                    <g v-for="(item, idx) in wheelItems" :key="idx" :transform="`rotate(${idx * 45} 100 100)`">
                      <path d="M100,100 L100,10 A90,90 0 0,1 163.64,36.36 Z" :fill="item.color" stroke="#11141e" stroke-width="2" />
                      <!-- Radial oriented text -->
                      <text 
                        x="100" 
                        y="48" 
                        transform="rotate(22.5 100 100) rotate(90 100 48)" 
                        fill="#11141e" 
                        font-size="6.8" 
                        font-weight="900" 
                        text-anchor="middle"
                      >
                        {{ item.label }}
                      </text>
                    </g>
                    <circle cx="100" cy="100" r="18" fill="var(--color-volt)" stroke="#11141e" stroke-width="3" />
                  </svg>
                  <div class="wheel-center-logo">🎡</div>
                </div>
              </div>

              <!-- Bottom Message/Button Area -->
              <div class="wheel-action-area">
                <!-- Initial state -->
                <div v-if="!hasSpun && !isSpinning" class="action-ready">
                  <button class="btn-primary spin-btn" @click="spinWheel">Çarkı Çevir</button>
                  <p class="spin-note">Her ziyaretçi yalnızca 1 kez çevirebilir.</p>
                </div>

                <!-- Spinning state -->
                <div v-else-if="isSpinning" class="action-spinning">
                  <div class="spin-loader"></div>
                  <p class="spinning-text">Çark dönüyor, şansınız bol olsun...</p>
                </div>

                <!-- Completed state (Won coupon) -->
                <div v-else class="action-completed fade-in-up">
                  <div class="celebration-confetti">🎉 Tebrikler! 🎉</div>
                  <p class="won-label">Kazandığınız Ödül: <strong>{{ wonItem?.label }}</strong></p>
                  
                  <div class="coupon-box" @click="copyCoupon" title="Kopyalamak için tıkla">
                    <span class="coupon-code">{{ wonItem?.code }}</span>
                    <button class="copy-btn-inner">{{ couponCopied ? 'Kopyalandı! ✓' : 'Kopyala 📋' }}</button>
                  </div>
                  <p class="coupon-usage-note">Bu kodu Sepetim sayfasında kupon kodu alanına yapıştırarak kullanabilirsiniz.</p>
                  <p v-if="remainingTimeText" class="spin-cooldown-text">{{ remainingTimeText }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.cat-icon-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25));
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.category-card:hover .cat-icon-img {
  transform: scale(1.15) translateY(-2px);
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 34px;
  margin-left: auto;
  margin-right: auto;
  background: transparent;
  border: none;
  padding: 0;
}

.trust-item {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(16, 20, 30, 0.6);
  backdrop-filter: blur(12px);
  border: 1.5px solid var(--color-line);
  border-radius: 12px;
  padding: 16px 20px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

/* Hover effects */
.trust-item:hover {
  transform: translateY(-5px);
  border-color: rgba(255, 255, 255, 0.15);
}

.trust-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.trust-svg-icon {
  width: 22px;
  height: 22px;
}

.trust-content strong {
  display: block;
  font-size: 0.9rem;
  font-weight: 800;
  color: white;
}

.trust-content p {
  margin: 4px 0 0;
  font-size: 0.74rem;
  color: var(--color-slate);
}

/* Specific Card themes */
/* 1. Truck */
.card-truck .trust-icon-wrapper {
  background: rgba(255, 159, 67, 0.08);
  color: #ff9f43;
  border: 1px solid rgba(255, 159, 67, 0.2);
}
.card-truck:hover {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 159, 67, 0.15);
  border-color: rgba(255, 159, 67, 0.4);
}

/* 2. Speed */
.card-speed .trust-icon-wrapper {
  background: rgba(68, 214, 44, 0.08);
  color: var(--color-volt);
  border: 1px solid rgba(68, 214, 44, 0.2);
}
.card-speed:hover {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(68, 214, 44, 0.15);
  border-color: rgba(68, 214, 44, 0.4);
}

/* 3. Secure */
.card-secure .trust-icon-wrapper {
  background: rgba(46, 204, 113, 0.08);
  color: #2ecc71;
  border: 1px solid rgba(46, 204, 113, 0.2);
}
.card-secure:hover {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(46, 204, 113, 0.15);
  border-color: rgba(46, 204, 113, 0.4);
}

/* 4. Refund */
.card-refund .trust-icon-wrapper {
  background: rgba(56, 189, 248, 0.08);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.2);
}
.card-refund:hover {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.4);
}

/* 5. Support */
.card-support .trust-icon-wrapper {
  background: rgba(253, 121, 168, 0.08);
  color: #fd79a8;
  border: 1px solid rgba(253, 121, 168, 0.2);
}
.card-support:hover {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(253, 121, 168, 0.15);
  border-color: rgba(253, 121, 168, 0.4);
}

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

/* CUSTOM CATEGORY DROPDOWN WITH SVG ICONS */
.custom-category-dropdown {
  position: relative;
  flex: 1;
  min-width: 170px;
}

.custom-dropdown-trigger {
  width: 100%;
  height: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  color: var(--color-ink);
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.custom-dropdown-trigger:hover,
.custom-dropdown-trigger:focus {
  border-color: var(--color-volt);
  box-shadow: 0 0 10px rgba(68, 214, 44, 0.2);
}

.selected-cat-info {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
}

.dropdown-cat-svg-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  flex-shrink: 0;
}

.dropdown-all-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.selected-cat-text {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.dropdown-arrow-icon {
  font-size: 0.8rem;
  color: var(--color-slate);
  transition: transform 0.2s ease;
  margin-left: 8px;
}

.dropdown-arrow-icon.open {
  transform: rotate(180deg);
  color: var(--color-volt);
}

.search-filter-container {
  overflow: visible !important;
  z-index: 100 !important;
}

.search-filter-container .filters-content-inner {
  overflow: visible !important;
}

.custom-dropdown-menu {
  position: absolute !important;
  top: calc(100% + 6px) !important;
  left: 0 !important;
  width: 100% !important;
  min-width: 220px !important;
  max-height: 320px !important;
  overflow-y: auto !important;
  background: #0f172a !important;
  border: 1px solid var(--color-volt) !important;
  border-radius: var(--radius-sm) !important;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.8) !important;
  z-index: 9999 !important;
  padding: 6px !important;
  box-sizing: border-box !important;
  scrollbar-width: thin;
  scrollbar-color: var(--color-line) transparent;
}

.custom-dropdown-menu::-webkit-scrollbar {
  width: 5px;
}
.custom-dropdown-menu::-webkit-scrollbar-thumb {
  background: var(--color-line);
  border-radius: 4px;
}

.dropdown-header-item {
  font-weight: 700;
  border-radius: 8px;
}

.dropdown-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 4px 6px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  color: var(--color-ink);
  font-size: 0.86rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dropdown-item:hover {
  background: rgba(68, 214, 44, 0.12);
  color: var(--color-volt);
}

.dropdown-item.selected {
  background: rgba(68, 214, 44, 0.2);
  color: var(--color-volt);
  font-weight: 700;
}

.dropdown-cat-svg-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.dropdown-item:hover .dropdown-cat-svg-img {
  transform: scale(1.15);
}

/* FİLTRELEME KUTUSU ALTI: 13 KATEGORİ İKONLU DÜĞME STRİP */
.filter-categories-pills-row {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding: 12px 14px 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin-top: 10px;
  scrollbar-width: thin;
  scrollbar-color: var(--color-line) transparent;
}

.filter-categories-pills-row::-webkit-scrollbar {
  height: 4px;
}
.filter-categories-pills-row::-webkit-scrollbar-thumb {
  background: var(--color-line);
  border-radius: 4px;
}

.cat-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 13px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--color-line);
  border-radius: 20px;
  color: var(--color-ink);
  font-size: 0.82rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  flex-shrink: 0;
}

.cat-pill-btn:hover {
  border-color: var(--color-volt);
  transform: translateY(-2px);
  background: rgba(68, 214, 44, 0.08);
}

.cat-pill-btn.active {
  background: rgba(68, 214, 44, 0.16);
  border-color: var(--color-volt);
  color: var(--color-volt);
  box-shadow: 0 0 10px rgba(68, 214, 44, 0.25);
  font-weight: 700;
}

.cat-pill-svg-img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  transition: transform 0.2s ease;
}

.cat-pill-btn:hover .cat-pill-svg-img {
  transform: scale(1.15);
}

.cat-pill-icon-all {
  font-size: 0.9rem;
}

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

.tracking-light-box .light-beam,
.light-beam {
  display: none !important;
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

/* ABSOLUTE OVERFLOW & Z-INDEX FIX FOR CATEGORY DROPDOWN MENU */
.search-filter-container,
.search-filter-container.tracking-light-box,
.search-filter-container.card,
.search-filter-container .light-content,
.search-filter-container .filters-content-inner,
section#kampanyalar {
  overflow: visible !important;
  z-index: 100 !important;
}

.custom-category-dropdown {
  position: relative !important;
  z-index: 99999 !important;
}

.custom-dropdown-menu {
  position: absolute !important;
  top: calc(100% + 6px) !important;
  left: 0 !important;
  width: 100% !important;
  min-width: 230px !important;
  max-height: 340px !important;
  overflow-y: auto !important;
  background: #0f172a !important;
  border: 1.5px solid var(--color-volt) !important;
  border-radius: var(--radius-sm) !important;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.95), 0 0 20px rgba(68, 214, 44, 0.35) !important;
  z-index: 999999 !important;
  padding: 6px !important;
  box-sizing: border-box !important;
}

/* ŞANS ÇARKI FLOATER BUTONU */
.spin-wheel-floater {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 9999;
  background: #11141e;
  border: 1.5px solid var(--color-volt);
  border-radius: 40px;
  padding: 10px 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 15px rgba(68, 214, 44, 0.2);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.spin-wheel-floater:hover {
  transform: scale(1.08) translateY(-3px);
  border-color: #55efc4;
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.8), 0 0 20px rgba(85, 239, 196, 0.4);
}

.floater-pulse {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 40px;
  border: 1.5px solid var(--color-volt);
  animation: floaterPulse 2s infinite;
  pointer-events: none;
}

@keyframes floaterPulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.25);
    opacity: 0;
  }
}

.floater-icon {
  font-size: 1.3rem;
  animation: floaterWobble 2s infinite ease-in-out;
}

@keyframes floaterWobble {
  0%, 100% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(10deg) scale(1.1); }
  75% { transform: rotate(-10deg) scale(1.1); }
}

.floater-text {
  font-size: 0.85rem;
  font-weight: 700;
  color: white;
  letter-spacing: 0.03em;
}

/* ŞANS ÇARKI MODAL OVERLAY & CONTENT */
.wheel-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(5, 5, 8, 0.85);
  backdrop-filter: blur(8px);
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.wheel-modal-content {
  width: 100%;
  max-width: 480px;
  background: #11141e;
  border: 1.5px solid var(--color-line);
  position: relative;
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0,0,0,0.8);
}

.wheel-modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  color: var(--color-slate);
  font-size: 1.8rem;
  cursor: pointer;
  line-height: 1;
}

.wheel-modal-close:hover:not(:disabled) {
  color: white;
}

.wheel-modal-close:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.wheel-modal-header h2 {
  font-size: 1.35rem;
  font-weight: 800;
  color: white;
  margin: 0 0 6px 0;
}

.wheel-modal-header p {
  font-size: 0.82rem;
  color: var(--color-slate);
  margin: 0;
}

/* ÇARK ALANI VE SVG */
.wheel-wrapper {
  position: relative;
  width: 280px;
  height: 280px;
  margin: 28px auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wheel-pointer {
  position: absolute;
  top: -8px;
  left: calc(50% - 12px);
  width: 24px;
  height: 24px;
  z-index: 10;
  color: var(--color-volt);
  font-size: 1.6rem;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.6));
  line-height: 1;
}

.wheel-outer {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  position: relative;
}

.wheel-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.wheel-center-logo {
  position: absolute;
  top: calc(50% - 15px);
  left: calc(50% - 15px);
  width: 30px;
  height: 30px;
  background: #11141e;
  border: 2px solid var(--color-volt);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  z-index: 3;
  box-shadow: 0 0 8px rgba(68, 214, 44, 0.4);
}

/* AKSİYON ALANI & KUPON KARTLARI */
.wheel-action-area {
  min-height: 110px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.spin-btn {
  padding: 12px 36px;
  font-size: 1.05rem;
  font-weight: 800;
  border-radius: 30px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.spin-note {
  font-size: 0.72rem;
  color: var(--color-slate);
  margin: 8px 0 0 0;
}

/* Çevirme Loader'ı */
.action-spinning {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.spin-loader {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--color-volt);
  border-radius: 50%;
  animation: spinLoading 0.8s linear infinite;
}

@keyframes spinLoading {
  to { transform: rotate(360deg); }
}

.spinning-text {
  font-size: 0.85rem;
  color: var(--color-slate);
  margin: 0;
  font-style: italic;
}

/* Kazandı Ekranı */
.action-completed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.celebration-confetti {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-volt);
  animation: bounceCelebration 1s infinite alternate;
}

@keyframes bounceCelebration {
  from { transform: translateY(0); }
  to { transform: translateY(-4px); }
}

.won-label {
  font-size: 0.9rem;
  color: white;
  margin: 0;
}

.coupon-box {
  display: flex;
  background: rgba(68, 214, 44, 0.06);
  border: 1.5px dashed var(--color-volt);
  border-radius: 8px;
  overflow: hidden;
  margin: 6px 0;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  max-width: 320px;
}

.coupon-box:hover {
  background: rgba(68, 214, 44, 0.12);
  transform: scale(1.02);
}

.coupon-code {
  flex: 1;
  padding: 10px 14px;
  font-family: var(--font-mono);
  font-weight: 800;
  font-size: 1.1rem;
  color: white;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-btn-inner {
  background: var(--color-volt);
  border: none;
  color: black;
  padding: 0 16px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.copy-btn-inner:hover {
  background: #55efc4;
}

.coupon-usage-note {
  font-size: 0.72rem;
  color: var(--color-slate);
  margin: 4px 0 0 0;
  max-width: 360px;
  line-height: 1.4;
}

.spin-cooldown-text {
  font-size: 0.76rem;
  color: #ff7675;
  margin: 10px 0 0 0;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: rgba(255, 118, 117, 0.05);
  border: 1px dashed rgba(255, 118, 117, 0.25);
  padding: 6px 14px;
  border-radius: 6px;
  display: inline-block;
  box-shadow: 0 0 8px rgba(255, 118, 117, 0.05);
}

/* Transitions */
.wheel-fade-enter-active, .wheel-fade-leave-active {
  transition: opacity 0.3s ease;
}

.wheel-fade-enter-from, .wheel-fade-leave-to {
  opacity: 0;
}

/* SON İNCELENEN ÜRÜNLER */
.recently-viewed-block {
  margin-top: 40px;
}

.recently-viewed-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  width: 100% !important;
  flex-direction: row !important;
}

.rv-carousel-nav {
  display: flex;
  gap: 8px;
}

.rv-carousel-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  color: var(--color-ink);
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.rv-carousel-btn:hover {
  background: var(--color-volt);
  color: #0b0f19;
  border-color: var(--color-volt);
}

.recently-viewed-carousel {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-behavior: smooth;
  padding: 10px 4px;
  scrollbar-width: none; /* Firefox */
}

.recently-viewed-carousel::-webkit-scrollbar {
  display: none; /* Safari & Chrome */
}

.recently-viewed-card {
  min-width: 250px;
  max-width: 250px;
  flex-shrink: 0;
}

/* BÜLTEN ABONELİĞİ */
.newsletter-section {
  margin-top: 40px;
  width: 100%;
}

.newsletter-banner {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9));
  border: 1px solid var(--color-line);
  border-radius: 12px;
  padding: 30px;
  position: relative;
  overflow: hidden;
}

.newsletter-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 30px;
  z-index: 2;
  position: relative;
}

.newsletter-info h2 {
  font-size: 1.4rem;
  font-weight: 800;
  color: white;
  margin: 0 0 10px 0;
}

.newsletter-info p {
  font-size: 0.9rem;
  color: var(--color-slate);
  margin: 0;
  line-height: 1.5;
}

.newsletter-info strong {
  color: var(--color-volt);
}

.newsletter-form-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.newsletter-form {
  display: flex;
  gap: 10px;
}

.newsletter-form input {
  flex: 1;
  padding: 12px 16px;
  font-size: 0.9rem;
  background: rgba(10, 12, 20, 0.85);
  border: 1.5px solid var(--color-line);
  color: white;
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.2s;
}

.newsletter-form input:focus {
  border-color: var(--color-volt);
}

.newsletter-form button {
  padding: 0 24px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  white-space: nowrap;
}

/* Bülten Mesajları */
.newsletter-msg {
  font-size: 0.82rem;
  margin: 0;
  font-weight: 600;
}

.newsletter-msg.error-msg {
  color: var(--color-danger);
}

.success-box {
  background: rgba(68, 214, 44, 0.05);
  border: 1.5px solid rgba(68, 214, 44, 0.2);
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  color: var(--color-success);
}

.msg-icon {
  font-size: 1.3rem;
  line-height: 1;
}

.newsletter-coupon-box {
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(68, 214, 44, 0.1);
  border: 1px dashed var(--color-success);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.8rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.newsletter-coupon-box:hover {
  background: rgba(68, 214, 44, 0.15);
  transform: scale(1.02);
}

.newsletter-code {
  color: var(--color-volt);
  font-family: var(--font-mono);
  font-size: 0.88rem;
}

.copy-hint {
  font-size: 0.7rem;
  color: var(--color-slate);
}

@media (max-width: 850px) {
  .newsletter-content {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

/* YETKİLİ DİSTRİBÜTÖRÜ OLDUĞUMUZ MARKALAR PANELI */
.brands-section {
  margin-top: 30px;
  width: 100%;
}

.brands-wrapper {
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid var(--color-line);
  border-radius: 12px;
  padding: 24px;
  position: relative;
  overflow: hidden;
}

.brands-container {
  display: flex;
  flex-direction: column;
  gap: 18px;
  z-index: 2;
  position: relative;
}

.brands-title {
  text-align: center;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--color-slate);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 10px;
}

.brands-slider {
  overflow: hidden;
  width: 100%;
  position: relative;
  mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
  padding: 10px 0;
}

.brands-slider:hover .brands-track {
  animation-play-state: paused;
}

.brands-track {
  display: flex;
  align-items: center;
  gap: 60px;
  width: max-content;
  animation: marquee-scroll 35s linear infinite;
}

.brand-item {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  opacity: 0.85;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  flex-shrink: 0;
}

.brand-item:hover {
  opacity: 1;
  transform: scale(1.16);
}

.brand-logo-svg {
  width: 36px;
  height: 36px;
  color: white;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.brand-logo-svg.wide {
  width: auto;
  height: 24px;
  max-width: 90px;
}

.brand-logo-svg.sq-logo {
  border-radius: 8px;
  width: 36px;
  height: 36px;
}

.brand-name {
  font-size: 1.1rem;
  font-weight: 800;
  color: white;
}

@keyframes marquee-scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-25%);
  }
}

@media (max-width: 768px) {
  .brands-track {
    gap: 40px;
    animation-duration: 25s;
  }
  .brand-item {
    opacity: 0.85;
  }
}

/* BLOG KARTLARI */
.blog-section {
  margin-top: 40px;
}

.blog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 24px;
}

.blog-card {
  border-radius: 12px;
  overflow: hidden;
  background: var(--color-surface);
  border: 1.5px solid var(--color-line);
  transition: all 0.3s ease;
}

.blog-card .mouse-glow {
  background: radial-gradient(
    220px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    rgba(68, 214, 44, 0.2),
    rgba(0, 255, 255, 0.09) 40%,
    transparent 75%
  ) !important;
  opacity: 0.45 !important;
}

.blog-card:hover {
  transform: translateY(-5px);
  border-color: var(--color-volt);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3), 0 0 15px rgba(223, 249, 251, 0.05);
}

.blog-card-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  text-decoration: none;
  color: inherit;
}

.blog-image-wrapper {
  height: 180px;
  position: relative;
  overflow: hidden;
  background-color: #ffffff; /* Ürün resimlerinin beyaz arka planıyla bütünleşmesi için */
  border-bottom: 1.5px solid var(--color-line);
  display: flex;
  justify-content: center;
  align-items: center;
}

.blog-image-wrapper::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.02); /* Hafif gölge */
  pointer-events: none;
}

.blog-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 8px; /* Resmi daha büyük ve net göstermek için padding azaltıldı */
  transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.blog-card:hover .blog-img {
  transform: scale(1.08);
}



.blog-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(0, 0, 0, 0.7);
  color: var(--color-volt);
  border: 1px solid var(--color-volt);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  backdrop-filter: blur(4px);
}

.blog-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.blog-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 0.82rem;
  color: var(--color-slate);
  margin-bottom: 12px;
  width: 100%;
}

.blog-brand {
  font-weight: 700;
  color: var(--color-volt);
  text-transform: uppercase;
}

.blog-price {
  font-weight: 800;
  color: white;
  margin-left: auto;
}

.blog-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: white;
  margin: 0 0 10px 0;
  line-height: 1.4;
  transition: color 0.2s;
}

.blog-card:hover .blog-title {
  color: var(--color-volt);
}

.blog-excerpt {
  font-size: 0.88rem;
  color: var(--color-slate);
  line-height: 1.6;
  margin: 0 0 20px 0;
  flex-grow: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.blog-read-btn {
  background: transparent;
  border: none;
  color: var(--color-volt);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  transition: all 0.2s;
}

.blog-read-btn .arrow {
  transition: transform 0.2s;
}

.blog-card:hover .blog-read-btn .arrow {
  transform: translateX(4px);
}

/* BLOG ÜRÜN ÖZELLİKLERİ DEĞERLERİ */
.blog-specs {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid rgba(255, 255, 255, 0.04);
  padding: 10px 12px;
  border-radius: 8px;
}

.spec-tag {
  font-size: 0.78rem;
  color: var(--color-slate);
  display: flex;
  justify-content: space-between;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.04);
  padding-bottom: 4px;
}

.spec-tag:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.spec-tag strong {
  color: white;
  font-weight: 600;
}
</style>