import axios from 'axios'

// Backend adresimiz. Deploy ederken burayı değiştirmen yeterli olacak.
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
})

// Her istekten önce çalışır: localStorage'daki token varsa isteğe otomatik ekler.
// Bu sayede her component'te "Authorization header'ı ekle" diye uğraşmıyoruz.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
