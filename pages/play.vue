<template>
    <div class="game-container">
        <button @click="goHome" class="home-button">🏠 Ana Sayfa</button>
        <div v-if="gameStore.currentImage || gameStore.isLoading" class="game-card">
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
                    <p>⏱️ {{ gameStore.timeRemaining }}s</p>
                    <div class="score">
                        <span>🏆 {{ gameStore.timeAttackScore }} Puan</span>
                    </div>
                </template>
            </div>

            <div class="question-content">
                <!-- API'den resim beklenirken yükleme göstergesi -->
                <div v-if="gameStore.isLoading" class="loading-indicator">Yükleniyor...</div>
                <!-- Resim yüklendiğinde göster -->
                <img v-else-if="gameStore.currentImage" :src="gameStore.currentImage.imageUrl" alt="Soru görseli"
                    class="question-image">
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
import { onMounted, watch } from 'vue';

const gameStore = useGameStore();
const router = useRouter();

const goHome = () => {
    gameStore.resetGame();
    router.push('/');
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
    font-size: 0.9rem;
    font-weight: 400;
    margin-top: 5px;
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
</style>
