import { defineStore } from 'pinia'
import api from '../api/axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
  },

  actions: {
    async login(email, password) {
      const res = await api.post('/auth/login', { email, password })
      this.setSession(res.data)
      return res.data
    },

    async register(name, email, password) {
      const res = await api.post('/auth/register', { name, email, password })
      this.setSession(res.data)
      return res.data
    },

    async updateProfile(payload) {
      const res = await api.put('/auth/profile', payload)
      if (res.data.user) {
        this.user = res.data.user
        localStorage.setItem('user', JSON.stringify(res.data.user))
      }
      if (res.data.token) {
        this.token = res.data.token
        localStorage.setItem('token', res.data.token)
      }
      return res.data
    },

    async changePassword(payload) {
      const res = await api.put('/auth/password', payload)
      return res.data
    },

    async forgotPassword(email) {
      const res = await api.post('/auth/forgot-password', { email })
      return res.data
    },

    async resetPassword(payload) {
      const res = await api.post('/auth/reset-password', payload)
      return res.data
    },

    setSession({ token, user }) {
      this.token = token
      this.user = user
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },

    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
  },
})
