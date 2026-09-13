<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
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
const SHOWCASE_COUNT = 6
const showcasePairs = computed(() => visiblePairs.value.slice(0, SHOWCASE_COUNT))

const expanded = ref(false)

const canExpand = computed(() => visiblePairs.value.length > SHOWCASE_COUNT)

const displayPairs = computed(() =>
  expanded.value ? visiblePairs.value : showcasePairs.value,
)

function toggleExpand() {
  const willExpand = !expanded.value
  expanded.value = willExpand
  if (!willExpand) return
  void nextTick(() => {
    // Мобільний: після розкриття показати перші нові фото (сітка / скрол).
    const el = document.getElementById(`work-card-${SHOWCASE_COUNT}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
  })
}

/** 0-based indices in current gallery order (work1 = 0). */
const CATEGORY_START = {
  reveals: 0, // work1 — MDF
  windowsDoors: 6, // work7 — windows
  garage: 15, // work16 — garage doors
}

/**
 * Розкрити всі фото й прокрутити до категорії (Pro-nav).
 * @param {'reveals' | 'windowsDoors' | 'garage'} category
 */
async function openCategory(category) {
  const start = CATEGORY_START[category]
  if (start == null) return
  expanded.value = true
  await nextTick()
  await new Promise((r) => requestAnimationFrame(() => r(undefined)))
  const el = document.getElementById(`work-card-${start}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  } else {
    document.querySelector('.works')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

defineExpose({ openCategory, expandAll: () => { expanded.value = true } })

/** @type {import('vue').Ref<number | null>} */
const lightboxIndex = ref(null)

/**
 * Snapshot списку фото для поточної сесії lightbox.
 * Індекси стабільні навіть якщо `visiblePairs` зміниться під час сесії.
 */
const lightboxPairs = ref(/** @type {{ thumb: string, large: string }[]} */ ([]))

const photoCount = computed(() => (lightboxOpen.value ? lightboxPairs.value.length : visiblePairs.value.length))

const lightboxOpen = computed(() => lightboxIndex.value != null)

/** Що показуємо зараз (thumb → large без blur). */
const lightboxDisplaySrc = ref(/** @type {string | null} */ (null))
let loadToken = 0

const lightboxStageKey = computed(() => {
  if (lightboxIndex.value == null) return 'closed'
  return `photo-${lightboxIndex.value}`
})

const canNavigate = computed(() => photoCount.value > 1)

const lightboxCounter = computed(() => {
  const i = lightboxIndex.value
  if (i == null) return null
  const total = photoCount.value
  if (total <= 0) return null
  return `${i + 1} / ${total}`
})

/** @type {Set<string>} */
const preloaded = new Set()

/** @param {string | null | undefined} url */
function preloadUrl(url) {
  if (!url || typeof Image === 'undefined') return
  if (preloaded.has(url) || brokenLarge.value.includes(url)) return
  preloaded.add(url)
  const img = new Image()
  img.decoding = 'async'
  img.src = url
}

/** @param {number} idx */
function pairAt(idx) {
  const list = lightboxOpen.value ? lightboxPairs.value : visiblePairs.value
  return list[idx] ?? null
}

/** Підвантажити large поточного + сусідів. */
function preloadAround(idx) {
  const n = photoCount.value
  if (n <= 0) return
  const cur = pairAt(idx)
  preloadUrl(cur?.large)
  if (n > 1) {
    preloadUrl(pairAt((idx + 1) % n)?.large)
    preloadUrl(pairAt((idx - 1 + n) % n)?.large)
  }
}

/**
 * @param {string} url
 * @returns {Promise<boolean>}
 */
function loadImage(url) {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(false)
      return
    }
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
    if (img.complete && img.naturalWidth > 0) resolve(true)
  })
}

/**
 * Показати thumb одразу (чітко), потім підмінити на large.
 * @param {number} idx
 */
async function syncLightboxImage(idx) {
  const pair = pairAt(idx)
  if (!pair) {
    lightboxDisplaySrc.value = null
    return
  }

  const token = ++loadToken
  lightboxDisplaySrc.value = pair.thumb
  preloadAround(idx)

  const target = pair.large
  if (brokenLarge.value.includes(target)) return

  const ok = await loadImage(target)
  if (token !== loadToken || lightboxIndex.value !== idx) return
  if (ok) {
    lightboxDisplaySrc.value = target
    preloaded.add(target)
  } else {
    onLargeError(target)
  }
}

watch(lightboxIndex, (idx) => {
  if (idx == null) {
    lightboxDisplaySrc.value = null
    return
  }
  if (idx >= photoCount.value && photoCount.value > 0) {
    lightboxIndex.value = photoCount.value - 1
    return
  }
  void syncLightboxImage(idx)
})

watch(expanded, (isOpen) => {
  if (!isOpen) return
  for (const pair of visiblePairs.value.slice(SHOWCASE_COUNT, SHOWCASE_COUNT + 6)) {
    preloadUrl(pair.thumb)
  }
})

/** @param {number} idx */
function openLightbox(idx) {
  lightboxPairs.value = visiblePairs.value.slice()
  lightboxIndex.value = idx
}

function closeLightbox() {
  loadToken += 1
  lightboxIndex.value = null
  lightboxPairs.value = []
  lightboxDisplaySrc.value = null
}

function goPrev() {
  const n = photoCount.value
  if (n <= 1 || lightboxIndex.value == null) return
  lightboxIndex.value = (lightboxIndex.value - 1 + n) % n
}

function goNext() {
  const n = photoCount.value
  if (n <= 1 || lightboxIndex.value == null) return
  lightboxIndex.value = (lightboxIndex.value + 1) % n
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
  if (canNavigate.value) goNext()
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
    <div v-if="canExpand" class="works__toolbar">
      <button
        type="button"
        class="works__expand"
        :aria-expanded="expanded"
        :aria-label="expanded ? t('works.showLess') : t('works.viewAll')"
        @click="toggleExpand"
      >
        <span class="works__expand-label">{{ expanded ? t('works.showLess') : t('works.viewAll') }}</span>
        <span class="works__expand-arrow" :class="{ 'works__expand-arrow--open': expanded }" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              d="M6.5 9.5L12 15l5.5-5.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </button>
    </div>

    <div class="works__showcase" :class="{ 'works__showcase--expanded': expanded }">
      <div class="works__row">
        <button
          v-for="(pair, idx) in displayPairs"
          :id="`work-card-${idx}`"
          :key="pair.thumb"
          type="button"
          class="works__card"
          :class="{ 'works__card--reveal': expanded && idx >= SHOWCASE_COUNT }"
          :style="
            expanded && idx >= SHOWCASE_COUNT
              ? { animationDelay: `${(idx - SHOWCASE_COUNT) * 55}ms` }
              : undefined
          "
          :aria-label="`${t('works.openPreview')} ${idx + 1}`"
          @click="openLightbox(idx)"
        >
          <img
            :src="pair.thumb"
            alt=""
            width="560"
            height="350"
            :loading="idx < 4 ? 'eager' : 'lazy'"
            decoding="async"
            :fetchpriority="idx < 2 ? 'high' : idx < 4 ? 'auto' : 'low'"
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
              v-if="lightboxDisplaySrc"
              class="lightbox__img"
              :class="{ 'lightbox__img--no-nav': !canNavigate }"
              :src="lightboxDisplaySrc"
              alt=""
              width="1280"
              height="960"
              loading="eager"
              decoding="async"
              fetchpriority="high"
              @click="onLargeImageClick"
              @error="onLargeError(lightboxDisplaySrc)"
            />

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
  margin: 1.5rem 0 calc(var(--section-y-lg) * 1.15);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow-x: clip;
}

.works__toolbar {
  display: flex;
  justify-content: flex-start;
  margin: 0 0 0.7rem;
}

.works__expand {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 0.45rem;
  margin: 0;
  padding: 0.4rem 0.7rem 0.4rem 0.85rem;
  border: 1px solid rgba(19, 52, 51, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 2px 10px rgba(26, 25, 23, 0.05);
  color: var(--allexo-olive);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.works__expand:hover {
  color: var(--allexo-gold);
  border-color: rgba(197, 160, 89, 0.55);
  background: #fff;
  box-shadow: 0 4px 14px rgba(26, 25, 23, 0.07);
}

.works__expand:focus-visible {
  outline: 2px solid var(--allexo-teal);
  outline-offset: 3px;
}

.works__expand-label {
  line-height: 1.2;
}

.works__expand-arrow {
  display: grid;
  place-items: center;
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 999px;
  border: none;
  background: transparent;
  box-shadow: none;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.works__expand-arrow svg {
  width: 1rem;
  height: 1rem;
  display: block;
}

.works__expand:hover .works__expand-arrow {
  border-color: transparent;
  background: transparent;
}

.works__expand-arrow--open {
  transform: rotate(180deg);
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
  transition: gap 0.3s ease;
}

.works__showcase--expanded .works__row {
  row-gap: 0.85rem;
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

.works__card--reveal {
  animation: worksCardReveal 0.65s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes worksCardReveal {
  from {
    opacity: 0;
    transform: translateY(22px) scale(0.965);
  }
  to {
    opacity: 1;
    transform: none;
  }
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
    margin: 1.5rem 0 calc(var(--section-y-lg) * 1.25);
  }

  .works__row {
    gap: 0.85rem;
  }
}

@media (max-width: 768px) {
  .works {
    margin: 1.25rem 0 1.85rem; /* повітря: hero ↔ галерея ↔ AboutMe */
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

  /* Усі роботи — сітка 2 колонки, щоб нові фото було видно одразу */
  .works__showcase--expanded {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem;
    overflow: visible;
    scroll-snap-type: none;
  }

  .works__showcase--expanded .works__card {
    flex: none;
    width: 100%;
    scroll-snap-align: none;
  }

  .works__showcase--expanded .works__card--reveal {
    animation: none;
    opacity: 1;
    transform: none;
  }

  .works__card:hover {
    transform: none;
  }

  .works__card--reveal:hover {
    transform: none;
  }

  .works__toolbar {
    margin-bottom: 0.45rem;
  }

  .works__expand {
    gap: 0.3rem;
    width: max-content;
    max-width: 78%;
    min-height: 0;
    height: auto;
    padding: 0.32rem 0.5rem 0.32rem 0.65rem;
    box-sizing: border-box;
    font-size: 0.7rem;
    letter-spacing: 0.06em;
  }

  .works__expand-arrow {
    width: 0.95rem;
    height: 0.95rem;
    flex: 0 0 0.95rem;
  }

  .works__expand-arrow svg {
    width: 0.8rem;
    height: 0.8rem;
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
  animation: lightboxBackdropIn 0.45s ease-out both;
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
  animation: lightboxStageIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
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

@keyframes lightboxBackdropIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes lightboxStageIn {
  from {
    opacity: 0;
    transform: translateY(28px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: none;
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
