<script setup>
import { useLocale } from '../i18n/useLocale.js'
import AboutCardIcon from './AboutCardIcon.vue'

const { t } = useLocale()

/** Поки порожньо — показується placeholder. Коли буде фото: імпорт і шлях сюди. */
const PHOTO_SRC = ''

const specialty = [
  { key: 'main1', icon: 'reveal-mdf' },
  { key: 'main2', icon: 'reveal-pvc' },
  { key: 'main3', icon: 'sill' },
  { key: 'main4', icon: 'reveal-out' },
  { key: 'main5', icon: 'roller-box' },
  { key: 'main6', icon: 'custom' },
]

const also = [
  { key: 'extra1', icon: 'door' },
  { key: 'extra2', icon: 'sliding' },
  { key: 'extra3', icon: 'roller' },
  { key: 'extra4', icon: 'seal' },
  { key: 'extra5', icon: 'repair' },
  { key: 'extra6', icon: 'adjust' },
]

const why = [
  { key: 'why1', icon: 'experience' },
  { key: 'why2', icon: 'neat' },
  { key: 'why3', icon: 'quality' },
  { key: 'why4', icon: 'person' },
  { key: 'why5', icon: 'clean' },
  { key: 'why6', icon: 'deadline' },
]
</script>

<template>
  <section class="about" :aria-label="t('about.aria')">
    <div class="about__panel">
      <div class="about__photo" aria-hidden="true">
        <img
          v-if="PHOTO_SRC"
          class="about__photo-img"
          :src="PHOTO_SRC"
          alt=""
        />
        <div v-else class="about__photo-placeholder">
          <span class="about__photo-initials">{{ t('about.photoInitials') }}</span>
          <span class="about__photo-hint">{{ t('about.photoPlaceholder') }}</span>
        </div>
      </div>

      <div class="about__side">
        <div class="about__intro">
          <p class="about__lead">{{ t('about.engagement') }}</p>
        </div>

        <div class="about__cards">
          <article class="about-card">
            <h3 class="about-card__title">{{ t('about.sectionMain') }}</h3>
            <ul class="about-card__grid" role="list">
              <li v-for="item in specialty" :key="item.key" class="about-card__item">
                <AboutCardIcon :name="item.icon" />
                <span class="about-card__label">{{ t(`about.${item.key}`) }}</span>
              </li>
            </ul>
          </article>

          <article class="about-card">
            <h3 class="about-card__title">{{ t('about.sectionExtra') }}</h3>
            <ul class="about-card__grid" role="list">
              <li v-for="item in also" :key="item.key" class="about-card__item">
                <AboutCardIcon :name="item.icon" />
                <span class="about-card__label">{{ t(`about.${item.key}`) }}</span>
              </li>
            </ul>
          </article>

          <article class="about-card">
            <h3 class="about-card__title">{{ t('about.sectionWhy') }}</h3>
            <ul class="about-card__grid" role="list">
              <li v-for="item in why" :key="item.key" class="about-card__item">
                <AboutCardIcon :name="item.icon" />
                <span class="about-card__label">{{ t(`about.${item.key}`) }}</span>
              </li>
            </ul>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about {
  margin: 1.15rem 0 var(--section-y-lg);
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
  max-height: 15rem;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--allexo-border);
  background: #ebe8e2;
  box-shadow: var(--shadow);
}

.about__photo-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 18%;
}

.about__photo-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  width: 100%;
  height: 100%;
  background:
    linear-gradient(165deg, #f3f1ec 0%, #e6e2da 55%, #d8d3c9 100%);
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

.about__side {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
}

.about__intro {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.about__lead {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.45;
  color: var(--allexo-text);
}

.about__cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.about-card {
  margin: 0;
  padding: 0.5rem 0.6rem 0.55rem;
  background: #fff;
  border: 1px solid var(--allexo-border);
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(26, 25, 23, 0.04);
  min-width: 0;
}

.about-card__title {
  margin: 0 0 0.35rem;
  font-size: 0.66rem;
  font-weight: 750;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--allexo-olive);
}

.about-card__grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid var(--allexo-divider);
  border-radius: 10px;
  overflow: hidden;
  background: var(--allexo-divider);
  gap: 1px;
}

.about-card__item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  min-height: 0;
  padding: 0.38rem 0.42rem;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.25;
  color: var(--allexo-text);
  background: #fff;
  box-sizing: border-box;
}

.about-card__item :deep(.aci) {
  width: 1.6rem;
  height: 1.6rem;
  flex: 0 0 1.6rem;
}

.about-card__item :deep(.aci svg) {
  width: 1.6rem;
  height: 1.6rem;
}

.about-card__label {
  min-width: 0;
  flex: 1;
  overflow-wrap: anywhere;
  word-break: break-word;
}

@media (min-width: 640px) {
  .about-card__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

/* Desktop: фото по висоті рівне блоку з текстом і картками */
@media (min-width: 900px) {
  .about__panel {
    display: flex;
    align-items: stretch;
    gap: 1.25rem;
  }

  .about__photo {
    flex: 0 0 clamp(17rem, 24vw, 20.5rem);
    width: clamp(17rem, 24vw, 20.5rem);
    max-width: 20.5rem;
    aspect-ratio: auto;
    max-height: none;
    height: auto;
    align-self: stretch;
  }

  .about__photo-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 16%;
  }

  .about__photo-placeholder {
    position: absolute;
    inset: 0;
  }

  .about__side {
    flex: 1 1 auto;
    gap: 0.65rem;
    min-width: 0;
  }

  .about__lead {
    font-size: 0.88rem;
    line-height: 1.5;
  }

  .about-card {
    padding: 0.55rem 0.65rem 0.58rem;
  }

  .about-card__item {
    padding: 0.4rem 0.48rem;
    font-size: 0.72rem;
  }
}

@media (max-width: 639px) {
  .about__photo {
    max-height: 14rem;
    aspect-ratio: 4 / 3;
  }

  .about__photo-initials {
    width: 3.5rem;
    height: 3.5rem;
    font-size: 1.35rem;
  }
}
</style>
