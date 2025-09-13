import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// API'den gelen resim verisinin yapısını tanımlıyoruz.
interface ImageResponse {
  imageId: number
  imageUrl: string
}

export const useGameStore = defineStore('gameStore', () => {
  // --- STATE: Oyunun durumunu tutan değişkenler ---
  const currentImage = ref<ImageResponse | null>(null)
  const gameMode = ref<'classic' | 'time' | null>(null)

  // Sonuç ve skorlar
  const lastAnswerCorrect = ref<boolean | null>(null)
  const lastCorrectAnswerIsAI = ref<boolean | null>(null)
  const classicScore = ref({ correct: 0, incorrect: 0 })
  const timeAttackScore = ref(0)
  
  // Oyunun genel durumu
  const gameFinished = ref(false)
  const currentQuestionIndex = ref(0) // Klasik mod için soru sayacı
  const isLoading = ref(false) // API'den cevap beklerken kullanılacak
  
  // Zamanlı mod için
  const timeRemaining = ref(30)
  let timerInterval: ReturnType<typeof setInterval> | null = null

  // --- API İLETİŞİMİ İÇİN HAZIRLIK ---
  // nuxt.config.ts'de tanımladığımız adresi alıyoruz.
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase

  // --- GETTERS: State'e bağlı hesaplanmış değerler ---
  const successRate = computed(() => {
    const total = classicScore.value.correct + classicScore.value.incorrect
    return total === 0 ? 0 : Math.round((classicScore.value.correct / total) * 100)
  })

  // --- ACTIONS: State'i değiştiren fonksiyonlar ---

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  // Önceki oyundan kalan her şeyi temizler
  function resetGame() {
    stopTimer()
    currentImage.value = null
    gameMode.value = null
    lastAnswerCorrect.value = null
    lastCorrectAnswerIsAI.value = null
    classicScore.value = { correct: 0, incorrect: 0 }
    timeAttackScore.value = 0
    gameFinished.value = false
    currentQuestionIndex.value = 0
    isLoading.value = false
    timeRemaining.value = 30
  }

  // API'den yeni, rastgele bir resim çeker
  async function fetchNextImage() {
    isLoading.value = true
    lastAnswerCorrect.value = null
    try {
      // Nuxt'ın entegre $fetch aracıyla GET isteği atıyoruz.
      const data = await $fetch<ImageResponse>(`${apiBase}/api/Game/random-image`)
      currentImage.value = data
    } catch (error) {
      console.error("API'den resim çekilirken hata oluştu:", error)
      alert("Sunucuya bağlanılamadı. Backend API'sinin çalıştığından emin olun.")
    } finally {
      isLoading.value = false
    }
  }

  // Oyunu belirtilen modda başlatır
  async function startGame(mode: 'classic' | 'time') {
    resetGame()
    gameMode.value = mode
    await fetchNextImage() // İlk resmi çekerek oyuna başla

    if (mode === 'time') {
      timerInterval = setInterval(() => {
        timeRemaining.value--
        if (timeRemaining.value <= 0) {
          stopTimer()
          gameFinished.value = true
        }
      }, 1000)
    }
  }

  // Kullanıcının tahminini API'ye gönderir ve sonucu işler
  async function answerQuestion(guess: 'human' | 'ai') {
    if (!currentImage.value || lastAnswerCorrect.value !== null) return

    const guessIsAI = guess === 'ai'
    isLoading.value = true

    try {
      const response = await $fetch<{ isCorrect: boolean, correctAnswerIsAI: boolean }>(`${apiBase}/api/Game/submit-guess`, {
        method: 'POST',
        body: {
          imageId: currentImage.value.imageId,
          guessIsAI,
        },
      })

      lastAnswerCorrect.value = response.isCorrect
      lastCorrectAnswerIsAI.value = response.correctAnswerIsAI

      if (gameMode.value === 'classic') {
        response.isCorrect ? classicScore.value.correct++ : classicScore.value.incorrect++
      } else if (gameMode.value === 'time' && response.isCorrect) {
        timeAttackScore.value += 100 // Puanlama mantığı basit tutuldu, geliştirilebilir.
      }

    } catch (error) {
      console.error("Tahmin gönderilirken hata oluştu:", error)
    } finally {
      isLoading.value = false
    }
  }

  // Bir sonraki soruya geçer
  async function nextQuestion() {
    if (gameMode.value === 'classic') {
      currentQuestionIndex.value++
      if (currentQuestionIndex.value >= 10) {
        gameFinished.value = true
        return
      }
    }
    
    // Zamanlı modda oyun bitmediyse veya klasik modda bir sonraki soruya geçiliyorsa yeni resim çek
    if (!gameFinished.value) {
      await fetchNextImage()
    }
  }

  return {
    // State
    currentImage, gameMode, lastAnswerCorrect, lastCorrectAnswerIsAI,
    classicScore, timeAttackScore, gameFinished, currentQuestionIndex,
    isLoading, timeRemaining,
    // Getters
    successRate,
    // Actions
    resetGame, startGame, answerQuestion, nextQuestion,
  }
})