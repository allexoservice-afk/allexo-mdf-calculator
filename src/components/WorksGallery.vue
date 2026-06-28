<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useLocale } from '../i18n/useLocale.js'
import worksGallery from '../generated/works-gallery.json'

const COUNT = worksGallery.count

/** Публічні URL (файли в `public/images/works/`). */
const ALL_THUMB = Array.from({ length: COUNT }, (_, i) => `/images/works/work${i + 1}-thumb.webp`)
const ALL_LARGE = Array.from({ length: COUNT }, (_, i) => `/images/works/work${i + 1}-large.webp`)

const { t } = useLocale()

/** @type {import('vue').Ref<string[]>} */
const brokenThumbs = ref([])

/** @type {import('vue').Ref<string[]>} */
const brokenLarge = ref([])

/** @param {string} thumbUrl */
function onThumbError(thumbUrl) {
  if (!brokenThumbs.value.includes(thumbUrl)) {
    brokenThumbs.value = [...brokenThumbs.value, thumbUrl]
  }
}

/** @param {string} largeUrl */
function onLargeError(largeUrl) {
  if (!brokenLarge.value.includes(largeUrl)) {
    brokenLarge.value = [...brokenLarge.value, largeUrl]
  }
}

/** Пари thumb + large для видимих мініатюр (large не завантажується, поки не відкрито lightbox). */
const visiblePairs = computed(() => {
  const out = []
  for (let i = 0; i < COUNT; i++) {
    const thumb = ALL_THUMB[i]
    if (!brokenThumbs.value.includes(thumb)) {
      out.push({ thumb, large: ALL_LARGE[i] })
    }
  }
  return out
})

/** @type {import('vue').Ref<number | null>} */
const lightboxIndex = ref(null)

/**
 * Snapshot списку фото для поточної сесії lightbox.
 * Це робить індекси/CTA стабільними навіть якщо `visiblePairs` зміниться
 * (наприклад, через `onThumbError` під час завантаження мініатюр).
 */
const lightboxPairs = ref(/** @type {{ thumb: string, large: string }[]} */ ([]))

const photoCount = computed(() => (lightboxOpen.value ? lightboxPairs.value.length : visiblePairs.value.length))

// CTA як “додатковий слайд” після останнього фото.
// Індекси: 0..photoCount-1 = фото, ctaIndex = photoCount = CTA.
const ctaIndex = computed(() => photoCount.value)
const slideCount = computed(() => (photoCount.value > 0 ? photoCount.value + 1 : 0))

const lightboxOpen = computed(() => lightboxIndex.value != null)

/**
 * Визначаємо CTA слайд максимально надійно:
 * - будь-який індекс >= photoCount вважаємо CTA (щоб ніколи не було "порожнього" слайду)
 */
const onCtaSlide = computed(() => {
  const i = lightboxIndex.value
  if (i == null) return false
  if (photoCount.value <= 0) return false
  return i >= ctaIndex.value
})

/** Велике зображення лише коли lightbox відкритий (img у DOM тільки тоді). */
const lightboxLargeSrc = computed(() => {
  const i = lightboxIndex.value
  if (i == null) return null
  // Якщо індекс вийшов за межі фото — це CTA.
  if (i >= photoCount.value) return null
  const src = (lightboxOpen.value ? lightboxPairs.value : visiblePairs.value)[i]?.large ?? null
  if (src && brokenLarge.value.includes(src)) return null
  return src || null
})

const lightboxStageKey = computed(() => {
  if (lightboxIndex.value == null) return 'closed'
  if (onCtaSlide.value) return 'cta'
  return lightboxLargeSrc.value ?? `photo-${lightboxIndex.value}`
})

// Якщо велике фото з якоїсь причини не визначилось — показуємо CTA замість "порожнього" екрану.
const showCtaSlide = computed(() => {
  if (onCtaSlide.value) return true
  if (!lightboxOpen.value) return false
  if (photoCount.value <= 0) return false
  return !lightboxLargeSrc.value
})

