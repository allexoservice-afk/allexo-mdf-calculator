<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useLocale } from '../i18n/useLocale.js'
import worksGallery from '../generated/works-gallery.json'

const COUNT = worksGallery.count
const CACHE_VERSION = worksGallery.version

function workUrl(name) {
  return `/images/works/${name}?v=${CACHE_VERSION}`
}

/** Публічні URL (файли в `public/images/works/`). */
const ALL_THUMB = Array.from({ length: COUNT }, (_, i) => workUrl(`work${i + 1}-thumb.webp`))
const ALL_LARGE = Array.from({ length: COUNT }, (_, i) => workUrl(`work${i + 1}-large.webp`))

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

/** Пари thumb + large для видимих карток (large не завантажується, поки не відкрито lightbox). */
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

/** Публічна вітрина — перші 6 фото. */
const showcasePairs = computed(() => visiblePairs.value.slice(0, 6))

/** @type {import('vue').Ref<number | null>} */
const lightboxIndex = ref(null)

/**
 * Snapshot списку фото для поточної сесії lightbox.
 * Індекси/CTA стабільні навіть якщо `visiblePairs` зміниться під час сесії.
 */
const lightboxPairs = ref(/** @type {{ thumb: string, large: string }[]} */ ([]))

const photoCount = computed(() => (lightboxOpen.value ? lightboxPairs.value.length : visiblePairs.value.length))

// CTA як додатковий слайд після останнього фото.
const ctaIndex = computed(() => photoCount.value)
const slideCount = computed(() => (photoCount.value > 0 ? photoCount.value + 1 : 0))

const lightboxOpen = computed(() => lightboxIndex.value != null)

const onCtaSlide = computed(() => {
  const i = lightboxIndex.value
  if (i == null) return false
  if (photoCount.value <= 0) return false
  return i >= ctaIndex.value
})

const lightboxLargeSrc = computed(() => {
  const i = lightboxIndex.value
  if (i == null) return null
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

const showCtaSlide = computed(() => {
  if (onCtaSlide.value) return true
  if (!lightboxOpen.value) return false
  if (photoCount.value <= 0) return false
  return !lightboxLargeSrc.value
})

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

const lightboxCounter = computed(() => {
  const i = lightboxIndex.value
  if (i == null || showCtaSlide.value) return null
  const total = photoCount.value
  if (total <= 0) return null
  return `${i + 1} / ${total}`
})

/** @param {number} idx */
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
    :aria-label="t('works.title')"
  >
    <div class="works__showcase">
      <div class="works__row">
        <button
          v-for="(pair, idx) in showcasePairs"
          :key="pair.thumb"
          type="button"
          class="works__card"
          :aria-label="`${t('works.openPreview')} ${idx + 1}`"
          @click="openLightbox(idx)"
        >
          <img
            :src="pair.thumb"
            alt=""
            width="720"
            height="450"
            loading="lazy"
            decoding="async"
            fetchpriority="low"
            @error="onThumbError(pair.thumb)"
          />
        </button>
      </div>
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
          <svg class="lightbox__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <button
          v-if="canNavigate"
          type="button"
          class="lightbox__nav lightbox__nav--prev"
          :aria-label="t('works.prevPhoto')"
          @click="onPrevArrowClick"
        >
          <svg class="lightbox__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M14.5 6.5L9 12l5.5 5.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button
          v-if="canNavigate"
          type="button"
          class="lightbox__nav lightbox__nav--next"
          :aria-label="t('works.nextPhoto')"
          @click="onNextArrowClick"
        >
          <svg class="lightbox__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9.5 6.5L15 12l-5.5 5.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
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

            <p v-if="lightboxCounter" class="lightbox__counter" aria-live="polite">
              {{ lightboxCounter }}
            </p>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.works {
  margin: 1.5rem 0 calc(var(--section-y-lg) * 0.85);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow-x: clip;
}

/* Один ряд — 6 фото; ширина = контентна сітка .site-container (як Hero / AboutMe) */
.works__showcase {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin-inline: 0;
  box-sizing: border-box;
}

.works__row {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.65rem;
  width: 100%;
}

.works__card {
  position: relative;
  display: block;
  width: 100%;
  min-width: 0;
  aspect-ratio: 16 / 10;
  padding: 0;
  border: 1px solid rgba(61, 66, 67, 0.08);
  border-radius: 12px;
  overflow: hidden;
  background: #f0efec;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05);
  -webkit-tap-highlight-color: transparent;
  transition:
    transform 250ms ease,
    box-shadow 250ms ease,
    border-color 250ms ease;
}

.works__card:hover {
  transform: scale(1.03);
  border-color: rgba(61, 66, 67, 0.14);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.08);
}

.works__card:focus-visible {
  outline: 2px solid var(--allexo-teal);
  outline-offset: 2px;
}

.works__card img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  pointer-events: none;
}

