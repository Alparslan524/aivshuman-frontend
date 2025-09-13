<template>
  <div class="main-container">
    <div class="card">
      <img src="/public/logo.png" alt="AivsHuman Logo" class="main-logo" />
      <h1><span style="color: #c039f4;">AI</span> vs <span style="color: black;">Human</span></h1>
      <p class="subtitle">AI mı İnsan mı? Zekânı test et!</p>

      <div class="mode-selection-container">
        <div class="mode-card" :class="{ 'selected': selectedMode === 'classic' }" @click="selectMode('classic')">
          <div class="mode-header">
            <span class="mode-icon">🖼️</span>
            <h2>Görsel Mod</h2>
          </div>
          <p class="mode-description">
            <span class="status-dot classic"></span>
            10 soruda başarı oranını test et
          </p>
        </div>

        <!-- <div class="mode-card" :class="{ 'selected': selectedMode === 'time' }" @click="selectMode('time')">
          <div class="mode-header">
            <span class="mode-icon">⏱️</span>
            <h2>Zamana Karşı</h2>
          </div>
          <p class="mode-description">
            <span class="status-dot time"></span>
            30 saniyede en yüksek puanı topla
          </p>
        </div> -->
      </div>

      <p class="footer-text">Yapay zeka çağında insanlığını koru! 😎</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '/composables/store/game'

const router = useRouter()
const gameStore = useGameStore()
const selectedMode = ref(null)

const selectMode = (mode) => {
  selectedMode.value = mode
  gameStore.startGame(mode)
  router.push('/play')
}
</script>


<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  height: 100%;
}

body {
  font-family: 'Poppins', sans-serif;
  color: #f0f0f0;
  background: linear-gradient(160deg, #8a71c9 0%, #5b4d8c 100%);
  margin: 0;
}

.main-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 100vh;
}

.card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  padding: 40px;
  width: 90%;
  max-width: 450px;
  text-align: center;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
}

/* Tablet ve büyük ekranlar için */
@media (min-width: 768px) {
  .card {
    max-width: 600px;
    padding: 50px;
  }
}

/* Desktop ekranlar için */
@media (min-width: 1024px) {
  .card {
    max-width: 700px;
    padding: 60px;
  }
}

/* Büyük desktop ekranlar için */
@media (min-width: 1440px) {
  .card {
    max-width: 800px;
    padding: 70px;
  }
}

.main-logo {
  width: 100px;
  height: 100px;
  object-fit: contain;
  /* margin-bottom: 24px; */
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 8px;
  color: #fff;
}

.subtitle {
  font-size: 1rem;
  margin-bottom: 30px;
  color: #e0e0e0;
}

.mode-selection-container {
  margin-bottom: 30px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.mode-card {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 15px;
  padding: 20px;
  text-align: left;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.3s ease, background-color 0.3s ease;
}

.mode-card:hover {
  background: rgba(0, 0, 0, 0.25);
}

.mode-card.selected {
  border-color: #2979ff;
}

.mode-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.mode-icon {
  font-size: 1.5rem;
  margin-right: 12px;
}

.mode-header h2 {
  font-size: 1.2rem;
  font-weight: 600;
  color: #fff;
}

.mode-description {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  color: #dcdcdc;
  padding-left: 2px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 10px;
}

.status-dot.classic {
  background-color: #2ecc71;
}

.status-dot.time {
  background-color: #f39c12;
}

.start-button {
  width: 100%;
  padding: 16px;
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
  background-color: #2979ff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;
  margin-bottom: 25px;
  font-family: 'Poppins', sans-serif;
}

.start-button:hover {
  background-color: #0056b3;
  transform: translateY(-2px);
}

.start-button:disabled {
  background-color: #5a5a5a;
  cursor: not-allowed;
}

.footer-text {
  font-size: 0.85rem;
  color: #c0c0c0;
}
</style>