// Додатковий захист: якщо індекс вийшов за межі слайдів — переводимо на CTA.
watch([lightboxOpen, photoCount], () => {
  if (!lightboxOpen.value) return
  const i = lightboxIndex.value
  if (i == null) return
  if (photoCount.value <= 0) return
  if (i > ctaIndex.value) {
    lightboxIndex.value = ctaIndex.value
  }
})

const canNavigate = computed(() => slideCount.value > 1)

/** @param {number} idx індекс у visiblePairs */
function openLightbox(idx) {
  lightboxPairs.value = visiblePairs.value.slice()
  lightboxIndex.value = idx
}

function closeLightbox() {
  lightboxIndex.value = null
  lightboxPairs.value = []
}

function goToCalculatorFromCta() {
  closeLightbox()
  const el = document.getElementById('calculator')
  if (!el) return
  // Let lightbox unmount first to avoid jank.
  window.setTimeout(() => {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 0)
}

function goPrev() {
  const n = slideCount.value
  if (n <= 1 || lightboxIndex.value == null) return
  lightboxIndex.value = (lightboxIndex.value - 1 + n) % n
}

function goNext() {
  const nPhotos = photoCount.value
  const i = lightboxIndex.value
  if (i == null) return
  if (nPhotos <= 0) return

  // 0..nPhotos-1 => фото; nPhotos => CTA
  if (i < nPhotos) {
    lightboxIndex.value = i + 1
    return
  }
  if (i === ctaIndex.value) {
    lightboxIndex.value = 0
  }
}

/** @param {MouseEvent} e */
function onBackdropClick(e) {
  e.stopPropagation()
  closeLightbox()
}

/** @param {MouseEvent} e */
function onCloseButtonClick(e) {
  e.stopPropagation()
  closeLightbox()
}

/** @param {MouseEvent} e */
function onPrevArrowClick(e) {
  e.stopPropagation()
  goPrev()
}

/** @param {MouseEvent} e */
function onNextArrowClick(e) {
  e.stopPropagation()
  goNext()
}

/** @param {MouseEvent} e */
function onLargeImageClick(e) {
  e.stopPropagation()
  if (canNavigate.value && !onCtaSlide.value) goNext()
}

/** @type {import('vue').Ref<number | null>} */
const touchStartX = ref(null)

/** @param {TouchEvent} e */
function onTouchStart(e) {
  touchStartX.value = e.changedTouches[0]?.clientX ?? null
}

/** @param {TouchEvent} e */
function onTouchEnd(e) {
  const start = touchStartX.value
  touchStartX.value = null
  if (start == null || !canNavigate.value) return
  const end = e.changedTouches[0]?.clientX
  if (end == null) return
  const d = end - start
  if (Math.abs(d) < 56) return
  if (d < 0) goNext()
  else goPrev()
}

/** @param {KeyboardEvent} e */
function onKeydown(e) {
  if (e.key === 'Escape') closeLightbox()
  else if (e.key === 'ArrowLeft') goPrev()
  else if (e.key === 'ArrowRight') goNext()
}

watch(lightboxOpen, (open) => {
  if (typeof document === 'undefined') return
  if (open) {
    document.addEventListener('keydown', onKeydown)
    document.body.style.overflow = 'hidden'
  } else {
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
  }
})

// Не реагуємо на зміни `visiblePairs` під час відкритого lightbox — індекси/CTA рахуються
// від snapshot `lightboxPairs`. Зміни в галереї застосуються при наступному відкритті.

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <section
    v-if="visiblePairs.length"
    class="works"
    aria-labelledby="works-title"
  >
    <h2 id="works-title" class="works__title">{{ t('works.title') }}</h2>
    <div class="works__subrow">
      <p class="works__subtitle">{{ t('works.subtitle') }}</p>
      <p class="works__scroll-hint" aria-hidden="true">{{ t('works.scrollHint') }}</p>
    </div>

    <div class="works__strip">
      <button
        v-for="(pair, idx) in visiblePairs"
        :key="pair.thumb"
        type="button"
        class="works__thumb"
        :aria-label="`${t('works.openPreview')} ${idx + 1}`"
        @click="openLightbox(idx)"
      >
        <img
          :src="pair.thumb"
          alt=""
          width="320"
          height="240"
          loading="lazy"
          decoding="async"
          fetchpriority="low"
          @error="onThumbError(pair.thumb)"
        />
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="lightboxOpen"
        class="lightbox"
        role="dialog"
        aria-modal="true"
        :aria-label="t('works.lightboxAria')"
      >
        <div
          class="lightbox__backdrop"
          @click="onBackdropClick"
          @touchstart.passive="onTouchStart"
          @touchend.passive="onTouchEnd"
        />

        <button
          type="button"
          class="lightbox__close"
          :aria-label="t('works.closeLightbox')"
          @click="onCloseButtonClick"
        >
          ❌
        </button>
        <button
          v-if="canNavigate"
          type="button"
          class="lightbox__nav lightbox__nav--prev"
          :aria-label="t('works.prevPhoto')"
          @click="onPrevArrowClick"
        >
          ←
        </button>
        <button
          v-if="canNavigate"
          type="button"
          class="lightbox__nav lightbox__nav--next"
          :aria-label="t('works.nextPhoto')"
          @click="onNextArrowClick"
        >
          →
        </button>

        <div
          class="lightbox__stage"
          @click.stop
          @touchstart.passive="onTouchStart"
          @touchend.passive="onTouchEnd"
        >
          <div :key="lightboxStageKey" class="lightbox__stage-inner">
            <img
              v-if="!showCtaSlide && lightboxLargeSrc"
              class="lightbox__img"
              :class="{ 'lightbox__img--no-nav': !canNavigate }"
              :src="lightboxLargeSrc"
              alt=""
              width="1600"
              height="1100"
              loading="eager"
              decoding="async"
              fetchpriority="high"
              @click="onLargeImageClick"
              @error="onLargeError(lightboxLargeSrc)"
            />

            <div v-else-if="showCtaSlide" class="lightbox__cta-slide">
              <p class="lightbox__cta-title">{{ t('works.ctaQ') }}</p>
              <p class="lightbox__cta-subtitle">{{ t('works.ctaSubtitle') }}</p>
              <button type="button" class="lightbox__cta-btn" @click="goToCalculatorFromCta">
                {{ t('app.calcCta') }}
              </button>
            </div>

            <p v-if="canNavigate && !showCtaSlide" class="lightbox__hint">
              {{ t('works.lightboxPhotoHint') }}
            </p>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.works {
  margin: 0 0 1.2rem;
}

.works__title {
  margin: 0 0 0.25rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--allexo-teal);
  letter-spacing: -0.02em;
}

