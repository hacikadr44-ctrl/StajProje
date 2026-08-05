<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { formatCurrency } from '../utils/format'
import api from '../api/axios'

const authStore = useAuthStore()

const activeTab = ref('profile') // 'profile', 'password', 'addresses', 'price-alerts'

// Fiyat Alarmları
const priceAlerts = ref([])
const alertsLoading = ref(false)

// Profil Bilgileri
const name = ref(authStore.user?.name || '')
const email = ref(authStore.user?.email || '')
const profileMsg = ref('')
const profileError = ref('')
const profileLoading = ref(false)

// Şifre Değiştirme
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passMsg = ref('')
const passError = ref('')
const passLoading = ref(false)

// Adres Defteri
const addresses = ref([])
const addressLoading = ref(true)
const showAddressModal = ref(false)
const editingAddress = ref(null)

const addressForm = ref({
  title: '',
  city: '',
  district: '',
  address: '',
  phone: '',
  isDefault: false,
})
const addressError = ref('')

onMounted(async () => {
  fetchAddresses()
  fetchPriceAlerts()
})

async function fetchPriceAlerts() {
  try {
    alertsLoading.value = true
    const res = await api.get('/price-alerts')
    priceAlerts.value = res.data
  } catch (err) {
    console.error('Fiyat alarmları yüklenemedi:', err)
  } finally {
    alertsLoading.value = false
  }
}

async function handleDeleteAlert(id) {
  if (!confirm('Bu fiyat alarmını kaldırmak istediğinize emin misiniz?')) return
  try {
    await api.delete(`/price-alerts/${id}`)
    await fetchPriceAlerts()
  } catch (err) {
    alert(err.response?.data?.message || 'Alarm silinirken hata oluştu.')
  }
}

async function fetchAddresses() {
  try {
    addressLoading.value = true
    const res = await api.get('/addresses')
    addresses.value = res.data
  } catch (err) {
    console.error('Adresler yüklenemedi:', err)
  } finally {
    addressLoading.value = false
  }
}

async function handleUpdateProfile() {
  profileMsg.value = ''
  profileError.value = ''
  profileLoading.value = true

  try {
    const res = await authStore.updateProfile({ name: name.value, email: email.value })
    profileMsg.value = res.message || 'Profil başarıyla güncellendi!'
  } catch (err) {
    profileError.value = err.response?.data?.message || 'Profil güncellenirken hata oluştu.'
  } finally {
    profileLoading.value = false
  }
}

async function handleChangePassword() {
  passMsg.value = ''
  passError.value = ''

  if (newPassword.value !== confirmPassword.value) {
    passError.value = 'Yeni şifreler eşleşmiyor!'
    return
  }

  passLoading.value = true
  try {
    const res = await authStore.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    passMsg.value = res.message || 'Şifreniz başarıyla değiştirildi.'
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err) {
    passError.value = err.response?.data?.message || 'Şifre değiştirilirken hata oluştu.'
  } finally {
    passLoading.value = false
  }
}

function openAddressModal(item = null) {
  addressError.value = ''
  if (item) {
    editingAddress.value = item
    addressForm.value = {
      title: item.title,
      city: item.city,
      district: item.district,
      address: item.address,
      phone: item.phone || '',
      isDefault: item.isDefault,
    }
  } else {
    editingAddress.value = null
    addressForm.value = {
      title: 'Ev Adresi',
      city: '',
      district: '',
      address: '',
      phone: '',
      isDefault: addresses.value.length === 0,
    }
  }
  showAddressModal.value = true
}

async function handleSaveAddress() {
  addressError.value = ''
  if (!addressForm.value.city || !addressForm.value.district || !addressForm.value.address) {
    addressError.value = 'İl, ilçe ve açık adres zorunludur.'
    return
  }

  try {
    if (editingAddress.value) {
      await api.put(`/addresses/${editingAddress.value.id}`, addressForm.value)
    } else {
      await api.post('/addresses', addressForm.value)
    }
    showAddressModal.value = false
    await fetchAddresses()
  } catch (err) {
    addressError.value = err.response?.data?.message || 'Adres kaydedilirken hata oluştu.'
  }
}

