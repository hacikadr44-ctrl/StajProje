import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

import Home from '../views/Home.vue'
import ProductDetail from '../views/ProductDetail.vue'
import Cart from '../views/Cart.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Checkout from '../views/Checkout.vue'
import MyOrders from '../views/MyOrders.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import Favorites from '../views/Favorites.vue'
import Compare from '../views/Compare.vue'
import Profile from '../views/Profile.vue'
import ForgotPassword from '../views/ForgotPassword.vue'
import RehberDetail from '../views/RehberDetail.vue'

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/urun/:id', name: 'product-detail', component: ProductDetail },
  { path: '/rehber/:id', name: 'rehber-detail', component: RehberDetail },
  { path: '/sepet', name: 'cart', component: Cart, meta: { requiresAuth: true } },
  { path: '/giris', name: 'login', component: Login },
  { path: '/kayit', name: 'register', component: Register },
  { path: '/sifremi-unuttum', name: 'forgot-password', component: ForgotPassword },
  { path: '/profil', name: 'profile', component: Profile, meta: { requiresAuth: true } },
  { path: '/odeme', name: 'checkout', component: Checkout, meta: { requiresAuth: true } },
  { path: '/siparislerim', name: 'my-orders', component: MyOrders, meta: { requiresAuth: true } },
  { path: '/favorilerim', name: 'favorites', component: Favorites, meta: { requiresAuth: true } },
  { path: '/karsilastir', name: 'compare', component: Compare },
  { path: '/admin', name: 'admin', component: AdminDashboard, meta: { requiresAuth: true, requiresAdmin: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    if (savedPosition) {
      return savedPosition
    }
    // Aynı sayfada sadece arama/filtre/sayfa (query) değiştiyse scroll konumuna dokunma -
    // aksi halde arama kutusuna yazarken her debounce tetiklendiğinde sayfa tepeye zıplıyordu.
    if (to.path === from.path) {
      return false
    }
    return { top: 0 }
  },
})
// Her sayfa geçişinden önce çalışır: giriş/admin gerektiren sayfalara yetkisiz erişimi engeller.
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return next({ name: 'login' })
  }
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return next({ name: 'home' })
  }
  next()
})

export default router
