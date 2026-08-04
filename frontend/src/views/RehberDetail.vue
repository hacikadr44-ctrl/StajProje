<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api/axios'
import { formatCurrency } from '../utils/format'

const route = useRoute()
const router = useRouter()

const product = ref(null)
const loading = ref(true)
const errorMsg = ref('')

async function fetchProduct() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await api.get(`/products/${route.params.id}`)
    product.value = res.data
  } catch (err) {
    console.error('Rehber detayları yüklenirken hata oluştu:', err)
    errorMsg.value = 'Ürün detayları yüklenemedi. Lütfen daha sonra tekrar deneyin.'
  } finally {
    loading.value = false
  }
}

const specsEntries = computed(() => {
  if (!product.value?.specs) return []
  return Object.entries(product.value.specs)
})

// Dinamik Kategori Bazlı Özel Rehber İçeriği
const guideContent = computed(() => {
  if (!product.value) return null

  const categoryName = product.value.Category?.name || ''
  const nameLower = product.value.name.toLowerCase()

  if (categoryName === 'Monitör' || nameLower.includes('monitör') || nameLower.includes('odyssey') || nameLower.includes('ultragear')) {
    return {
      title: 'Monitör Satın Alma ve Kurulum Rehberi',
      tag: 'Görüntü Teknolojileri',
      intro: 'Görüntü kalitesi, yenileme hızı ve kavis derecesi rekabetçi oyunculukta farkı yaratan en kritik bileşenlerdir.',
      sections: [
        {
          heading: '🔴 OLED vs IPS/VA Panel Farkı',
          body: 'Seçtiğiniz bu üründeki panel teknolojisi (özellikle OLED ise), her pikselin kendi ışığını yaymasını sağlayarak gerçek siyah seviyeleri ve sonsuz kontrast sunar. IPS paneller ise geniş görüş açısı ve doğru renk üretimi sağlar. Oyunlarda pürüzsüzlük için panel tipini bütçenize ve kullanım amacınıza göre optimize etmelisiniz.'
        },
        {
          heading: '⚡ Yenileme Hızı (Hz) ve Tepki Süresi (ms)',
          body: 'Yüksek Hz değerleri (144Hz, 240Hz veya 360Hz) saniyede çizilen kare sayısını artırır. Gözümüzün akıcılığı hissetmesi için bu değerlerin yüksek olması önemlidir. 0.03ms ila 1ms arasındaki düşük tepki süreleri ise hareketli sahnelerde gölgelenme (ghosting) efektini sıfıra indirir.'
        },
        {
          heading: '📐 Kavis Derecesi (1000R / 1800R) Ne İşe Yarar?',
          body: 'Kavisli ekranlar, gözünüzün ekranın her noktasına olan mesafesini eşitleyerek göz yorgunluğunu azaltır ve görüş alanınızı genişletir. 1000R, insan gözünün doğal görüş kavisini taklit eden en ideal kavis derecesidir.'
        }
      ]
    }
  }

  if (categoryName === 'Laptop' || nameLower.includes('laptop') || nameLower.includes('notebook') || nameLower.includes('computer')) {
    return {
      title: 'Yüksek Performanslı Laptop Kullanma Kılavuzu',
      tag: 'Taşınabilir Sistemler',
      intro: 'Yeni nesil işlemciler ve ekran kartları, yüksek gücü kompakt gövdelerde sunarken doğru termal yönetim gerektirir.',
      sections: [
        {
          heading: '🔥 Sıcaklık Yönetimi ve Soğutma Standartları',
          body: 'Oyuncu bilgisayarlarında termal darboğazı (throttling) engellemek için cihazın hava çıkış kanallarını kapatmamalısınız. Üründe kullanılan gelişmiş fan sistemleri ve sıvı metal macunlar ısının hızlıca uzaklaştırılmasını sağlar. Ağır yük altındayken laptop standı kullanmak sıcaklığı 3-5 derece düşürür.'
        },
        {
          heading: '🤖 NVIDIA DLSS ve Yapay Zeka Kare Üretimi',
          body: 'Cihazınızdaki RTX grafik kartı, DLSS teknolojisini destekler. Derin Öğrenme Destekli Süper Örnekleme (DLSS) sayesinde oyunların çözünürlüğü yapay zeka ile yükseltilir ve kare hızınız (FPS) görüntü kalitesinden ödün vermeden iki kata kadar artar.'
        },
        {
          heading: '🔋 Pil Ömrü ve Güç Modları',
          body: 'Maksimum oyun ve render performansı elde etmek için cihazı mutlaka prize takılı kullanmalısınız. Batarya modunda Windows/Geliştirici yazılım üzerinden "Hibrit Grafik / ECO Modu" seçilerek günlük kullanımda pil ömrünü 8+ saate çıkarabilirsiniz.'
        }
      ]
    }
  }

  if (categoryName === 'Klavye' || nameLower.includes('klavye') || nameLower.includes('keyboard')) {
    return {
      title: 'Mekanik Klavye Switch ve Donanım Rehberi',
      tag: 'Oyuncu Ekipmanları',
      intro: 'Tepki sürelerinin mili saniyelerle ölçüldüğü arenada klavye switch yapınız en hayati kararınızdır.',
      sections: [
        {
          heading: '🧲 Manyetik Hall Effect Switch Nedir?',
          body: 'Geleneksel mekanik switchlerin aksine, manyetik switchler tuş basışını bir mıknatısın mesafesini ölçerek algılar. Bu sayede tuşun basış algılama noktasını (Actuation Point) 0.1mm gibi ultra hassas bir değere çekerek anlık tepkiler verebilirsiniz.'
        },
        {
          heading: '🎯 Rapid Trigger Teknolojisi',
          body: 'Valorant, CS2 gibi taktiksel nişancı oyunlarında hareketinizi anında durdurup atış doğruluğu kazanmak (counter-strafe) için elinizi tuştan kaldırdığınız milisaniyede tuşun girdiyi sıfırlaması gerekir. Rapid Trigger bunu donanımsal olarak mükemmel yapar.'
        },
        {
          heading: '🔊 Gasket Mount Yapısı ve Akustik',
          body: 'Klavyedeki tuş sesinin tok olması ve basım hissiyatının yumuşak olması için iç kısımda gasket (conta) montajı ve çok katmanlı köpük yalıtım kullanılır. Bu sayede hem yazı yazarken hem de oyun oynarken kusursuz bir ses akustiği elde edersiniz.'
        }
      ]
    }
  }

  // Varsayılan Rehber
  return {
    title: `${product.value.brand} Teknoloji İnceleme ve Kullanım Rehberi`,
    tag: 'Teknoloji Rehberi',
    intro: 'Bu ürünün sunduğu teknik özelliklerin günlük yaşantınıza ve oyun deneyiminize katkılarını inceliyoruz.',
    sections: [
      {
        heading: '💎 Tasarım ve Malzeme Kalitesi',
        body: 'Ürünün ergonomik yapısı ve kullanılan yüksek kaliteli alaşımlar, uzun ömürlü bir kullanıcı deneyimi hedeflenerek tasarlanmıştır. Markanın kendine has çizgileri estetik ve dayanıklılığı birleştirir.'
      },
      {
        heading: '🔌 Verimli Güç ve Entegrasyon',
        body: 'Günümüz teknoloji dünyasının en önemli kriteri enerji verimliliği ve ekosistem entegrasyonudur. Bu ürün, diğer cihazlarınızla senkronize olarak çalışabilecek modern bağlantı portları ve protokollerine sahiptir.'
      },
      {
        heading: '💡 Akıllı Özellikler ve Kullanım İpuçları',
        body: 'Üründen maksimum performansı almak için güncel sürücüleri ve destekleyici mobil/masaüstü yazılımları yüklemenizi öneririz. Bu sayede ince ayarlara erişerek ürünü kendinize göre kişiselleştirebilirsiniz.'
      }
    ]
  }
})