async function handleDeleteAddress(id) {
  if (!confirm('Bu adresi silmek istediğinize emin misiniz?')) return
  try {
    await api.delete(`/addresses/${id}`)
    await fetchAddresses()
  } catch (err) {
    alert(err.response?.data?.message || 'Adres silinirken hata oluştu.')
  }
}
</script>

<template>
  <div class="profile-page">
    <div class="profile-header">
      <div class="user-avatar">
        <span>{{ authStore.user?.name?.charAt(0)?.toUpperCase() || 'U' }}</span>
      </div>
      <div class="user-info">
        <h1>{{ authStore.user?.name }}</h1>
        <p>{{ authStore.user?.email }} • <span class="role-badge">{{ authStore.user?.role }}</span></p>
      </div>
    </div>

    <!-- TAB NAV -->
    <div class="tabs">
      <button :class="{ active: activeTab === 'profile' }" @click="activeTab = 'profile'">
        👤 Profil Bilgilerim
      </button>
      <button :class="{ active: activeTab === 'password' }" @click="activeTab = 'password'">
        🔒 Şifre Değiştir
      </button>
      <button :class="{ active: activeTab === 'addresses' }" @click="activeTab = 'addresses'">
        📍 Adres Defterim
      </button>
      <button :class="{ active: activeTab === 'price-alerts' }" @click="activeTab = 'price-alerts'">
        🔔 Fiyat Alarmlarım
      </button>
    </div>

    <!-- TAB 1: PROFİL GÜNCELLEME -->
    <div v-if="activeTab === 'profile'" class="tab-content card">
      <h2>Profil Bilgilerini Düzenle</h2>
      <p class="tab-sub">Hesap bilgilerinizi güncel tutun.</p>

      <form @submit.prevent="handleUpdateProfile">
        <div v-if="profileMsg" class="alert alert-success">{{ profileMsg }}</div>
        <div v-if="profileError" class="alert alert-danger">{{ profileError }}</div>

        <div class="form-group">
          <label>Ad Soyad</label>
          <input v-model="name" type="text" required placeholder="Adınız Soyadınız" />
        </div>

        <div class="form-group">
          <label>E-Posta Adresi</label>
          <input v-model="email" type="email" required placeholder="ornek@email.com" />
        </div>

        <button type="submit" class="btn btn-primary" :disabled="profileLoading">
          {{ profileLoading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet' }}
        </button>
      </form>
    </div>

    <!-- TAB 2: ŞİFRE DEĞİŞTİRME -->
    <div v-if="activeTab === 'password'" class="tab-content card">
      <h2>Şifre Değiştir</h2>
      <p class="tab-sub">Hesabınızın güvenliği için güçlü bir şifre seçin.</p>

      <form @submit.prevent="handleChangePassword">
        <div v-if="passMsg" class="alert alert-success">{{ passMsg }}</div>
        <div v-if="passError" class="alert alert-danger">{{ passError }}</div>

        <div class="form-group">
          <label>Mevcut Şifre</label>
          <input v-model="currentPassword" type="password" required placeholder="••••••••" />
        </div>

        <div class="form-group">
          <label>Yeni Şifre</label>
          <input v-model="newPassword" type="password" required placeholder="En az 6 karakter" />
        </div>

        <div class="form-group">
          <label>Yeni Şifre (Tekrar)</label>
          <input v-model="confirmPassword" type="password" required placeholder="En az 6 karakter" />
        </div>

        <button type="submit" class="btn btn-primary" :disabled="passLoading">
          {{ passLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle' }}
        </button>
      </form>
    </div>

    <!-- TAB 3: ADRES DEFTERİ -->
    <div v-if="activeTab === 'addresses'" class="tab-content card">
      <div class="addresses-header">
        <div>
          <h2>Kayıtlı Adreslerim</h2>
          <p class="tab-sub">Siparişlerinizde kolayca seçmek için adreslerinizi yönetin.</p>
        </div>
        <button class="btn btn-primary" @click="openAddressModal()">+ Yeni Adres Ekle</button>
      </div>

      <div v-if="addressLoading" class="loading-state">Adresler yükleniyor...</div>
      <div v-else-if="addresses.length === 0" class="empty-state">
        <p>Henüz kayıtlı bir adresiniz bulunmuyor.</p>
        <button class="btn btn-secondary" @click="openAddressModal()">İlk Adresinizi Ekleyin</button>
      </div>

      <div v-else class="address-grid">
        <div v-for="item in addresses" :key="item.id" class="address-card" :class="{ default: item.isDefault }">
          <div class="address-card-head">
            <h3>{{ item.title }}</h3>
            <span v-if="item.isDefault" class="badge-default">Varsayılan</span>
          </div>
          <p class="address-body">{{ item.address }}</p>
          <p class="address-location"><strong>{{ item.district }} / {{ item.city }}</strong></p>
          <p v-if="item.phone" class="address-phone">📞 {{ item.phone }}</p>

          <div class="address-actions">
            <button class="btn-sm btn-outline" @click="openAddressModal(item)">✏️ Düzenle</button>
            <button class="btn-sm btn-danger" @click="handleDeleteAddress(item.id)">🗑️ Sil</button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 4: FİYAT ALARMLARIM -->
    <div v-if="activeTab === 'price-alerts'" class="tab-content card">
      <div class="price-alerts-header">
        <div>
          <h2>Fiyat Alarmlarım</h2>
          <p class="tab-sub">Ürünlerin fiyatı düştüğünde haberdar olmak için kurduğunuz alarmları yönetin.</p>
        </div>
      </div>

      <div v-if="alertsLoading" class="loading-state">Alarmlar yükleniyor...</div>
      <div v-else-if="priceAlerts.length === 0" class="empty-state">
        <p>Henüz kurulmuş bir fiyat alarmınız bulunmuyor.</p>
        <RouterLink to="/" class="btn btn-secondary">Ürünleri İncele & Alarm Kur</RouterLink>
      </div>

      <div v-else class="alerts-grid">
        <div v-for="alert in priceAlerts" :key="alert.id" class="alert-item-card">
          <img :src="alert.Product?.imageUrl || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80'" :alt="alert.Product?.name" class="alert-prod-img" />
          
          <div class="alert-prod-details">
            <span class="alert-prod-brand" v-if="alert.Product?.brand">{{ alert.Product?.brand }}</span>
            <RouterLink :to="`/urun/${alert.Product?.id}`" class="alert-prod-name">{{ alert.Product?.name }}</RouterLink>
            
            <div class="alert-price-comparison">
              <div class="price-info-pill current">
                <span class="label">Mevcut Fiyat:</span>
                <span class="value">{{ formatCurrency(alert.Product?.price) }} TL</span>
              </div>
              <div class="price-info-pill target">
                <span class="label">Hedef Fiyat:</span>
                <span class="value text-volt">{{ formatCurrency(alert.targetPrice) }} TL</span>
              </div>
            </div>
          </div>

          <div class="alert-card-actions">
            <button class="btn-sm btn-danger" @click="handleDeleteAlert(alert.id)">🗑️ Alarmı Sil</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ADRES EKLE/DÜZENLE MODAL -->
    <div v-if="showAddressModal" class="modal-backdrop" @click.self="showAddressModal = false">
      <div class="modal-card">
        <h3>{{ editingAddress ? 'Adresi Düzenle' : 'Yeni Adres Ekle' }}</h3>

        <div v-if="addressError" class="alert alert-danger">{{ addressError }}</div>

        <form @submit.prevent="handleSaveAddress">
          <div class="form-group">
            <label>Adres Başlığı</label>
            <input v-model="addressForm.title" type="text" placeholder="Örn: Ev, İş, Yazlık" required />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>İl</label>
              <input v-model="addressForm.city" type="text" placeholder="Örn: İstanbul" required />
            </div>
            <div class="form-group">
              <label>İlçe</label>
              <input v-model="addressForm.district" type="text" placeholder="Örn: Kadıköy" required />
            </div>
          </div>

          <div class="form-group">
            <label>Açık Adres</label>
            <textarea v-model="addressForm.address" rows="3" placeholder="Mahalle, sokak, bina ve daire no..." required></textarea>
          </div>

          <div class="form-group">
            <label>Telefon Numarası</label>
            <input v-model="addressForm.phone" type="tel" placeholder="05XX XXX XX XX" />
          </div>

          <div class="form-group checkbox-group">
            <label>
              <input v-model="addressForm.isDefault" type="checkbox" />
              Varsayılan adresim olarak kaydet
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showAddressModal = false">İptal</button>
            <button type="submit" class="btn btn-primary">Kaydet</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px 16px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  padding: 24px;
  border-radius: var(--radius-md);
  margin-bottom: 24px;
}

.user-avatar {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-volt), #2dd4bf);
  color: #0b0f19;
  font-size: 2rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 16px rgba(68, 214, 44, 0.3);
}

.user-info h1 {
  margin: 0 0 4px 0;
  font-size: 1.6rem;
}

.user-info p {
  margin: 0;
  color: var(--color-slate);
  font-size: 0.9rem;
}

.role-badge {
  background: rgba(68, 214, 44, 0.15);
  color: var(--color-volt);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--color-line);
  padding-bottom: 8px;
  overflow-x: auto;
}

.tabs button {
  background: none;
  border: none;
  color: var(--color-slate);
  padding: 10px 18px;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.tabs button:hover {
  color: white;
  background: rgba(255, 255, 255, 0.05);
}

.tabs button.active {
  background: var(--color-volt);
  color: #0b0f19;
}

.tab-content {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  padding: 28px;
  border-radius: var(--radius-md);
}

.tab-sub {
  color: var(--color-slate);
  font-size: 0.88rem;
  margin-bottom: 20px;
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
  color: var(--color-ink);
}

.form-group input, .form-group textarea {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-line);
  color: white;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
}

.form-group input:focus, .form-group textarea:focus {
  outline: none;
  border-color: var(--color-volt);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.alert {
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  font-size: 0.9rem;
}
.alert-success {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}
.alert-danger {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.addresses-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.address-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
}

.address-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 18px;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: border-color 0.2s;
}

.address-card.default {
  border-color: var(--color-volt);
  background: rgba(68, 214, 44, 0.04);
}

.address-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.address-card-head h3 {
  margin: 0;
  font-size: 1.05rem;
}

.badge-default {
  background: var(--color-volt);
  color: #0b0f19;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
}

.address-body {
  font-size: 0.9rem;
  color: var(--color-slate);
  margin-bottom: 8px;
  line-height: 1.4;
  flex: 1;
}

.address-location {
  font-size: 0.88rem;
  margin-bottom: 6px;
}

.address-phone {
  font-size: 0.85rem;
  color: var(--color-slate);
  margin-bottom: 12px;
}

.address-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.8rem;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-outline {
  background: transparent;
  border: 1px solid var(--color-line);
  color: white;
}
.btn-danger {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.btn-danger:hover {
  background: rgba(239, 68, 68, 0.4);
}

/* MODAL */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}

.modal-card {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 24px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
}

.modal-card h3 {
  margin-top: 0;
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

@media (max-width: 600px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
  }
  .form-row {
    grid-template-columns: 1fr;
  }
}

/* ============ FİYAT ALARMLARI TABİ CSS ============ */
.price-alerts-header {
  margin-bottom: 24px;
}

.alerts-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.alert-item-card {
  display: flex;
  align-items: center;
  gap: 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--color-line);
  padding: 16px;
  border-radius: var(--radius-sm);
  transition: transform 0.2s, border-color 0.2s;
}