@media (min-width: 640px) {
  .works__row {
    gap: 0.75rem;
  }

  .works__card {
    border-radius: 14px;
  }
}

@media (min-width: 960px) {
  .works {
    margin: 1.5rem 0 calc(var(--section-y-lg) * 0.85);
  }

  .works__row {
    gap: 0.85rem;
  }
}

@media (max-width: 768px) {
  .works {
    margin: 1.25rem 0 1.25rem; /* повітря: hero ↔ галерея ↔ AboutMe */
    overflow-x: clip;
    max-width: 100%;
  }

  .works__showcase {
    display: flex;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x mandatory;
    gap: 0.45rem;
    scrollbar-width: none;
    box-sizing: border-box;
  }

  .works__showcase::-webkit-scrollbar {
    display: none;
  }

  .works__row {
    display: contents;
  }

  /* ~2 повні картки + ~35% peek наступної */
  .works__card {
    flex: 0 0 calc((100% - 0.45rem) / 2.4);
    width: calc((100% - 0.45rem) / 2.4);
    aspect-ratio: 1.7 / 1;
    scroll-snap-align: start;
    border-radius: 10px;
  }

  .works__card:hover {
    transform: none;
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
  background: rgba(26, 25, 23, 0.72);
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
  gap: 0.65rem;
  width: 100%;
  animation: lightboxStageIn 240ms ease-out;
}

.lightbox__img {
  max-width: 90vw;
  max-height: min(78vh, 820px);
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(26, 25, 23, 0.28);
  cursor: pointer;
}

.lightbox__img--no-nav {
  cursor: default;
}

.lightbox__counter {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: rgba(250, 249, 246, 0.78);
  user-select: none;
}

.lightbox__icon {
  width: 1.15rem;
  height: 1.15rem;
  display: block;
}

.lightbox__close,
.lightbox__nav {
  position: fixed;
  z-index: 2;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(250, 249, 246, 0.14);
  border-radius: 10px;
  background: rgba(250, 249, 246, 0.92);
  color: #2a2824;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(26, 25, 23, 0.12);
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.lightbox__close:hover,
.lightbox__nav:hover {
  background: #fff;
  border-color: rgba(42, 40, 36, 0.12);
}

.lightbox__close {
  top: 1rem;
  right: 1rem;
}

.lightbox__nav {
  top: 50%;
  transform: translateY(-50%);
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
  border-radius: 8px;
  background: rgba(250, 249, 246, 0.97);
  border: 1px solid rgba(26, 25, 23, 0.08);
  box-shadow: 0 4px 24px rgba(26, 25, 23, 0.28);
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
  border: 1px solid var(--allexo-teal);
  background: var(--allexo-teal);
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
  background: var(--allexo-teal-light);
  color: #fff;
  border-color: var(--allexo-teal-light);
}

@keyframes lightboxStageIn {
  from {
    opacity: 0;
    transform: translateY(8px);
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