onMounted(() => {
  fetchProduct()
})
</script>

<template>
  <div class="rehber-detail-page">
    <div class="container py-5">
      <!-- Geri Dön Butonu -->
      <RouterLink to="/" class="btn-back">
        <span class="arrow">←</span> Ana Sayfaya Dön
      </RouterLink>

      <!-- Yükleniyor Durumu -->
      <div v-if="loading" class="loader-container">
        <div class="neon-spinner"></div>
        <p>Rehber detayları yükleniyor...</p>
      </div>

      <!-- Hata Durumu -->
      <div v-else-if="errorMsg" class="error-container card">
        <p class="error-text">❌ {{ errorMsg }}</p>
        <button @click="fetchProduct" class="btn-retry">Tekrar Dene</button>
      </div>

      <!-- Ana İçerik -->
      <div v-else-if="product" class="rehber-grid-layout">
        <!-- Sol Sütun: Görsel ve Satın Alma Kartı -->
        <div class="rehber-sidebar">
          <div class="sticky-box">
            <div class="rehber-image-box">
              <img :src="product.imageUrl" :alt="product.name" class="rehber-img-full" />
            </div>

            <div class="purchase-box card tracking-light-box">
              <div class="product-price-info">
                <span class="brand-badge">{{ product.brand }}</span>
                <span class="product-price price-mono">{{ formatCurrency(product.price) }} TL</span>
              </div>
              <h3 class="product-title-sidebar">{{ product.name }}</h3>
              <p class="stock-info" :class="{ 'in-stock': product.stock > 0, 'out-of-stock': product.stock <= 0 }">
                ● {{ product.stock > 0 ? `Stokta Var (${product.stock} adet)` : 'Stokta Yok' }}
              </p>
              <RouterLink :to="`/urun/${product.id}`" class="btn-buy-now">
                <span>Ürünü Satın Al</span>
                <span class="arrow">→</span>
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- Sağ Sütun: Teknik Detaylar ve Tekno Rehber -->
        <div class="rehber-content-section">
          <!-- Başlık ve Meta Bilgisi -->
          <div class="guide-header">
            <span class="guide-category-tag">{{ guideContent.tag }}</span>
            <h1 class="guide-main-title">{{ guideContent.title }}</h1>
            <p class="guide-intro">{{ guideContent.intro }}</p>
          </div>

          <!-- Ürün Açıklaması (Siteden Alınan Bilgi) -->
          <div class="guide-section-block card">
            <h3 class="section-title">📝 Ürün Açıklaması</h3>
            <p class="section-body-text">{{ product.description }}</p>
          </div>

          <!-- Teknik Özellikler (Karttan Alınan Bilgi) -->
          <div class="guide-section-block card" v-if="specsEntries.length > 0">
            <h3 class="section-title">⚙️ Teknik Donanım Detayları</h3>
            <div class="specs-table">
              <div v-for="[key, val] in specsEntries" :key="key" class="specs-row">
                <span class="spec-name">{{ key }}</span>
                <span class="spec-val">{{ val }}</span>
              </div>
            </div>
          </div>

          <!-- Bizim Eklediğimiz Teknik Rehber Bilgileri -->
          <div class="guide-sections">
            <div v-for="(sec, idx) in guideContent.sections" :key="idx" class="guide-section-block card guide-info-card">
              <h3 class="section-title text-volt">{{ sec.heading }}</h3>
              <p class="section-body-text">{{ sec.body }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rehber-detail-page {
  background: var(--color-bg);
  min-height: 100vh;
  color: white;
  padding-top: 40px;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-slate);
  text-decoration: none;
  font-weight: 700;
  font-size: 0.95rem;
  margin-bottom: 30px;
  transition: all 0.25s ease;
  border: 1px solid var(--color-line);
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.01);
}

