import { defineStore } from 'pinia'
import api from '../api/axios'

export const useFavoritesStore = defineStore('favorites', {
  state: () => ({
    items: [], // backend'den gelen Favorite listesi (Product bilgisiyle beraber)
  }),

  getters: {
    // Bir ürünün favoride olup olmadığını hızlıca kontrol etmek için (kalp ikonunun dolu/boş görünmesi)
    isFavorite: (state) => (productId) => state.items.some((item) => item.productId === productId),
  },

  actions: {
    async fetchFavorites() {
      const res = await api.get('/favorites')
      this.items = res.data
    },

    async toggleFavorite(productId) {
      if (this.isFavorite(productId)) {
        await api.delete(`/favorites/${productId}`)
      } else {
        await api.post('/favorites', { productId })
      }
      await this.fetchFavorites()
    },

    clearLocal() {
      this.items = []
    },
  },
})
