<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api/axios'
import { useCartStore } from '../stores/cart'
import { useAuthStore } from '../stores/auth'
import { locations } from '../constants/locations'

const cartStore = useCartStore()
const authStore = useAuthStore()
const router = useRouter()

// step: 'address' -> 'payment' -> 'success'
const step = ref('address')
const error = ref('')
const loading = ref(false)
const completedOrder = ref(null)

// --- ADRES DEFTERİ ENTENTRASYONU ---
const savedAddresses = ref([])
const addressMode = ref('saved') // 'saved' | 'custom'
const selectedSavedAddressId = ref(null)
const saveAddressToBook = ref(false)
const newAddressTitle = ref('Ev Adresi')

const selectedCity = ref('')
const selectedDistrict = ref('')
const address = ref('')

const availableDistricts = computed(() => {
  const found = locations.find((l) => l.il === selectedCity.value)
  return found ? found.ilceler : []
})

function handleCityChange() {
  selectedDistrict.value = ''
}

function selectSavedAddress(item) {
  selectedSavedAddressId.value = item.id
  selectedCity.value = item.city
  selectedDistrict.value = item.district
  address.value = item.address
}

function switchToCustomAddress() {
  addressMode.value = 'custom'
  selectedSavedAddressId.value = null
  selectedCity.value = ''
  selectedDistrict.value = ''
  address.value = ''
}

function goToPayment() {
  if (!selectedCity.value || !selectedDistrict.value || !address.value.trim()) {
    error.value = 'Lütfen il, ilçe ve açık adresi doldurun.'
    return
  }
  error.value = ''
  step.value = 'payment'
}

function backToAddress() {
  step.value = 'address'
}

// --- ÖDEME ---
const paymentMethod = ref('kapida_odeme') // 'kapida_odeme' | 'online_odeme'
const cardName = ref('')
const cardNumber = ref('')
const cardExpiry = ref('')
const cardCvv = ref('')
const selectedInstallment = ref(1)

const installmentOptions = computed(() => {
  return [1, 2, 3, 6, 9, 12].map((count) => ({
    count,
    monthly: (cartStore.totalPrice / count).toFixed(2),
  }))
})

function onCardNumberInput() {
  cardNumber.value = cardNumber.value.replace(/\D/g, '').slice(0, 16)
}
function onCvvInput() {
  cardCvv.value = cardCvv.value.replace(/\D/g, '').slice(0, 3)
}
function onExpiryInput() {
  let digits = cardExpiry.value.replace(/\D/g, '').slice(0, 4)
  if (digits.length >= 3) {
    digits = digits.slice(0, 2) + '/' + digits.slice(2)
  }
  cardExpiry.value = digits
}

function isExpiryDateValid(expiry) {
  if (!/^\d{2}\/\d{2}$/.test(expiry)) return false
  const [monthStr, yearStr] = expiry.split('/')
  const month = Number(monthStr)
  const fullYear = 2000 + Number(yearStr)
  if (month < 1 || month > 12) return false

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  if (fullYear < currentYear) return false
  if (fullYear === currentYear && month < currentMonth) return false
  return true
}

const expiryError = computed(() => {
  if (cardExpiry.value.length !== 5) return ''
  return isExpiryDateValid(cardExpiry.value)
    ? ''
    : 'Geçersiz veya süresi dolmuş tarih. Lütfen bugünden sonraki bir son kullanma tarihi girin.'
})

const isOnlinePaymentValid = computed(() => {
  if (paymentMethod.value !== 'online_odeme') return true
  return (
    cardName.value.trim().length > 2 &&
    cardNumber.value.length === 16 &&
    isExpiryDateValid(cardExpiry.value) &&
    cardCvv.value.length === 3 &&
    selectedInstallment.value !== null
  )
})

onMounted(async () => {
  cartStore.fetchCart()
  if (authStore.isLoggedIn) {
    try {
      const res = await api.get('/addresses')
      savedAddresses.value = res.data
      if (savedAddresses.value.length > 0) {
        addressMode.value = 'saved'
        const defaultItem = savedAddresses.value.find(a => a.isDefault) || savedAddresses.value[0]
        selectSavedAddress(defaultItem)
      } else {
        addressMode.value = 'custom'
      }
    } catch (err) {
      console.error('Kayıtlı adresler yüklenemedi:', err)
      addressMode.value = 'custom'
    }
  }
})