.btn-back:hover {
  color: var(--color-volt);
  border-color: var(--color-volt);
  transform: translateX(-4px);
  box-shadow: 0 0 10px rgba(223, 249, 251, 0.15);
}

.btn-back .arrow {
  transition: transform 0.25s;
}

/* Yükleniyor ve Hata */
.loader-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 20px;
}

.neon-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(223, 249, 251, 0.1);
  border-radius: 50%;
  border-top-color: var(--color-volt);
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Grid Layout */
.rehber-grid-layout {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 40px;
  align-items: start;
}

/* Sol Sütun */
.rehber-sidebar {
  position: relative;
}

.sticky-box {
  position: sticky;
  top: 100px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.rehber-image-box {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  height: 300px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1.5px solid var(--color-line);
  padding: 10px;
}

.rehber-img-full {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.purchase-box {
  padding: 24px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-line);
  border-radius: 12px;
}

.product-price-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.brand-badge {
  background: rgba(223, 249, 251, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-slate);
}

.product-price {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--color-volt);
}

.product-title-sidebar {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0 0 10px 0;
  line-height: 1.4;
}

.stock-info {
  font-size: 0.8rem;
  font-weight: 700;
  margin-bottom: 20px;
}

.stock-info.in-stock {
  color: var(--color-success);
}

.stock-info.out-of-stock {
  color: var(--color-danger);
}

.btn-buy-now {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  background: var(--color-volt);
  color: #0a0c14;
  text-decoration: none;
  font-weight: 800;
  padding: 14px 20px;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.btn-buy-now:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(223, 249, 251, 0.3);
}

/* Sağ Sütun */
.rehber-content-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.guide-header {
  border-bottom: 1.5px solid var(--color-line);
  padding-bottom: 20px;
}

.guide-category-tag {
  color: var(--color-volt);
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.guide-main-title {
  font-size: 2.2rem;
  font-weight: 900;
  margin: 10px 0;
  line-height: 1.25;
}

.guide-intro {
  font-size: 1.1rem;
  color: var(--color-slate);
  line-height: 1.5;
  margin: 0;
}

.guide-section-block {
  padding: 24px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-line);
  border-radius: 12px;
}

.section-title {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0 0 16px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 10px;
}

.section-title.text-volt {
  color: var(--color-volt);
}

.section-body-text {
  font-size: 0.95rem;
  color: var(--color-slate);
  line-height: 1.7;
  margin: 0;
}

/* Teknik Özellikler Tablosu */
.specs-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.specs-row {
  display: flex;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.04);
}

.specs-row:last-child {
  border-bottom: none;
}

.spec-name {
  color: var(--color-slate);
  font-weight: 600;
}

.spec-val {
  font-weight: 700;
}

.guide-info-card {
  transition: transform 0.2s, border-color 0.2s;
}

.guide-info-card:hover {
  transform: translateY(-2px);
  border-color: rgba(223, 249, 251, 0.15);
}

@media (max-width: 992px) {
  .rehber-grid-layout {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  .sticky-box {
    position: static;
  }
  .guide-main-title {
    font-size: 1.8rem;
  }
}
</style>
