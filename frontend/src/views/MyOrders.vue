<script setup>
import { ref, onMounted } from 'vue'
import api from '../api/axios'
import { formatCurrency } from '../utils/format'

const orders = ref([])
const loading = ref(true)
const selectedOrder = ref(null)
const cancellingId = ref(null)

const statusLabels = {
  beklemede: 'Beklemede',
  hazirlaniyor: 'Hazırlanıyor',
  kargoda: 'Kargoda',
  tamamlandi: 'Tamamlandı',
  iptal: 'İptal Edildi',
}

const statusBadges = {
  beklemede: 'badge-pending',
  hazirlaniyor: 'badge-info',
  kargoda: 'badge-shipping',
  tamamlandi: 'badge-success',
  iptal: 'badge-danger',
}

onMounted(async () => {
  await fetchMyOrders()
})

async function fetchMyOrders() {
  try {
    loading.value = true
    const res = await api.get('/orders/my')
    orders.value = res.data
  } catch (err) {
    console.error('Siparişler yüklenemedi:', err)
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function openDetail(order) {
  selectedOrder.value = order
}

async function handleCancelOrder(order) {
  if (!confirm(`Sipariş #${order.id} tutarındaki siparişinizi iptal etmek istediğinize emin misiniz?`)) {
    return
  }

  cancellingId.value = order.id
  try {
    const res = await api.put(`/orders/${order.id}/cancel`)
    alert(res.data.message || 'Siparişiniz başarıyla iptal edildi.')
    await fetchMyOrders()
    if (selectedOrder.value && selectedOrder.value.id === order.id) {
      selectedOrder.value = orders.value.find(o => o.id === order.id) || null
    }
  } catch (err) {
    alert(err.response?.data?.message || 'Sipariş iptal edilirken bir hata oluştu.')
  } finally {
    cancellingId.value = null
  }
}
</script>

<template>
  <div class="my-orders-page">
    <div class="page-header">
      <h1>📦 Siparişlerim</h1>
      <p class="sub-title">Verdiğiniz tüm siparişleri ve kargo durumlarını buradan takip edebilirsiniz.</p>
    </div>

    <div v-if="loading" class="loading-box">
      <div class="spinner"></div>
      <p>Siparişleriniz yükleniyor...</p>
    </div>

    <div v-else-if="orders.length === 0" class="empty-orders card">
      <div class="empty-icon">🛒</div>
      <h2>Henüz Hiç Sipariş Vermediniz</h2>
      <p>Teknoloji tutkunuzu doyuracak binlerce ürün sizi bekliyor!</p>
      <RouterLink to="/" class="btn btn-primary">Alışverişe Başla</RouterLink>
    </div>

    <div v-else class="orders-list">
      <div v-for="order in orders" :key="order.id" class="order-card card">
        <div class="order-card-header">
          <div>
            <span class="order-no">Sipariş #{{ order.id }}</span>
            <span class="order-date">{{ formatDate(order.createdAt) }}</span>
          </div>
          <span class="status-badge" :class="statusBadges[order.status]">
            {{ statusLabels[order.status] }}
          </span>
        </div>

        <div class="order-card-body">
          <div class="items-preview">
            <div
              v-for="item in order.OrderItems.slice(0, 4)"
              :key="item.id"
              class="item-thumb"
              :title="item.Product?.name"
            >
              <img :src="item.Product?.imageUrl || 'https://via.placeholder.com/60'" :alt="item.Product?.name" />
              <span class="qty-tag">x{{ item.quantity }}</span>
            </div>
            <div v-if="order.OrderItems.length > 4" class="more-items">
              +{{ order.OrderItems.length - 4 }} ürün
            </div>
          </div>

          <div class="order-summary">
            <div class="address-preview">
              <span>📍 {{ order.district }} / {{ order.city }}</span>
              <p class="address-line">{{ order.address }}</p>
            </div>
            <div class="total-price">
              <span class="label">Toplam Tutar:</span>
              <span class="amount">{{ formatCurrency(order.totalPrice) }} TL</span>
            </div>
          </div>
        </div>

        <div class="order-card-footer">
          <button class="btn btn-secondary btn-sm" @click="openDetail(order)">
            🔍 Sipariş Detayı
          </button>
          <button
            v-if="order.status === 'beklemede'"
            class="btn btn-danger-outline btn-sm"
            :disabled="cancellingId === order.id"
            @click="handleCancelOrder(order)"
          >
            {{ cancellingId === order.id ? 'İptal Ediliyor...' : '🚫 Siparişi İptal Et' }}
          </button>
        </div>
      </div>
    </div>

    <!-- SİPARİŞ DETAY MODAL -->
    <div v-if="selectedOrder" class="modal-backdrop" @click.self="selectedOrder = null">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h2>Sipariş Detayı #{{ selectedOrder.id }}</h2>
            <span class="order-date-modal">{{ formatDate(selectedOrder.createdAt) }}</span>
          </div>
          <button class="close-btn" @click="selectedOrder = null">✕</button>
        </div>

        <div class="modal-body">
          <div class="status-box" :class="statusBadges[selectedOrder.status]">
            <span>Sipariş Durumu: <strong>{{ statusLabels[selectedOrder.status] }}</strong></span>
            <p v-if="selectedOrder.status === 'beklemede'">Siparişiniz satıcı tarafından hazırlanma aşamasındadır. İsterseniz iptal edebilirsiniz.</p>
            <p v-else-if="selectedOrder.status === 'hazirlaniyor'">Siparişiniz paketleniyor.</p>
            <p v-else-if="selectedOrder.status === 'kargoda'">Siparişiniz kargoya verildi!</p>
            <p v-else-if="selectedOrder.status === 'tamamlandi'">Siparişiniz teslim edilmiştir.</p>
            <p v-else-if="selectedOrder.status === 'iptal'">Bu sipariş iptal edilmiştir.</p>
          </div>

          <h3>Teslimat Adresi</h3>
          <div class="detail-address-card">
            <p><strong>{{ selectedOrder.district }} / {{ selectedOrder.city }}</strong></p>
            <p>{{ selectedOrder.address }}</p>
            <p>Ödeme Yöntemi: <span>{{ selectedOrder.paymentMethod === 'online_odeme' ? 'Kredi / Banka Kartı' : 'Kapıda Ödeme' }}</span></p>
          </div>

          <h3>Sipariş Edilen Ürünler ({{ selectedOrder.OrderItems?.length || 0 }})</h3>
          <div class="detail-items-list">
            <div v-for="item in selectedOrder.OrderItems" :key="item.id" class="detail-item-row">
              <img :src="item.Product?.imageUrl || 'https://via.placeholder.com/80'" :alt="item.Product?.name" class="detail-item-img" />
              <div class="detail-item-info">
                <h4>{{ item.Product?.name || 'Ürün' }}</h4>
                <p class="item-unit-price">{{ formatCurrency(item.priceAtPurchase) }} TL x {{ item.quantity }} adet</p>
              </div>
              <div class="detail-item-total">
                {{ formatCurrency(Number(item.priceAtPurchase) * item.quantity) }} TL
              </div>
            </div>
          </div>

          <div class="detail-total-row">
            <span>Genel Toplam</span>
            <strong class="grand-total">{{ formatCurrency(selectedOrder.totalPrice) }} TL</strong>
          </div>
        </div>

        <div class="modal-footer">
          <button
            v-if="selectedOrder.status === 'beklemede'"
            class="btn btn-danger-outline"
            :disabled="cancellingId === selectedOrder.id"
            @click="handleCancelOrder(selectedOrder)"
          >
            {{ cancellingId === selectedOrder.id ? 'İptal Ediliyor...' : '🚫 Siparişi İptal Et' }}
          </button>
          <button class="btn btn-secondary" @click="selectedOrder = null">Kapat</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-orders-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px 16px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 1.8rem;
  margin: 0 0 6px 0;
}

.sub-title {
  color: var(--color-slate);
  font-size: 0.9rem;
  margin: 0;
}

.loading-box {
  text-align: center;
  padding: 60px;
  color: var(--color-slate);
}

.empty-orders {
  text-align: center;
  padding: 48px 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
}

.empty-icon {
  font-size: 3.5rem;
  margin-bottom: 12px;
}

.empty-orders h2 {
  margin-bottom: 8px;
}

.empty-orders p {
  color: var(--color-slate);
  margin-bottom: 20px;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.order-card {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: transform 0.2s, border-color 0.2s;
}

.order-card:hover {
  border-color: rgba(68, 214, 44, 0.4);
}

.order-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-line);
}

