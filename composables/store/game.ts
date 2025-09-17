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

  // Zamanlı mod için önceden yüklenmiş görseller
  const timePreloadedImages = ref<ImageResponse[]>([])
  const timeCurrentIndex = ref(0) // Zamanlı modda hangi görseldeyiz
  const timeBatchNumber = ref(0) // Kaçıncı batch'teyiz (0, 1, 2...)
  const questionStartTime = ref(0) // Sorunun başladığı zaman

  // Oyun başlangıç aşaması kontrolü
  const showModeIntro = ref(false) // Mod tanıtım ekranı
  const imagesPreloaded = ref(false) // Görseller yüklendi mi?

  // Sonuç ve skorlar
  const lastAnswerCorrect = ref<boolean | null>(null)
  const lastCorrectAnswerIsAI = ref<boolean | null>(null)
  const classicScore = ref({ correct: 0, incorrect: 0 })
  const timeAttackScore = ref(0)
  const lastEarnedPoints = ref(0) // Son kazanılan puan miktarı

  // Oyunun genel durumu
  const gameFinished = ref(false)
  const currentQuestionIndex = ref(0) // Klasik mod için soru sayacı
  const isLoading = ref(false) // API'den cevap beklerken kullanılacak

  // Zamanlı mod için
  const timeRemaining = ref(30)
  const gameStartTime = ref(0) // Oyunun başladığı zaman
  const totalGameTime = 30 // Toplam oyun süresi (saniye)
  const pausedTime = ref(0) // Duraklatılan toplam süre
  const pauseStartTime = ref(0) // Duraklatmanın başladığı zaman
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

  // Milisaniye bazlı timer sistemi
  function startTimer() {
    if (timerInterval) return // Zaten çalışıyorsa tekrar başlatma

    if (gameStartTime.value === 0) {
      // İlk başlangıç
      gameStartTime.value = Date.now()
    }

    timerInterval = setInterval(() => {
      updateTimeRemaining()
    }, 100) // Her 100ms'de bir güncelle (daha akıcı)
  }

  function updateTimeRemaining() {
    const currentTime = Date.now()
    const elapsedTime = (currentTime - gameStartTime.value - pausedTime.value) / 1000 // Saniye cinsinden
    const remaining = totalGameTime - elapsedTime

    if (remaining <= 0) {
      timeRemaining.value = 0
      stopTimer()
      gameFinished.value = true
    } else {
      timeRemaining.value = remaining
    }
  }

  function pauseTimer() {
    if (timerInterval && pauseStartTime.value === 0) {
      stopTimer()
      pauseStartTime.value = Date.now()
    }
  }

  function resumeTimer() {
    if (pauseStartTime.value > 0) {
      // Duraklatılan süreyi toplam duraklatma süresine ekle
      pausedTime.value += Date.now() - pauseStartTime.value
      pauseStartTime.value = 0

      // Timer'ı yeniden başlat
      if (!gameFinished.value && timeRemaining.value > 0) {
        startTimer()
      }
    }
  }

  // Zamanlı modda soru başlangıç zamanını ayarlar
  function setQuestionStartTime() {
    questionStartTime.value = Date.now()
  }

  // Cevap verme hızına göre puan hesaplar (zamanlı mod için)
  function calculateTimeBasedScore(): number {
    const responseTime = Date.now() - questionStartTime.value // Milisaniye cinsinden
    const responseTimeSeconds = responseTime / 1000 // Saniye cinsinden

    // Maksimum puan 100, minimum puan 25
    // 0-2 saniye: 100 puan
    // 2-5 saniye: 75 puan  
    // 5-8 saniye: 50 puan
    // 8+ saniye: 25 puan

    if (responseTimeSeconds <= 2) {
      return 100
    } else if (responseTimeSeconds <= 5) {
      return 75
    } else if (responseTimeSeconds <= 8) {
      return 50
    } else {
      return 25
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
    lastEarnedPoints.value = 0
    gameFinished.value = false
    currentQuestionIndex.value = 0
    isLoading.value = false
    timeRemaining.value = 30
    gameStartTime.value = 0
    pausedTime.value = 0
    pauseStartTime.value = 0
    preloadedImages.value = []
    timePreloadedImages.value = []
    timeCurrentIndex.value = 0
    timeBatchNumber.value = 0
    questionStartTime.value = 0
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

  // Zamanlı mod için 10 görseli önceden yükler
  async function preloadTimeImages() {
    isLoading.value = true
    try {
      const data = await $fetch<ImageResponse[]>(`${apiBase}/api/Game/random-images`)
      timePreloadedImages.value = data
      timeCurrentIndex.value = 0
      currentImage.value = data?.[0] || null // İlk görseli göster
    } catch (error) {
      console.error("Zamanlı mod görselleri yüklenirken hata oluştu:", error)
      alert("Sunucuya bağlanılamadı. Backend API'sinin çalıştığından emin olun.")
    } finally {
      isLoading.value = false
    }
  }

  // Zamanlı modda bir sonraki batch'i yükler (10 soru bitince)
  async function loadNextTimeBatch() {
    const pausedTimeRemaining = timeRemaining.value // Mevcut süreyi sakla
    stopTimer() // Timer'ı durdur

    timeBatchNumber.value++
    timeCurrentIndex.value = 0

    // Yeni 10 görseli yükle
    await preloadTimeImages()

    // Süreyi eski haline getir ve timer'ı yeniden başlat
    timeRemaining.value = pausedTimeRemaining
    if (!gameFinished.value) {
      startTimer()
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
        await preloadTimeImages()
        imagesPreloaded.value = true
        // Intro'yu skip et, direkt oyuna başla
        if (timePreloadedImages.value.length > 0) {
          currentImage.value = timePreloadedImages.value[0] || null
        }
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
      await preloadTimeImages()
      imagesPreloaded.value = true
    }
  }

  // Mod tanıtım ekranından gerçek oyuna başlar
  function startActualGame() {
    showModeIntro.value = false
    // Klasik modda ilk görseli göster
    if (gameMode.value === 'classic' && preloadedImages.value.length > 0) {
      currentImage.value = preloadedImages.value[0] || null
    }
    // Zamanlı modda timer'ı başlat ve soru süresini kaydet
    else if (gameMode.value === 'time' && timePreloadedImages.value.length > 0) {
      currentImage.value = timePreloadedImages.value[0] || null
      setQuestionStartTime() // İlk soru için süre takibini başlat
      startTimer()
    }
  }

  // Kullanıcının tahminini API'ye gönderir ve sonucu işler
  async function answerQuestion(guess: 'human' | 'ai') {
    if (!currentImage.value || lastAnswerCorrect.value !== null) return

    const guessIsAI = guess === 'ai'
    isLoading.value = true

    // Zamanlı modda, API isteği başlamadan önce zamanlayıcıyı duraklat
    if (gameMode.value === 'time') {
      pauseTimer()
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
        response.isCorrect ? classicScore.value.correct++ : classicScore.value.incorrect++
        if (response.isCorrect) {
          const earnedPoints = calculateTimeBasedScore()
          lastEarnedPoints.value = earnedPoints // Son kazanılan puanı kaydet
          timeAttackScore.value += earnedPoints
        } else {
          lastEarnedPoints.value = 0 // Yanlış cevaplarda 0 puan
        }
        // Zamanlı modda otomatik olarak sonraki soruya geç
        setTimeout(() => {
          nextQuestionTime()
        }, 1500) // 1.5 saniye feedback göster
      }

    } catch (error) {
      console.error("Tahmin gönderilirken hata oluştu:", error)
      // Hata durumunda da timer'ı devam ettir
      if (gameMode.value === 'time') {
        resumeTimer()
      }
    } finally {
      isLoading.value = false
    }
  }

  // Zamanlı mod için sonraki soru geçişi
  async function nextQuestionTime() {
    lastAnswerCorrect.value = null
    timeCurrentIndex.value++

    // Eğer mevcut batch'teki 10 görsel bittiyse, yeni batch yükle
    if (timeCurrentIndex.value >= timePreloadedImages.value.length) {
      await loadNextTimeBatch()
      setQuestionStartTime() // Yeni soru için süre takibini başlat
      return
    }

    // Sonraki görseli göster
    currentImage.value = timePreloadedImages.value[timeCurrentIndex.value] || null

    // Timer'ı devam ettir ve soru süresini kaydet
    if (!gameFinished.value) {
      setQuestionStartTime() // Yeni soru için süre takibini başlat
      resumeTimer() // Timer'ı kaldığı yerden devam ettir
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
    isLoading, timeRemaining, preloadedImages, timePreloadedImages, timeCurrentIndex, timeBatchNumber, showModeIntro, imagesPreloaded,
    lastEarnedPoints,
    // Getters
    successRate,
    // Actions
    resetGame, startGame, startActualGame, answerQuestion, nextQuestion,
    setSkipIntro, shouldSkipIntro, setQuestionStartTime, calculateTimeBasedScore,
    pauseTimer, resumeTimer, updateTimeRemaining,
  }
})