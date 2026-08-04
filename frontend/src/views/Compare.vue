<script setup>
import { computed } from 'vue'
import { useCompareStore } from '../stores/compare'
import { formatCurrency } from '../utils/format'

const compareStore = useCompareStore()

// Tüm ürünlerdeki teknik özellik anahtarlarının birleşimi (bir ürün RAM içermiyorsa "-" gösterilecek)
const allSpecKeys = computed(() => {
  const keys = new Set()
  compareStore.products.forEach((p) => {
    Object.keys(p.specs || {}).forEach((k) => keys.add(k))
  })
  return Array.from(keys)
})
</script>

<template>
  <div>
    <h1>Ürün Karşılaştırma</h1>

    <p v-if="compareStore.products.length === 0">
      Karşılaştırmak için ürün listesinden en fazla 3 ürün seçebilirsiniz.
    </p>

    <div v-else class="compare-wrapper">
      <table class="compare-table">
        <thead>
          <tr>
            <th></th>
            <th v-for="p in compareStore.products" :key="p.id">
              <img :src="p.imageUrl" :alt="p.name" />
              <p>{{ p.name }}</p>
              <button class="remove-btn" @click="compareStore.toggleCompare(p)">Kaldır</button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="row-label">Marka</td>
            <td v-for="p in compareStore.products" :key="p.id">{{ p.brand || '-' }}</td>
          </tr>
          <tr>
            <td class="row-label">Fiyat</td>
            <td v-for="p in compareStore.products" :key="p.id">{{ formatCurrency(p.price) }} TL</td>
          </tr>
          <tr>
            <td class="row-label">Stok</td>
            <td v-for="p in compareStore.products" :key="p.id">{{ p.stock }}</td>
          </tr>
          <tr v-for="key in allSpecKeys" :key="key">
            <td class="row-label">{{ key }}</td>
            <td v-for="p in compareStore.products" :key="p.id">{{ (p.specs && p.specs[key]) || '-' }}</td>
          </tr>
        </tbody>
      </table>

      <button class="clear-btn" @click="compareStore.clear()">Tümünü Temizle</button>
    </div>
  </div>
</template>

<style scoped>
.compare-table {
  width: 99%;
  border-collapse: collapse;
  background: var(--color-surface);
  border-radius: 8px;
  overflow: hidden;
  margin:0 auto;
}
.compare-table th, .compare-table td {
  border: 1px solid var(--color-line);
  padding: 10px;
  text-align: center;
}
.compare-table th img {
  width: 100px;
  height: 100px;
  object-fit: contain;
  padding: 6px;
  background: #0a0c14;
  border-radius: 6px;
  border: 1px solid var(--color-line);
  image-rendering: -webkit-optimize-contrast;
}
.row-label {
  font-weight: bold;
  background: var(--color-ink-soft);
  text-align: left !important;
}
.clear-btn {
  margin-top: 16px;
  background: rgba(255, 71, 87, 0.12);
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}
.remove-btn {
  background: var(--color-ink-soft);
  border: 1px solid var(--color-line);
  color: var(--color-ink);
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  margin-top: 6px;
}
</style>