.works__subtitle {
  margin: 0 0 0.65rem;
  font-size: 0.82rem;
  color: var(--allexo-muted);
  line-height: 1.4;
  max-width: 34rem;
}

.works__subrow {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.works__scroll-hint {
  margin: 0 0 0.65rem;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--allexo-teal);
  opacity: 0.9;
  user-select: none;
}

.works__strip {
  display: flex;
  overflow-x: auto;
  gap: 10px;
  padding: 3px 0 6px;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  touch-action: pan-x;
  scrollbar-color: var(--allexo-border) transparent;
}

.works__strip::after {
  content: '';
  width: 8px;
  flex: 0 0 8px;
}

.works__strip::-webkit-scrollbar {
  height: 5px;
}

.works__strip::-webkit-scrollbar-thumb {
  background: var(--allexo-border);
  border-radius: 999px;
}

.works__thumb {
  display: block;
  width: 160px;
  height: 110px;
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.works__thumb:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 32px rgba(17, 17, 17, 0.12);
}

.works__thumb:focus-visible {
  outline: 2px solid var(--allexo-teal);
  outline-offset: 2px;
}

.works__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 14px;
  display: block;
  pointer-events: none;
}

@media (min-width: 769px) {
  .works {
    margin-bottom: 1.5rem;
  }

  .works__title {
    margin-bottom: 0.4rem;
    font-size: 1.12rem;
  }

  .works__subtitle {
    margin-bottom: 0.85rem;
  }

  .works__strip {
    gap: 14px;
    padding: 6px 0 10px;
  }

  .works__thumb {
    width: 192px;
    height: 132px;
    border-radius: 16px;
    box-shadow: 0 10px 28px rgba(17, 17, 17, 0.14);
  }

  .works__thumb:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 18px 42px rgba(17, 17, 17, 0.2);
  }

  .works__thumb img {
    border-radius: 16px;
  }
}