.alert-item-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 170, 0, 0.3);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.alert-prod-img {
  width: 80px;
  height: 80px;
  object-fit: contain;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  padding: 6px;
}

.alert-prod-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.alert-prod-brand {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--color-slate);
  font-weight: 700;
  letter-spacing: 0.05em;
}

.alert-prod-name {
  color: white;
  font-size: 0.95rem;
  font-weight: 700;
  text-decoration: none;
  transition: color 0.15s;
}

.alert-prod-name:hover {
  color: var(--color-volt);
}

.alert-price-comparison {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.price-info-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-line);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
}

.price-info-pill.target {
  background: rgba(255, 170, 0, 0.05);
  border-color: rgba(255, 170, 0, 0.2);
}

.price-info-pill .label {
  color: var(--color-slate);
}

.price-info-pill .value {
  font-family: var(--font-mono);
  font-weight: 700;
}

.alert-card-actions {
  display: flex;
  align-items: center;
}

@media (max-width: 600px) {
  .alert-item-card {
    flex-direction: column;
    text-align: center;
    align-items: stretch;
    gap: 16px;
  }
  .alert-prod-img {
    margin: 0 auto;
  }
  .alert-price-comparison {
    justify-content: center;
  }
  .alert-card-actions {
    justify-content: center;
  }
}
</style>
