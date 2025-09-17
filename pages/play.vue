<template>
    <div class="game-container">
        <button @click="goHome" class="home-button">🏠 Ana Sayfa</button>

        <!-- Görselleri önceden render et (gizli) -->
        <div v-if="gameStore.gameMode === 'classic' && gameStore.preloadedImages.length > 0" class="hidden-preload">
            <img v-for="(image, index) in gameStore.preloadedImages" :key="image.imageId" :src="image.imageUrl"
                :alt="`Soru ${index + 1} görseli`" @load="onImageLoad(index)" @error="onImageError(index)">
        </div>

        <!-- Zamanlı mod için görselleri önceden render et (gizli) -->
        <div v-if="gameStore.gameMode === 'time' && gameStore.timePreloadedImages.length > 0" class="hidden-preload">
            <img v-for="(image, index) in gameStore.timePreloadedImages" :key="image.imageId" :src="image.imageUrl"
                :alt="`Zamanlı mod görsel ${index + 1}`" @load="onImageLoad(index)" @error="onImageError(index)">
        </div>

        <!-- Mod Tanıtım Ekranı -->
        <div v-if="gameStore.showModeIntro" class="intro-card">
            <div class="intro-content">
                <h2 class="intro-title">
                    {{ gameStore.gameMode === 'classic' ? '📚 Klasik Mod' : '⚡ Zamana Karşı Mod' }}
                </h2>

                <!-- Klasik Mod Açıklaması -->
                <div v-if="gameStore.gameMode === 'classic'" class="intro-description">
                    <p class="intro-text">🎯 <strong>10 farklı görsel</strong> ile karşılaşacaksınız</p>
                    <p class="intro-text">🤔 Her görselin <strong>AI</strong> mi yoksa <strong>İnsan</strong> yapımı mı
                        olduğunu tahmin edin</p>
                    <p class="intro-text">📊 Sonunda <strong>başarı oranınızı</strong> görün</p>
                    <p class="intro-text">⏰ Zaman sınırı yok, rahatça düşünebilirsiniz</p>
                </div>

                <!-- Zamanlı Mod Açıklaması -->
                <div v-else class="intro-description">
                    <p class="intro-text">⚡ <strong>30 saniye</strong> içinde mümkün olduğunca çok soru cevaplayın</p>
                    <p class="intro-text">🏆 Hızlı cevap verin, daha çok puan kazanın!</p>
                    <p class="intro-text">🚀 <strong>0-2 saniye:</strong> 100 puan | <strong>2-5 saniye:</strong> 75
                        puan</p>
                    <p class="intro-text">⚡ <strong>5-8 saniye:</strong> 50 puan | <strong>8+ saniye:</strong> 25 puan
                    </p>
                    <p class="intro-text">⏱️ Süre bitince oyun otomatik sonlanır</p>
                </div>

                <!-- Yükleme Durumu -->
                <div v-if="gameStore.gameMode === 'classic' && !gameStore.imagesPreloaded" class="loading-status">
                    <div class="spinner-small"></div>
                    <p>Görseller hazırlanıyor...</p>
                </div>

                <!-- Bir daha gösterme seçeneği -->
                <div v-if="gameStore.gameMode === 'time' || gameStore.imagesPreloaded" class="skip-intro-option">
                    <label class="checkbox-container">
                        <input type="checkbox" v-model="skipIntroNext" class="checkbox">
                        <span class="checkmark"></span>
                        <span class="checkbox-text">Bu tanıtımı bir daha gösterme</span>
                    </label>
                </div>

                <!-- Başlat Butonu -->
                <button v-if="gameStore.gameMode === 'time' || gameStore.imagesPreloaded"
                    @click="startGameWithPreference()" class="start-game-btn">
                    🚀 Oyuna Başla
                </button>
            </div>
        </div>

        <!-- Oyun Ekranı -->
        <div v-else-if="gameStore.currentImage || gameStore.isLoading" class="game-card">
            <!-- Klasik Mod: Soru Sayacı -->
            <div v-if="gameStore.gameMode === 'classic'" class="progress-bar-container">
                <div class="progress-bar" :style="{ width: (gameStore.currentQuestionIndex / 10) * 100 + '%' }"></div>
            </div>

            <!-- Zamanlı Mod: Süre Sayacı -->
            <div v-if="gameStore.gameMode === 'time'" class="progress-bar-container">
                <div class="timer-bar" :style="{ width: (gameStore.timeRemaining / 30) * 100 + '%' }"></div>
            </div>

            <div class="game-header">
                <!-- Klasik Mod Başlığı -->
                <template v-if="gameStore.gameMode === 'classic'">
                    <p>Soru {{ gameStore.currentQuestionIndex + 1 }} / 10</p>
                    <div class="score">
                        <span>✔️ {{ gameStore.classicScore.correct }}</span>
                        <span>❌ {{ gameStore.classicScore.incorrect }}</span>
                    </div>
                </template>

                <!-- Zamanlı Mod Başlığı -->
                <template v-if="gameStore.gameMode === 'time'">
                    <p>⏱️ {{ Math.ceil(gameStore.timeRemaining) }}s</p>
                    <div class="score">
                        <span>🏆 {{ gameStore.timeAttackScore }} Puan</span>
                    </div>
                </template>
            </div>

            <div class="question-content">
                <!-- Resim yükleme alanı -->
                <div class="image-container">
                    <!-- API'den resim beklenirken lokalize spinner -->
                    <div v-if="gameStore.isLoading" class="image-loading">
                        <div class="image-spinner"></div>
                        <p>Resim yükleniyor...</p>
                    </div>

                    <!-- Klasik Mod: Önceden yüklenmiş görseller -->
                    <div v-else-if="gameStore.gameMode === 'classic'" class="preloaded-images-container">
                        <img v-for="(image, index) in gameStore.preloadedImages" :key="image.imageId"
                            :src="image.imageUrl" :alt="`Soru ${index + 1} görseli`" class="question-image"
                            :class="{ 'active': index === gameStore.currentQuestionIndex }" @load="onImageLoad(index)"
                            @error="onImageError(index)">
                    </div>

                    <!-- Zamanlı Mod: Tek görsel (eski yöntem) -->
                    <img v-else-if="gameStore.currentImage" :src="gameStore.currentImage.imageUrl" alt="Soru görseli"
                        class="question-image">

                    <!-- Fallback: Resim yoksa placeholder -->
                    <div v-else class="image-placeholder">
                        <p>Resim yükleniyor...</p>
                    </div>
                </div>
            </div>

            <!-- Cevap verilmediyse butonları göster -->
            <div v-if="gameStore.lastAnswerCorrect === null && !gameStore.isLoading" class="answer-buttons">
                <button @click="gameStore.answerQuestion('human')" :disabled="gameStore.isLoading">👨‍🎨 İnsan
                    Yapımı</button>
                <button @click="gameStore.answerQuestion('ai')" :disabled="gameStore.isLoading">🤖 AI Yapımı</button>
            </div>

            <!-- Cevap verildiyse sonucu göster -->
            <div v-if="gameStore.lastAnswerCorrect !== null" class="feedback-container">
                <div v-if="gameStore.lastAnswerCorrect" class="feedback correct">
                    <p>🎉 Doğru!</p>
                    <!-- Zamanlı modda kazanılan puanı göster -->
                    <div v-if="gameStore.gameMode === 'time'" class="points-earned">
                        +{{ getLastEarnedPoints() }} Puan Kazandın!
                    </div>
                </div>
                <div v-else class="feedback incorrect">
                    <p>😞 Yanlış! Doğru cevap: {{ gameStore.lastCorrectAnswerIsAI ? 'AI Yapımı' : 'İnsan Yapımı' }}</p>
                </div>
                <!-- Sadece klasik modda sonraki soru butonu göster -->
                <button v-if="gameStore.gameMode === 'classic'" @click="gameStore.nextQuestion()" class="next-button">
                    Sonraki Soru →
                </button>
            </div>
        </div>

        <!-- Oyunun başlangıcında veya yönlendirme sırasında bir fallback -->
        <div v-else class="loading-indicator">
            Oyuna başlanıyor...
        </div>
    </div>
