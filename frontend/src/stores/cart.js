import { defineStore } from 'pinia'
import api from '../api/axios'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [], // backend'den gelen CartItem listesi (her biri Product bilgisiyle beraber gelir)
  }),

  getters: {
    itemCount: (state) => state.items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: (state) =>
      state.items.reduce((sum, item) => sum + Number(item.Product.price) * item.quantity, 0),
  },

  actions: {
    async fetchCart() {
      const res = await api.get('/cart')
      this.items = res.data
    },

    async addToCart(productId, quantity = 1) {
      await api.post('/cart', { productId, quantity })
      await this.fetchCart()
    },

    async updateQuantity(cartItemId, quantity) {
      await api.put(`/cart/${cartItemId}`, { quantity })
      await this.fetchCart()
    },

    async removeItem(cartItemId) {
      await api.delete(`/cart/${cartItemId}`)
      await this.fetchCart()
    },

    clearLocal() {
      this.items = []
    },
  },
})
