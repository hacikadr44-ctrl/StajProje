<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const authStore = useAuthStore()
const router = useRouter()

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    await authStore.register(name.value, email.value, password.value)
    router.push('/')
  } catch (err) {
    error.value = err.response?.data?.message || 'Kayıt yapılamadı.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card glass-card">
      <div class="auth-icon">✨</div>
      <h1>Kayıt Ol</h1>
      <p class="auth-sub">TeknoMarkt ailesine katılın, ayrıcalıklı avantajlardan yararlanın.</p>

      <p v-if="error" class="error-message">{{ error }}</p>

      <form @submit.prevent="handleSubmit">
        <label>Ad Soyad</label>
        <input v-model="name" type="text" placeholder="Ahmet Yılmaz" required />

        <label>E-posta</label>
        <input v-model="email" type="email" placeholder="ornek@email.com" required />

        <label>Şifre</label>
        <input v-model="password" type="password" placeholder="En az 6 karakter" required minlength="6" />

        <button class="btn-primary" type="submit" :disabled="loading">
          {{ loading ? 'Kaydediliyor...' : 'Kayıt Ol' }}
        </button>
      </form>

      <p class="alt-link">Zaten hesabın var mı? <RouterLink to="/giris">Giriş yap</RouterLink></p>
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
</style>