</template>

<script setup>
import { useGameStore } from '/composables/store/game'
import { useRouter } from 'vue-router';
import { onMounted, watch, ref } from 'vue';

const gameStore = useGameStore();
const router = useRouter();
const loadedImages = ref(new Set());
const skipIntroNext = ref(false);

const goHome = () => {
    gameStore.resetGame();
    router.push('/');
};

const onImageLoad = (index) => {
    loadedImages.value.add(index);
};

const onImageError = (index) => {
    console.error(`Görsel ${index + 1} yüklenemedi`);
};

const startGameWithPreference = () => {
    if (skipIntroNext.value && gameStore.gameMode) {
        gameStore.setSkipIntro(gameStore.gameMode, true);
    }
    gameStore.startActualGame();
};

const getLastEarnedPoints = () => {
    return gameStore.lastEarnedPoints || 0;
};

// Oyun bittiğinde sonuçlar sayfasına yönlendir
watch(() => gameStore.gameFinished, (isFinished) => {
    if (isFinished) {
        router.push('/results');
    }
});

onMounted(() => {
    // Eğer sayfaya doğrudan gelindiyse veya mod seçilmemişse ana sayfaya dön
    if (!gameStore.gameMode) {
        router.push('/');
    }
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');

.game-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    width: 100%;
    font-family: 'Poppins', sans-serif;
    background: linear-gradient(160deg, #8a71c9 0%, #5b4d8c 100%);
    padding: 20px;
}

.game-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(25px);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    padding: 30px;
    width: 90%;
    max-width: 600px;
    text-align: center;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
    color: #fff;
}

/* Tablet ve büyük ekranlar için */
@media (min-width: 768px) {
    .game-card {
        max-width: 700px;
        padding: 40px;
    }
}

/* Desktop ekranlar için */
@media (min-width: 1024px) {
    .game-card {
        max-width: 800px;
        padding: 50px;
    }
}

/* Büyük desktop ekranlar için */
@media (min-width: 1440px) {
    .game-card {
        max-width: 900px;
        padding: 60px;
    }
}

.home-button {
    position: fixed;
    top: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.2);
    color: #fff;
    padding: 8px 12px;
    border-radius: 10px;
    border: none;
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.3s ease;
    font-family: 'Poppins', sans-serif;
    z-index: 1000;
}

