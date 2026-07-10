<script setup>
import { computed, ref } from 'vue'
import { useLocale } from '../i18n/useLocale.js'

const { t } = useLocale()
const open = ref(false)

const chipKeys = ['badge1', 'badge2']
const mainServiceKeys = [
  'main1',
  'main2',
  'main3',
  'main4',
  'main5',
  'main6',
]
const extraServiceKeys = [
  'extra1',
  'extra2',
  'extra3',
  'extra4',
  'extra5',
  'extra6',
  'extra7',
  'extra8',
  'extra9',
]
const whyKeys = ['why1', 'why2', 'why3', 'why4', 'why5', 'why6']

const toggleLabel = computed(() =>
  open.value ? t('about.toggleCollapse') : t('about.toggleExpand'),
)
</script>

<template>
  <section class="about-me" :aria-label="t('about.aria')">
    <div class="about-me__card">
      <div class="about-me__head">
        <div class="about-me__avatar" aria-hidden="true">
          <span class="about-me__initials">{{ t('about.photoInitials') }}</span>
        </div>
        <div class="about-me__intro">
          <p class="about-me__tagline">{{ t('about.tagline') }}</p>
          <p class="about-me__line">{{ t('about.intro1') }}</p>
          <p class="about-me__line about-me__line--muted">{{ t('about.intro2') }}</p>
          <p class="about-me__line about-me__line--muted">{{ t('about.intro3') }}</p>
        </div>
      </div>

      <ul class="about-me__badges" role="list">
        <li v-for="key in chipKeys" :key="key" class="about-me__badge">
          {{ t(`about.${key}`) }}
        </li>
      </ul>

      <div v-show="open" class="about-me__details">
        <p class="about-me__detail about-me__detail--lead">{{ t('about.positioning') }}</p>
        <p class="about-me__detail">{{ t('about.pitch2') }}</p>

        <h3 class="about-me__section-title">{{ t('about.sectionMain') }}</h3>
        <p class="about-me__services-lead">{{ t('about.mainLead') }}</p>
        <ul class="about-me__services" role="list">
          <li v-for="key in mainServiceKeys" :key="key">{{ t(`about.${key}`) }}</li>
        </ul>
        <p class="about-me__detail">{{ t('about.quality') }}</p>
        <p class="about-me__detail">{{ t('about.goal') }}</p>

        <h3 class="about-me__section-title">{{ t('about.sectionExtra') }}</h3>
        <p class="about-me__services-lead">{{ t('about.extraLead') }}</p>
        <ul class="about-me__services" role="list">
          <li v-for="key in extraServiceKeys" :key="key">{{ t(`about.${key}`) }}</li>
        </ul>

        <h3 class="about-me__section-title">{{ t('about.sectionWhy') }}</h3>
        <ul class="about-me__why" role="list">
          <li v-for="key in whyKeys" :key="key">{{ t(`about.${key}`) }}</li>
        </ul>
      </div>

      <button
        type="button"
        class="about-me__toggle"
        :aria-expanded="open"
        @click="open = !open"
      >
        <span>{{ toggleLabel }}</span>
        <span class="about-me__chevron" aria-hidden="true">▾</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.about-me {
  margin: 0 0 1.25rem;
}

.about-me__card {
  padding: 1rem 1rem 0.65rem;
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius-lg);
  background: var(--allexo-surface);
  box-shadow: var(--shadow);
  position: relative;
}

.about-me__card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--allexo-accent);
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
}

.about-me__head {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
}

.about-me__avatar {
  flex-shrink: 0;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, #1a1a1a, #2d2d2d);
  border: 2px solid var(--allexo-accent);
  box-shadow: 0 2px 8px rgba(15, 61, 62, 0.12);
}

.about-me__initials {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--allexo-accent);
}

.about-me__intro {
  min-width: 0;
  flex: 1;
}

.about-me__tagline {
  margin: 0 0 0.4rem;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: var(--allexo-teal);
}

.about-me__line {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--allexo-text);
}

.about-me__line--muted {
  margin-top: 0.25rem;
  font-weight: 500;
  color: var(--allexo-muted);
}

.about-me__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0.75rem 0 0;
  padding: 0;
  list-style: none;
}

.about-me__badge {
  padding: 0.28rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--allexo-teal);
  background: rgba(15, 61, 62, 0.06);
  border: 1px solid rgba(15, 61, 62, 0.12);
  border-radius: 999px;
}

.about-me__details {
  margin-top: 0.85rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--allexo-border);
}

.about-me__section-title {
  margin: 0.85rem 0 0.35rem;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--allexo-teal);
}

.about-me__section-title:first-child {
  margin-top: 0;
}

.about-me__services-lead {
  margin: 0 0 0.35rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--allexo-muted);
}

.about-me__services,
.about-me__why {
  margin: 0 0 0.65rem;
  padding: 0 0 0 1.1rem;
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--allexo-text);
}

.about-me__services li + li,
.about-me__why li + li {
  margin-top: 0.2rem;
}

.about-me__why {
  list-style: none;
  padding-left: 0;
}

.about-me__why li {
  position: relative;
  padding-left: 1.15rem;
}

.about-me__why li::before {
  content: '✓';
  position: absolute;
  left: 0;
  font-weight: 800;
  color: var(--allexo-accent);
}

.about-me__detail {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--allexo-muted);
}

.about-me__detail + .about-me__detail {
  margin-top: 0.5rem;
}

.about-me__detail--lead {
  font-weight: 600;
  color: var(--allexo-text);
}

.about-me__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: 100%;
  margin-top: 0.65rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--allexo-teal);
  background: transparent;
  border: none;
  border-top: 1px solid var(--allexo-border);
  cursor: pointer;
}

.about-me__toggle:hover {
  color: var(--allexo-accent);
}

.about-me__toggle:focus-visible {
  outline: 2px solid var(--allexo-accent);
  outline-offset: 2px;
}

.about-me__chevron {
  display: inline-block;
  font-size: 0.75rem;
  transition: transform 0.2s ease;
}

.about-me__toggle[aria-expanded='true'] .about-me__chevron {
  transform: rotate(180deg);
}

@media (max-width: 430px) {
  .about-me__card {
    padding: 0.85rem 0.85rem 0.55rem;
  }

  .about-me__avatar {
    width: 3rem;
    height: 3rem;
  }

  .about-me__tagline {
    font-size: 0.95rem;
  }

  .about-me__line,
  .about-me__detail,
  .about-me__services,
  .about-me__why {
    font-size: 0.84rem;
  }
}
</style>