.order-no {
  font-weight: 700;
  font-size: 1.05rem;
  margin-right: 12px;
}

.order-date {
  color: var(--color-slate);
  font-size: 0.82rem;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}
.badge-pending {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}
.badge-info {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}
.badge-shipping {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.3);
}
.badge-success {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}
.badge-danger {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.order-card-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.items-preview {
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-thumb {
  position: relative;
  width: 54px;
  height: 54px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: #1e293b;
  border: 1px solid var(--color-line);
}

.item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.qty-tag {
  position: absolute;
  bottom: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 4px;
}

.more-items {
  font-size: 0.82rem;
  color: var(--color-slate);
  font-weight: 600;
}

.order-summary {
  display: flex;
  align-items: center;
  gap: 24px;
}

.address-preview span {
  font-size: 0.85rem;
  font-weight: 600;
}

.address-line {
  font-size: 0.8rem;
  color: var(--color-slate);
  margin: 2px 0 0 0;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.total-price {
  text-align: right;
}

.total-price .label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-slate);
}

.total-price .amount {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--color-volt);
}

.order-card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--color-line);
}

.btn-sm {
  padding: 8px 16px;
  font-size: 0.88rem;
  font-weight: 600;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff !important;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-secondary:hover {
  background: rgba(68, 214, 44, 0.22);
  border-color: var(--color-volt);
  color: var(--color-volt) !important;
  box-shadow: 0 0 12px rgba(68, 214, 44, 0.3);
}

.btn-danger-outline {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5 !important;
  border: 1px solid rgba(239, 68, 68, 0.45);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
  font-weight: 600;
}

.btn-danger-outline:hover {
  background: rgba(239, 68, 68, 0.3);
  color: #ffffff !important;
  border-color: #ef4444;
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.3);
}