.home-button:hover {
    background: rgba(0, 0, 0, 0.4);
}

.progress-bar-container {
    width: 100%;
    height: 8px;
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    margin-bottom: 20px;
    overflow: hidden;
}

.progress-bar {
    height: 100%;
    background-color: #2ecc71;
    border-radius: 4px;
    transition: width 0.5s ease;
}

.timer-bar {
    height: 100%;
    background-color: #f39c12;
    border-radius: 4px;
    transition: width 0.5s linear;
}

.game-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    font-size: 0.9rem;
    color: #e0e0e0;
}

.score span {
    margin-left: 15px;
}

.question-content {
    margin-bottom: 30px;
}

.question-image {
    width: 100%;
    max-height: 400px;
    border-radius: 16px;
    margin-bottom: 15px;
    object-fit: contain;
    /* border: 2px solid rgba(255, 255, 255, 0.1); */
    /* background-color: rgba(0, 0, 0, 0.1); */
}

/* Büyük ekranlar için resim boyutunu artır */
@media (min-width: 768px) {
    .question-image {
        max-height: 450px;
    }
}

@media (min-width: 1024px) {
    .question-image {
        max-height: 500px;
    }
}

.answer-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

.answer-buttons button {
    padding: 15px;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-family: 'Poppins', sans-serif;
}

.answer-buttons button:first-child {
    background-color: #3498db;
    color: white;
}

.answer-buttons button:last-child {
    background-color: #9b59b6;
    color: white;
}

.answer-buttons button:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.feedback-container {
    margin-top: 20px;
}

.feedback {
    padding: 15px;
    border-radius: 12px;
    margin-bottom: 20px;
    font-size: 1.1rem;
    font-weight: 600;
}

.feedback.correct {
    background-color: rgba(46, 204, 113, 0.8);
    color: white;
    padding: 10px;
}

.feedback.incorrect {
    background-color: rgba(231, 76, 60, 0.8);
    color: white;
}