@media (max-width: 768px) {
  .works {
    margin-bottom: 1.1rem;
  }

  .works__title {
    margin-bottom: 0.35rem;
  }

  .works__subtitle {
    margin-bottom: 0.5rem;
  }

  .works__scroll-hint {
    margin-bottom: 0.5rem;
  }

  .works__strip {
    gap: 12px;
    padding: 4px 0 8px;
  }

  .works__thumb {
    width: 172px;
    height: 127px;
  }
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.lightbox__backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: rgba(0, 0, 0, 0.8);
  cursor: pointer;
}

.lightbox__stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  max-width: min(90vw, 960px);
  pointer-events: auto;
}

.lightbox__stage-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  animation: lightboxStageIn 180ms ease-out;
}

.lightbox__img {
  max-width: 90vw;
  max-height: min(78vh, 820px);
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  cursor: pointer;
}

.lightbox__img--no-nav {
  cursor: default;
}

.lightbox__hint {
  margin: 0;
  padding: 0 0.5rem;
  max-width: 22rem;
  text-align: center;
  font-size: 0.8rem;
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.82);
}

.lightbox__close {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 2;
  width: 2.6rem;
  height: 2.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.94);
  color: var(--allexo-text);
  font-size: 1.05rem;
  line-height: 1;
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: background 0.15s ease;
}

.lightbox__close:hover {
  background: #fff;
}

.lightbox__nav {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  width: 2.6rem;
  height: 2.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.94);
  color: var(--allexo-text);
  font-size: 1.3rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: background 0.15s ease;
}

.lightbox__nav:hover {
  background: #fff;
}

.lightbox__nav--prev {
  left: 0.75rem;
}

.lightbox__nav--next {
  right: 0.75rem;
}

.lightbox__cta-slide {
  width: min(92vw, 720px);
  max-width: 90vw;
  min-height: min(52vh, 520px);
  max-height: min(78vh, 820px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
  padding: 1.25rem 1.1rem;
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(245, 250, 249, 0.96));
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  text-align: center;
}

.lightbox__cta-title {
  margin: 0;
  max-width: 26rem;
  font-size: 0.98rem;
  font-weight: 800;
  color: var(--allexo-text);
  line-height: 1.25;
}

.lightbox__cta-subtitle {
  margin: 0;
  max-width: 26rem;
  font-size: 0.9rem;
  font-weight: 650;
  color: var(--allexo-muted);
  line-height: 1.3;
}

.lightbox__cta-btn {
  min-height: 2.85rem;
  padding: 0.65rem 1.05rem;
  border-radius: var(--radius);
  border: 1px solid #111111;
  background: #111111;
  color: #fff;
  font: inherit;
  font-weight: 900;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    background 0.18s,
    color 0.18s,
    border-color 0.18s;
}

.lightbox__cta-btn:hover {
  background: var(--allexo-accent);
  color: #111111;
  border-color: var(--allexo-accent);
}

@keyframes lightboxStageIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}


@media (min-width: 640px) {
  .lightbox__nav--prev {
    left: 1rem;
  }

  .lightbox__nav--next {
    right: 1rem;
  }
}
</style>
