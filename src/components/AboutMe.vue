<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { useLocale } from '../i18n/useLocale.js'
import AboutCardIcon from './AboutCardIcon.vue'
import aboutPhoto from '../assets/about/oleksandr.jpg'

const { t } = useLocale()

const PHOTO_SRC = aboutPhoto
const lightboxOpen = ref(false)

const finishing = [
  { key: 'main1', icon: 'reveal-mdf' },
  { key: 'main2', icon: 'roller-box' },
  { key: 'main3', icon: 'custom' },
]

const service = [
  { key: 'extra1', icon: 'repair', highlight: true },
  { key: 'extra2', icon: 'door' },
  { key: 'extra3', icon: 'adjust' },
]

const badges = ['why1', 'why2', 'why3', 'why4']

function openPhotoLightbox() {
  if (!PHOTO_SRC) return
  lightboxOpen.value = true
}

function closePhotoLightbox() {
  lightboxOpen.value = false
}

function onLightboxKeydown(/** @type {KeyboardEvent} */ e) {
  if (e.key === 'Escape') closePhotoLightbox()
}

watch(lightboxOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <section class="about" :aria-label="t('about.aria')">
    <div class="about__panel">
      <div class="about__photo">
        <button
          v-if="PHOTO_SRC"
          type="button"
          class="about__photo-btn"
          :aria-label="t('about.photoExpandAria')"
          @click="openPhotoLightbox"
        >
          <img
            class="about__photo-img"
            :src="PHOTO_SRC"
            alt=""
            width="1024"
            height="768"
            decoding="async"
            fetchpriority="low"
          />
        </button>
        <div v-else class="about__photo-placeholder">
          <span class="about__photo-initials">{{ t('about.photoInitials') }}</span>
          <span class="about__photo-hint">{{ t('about.photoPlaceholder') }}</span>
        </div>
      </div>

      <div class="about__content">
        <header class="about__header">
          <h2 class="about__title">{{ t('about.profileTitle') }}</h2>
          <p class="about__lead">{{ t('about.engagement') }}</p>
        </header>

        <div class="about__columns">
          <section class="about__col" :aria-labelledby="'about-col-finishing'">
            <h3 id="about-col-finishing" class="about__col-title">{{ t('about.sectionMain') }}</h3>
            <ul class="about__list" role="list">
              <li v-for="item in finishing" :key="item.key" class="about__list-item">
                <AboutCardIcon :name="item.icon" />
                <span>{{ t(`about.${item.key}`) }}</span>
              </li>
            </ul>
          </section>

          <section class="about__col" :aria-labelledby="'about-col-service'">
            <h3 id="about-col-service" class="about__col-title">{{ t('about.sectionService') }}</h3>
            <ul class="about__list" role="list">
              <li
                v-for="item in service"
                :key="item.key"
                class="about__list-item"
                :class="{ 'about__list-item--highlight': item.highlight }"
              >
                <AboutCardIcon :name="item.icon" />
                <span>{{ t(`about.${item.key}`) }}</span>
              </li>
            </ul>
          </section>
        </div>

        <section class="about__trust" aria-labelledby="about-trust-title">
          <h3 id="about-trust-title" class="about__trust-title">{{ t('about.sectionWhy') }}</h3>
          <ul class="about__trust-list" role="list">
            <li v-for="key in badges" :key="key" class="about__trust-item">{{ t(`about.${key}`) }}</li>
          </ul>
        </section>
      </div>
    </div>
  </section>

  <Teleport to="body">
    <div
      v-if="lightboxOpen && PHOTO_SRC"
      class="about-lightbox"
      role="dialog"
      aria-modal="true"
      :aria-label="t('about.photoLightboxAria')"
      @keydown="onLightboxKeydown"
    >
      <button
        type="button"
        class="about-lightbox__backdrop"
        :aria-label="t('common.close')"
        @click="closePhotoLightbox"
      />
      <button type="button" class="about-lightbox__close" :aria-label="t('common.close')" @click="closePhotoLightbox">
        ×
      </button>
      <div class="about-lightbox__stage">
        <img
          class="about-lightbox__img"
          :src="PHOTO_SRC"
          :alt="t('about.photoAlt')"
          @click="closePhotoLightbox"
        />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.about {
  margin: 0.5rem 0 var(--section-y-lg);
  padding: 0;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: clip;
}

.about__panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
  align-items: stretch;
  width: 100%;
  min-width: 0;
}

.about__photo {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--allexo-border);
  background: #ebe8e2;
  box-shadow: var(--shadow);
}

.about__photo-btn {
  display: block;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: zoom-in;
  -webkit-tap-highlight-color: transparent;
}

.about__photo-btn:focus-visible {
  outline: 2px solid var(--allexo-olive);
  outline-offset: 3px;
}

.about__photo-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 28%;
  transition: transform 0.35s ease;
  will-change: transform;
}

