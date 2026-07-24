<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { useFavoritesStore } from '../stores/favorites'
import { useCompareStore } from '../stores/compare'

const authStore = useAuthStore()
const cartStore = useCartStore()
const favoritesStore = useFavoritesStore()
const compareStore = useCompareStore()
const router = useRouter()

const searchQuery = ref('')
const showAccountMenu = ref(false)
const showMobileMenu = ref(false)

onMounted(() => {
  if (authStore.isLoggedIn) {
    cartStore.fetchCart()
    favoritesStore.fetchFavorites()
  }
})

function handleSearch() {
  showMobileMenu.value = false
  router.push({ path: '/', query: searchQuery.value ? { search: searchQuery.value } : {} })
}

function handleLogout() {
  showAccountMenu.value = false
  showMobileMenu.value = false
  authStore.logout()
  cartStore.clearLocal()
  favoritesStore.clearLocal()
  router.push('/')
}
</script>

<template>
  <nav class="navbar">
    <!-- Üst Bar: Bilgilendirme -->
    <div class="top-bar">
      <div class="top-bar-content">
        <span>🚚 750 TL üzeri <strong>ücretsiz kargo</strong></span>
        <span>⚡ Aynı gün kargo imkanı</span>
        <span>🔒 256-bit SSL güvenli alışveriş</span>
      </div>
    </div>

    <div class="navbar-main">
      <div class="navbar-top">
        <RouterLink to="/" class="brand">
          <img src="/logo.svg" alt="TeknoMarkt Logo" class="brand-logo" />
        </RouterLink>

        <form class="search-form" @submit.prevent="handleSearch">
          <input v-model="searchQuery" placeholder="Ürün, kategori veya marka ara..." />
          <button type="submit">🔍</button>
        </form>

        <div class="nav-actions">
          <RouterLink to="/karsilastir" class="nav-action">
            <span class="icon">⇄</span>
            <span class="label">Karşılaştır</span>
            <span v-if="compareStore.count > 0" class="badge">{{ compareStore.count }}</span>
          </RouterLink>

          <RouterLink v-if="authStore.isLoggedIn" to="/favorilerim" class="nav-action">
            <span class="icon">♥</span>
            <span class="label">Favorilerim</span>
            <span v-if="favoritesStore.items.length > 0" class="badge">{{ favoritesStore.items.length }}</span>
          </RouterLink>

          <RouterLink v-if="authStore.isLoggedIn" to="/sepet" class="nav-action">
            <span class="icon">🛒</span>
            <span class="label">Sepetim</span>
            <span v-if="cartStore.itemCount > 0" class="badge">{{ cartStore.itemCount }}</span>
          </RouterLink>

          <div class="dropdown-wrapper desktop-only">
            <button class="nav-action account-btn" @click="showAccountMenu = !showAccountMenu">
              <span class="icon">👤</span>
              <span class="label">Hesabım</span>
            </button>
            <div v-if="showAccountMenu" class="backdrop" @click="showAccountMenu = false"></div>
            <div v-if="showAccountMenu" class="dropdown-panel account-panel">
              <template v-if="authStore.isLoggedIn">
                <p class="account-name">Merhaba, {{ authStore.user.name }}</p>
                <RouterLink to="/profil" @click="showAccountMenu = false">👤 Profilim & Adreslerim</RouterLink>
                <RouterLink to="/siparislerim" @click="showAccountMenu = false">📦 Siparişlerim</RouterLink>
                <RouterLink v-if="authStore.isAdmin" to="/admin" @click="showAccountMenu = false">⚡ Admin Panel</RouterLink>
                <button class="logout-link" @click="handleLogout">🚪 Çıkış Yap</button>
              </template>
              <template v-else>
                <RouterLink to="/giris" @click="showAccountMenu = false">🔑 Giriş Yap</RouterLink>
                <RouterLink to="/kayit" @click="showAccountMenu = false">📝 Kayıt Ol</RouterLink>
              </template>
            </div>
          </div>

          <!-- Mobil Hamburger Butonu -->
          <button class="mobile-toggle" @click="showMobileMenu = !showMobileMenu">
            {{ showMobileMenu ? '✕' : '☰' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Mobil Menü Drawer -->
    <div v-if="showMobileMenu" class="mobile-drawer-backdrop" @click="showMobileMenu = false"></div>
    <div v-if="showMobileMenu" class="mobile-drawer">
      <div class="mobile-drawer-header">
        <RouterLink to="/" class="mobile-brand-link" @click="showMobileMenu = false">
          <img src="/logo.svg" alt="TeknoMarkt Logo" class="mobile-brand-logo" />
        </RouterLink>
        <button class="mobile-close" @click="showMobileMenu = false">✕</button>
      </div>

      <form class="mobile-search-form" @submit.prevent="handleSearch">
        <input v-model="searchQuery" placeholder="Ürün veya kategori ara..." />
        <button type="submit">🔍</button>
      </form>

      <div class="mobile-links">
        <RouterLink to="/" @click="showMobileMenu = false">🏠 Ana Sayfa</RouterLink>
        <RouterLink to="/karsilastir" @click="showMobileMenu = false">
          ⇄ Ürün Karşılaştır ({{ compareStore.count }})
        </RouterLink>

        <template v-if="authStore.isLoggedIn">
          <div class="mobile-user-box">
            <span class="mobile-user-name">👤 {{ authStore.user.name }}</span>
            <span class="mobile-user-email">{{ authStore.user.email }}</span>
          </div>
          <RouterLink to="/profil" @click="showMobileMenu = false">👤 Profilim & Adres Defterim</RouterLink>
          <RouterLink to="/siparislerim" @click="showMobileMenu = false">📦 Siparişlerim</RouterLink>
          <RouterLink to="/favorilerim" @click="showMobileMenu = false">♥ Favorilerim ({{ favoritesStore.items.length }})</RouterLink>
          <RouterLink to="/sepet" @click="showMobileMenu = false">🛒 Sepetim ({{ cartStore.itemCount }})</RouterLink>
          <RouterLink v-if="authStore.isAdmin" to="/admin" @click="showMobileMenu = false">⚡ Admin Paneli</RouterLink>
          <button class="mobile-logout-btn" @click="handleLogout">🚪 Çıkış Yap</button>
        </template>
        <template v-else>
          <RouterLink to="/giris" @click="showMobileMenu = false">🔑 Giriş Yap</RouterLink>
          <RouterLink to="/kayit" @click="showMobileMenu = false">📝 Kayıt Ol</RouterLink>
        </template>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* ---- ÜST BİLGİ BARI ---- */
.top-bar {
  background: linear-gradient(90deg, rgba(68, 214, 44, 0.12), rgba(56, 189, 248, 0.08));
  border-bottom: 1px solid rgba(68, 214, 44, 0.15);
  padding: 6px 28px;
  font-size: 0.72rem;
  color: var(--color-slate);
}
.top-bar-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  gap: 32px;
  flex-wrap: wrap;
}
.top-bar-content strong {
  color: var(--color-volt);
}

/* ---- ANA NAVBAR ---- */
.navbar {
  background: var(--color-chrome);
  color: white;
  position: sticky;
  top: 0;
  z-index: 20;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
}
.navbar-main {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.navbar-top {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 14px 28px;
  flex-wrap: wrap;
  max-width: 1600px;
  margin: 0 auto;
}
.brand {
  display: flex;
  align-items: center;
  text-decoration: none;
  white-space: nowrap;
}
.brand-logo {
  height: 44px;
  width: auto;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 2px 10px rgba(68, 214, 44, 0.25));
  transition: transform 0.25s ease, filter 0.25s ease;
}
.brand-logo:hover {
  transform: scale(1.03);
  filter: drop-shadow(0 4px 18px rgba(68, 214, 44, 0.5));
}
.mobile-brand-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  flex: 1;
}
.mobile-brand-logo {
  height: 38px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 2px 8px rgba(68, 214, 44, 0.3));
}

