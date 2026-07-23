import { defineStore } from 'pinia'

const MAX_COMPARE = 3 // aynı anda en fazla 3 ürün karşılaştırılabilir

export const useCompareStore = defineStore('compare', {
  state: () => ({
    products: [], // karşılaştırmaya eklenen tam ürün objeleri (specs'e erişebilmek için)
  }),

  getters: {
    isInCompare: (state) => (productId) => state.products.some((p) => p.id === productId),
    count: (state) => state.products.length,
    isFull: (state) => state.products.length >= MAX_COMPARE,
  },

  actions: {
    toggleCompare(product) {
      const exists = this.products.find((p) => p.id === product.id)
      if (exists) {
        this.products = this.products.filter((p) => p.id !== product.id)
      } else if (this.products.length < MAX_COMPARE) {
        this.products.push(product)
      }
    },

    clear() {
      this.products = []
    },
  },
})