async function handleConfirmOrder() {
  error.value = ''

  if (paymentMethod.value === 'online_odeme' && !isOnlinePaymentValid.value) {
    error.value = 'Lütfen kart bilgilerini eksiksiz ve doğru girin.'
    return
  }

  loading.value = true
  try {
    // İsteğe bağlı yeni adresi Adres Defterine kaydet
    if (addressMode.value === 'custom' && saveAddressToBook.value && authStore.isLoggedIn) {
      try {
        await api.post('/addresses', {
          title: newAddressTitle.value || 'Yeni Adres',
          city: selectedCity.value,
          district: selectedDistrict.value,
          address: address.value,
          isDefault: savedAddresses.value.length === 0,
        })
      } catch (err) {
        console.error('Adres kaydedilemedi:', err)
      }
    }

    const res = await api.post('/orders', {
      city: selectedCity.value,
      district: selectedDistrict.value,
      address: address.value,
      paymentMethod: paymentMethod.value,
    })
    completedOrder.value = res.data
    cartStore.clearLocal()
    step.value = 'success'
  } catch (err) {
    error.value = err.response?.data?.message || 'Sipariş oluşturulamadı.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="checkout-wrapper">
    <!-- ADIM GÖSTERGESİ -->
    <div class="steps" v-if="step !== 'success'">
      <span :class="{ active: step === 'address' }">1. Teslimat Adresi</span>
      <span class="sep">→</span>
      <span :class="{ active: step === 'payment' }">2. Ödeme</span>
    </div>

    <!-- ADIM 1: ADRES -->
    <div v-if="step === 'address'" class="checkout card">
      <h1>Teslimat Adresi</h1>
      <p v-if="error" class="error-message">{{ error }}</p>
      <h3 class="total-header">Toplam: {{ cartStore.totalPrice.toFixed(2) }} TL</h3>

      <!-- KAYITLI ADRES SEÇİMİ VEYA YENİ ADRES -->
      <div v-if="savedAddresses.length > 0" class="address-mode-selector">
        <button
          type="button"
          :class="{ active: addressMode === 'saved' }"
          @click="addressMode = 'saved'"
        >
          📍 Kayıtlı Adreslerim ({{ savedAddresses.length }})
        </button>
        <button
          type="button"
          :class="{ active: addressMode === 'custom' }"
          @click="switchToCustomAddress"
        >
          ✏️ Yeni Adres Gir
        </button>
      </div>

      <!-- KAYITLI ADRESLER LİSTESİ -->
      <div v-if="addressMode === 'saved' && savedAddresses.length > 0" class="saved-addresses-list">
        <div
          v-for="item in savedAddresses"
          :key="item.id"
          class="saved-address-card"
          :class="{ selected: selectedSavedAddressId === item.id }"
          @click="selectSavedAddress(item)"
        >
          <div class="saved-card-top">
            <strong>{{ item.title }}</strong>
            <span v-if="item.isDefault" class="badge-default">Varsayılan</span>
          </div>
          <p class="saved-card-location">{{ item.district }} / {{ item.city }}</p>
          <p class="saved-card-text">{{ item.address }}</p>
        </div>
      </div>

      <!-- YENİ ADRES FORMU -->
      <form v-if="addressMode === 'custom' || savedAddresses.length === 0" @submit.prevent="goToPayment">
        <label>İl</label>
        <select v-model="selectedCity" @change="handleCityChange" required>
          <option value="" disabled>İl seçin</option>
          <option v-for="loc in locations" :key="loc.il" :value="loc.il">{{ loc.il }}</option>
        </select>

        <label>İlçe</label>
        <select v-model="selectedDistrict" required :disabled="!selectedCity">
          <option value="" disabled>{{ selectedCity ? 'İlçe seçin' : 'Önce il seçin' }}</option>
          <option v-for="ilce in availableDistricts" :key="ilce" :value="ilce">{{ ilce }}</option>
        </select>

        <label>Açık Adres (Mahalle, Sokak, No)</label>
        <textarea v-model="address" rows="3" required></textarea>

        <div v-if="authStore.isLoggedIn" class="save-address-check">
          <label>
            <input type="checkbox" v-model="saveAddressToBook" />
            Bu adresi Adres Defterime kaydet
          </label>
          <input
            v-if="saveAddressToBook"
            v-model="newAddressTitle"
            type="text"
            placeholder="Adres Başlığı (Örn: Ev, İş)"
            class="title-input"
          />
        </div>
      </form>

      <button
        class="btn-primary btn-block"
        type="button"
        :disabled="cartStore.items.length === 0"
        @click="goToPayment"
      >
        Ödemeye Geç →
      </button>
    </div>

    <!-- ADIM 2: ÖDEME -->
    <div v-else-if="step === 'payment'" class="checkout card">
      <h1>Ödeme</h1>
      <p v-if="error" class="error-message">{{ error }}</p>
      <h3 class="total-header">Toplam: {{ cartStore.totalPrice.toFixed(2) }} TL</h3>

      <div class="payment-methods">
        <label class="method-option" :class="{ active: paymentMethod === 'kapida_odeme' }">
          <input type="radio" value="kapida_odeme" v-model="paymentMethod" />
          Kapıda Ödeme
        </label>
        <label class="method-option" :class="{ active: paymentMethod === 'online_odeme' }">
          <input type="radio" value="online_odeme" v-model="paymentMethod" />
          Online Ödeme (Kredi/Banka Kartı)
        </label>
      </div>

      <!-- KART FORMU -->
      <div v-if="paymentMethod === 'online_odeme'" class="card-form">
        <label>Kart Üzerindeki İsim</label>
        <input v-model="cardName" type="text" placeholder="AD SOYAD" />

        <label>Kart Numarası</label>
        <input
          v-model="cardNumber"
          @input="onCardNumberInput"
          type="text"
          inputmode="numeric"
          placeholder="16 haneli kart numarası"
          maxlength="16"
        />

        <div class="card-row">
          <div class="card-field">
            <label>Son Kullanma Tarihi</label>
            <input
              v-model="cardExpiry"
              @input="onExpiryInput"
              type="text"
              inputmode="numeric"
              placeholder="AA/YY"
              maxlength="5"
            />
            <p v-if="expiryError" class="field-error">{{ expiryError }}</p>
          </div>
          <div class="card-field">
            <label>CVV</label>
            <input
              v-model="cardCvv"
              @input="onCvvInput"
              type="text"
              inputmode="numeric"
              placeholder="000"
              maxlength="3"
            />
          </div>
        </div>

        <!-- TAKSİT SEÇENEKLERİ -->
        <label>Taksit Seçeneği</label>
        <select v-model.number="selectedInstallment">
          <option v-for="opt in installmentOptions" :key="opt.count" :value="opt.count">
            {{ opt.count === 1 ? 'Tek Çekim' : `${opt.count} Taksit` }} — {{ opt.monthly }} TL{{ opt.count > 1 ? '/ay' : '' }}
          </option>
        </select>
      </div>

      <div class="payment-buttons">
        <button type="button" class="back-btn" @click="backToAddress">← Geri</button>
        <button
          class="btn-primary"
          type="button"
          :disabled="loading || !isOnlinePaymentValid"
          @click="handleConfirmOrder"
        >
          {{ loading ? 'Sipariş oluşturuluyor...' : 'Siparişi Onayla' }}
        </button>
      </div>
    </div>

    <!-- ADIM 3: TEŞEKKÜR -->
    <div v-else-if="step === 'success'" class="success-card card">
      <div class="success-icon">✓</div>
      <h1>Siparişiniz Alındı!</h1>
      <p class="thanks-text">
        Bizi tercih ettiğiniz için teşekkür ederiz. Siparişiniz başarıyla oluşturuldu ve en kısa
        sürede hazırlanmaya başlanacak. Sipariş durumunuzu "Siparişlerim" sayfasından takip
        edebilirsiniz.
      </p>
      <p class="order-number" v-if="completedOrder">Sipariş Numarası: #{{ completedOrder.id }}</p>

      <div class="success-buttons">
        <RouterLink to="/siparislerim"><button class="btn-primary">Siparişlerimi Görüntüle</button></RouterLink>
        <RouterLink to="/"><button class="secondary-btn">Alışverişe Devam Et</button></RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.checkout-wrapper {
  max-width: 500px;
  margin: 30px auto;
  padding: 0 16px;
}
.steps {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  font-size: 0.85rem;
  color: var(--color-slate);
}
.steps .active {
  color: var(--color-volt);
  font-weight: 600;
}
.sep {
  color: var(--color-line);
}
.total-header {
  color: var(--color-volt);
  font-size: 1.2rem;
  margin-bottom: 16px;
}

/* ADRES SEÇİMİ MODU */
.address-mode-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.address-mode-selector button {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-line);
  color: var(--color-slate);
  padding: 10px;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.address-mode-selector button.active {
  background: rgba(68, 214, 44, 0.15);
  border-color: var(--color-volt);
  color: var(--color-volt);
}

.saved-addresses-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 18px;
}

.saved-address-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.saved-address-card:hover {
  border-color: rgba(68, 214, 44, 0.4);
}

.saved-address-card.selected {
  border-color: var(--color-volt);
  background: rgba(68, 214, 44, 0.08);
}

.saved-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.badge-default {
  background: var(--color-volt);
  color: #0b0f19;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
}

.saved-card-location {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.saved-card-text {
  font-size: 0.8rem;
  color: var(--color-slate);
  margin: 0;
  line-height: 1.3;
}

.save-address-check {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.85rem;
}
.save-address-check label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.title-input {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-line);
  color: white;
  border-radius: var(--radius-sm);
}

.btn-block {
  width: 100%;
  margin-top: 16px;
  padding: 12px;
}

form, .card-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.payment-methods {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 16px 0;
}
.method-option {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  cursor: pointer;
}
.method-option input[type="radio"] {
  width: auto;
}
.method-option.active {
  border-color: var(--color-volt);
  background: rgba(68, 214, 44, 0.12);
  color: var(--color-volt);
}
.card-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.card-field {
  min-width: 0;
}
.field-error {
  color: var(--color-danger);
  font-size: 0.75rem;
  margin: 4px 0 0;
}
.payment-buttons {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 20px;
}
.back-btn {
  background: var(--color-cloud);
  border: 1.5px solid var(--color-line);
  padding: 11px 18px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: white;
}
.success-card {
  text-align: center;
  padding: 40px 24px;
}
.success-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-success);
  color: white;
  font-size: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}
.thanks-text {
  color: var(--color-slate);
  line-height: 1.6;
  margin: 10px 0 16px;
}
.order-number {
  font-family: var(--font-mono);
  font-weight: 600;
  margin-bottom: 20px;
}
.success-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}
.secondary-btn {
  background: var(--color-cloud);
  border: 1.5px solid var(--color-line);
  padding: 11px 20px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: white;
}
</style>