/* ---- DROPDOWN ---- */
.dropdown-wrapper {
  position: relative;
}
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 25;
}
.dropdown-panel {
  position: absolute;
  top: 110%;
  left: 0;
  background: var(--color-surface);
  color: var(--color-ink);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
  min-width: 220px;
  padding: 6px;
  z-index: 30;
  display: flex;
  flex-direction: column;
}
.dropdown-panel button, .dropdown-panel a {
  background: none;
  border: none;
  text-align: left;
  padding: 9px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.88rem;
  color: var(--color-ink);
  text-decoration: none;
  transition: background 0.15s;
}
.dropdown-panel button:hover, .dropdown-panel a:hover {
  background: rgba(68, 214, 44, 0.08);
}
.account-panel {
  right: 0;
  left: auto;
}
.account-name {
  padding: 8px 12px;
  font-weight: 600;
  font-size: 0.85rem;
  margin: 0;
  border-bottom: 1px solid var(--color-line);
}
.logout-link {
  color: var(--color-danger) !important;
}

/* ---- ARAMA ---- */
.search-form {
  flex: 1;
  display: flex;
  min-width: 200px;
  max-width: 520px;
}
.search-form input {
  flex: 1;
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  border-right: none;
  border-color: rgba(255, 255, 255, 0.16);
  color: var(--color-ink);
  background: rgba(255, 255, 255, 0.06);
  transition: all 0.2s;
}
.search-form input:focus {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--color-volt);
  box-shadow: none;
}
.search-form button {
  background: var(--color-volt);
  color: #0b0f19;
  border: none;
  padding: 0 18px;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}
