<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const step = ref(1) // 1: Email girme, 2: Kod ve Yeni Şifre girme, 3: Başarılı
const email = ref('')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const demoNotice = ref('')
const errorMsg = ref('')
const successMsg = ref('')
const loading = ref(false)

async function handleSendCode() {
  errorMsg.value = ''
  demoNotice.value = ''
  if (!email.value) {
    errorMsg.value = 'Lütfen e-posta adresinizi girin.'
    return
  }

  loading.value = true
  try {
    const res = await authStore.forgotPassword(email.value)
    if (res.demoCode) {
      demoNotice.value = `[DEMO BİLDİRİMİ]: Şifre sıfırlama doğrulama kodunuz: ${res.demoCode}`
      code.value = res.demoCode // Kolay test imkanı için otomatik doldurma
    }
    step.value = 2
  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'İşlem gerçekleştirilemedi.'
  } finally {
    loading.value = false
  }
}

async function handleResetPassword() {
  errorMsg.value = ''
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = 'Şifreler eşleşmiyor!'
    return
  }
  if (newPassword.value.length < 6) {
    errorMsg.value = 'Şifre en az 6 karakter olmalıdır.'
    return
  }

  loading.value = true
  try {
    const res = await authStore.resetPassword({
      email: email.value,
      code: code.value,
      newPassword: newPassword.value,
    })
    successMsg.value = res.message || 'Şifreniz başarıyla güncellendi!'
    step.value = 3
    setTimeout(() => {
      router.push('/giris')
    }, 2500)
  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'Şifre sıfırlanırken hata oluştu.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="forgot-page">
    <div class="auth-card">
      <div class="auth-header">
        <span class="auth-icon">🔑</span>
        <h1>Şifremi Unuttum</h1>
        <p v-if="step === 1">Kayıtlı e-posta adresinize sıfırlama kodu göndereceğiz.</p>
        <p v-else-if="step === 2">E-postanıza gönderilen doğrulama kodunu ve yeni şifrenizi girin.</p>
        <p v-else-if="step === 3">Şifreniz sıfırlandı! Giriş ekranına yönlendiriliyorsunuz...</p>
      </div>

      <!-- ADIM 1: E-POSTA ALMA -->
      <form v-if="step === 1" @submit.prevent="handleSendCode">
        <div v-if="errorMsg" class="alert alert-danger">{{ errorMsg }}</div>

        <div class="form-group">
          <label>E-Posta Adresi</label>
          <input v-model="email" type="email" required placeholder="ornek@email.com" />
        </div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          {{ loading ? 'Kod Gönderiliyor...' : 'Doğrulama Kodu Gönder' }}
        </button>
      </form>

      <!-- ADIM 2: KOD VEYA YENİ ŞİFRE -->
      <form v-else-if="step === 2" @submit.prevent="handleResetPassword">
        <div v-if="demoNotice" class="alert alert-demo">{{ demoNotice }}</div>
        <div v-if="errorMsg" class="alert alert-danger">{{ errorMsg }}</div>

        <div class="form-group">
          <label>Doğrulama Kodu</label>
          <input v-model="code" type="text" required placeholder="6 Haneli Kod (Örn: 123456)" />
        </div>

        <div class="form-group">
          <label>Yeni Şifre</label>
          <input v-model="newPassword" type="password" required placeholder="En az 6 karakter" />
        </div>

        <div class="form-group">
          <label>Yeni Şifre (Tekrar)</label>
          <input v-model="confirmPassword" type="password" required placeholder="En az 6 karakter" />
        </div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          {{ loading ? 'Şifre Güncelleniyor...' : 'Şifremi Sıfırla ve Güncelle' }}
        </button>
      </form>

      <!-- ADIM 3: BAŞARILI -->
      <div v-else-if="step === 3" class="success-box">
        <div class="check-icon">✅</div>
        <p>{{ successMsg }}</p>
      </div>

      <div class="auth-footer">
        <RouterLink to="/giris" class="back-link">← Giriş Sayfasına Dön</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.forgot-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
  padding: 24px;
}

.auth-card {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 32px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
}

.auth-header {
  text-align: center;
  margin-bottom: 24px;
}

.auth-icon {
  font-size: 2.5rem;
  display: inline-block;
  margin-bottom: 8px;
}

.auth-header h1 {
  font-size: 1.5rem;
  margin: 0 0 8px 0;
}

.auth-header p {
  color: var(--color-slate);
  font-size: 0.88rem;
  margin: 0;
}

.form-group {
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
}

.form-group input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-line);
  color: white;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-volt);
}

.btn-block {
  width: 100%;
  padding: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  margin-top: 8px;
}

.alert {
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  font-size: 0.88rem;
}
.alert-danger {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.alert-demo {
  background: rgba(68, 214, 44, 0.15);
  color: var(--color-volt);
  border: 1px solid rgba(68, 214, 44, 0.3);
  font-weight: 600;
}

.success-box {
  text-align: center;
  padding: 20px 0;
}

.check-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.auth-footer {
  margin-top: 24px;
  text-align: center;
  border-top: 1px solid var(--color-line);
  padding-top: 16px;
}

.back-link {
  color: var(--color-slate);
  text-decoration: none;
  font-size: 0.88rem;
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--color-volt);
}
</style>