.about__photo-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  width: 100%;
  height: 100%;
  background: linear-gradient(165deg, #f3f1ec 0%, #e6e2da 55%, #d8d3c9 100%);
  color: var(--allexo-olive);
}

.about__photo-initials {
  display: grid;
  place-items: center;
  width: 4.25rem;
  height: 4.25rem;
  border-radius: 50%;
  background: var(--allexo-olive);
  color: #fff;
  font-family: Georgia, 'Times New Roman', Times, serif;
  font-size: 1.65rem;
  font-weight: 700;
  line-height: 1;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px var(--allexo-gold);
}

.about__photo-hint {
  font-size: 0.78rem;
  font-weight: 550;
  letter-spacing: 0.02em;
  color: rgba(26, 25, 23, 0.55);
}

.about__content {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-width: 0;
}

.about__header {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.about__title {
  margin: 0;
  font-size: clamp(1.05rem, 2.2vw, 1.22rem);
  font-weight: 750;
  letter-spacing: 0.04em;
  color: var(--allexo-olive);
  line-height: 1.2;
}

.about__lead {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.55;
  color: var(--allexo-text);
  max-width: 40rem;
}

.about__columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem 1.25rem;
}

.about__col-title {
  margin: 0 0 0.45rem;
  font-size: 0.66rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--allexo-olive);
}

.about__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.38rem;
}

.about__list-item {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--allexo-text);
}

.about__list-item :deep(.aci) {
  width: 1.45rem;
  height: 1.45rem;
  flex: 0 0 1.45rem;
  margin-top: 0.02rem;
}

.about__list-item :deep(.aci svg) {
  width: 1.45rem;
  height: 1.45rem;
}

.about__list-item--highlight {
  color: var(--allexo-olive);
}

.about__list-item--highlight span {
  font-weight: 700;
}

.about__trust {
  margin-top: 0.2rem;
  padding: 0.7rem 0.8rem 0.75rem;
  border-radius: var(--radius);
  background: rgba(19, 52, 51, 0.05);
  border: 1px solid rgba(19, 52, 51, 0.1);
}

.about__trust-title {
  margin: 0 0 0.5rem;
  font-size: 0.66rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--allexo-olive);
}

.about__trust-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 0.85rem;
  row-gap: 0.45rem;
}

.about__trust-item {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  font-size: 0.74rem;
  font-weight: 650;
  line-height: 1.35;
  color: var(--allexo-text);
}

.about__trust-item::before {
  content: '';
  flex: 0 0 0.38rem;
  width: 0.38rem;
  height: 0.38rem;
  margin-top: 0.28em;
  border-radius: 50%;
  background: var(--allexo-gold);
  box-shadow: 0 0 0 1px rgba(197, 160, 89, 0.35);
}

.about__trust-item:first-child {
  color: var(--allexo-olive);
  font-weight: 700;
}

.about__trust-item:last-child {
  font-weight: 600;
}

.about-lightbox {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.about-lightbox__backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  margin: 0;
  padding: 0;
  border: none;
  background: rgba(26, 25, 23, 0.72);
  cursor: pointer;
}

.about-lightbox__close {
  position: fixed;
  top: 1rem;
  right: 1rem;
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
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(26, 25, 23, 0.12);
}

.about-lightbox__close:hover {
  background: #fff;
}

.about-lightbox__stage {
  position: relative;
  z-index: 1;
  max-width: min(92vw, 960px);
}

.about-lightbox__img {
  display: block;
  max-width: min(92vw, 960px);
  max-height: min(82vh, 860px);
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(26, 25, 23, 0.28);
  cursor: zoom-out;
  animation: aboutLightboxIn 240ms ease-out;
}

@keyframes aboutLightboxIn {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (min-width: 560px) {
  .about__columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 900px) {
  .about__panel {
    display: flex;
    align-items: stretch;
    gap: 1.35rem;
  }

  .about__photo {
    flex: 0 0 clamp(16.5rem, 22vw, 19.5rem);
    width: clamp(16.5rem, 22vw, 19.5rem);
    max-width: 19.5rem;
    aspect-ratio: auto;
    height: auto;
    align-self: stretch;
  }

  .about__photo-btn {
    position: absolute;
    inset: 0;
  }

  .about__photo-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-position: center 24%;
  }

  .about__photo-placeholder {
    position: absolute;
    inset: 0;
  }

  .about__content {
    flex: 1 1 auto;
    gap: 0.9rem;
    padding-top: 0.15rem;
  }

  .about__lead {
    font-size: 0.88rem;
  }

  .about__list-item {
    font-size: 0.8rem;
  }

  .about__trust-list {
    column-gap: 1.1rem;
  }

  .about__trust-item {
    font-size: 0.8rem;
  }
}

@media (min-width: 900px) and (hover: hover) {
  .about__photo-btn:hover .about__photo-img {
    transform: scale(1.025);
  }
}

@media (prefers-reduced-motion: reduce) {
  .about__photo-img {
    transition: none;
  }

  .about-lightbox__img {
    animation: none;
  }
}
</style>