.points-earned {
    font-size: 1rem;
    font-weight: 600;
    margin-top: 8px;
    background: rgba(255, 255, 255, 0.2);
    padding: 8px 15px;
    border-radius: 8px;
    color: #f1c40f;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.next-button {
    width: 100%;
    padding: 15px;
    font-size: 1.1rem;
    font-weight: 600;
    color: #fff;
    background-color: #2979ff;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: background-color 0.3s ease;
    font-family: 'Poppins', sans-serif;
}

.next-button:hover {
    background-color: #0056b3;
}

.preloaded-images-container {
    position: relative;
    width: 100%;
    max-height: 400px;
    margin-bottom: 15px;
}

.question-image {
    width: 100%;
    max-height: 400px;
    border-radius: 16px;
    object-fit: contain;
    transition: opacity 0.3s ease;
}

/* Klasik mod için görsel gösterim kontrolü */
.preloaded-images-container .question-image {
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0;
    visibility: hidden;
}

.preloaded-images-container .question-image.active {
    opacity: 1;
    visibility: visible;
    position: relative;
}

/* Mod Tanıtım Ekranı Stilleri */
.intro-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(25px);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    padding: 40px;
    width: 90%;
    max-width: 600px;
    text-align: center;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
    color: #fff;
}

.intro-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 25px;
}

.intro-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0;
    text-align: center;
}

.intro-description {
    display: flex;
    flex-direction: column;
    gap: 15px;
    text-align: left;
    width: 100%;
}

.intro-text {
    font-size: 1.1rem;
    line-height: 1.6;
    margin: 0;
    padding: 12px 0;
    border-left: 4px solid rgba(255, 255, 255, 0.3);
    padding-left: 15px;
}

.loading-status {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    color: #e0e0e0;
    font-size: 1rem;
}

.spinner-small {
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top: 4px solid #8a71c9;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
}

.start-game-btn {
    background: linear-gradient(45deg, #2ecc71, #27ae60);
    color: white;
    font-size: 1.3rem;
    font-weight: 700;
    padding: 18px 40px;
    border: none;
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-family: 'Poppins', sans-serif;
    box-shadow: 0 6px 20px rgba(46, 204, 113, 0.3);
}

.start-game-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(46, 204, 113, 0.5);
}

/* Checkbox stilleri */
.skip-intro-option {
    width: 100%;
    display: flex;
    justify-content: center;
}

.checkbox-container {
    display: flex;
    align-items: center;
    cursor: pointer;
    user-select: none;
    font-size: 0.95rem;
    color: #e0e0e0;
    gap: 10px;
}

.checkbox {
    display: none;
}

.checkmark {
    height: 20px;
    width: 20px;
    background-color: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    position: relative;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.checkbox-container:hover .checkmark {
    background-color: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
}

.checkbox:checked~.checkmark {
    background-color: #2ecc71;
    border-color: #2ecc71;
}

.checkmark:after {
    content: "";
    position: absolute;
    display: none;
    width: 5px;
    height: 10px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}

.checkbox:checked~.checkmark:after {
    display: block;
}

.checkbox-text {
    font-weight: 500;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

/* Responsive tasarım */
@media (min-width: 768px) {
    .intro-card {
        max-width: 700px;
        padding: 50px;
    }

    .intro-title {
        font-size: 3rem;
    }

    .intro-text {
        font-size: 1.2rem;
    }
}

@media (min-width: 1024px) {
    .intro-card {
        max-width: 800px;
        padding: 60px;
    }
}

.loading-indicator {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px;
    font-size: 1.2rem;
    color: #fff;
    font-weight: 600;
}

/* Gizli preload alanı - görselleri önceden yükler ama göstermez */
.hidden-preload {
    position: absolute;
    top: -9999px;
    left: -9999px;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
}

.hidden-preload img {
    width: 1px;
    height: 1px;
}

/* Resim yükleme alanı stilleri */
.image-container {
    position: relative;
    width: 100%;
    min-height: 400px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.image-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    color: #e0e0e0;
    font-size: 1rem;
    height: 400px;
    justify-content: center;
}

.image-spinner {
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top: 4px solid #8a71c9;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin 1s linear infinite;
}

.image-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 400px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 16px;
    color: #e0e0e0;
    font-size: 1rem;
}
</style>
```
