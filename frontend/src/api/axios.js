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

// Hata yönetimi interceptor'ı: Token süresi dolduğunda veya geçersiz olduğunda otomatik çıkış yapar.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLoginRequest) {
      // localStorage'ı temizleyerek çıkış yapılmış gibi davranıyoruz (Döngüsel bağımlılığı önlemek için)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // Giriş sayfasına yönlendir ve sayfayı temizle
      if (window.location.pathname !== '/giris') {
        window.location.href = '/giris'
      }
    }
    return Promise.reject(error)
  }
)

export default api
