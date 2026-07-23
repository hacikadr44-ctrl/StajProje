<script setup>
import Navbar from './components/Navbar.vue'
import Footer from './components/Footer.vue'
</script>

<template>
  <div id="app">
    <Navbar />
    <!-- Sayfa içeriklerinin rahatça yayılabilmesi için sınırlayıcı kutuyu kaldırıyoruz -->
    <main class="main-content">
      <router-view />
    </main>
    <Footer />
  </div>
</template>

<style>
/* Ana taşıyıcının taşmasını engeller ama tam genişlik verir */
.main-content {
  width: 100%;
  overflow-x: hidden;
}
</style>