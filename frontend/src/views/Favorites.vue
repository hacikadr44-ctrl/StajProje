<script setup>
import { onMounted } from 'vue'
import { useFavoritesStore } from '../stores/favorites'
import ProductCard from '../components/ProductCard.vue'

const favoritesStore = useFavoritesStore()

onMounted(() => {
  favoritesStore.fetchFavorites()
})
</script>

<template>
  <div>
    <h1>Favorilerim</h1>
    <p v-if="favoritesStore.items.length === 0">Henüz favori ürününüz yok.</p>
    <div v-else class="grid">
      <ProductCard v-for="item in favoritesStore.items" :key="item.id" :product="item.Product" />
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
</style>
