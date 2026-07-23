<script setup>
import { onMounted } from 'vue'
import { useCartStore } from '../stores/cart'

const cartStore = useCartStore()

onMounted(() => {
  cartStore.fetchCart()
})

function increaseQty(item) {
  if (item.quantity < item.Product.stock) {
    cartStore.updateQuantity(item.id, item.quantity + 1)
  }
}
function decreaseQty(item) {
  if (item.quantity > 1) {
    cartStore.updateQuantity(item.id, item.quantity - 1)
  }
}
</script>

<template>
  <div class="cart-page">
    <h1>🛒 Sepetim</h1>

    <div v-if="cartStore.items.length === 0" class="empty-cart card">
      <div class="empty-icon">🛒</div>
      <h2>Sepetiniz Boş</h2>
      <p>Alışverişe başlamak için ürünlerimize göz atın.</p>
      <RouterLink to="/"><button class="btn-primary">Alışverişe Başla</button></RouterLink>
    </div>

    <div v-else class="cart-layout">
      <div class="cart-items">
        <div v-for="item in cartStore.items" :key="item.id" class="cart-row card">
          <RouterLink :to="`/urun/${item.Product.id}`" class="cart-img-link">
            <img :src="item.Product.imageUrl || 'https://placehold.co/80x80'" :alt="item.Product.name" />
          </RouterLink>
          <div class="cart-info">
            <RouterLink :to="`/urun/${item.Product.id}`" class="cart-product-name">{{ item.Product.name }}</RouterLink>
            <p class="cart-unit-price">{{ Number(item.Product.price).toFixed(2) }} TL</p>
          </div>
          <div class="qty-control">
            <button class="qty-btn" @click="decreaseQty(item)" :disabled="item.quantity <= 1">−</button>
            <span class="qty-val">{{ item.quantity }}</span>
            <button class="qty-btn" @click="increaseQty(item)" :disabled="item.quantity >= item.Product.stock">+</button>
          </div>
          <p class="line-total price-mono">{{ (item.Product.price * item.quantity).toFixed(2) }} TL</p>
          <button class="remove-btn" @click="cartStore.removeItem(item.id)" title="Kaldır">✕</button>
        </div>
      </div>

      <aside class="cart-summary card">
        <h3>Sipariş Özeti</h3>
        <div class="summary-row">
          <span>Ürünler ({{ cartStore.itemCount }} adet)</span>
          <span class="price-mono">{{ cartStore.totalPrice.toFixed(2) }} TL</span>
        </div>
        <div class="summary-row">
          <span>Kargo</span>
          <span class="free-shipping" v-if="cartStore.totalPrice >= 750">Ücretsiz 🎉</span>
          <span v-else class="price-mono">29.90 TL</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-row total">
          <span>Toplam</span>
          <span class="price-mono">{{ (cartStore.totalPrice + (cartStore.totalPrice >= 750 ? 0 : 29.90)).toFixed(2) }} TL</span>
        </div>
        <RouterLink to="/odeme"><button class="btn-primary checkout-btn">Siparişi Tamamla →</button></RouterLink>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.cart-page {
  max-width: 1100px;
  margin: 20px auto;
  padding: 0 16px;
}
h1 {
  margin-bottom: 24px;
}

/* Empty */
.empty-cart {
  text-align: center;
  padding: 60px 24px;
}
.empty-icon {
  font-size: 3rem;
  margin-bottom: 12px;
  opacity: 0.4;
}
.empty-cart h2 {
  margin: 0 0 8px;
}
.empty-cart p {
  color: var(--color-slate);
  margin: 0 0 20px;
}

/* Layout */
.cart-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  align-items: start;
}

/* Cart Items */
.cart-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 10px;
  padding: 14px 18px;
}
.cart-img-link {
  flex-shrink: 0;
}
.cart-row img {
  width: 72px;
  height: 72px;
  object-fit: contain;
  padding: 4px;
  border-radius: var(--radius-sm);
  background: #0a0c14;
  border: 1px solid var(--color-line);
  image-rendering: -webkit-optimize-contrast;
}
.cart-info {
  flex: 1;
  min-width: 0;
}
.cart-product-name {
  display: block;
  color: var(--color-ink);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cart-product-name:hover {
  color: var(--color-volt);
}
.cart-unit-price {
  margin: 0;
  font-size: 0.82rem;
  color: var(--color-slate);
  font-family: var(--font-mono);
}
.qty-control {
  display: flex;
  align-items: center;
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.qty-btn {
  background: var(--color-surface);
  border: none;
  width: 32px;
  height: 34px;
  font-size: 1rem;
  cursor: pointer;
  color: var(--color-ink);
  transition: all 0.15s;
}
.qty-btn:hover:not(:disabled) {
  background: rgba(68, 214, 44, 0.1);
  color: var(--color-volt);
}
.qty-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.qty-val {
  width: 36px;
  text-align: center;
  font-weight: 600;
  font-size: 0.9rem;
  border-left: 1px solid var(--color-line);
  border-right: 1px solid var(--color-line);
  padding: 6px 0;
}
.line-total {
  width: 110px;
  font-weight: 700;
  text-align: right;
  font-size: 0.95rem;
}
.remove-btn {
  background: rgba(255, 71, 87, 0.08);
  color: var(--color-danger);
  border: 1px solid rgba(255, 71, 87, 0.2);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.remove-btn:hover {
  background: rgba(255, 71, 87, 0.2);
  transform: scale(1.1);
}

/* Summary */
.cart-summary {
  position: sticky;
  top: 140px;
  padding: 24px;
}
.cart-summary h3 {
  margin: 0 0 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-line);
}
.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 0.9rem;
}
.summary-row.total {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--color-ink);
}
.free-shipping {
  color: var(--color-success);
  font-weight: 600;
}
.summary-divider {
  height: 1px;
  background: var(--color-line);
  margin: 12px 0;
}
.checkout-btn {
  width: 100%;
  margin-top: 16px;
  padding: 13px;
  font-size: 1rem;
}

@media (max-width: 800px) {
  .cart-layout {
    grid-template-columns: 1fr;
  }
  .cart-summary {
    position: static;
  }
  .cart-row {
    flex-wrap: wrap;
    gap: 10px;
  }
  .line-total {
    width: auto;
  }
}
</style>
