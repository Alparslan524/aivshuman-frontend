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

  // Klasik mod için önceden yüklenmiş görseller
  const preloadedImages = ref<ImageResponse[]>([])

  // Oyun başlangıç aşaması kontrolü
  const showModeIntro = ref(false) // Mod tanıtım ekranı
  const imagesPreloaded = ref(false) // Görseller yüklendi mi?

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

  function startTimer() {
    if (timerInterval) return; // Zaten çalışıyorsa tekrar başlatma
    timerInterval = setInterval(() => {
      timeRemaining.value--
      if (timeRemaining.value <= 0) {
        stopTimer()
        gameFinished.value = true
      }
    }, 1000)
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
    preloadedImages.value = []
    showModeIntro.value = false
    imagesPreloaded.value = false
  }

  // LocalStorage yardımcı fonksiyonları
  function shouldSkipIntro(mode: string): boolean {
    if (import.meta.client) {
      const skipKey = `skipIntro_${mode}`
      return localStorage.getItem(skipKey) === 'true'
    }
    return false
  }

  function setSkipIntro(mode: string, skip: boolean): void {
    if (import.meta.client) {
      const skipKey = `skipIntro_${mode}`
      localStorage.setItem(skipKey, skip.toString())
    }
  }

  // Klasik mod için 10 görseli önceden yükler
  async function preloadClassicImages() {
    isLoading.value = true
    try {
      const data = await $fetch<ImageResponse[]>(`${apiBase}/api/Game/random-images`)
      preloadedImages.value = data
      currentImage.value = data?.[0] || null // İlk görseli göster
    } catch (error) {
      console.error("Görseller önceden yüklenirken hata oluştu:", error)
      alert("Sunucuya bağlanılamadı. Backend API'sinin çalıştığından emin olun.")
    } finally {
      isLoading.value = false
    }
  }

  // API'den yeni, rastgele bir resim çeker (sadece zamanlı mod için)
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
      // Zamanlı modda, yeni resim geldikten sonra zamanlayıcıyı yeniden başlat
      if (gameMode.value === 'time' && !gameFinished.value) {
        startTimer()
      }
    }
  }

  // Oyunu belirtilen modda başlatır
  async function startGame(mode: 'classic' | 'time') {
    resetGame()
    gameMode.value = mode

    // Eğer kullanıcı intro'yu skip etmeyi seçmişse
    if (shouldSkipIntro(mode)) {
      if (mode === 'classic') {
        await preloadClassicImages()
        imagesPreloaded.value = true
        // Intro'yu skip et, direkt oyuna başla
        if (preloadedImages.value.length > 0) {
          currentImage.value = preloadedImages.value[0] || null
        }
      } else {
        await fetchNextImage()
        startTimer()
      }
      return
    }

    // Normal intro akışı
    if (mode === 'classic') {
      showModeIntro.value = true
      await preloadClassicImages()
      imagesPreloaded.value = true
    } else {
      showModeIntro.value = true
      await fetchNextImage()
    }
  }

  // Mod tanıtım ekranından gerçek oyuna başlar
  function startActualGame() {
    showModeIntro.value = false
    // Klasik modda ilk görseli göster
    if (gameMode.value === 'classic' && preloadedImages.value.length > 0) {
      currentImage.value = preloadedImages.value[0] || null
    }
  }

  // Kullanıcının tahminini API'ye gönderir ve sonucu işler
  async function answerQuestion(guess: 'human' | 'ai') {
    if (!currentImage.value || lastAnswerCorrect.value !== null) return

    const guessIsAI = guess === 'ai'
    isLoading.value = true

    // Zamanlı modda, API isteği başlamadan önce zamanlayıcıyı durdur
    if (gameMode.value === 'time') {
      stopTimer()
    }

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
      } else if (gameMode.value === 'time') {
        if (response.isCorrect) {
          timeAttackScore.value += 100
        }
        // Cevap geldikten sonra beklemeden sonraki soruya geç
        nextQuestion()
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

      // Önemli: currentImage'i de güncelle ki doğru ID ile API'ye istek atılsın
      currentImage.value = preloadedImages.value[currentQuestionIndex.value] || null
      lastAnswerCorrect.value = null
    } else {
      // Zamanlı modda API'den yeni görsel çek
      if (!gameFinished.value) {
        await fetchNextImage()
      }
    }
  }

  return {
    // State
    currentImage, gameMode, lastAnswerCorrect, lastCorrectAnswerIsAI,
    classicScore, timeAttackScore, gameFinished, currentQuestionIndex,
    isLoading, timeRemaining, preloadedImages, showModeIntro, imagesPreloaded,
    // Getters
    successRate,
    // Actions
    resetGame, startGame, startActualGame, answerQuestion, nextQuestion,
    setSkipIntro, shouldSkipIntro,
  }
})