.search-form button:hover {
  background: var(--color-volt-dark);
}

/* ---- NAV ACTIONS ---- */
.nav-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
.nav-action {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: #dbe3f4;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 12px;
  font-size: 0.72rem;
  font-family: var(--font-body);
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}
.nav-action:hover {
  color: white;
  background: rgba(255, 255, 255, 0.06);
}
.nav-action .icon {
  font-size: 1.1rem;
}
.badge {
  position: absolute;
  top: -2px;
  right: 4px;
  background: var(--color-ember);
  color: white;
  font-size: 0.6rem;
  font-weight: 700;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 6px rgba(255, 46, 99, 0.4);
}

.mobile-toggle {
  display: none;
  background: none;
  border: 1px solid var(--color-line);
  color: white;
  font-size: 1.3rem;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

/* MOBİL DRAWER */
.mobile-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 90;
}
.mobile-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 280px;
  height: 100vh;
  background: var(--color-surface);
  border-left: 1px solid var(--color-line);
  z-index: 100;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.6);
}
.mobile-drawer-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-line);
  margin-bottom: 16px;
}
.mobile-title {
  font-weight: 700;
  font-size: 1.1rem;
  flex: 1;
}
.mobile-close {
  background: none;
  border: none;
  color: var(--color-slate);
  font-size: 1.2rem;
  cursor: pointer;
}
.mobile-search-form {
  display: flex;
  margin-bottom: 20px;
}
.mobile-search-form input {
  flex: 1;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  color: white;
}
.mobile-search-form button {
  background: var(--color-volt);
  border: none;
  padding: 0 12px;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  cursor: pointer;
}
.mobile-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.mobile-links a {
  color: white;
  text-decoration: none;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.92rem;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.15s;
}
.mobile-links a:hover {
  background: rgba(68, 214, 44, 0.1);
  color: var(--color-volt);
}
.mobile-user-box {
  background: rgba(255, 255, 255, 0.04);
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 8px;
}
.mobile-user-name {
  font-weight: 600;
  font-size: 0.9rem;
}
.mobile-user-email {
  font-size: 0.78rem;
  color: var(--color-slate);
}
.mobile-logout-btn {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
  margin-top: 12px;
}

@media (max-width: 800px) {
  .top-bar { display: none; }
  .navbar-top { padding: 10px 16px; gap: 10px; }
  .search-form { display: none; }
  .mobile-toggle { display: block; }
  .desktop-only { display: none; }
  .nav-action .label { display: none; }
}
</style>