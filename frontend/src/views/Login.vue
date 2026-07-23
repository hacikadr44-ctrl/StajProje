<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const authStore = useAuthStore()
const cartStore = useCartStore()
const router = useRouter()

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    await authStore.login(email.value, password.value)
    await cartStore.fetchCart()
    router.push('/')
  } catch (err) {
    error.value = err.response?.data?.message || 'Giriş yapılamadı.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card glass-card">
      <div class="auth-icon">👤</div>
      <h1>Giriş Yap</h1>
      <p class="auth-sub">Hesabınıza giriş yaparak alışverişe devam edin.</p>

      <p v-if="error" class="error-message">{{ error }}</p>

      <form @submit.prevent="handleSubmit">
        <label>E-posta</label>
        <input v-model="email" type="email" placeholder="ornek@email.com" required />

        <div class="form-row-between">
          <label>Şifre</label>
          <RouterLink to="/sifremi-unuttum" class="forgot-link">Şifremi Unuttum?</RouterLink>
        </div>
        <input v-model="password" type="password" placeholder="••••••" required />

        <button class="btn-primary" type="submit" :disabled="loading">
          {{ loading ? 'Giriş yapılıyor...' : 'Giriş Yap' }}
        </button>
      </form>

      <p class="alt-link">Hesabın yok mu? <RouterLink to="/kayit">Kayıt ol</RouterLink></p>
      <p class="test-hint">Test: admin@example.com / admin123</p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 40px 16px;
}
.auth-card {
  width: 100%;
  max-width: 400px;
  padding: 36px 32px;
  text-align: center;
}
.auth-icon {
  font-size: 2.5rem;
  margin-bottom: 8px;
}
h1 {
  margin: 0 0 4px;
  font-size: 1.5rem;
}
.auth-sub {
  color: var(--color-slate);
  font-size: 0.85rem;
  margin: 0 0 24px;
}
form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}
label {
  font-size: 0.82rem;
  color: var(--color-slate);
  margin-top: 8px;
  font-weight: 500;
}
button {
  margin-top: 16px;
}
.alt-link {
  margin-top: 16px;
  font-size: 0.85rem;
}
.alt-link a {
  color: var(--color-volt);
  text-decoration: none;
  font-weight: 600;
}
.alt-link a:hover {
  text-decoration: underline;
}
.test-hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 8px;
}
.form-row-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.forgot-link {
  font-size: 0.78rem;
  color: var(--color-volt);
  text-decoration: none;
}
.forgot-link:hover {
  text-decoration: underline;
}
</style>