/* MODAL */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(6px);
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
  max-width: 650px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-line);
}

.modal-header h2 {
  margin: 0 0 4px 0;
  font-size: 1.4rem;
}

.order-date-modal {
  font-size: 0.82rem;
  color: var(--color-slate);
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 1.2rem;
  font-weight: 700;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.25);
  border-color: #f87171;
  color: #f87171;
  transform: rotate(90deg);
}

.status-box {
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  margin-bottom: 20px;
  font-size: 0.9rem;
}
.status-box p {
  margin: 4px 0 0 0;
  font-size: 0.82rem;
  opacity: 0.9;
}

.detail-address-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-line);
  padding: 14px;
  border-radius: var(--radius-sm);
  margin-bottom: 20px;
  font-size: 0.88rem;
}

.detail-address-card p {
  margin: 2px 0;
}

.modal-body h3 {
  font-size: 1rem;
  margin: 16px 0 10px 0;
}

.detail-items-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.detail-item-row {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(255, 255, 255, 0.02);
  padding: 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-line);
}

.detail-item-img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 6px;
  background: #1e293b;
}

.detail-item-info {
  flex: 1;
}

.detail-item-info h4 {
  margin: 0 0 4px 0;
  font-size: 0.92rem;
}

.item-unit-price {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-slate);
}

.detail-item-total {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-volt);
}

.detail-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  background: rgba(68, 214, 44, 0.06);
  border: 1px solid rgba(68, 214, 44, 0.2);
  border-radius: var(--radius-sm);
}

.grand-total {
  font-size: 1.3rem;
  color: var(--color-volt);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--color-line);
}

@media (max-width: 600px) {
  .order-card-body {
    flex-direction: column;
    align-items: flex-start;
  }
  .order-summary {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
