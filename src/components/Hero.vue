<script setup>
import { useLocale } from '../i18n/useLocale.js'

const { t } = useLocale()

function scrollToCalculator() {
  const el = document.getElementById('calculator')
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="header__text">
    <p class="header__brand">ALLEXO</p>
    <h1 class="header__title">{{ t('hero.title') }}</h1>
    <p class="header__tag">{{ t('hero.subtitle') }}</p>
    <button type="button" class="header__cta" @click="scrollToCalculator">
      {{ t('app.calcCta') }}
    </button>
  </div>
</template>

<style scoped>
.header__text {
  flex: 1;
  min-width: 0;
}

.header__brand {
  margin: 0 0 12px;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--allexo-accent-soft);
}

.header__title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.28;
  max-width: 100%;
  text-wrap: balance;
  overflow-wrap: break-word;
  hyphens: auto;
}

@media (max-width: 430px) {
  .header__title {
    font-size: 1.08rem;
    line-height: 1.26;
  }
}

@media (min-width: 640px) {
  .header__title {
    font-size: clamp(1.875rem, 2.2vw, 2rem);
    line-height: 1.3;
  }
}

.header__tag {
  margin: 8px 0 0;
  font-size: 1.125rem;
  line-height: 1.4;
  opacity: 0.85;
  max-width: 32rem;
  text-wrap: balance;
  overflow-wrap: break-word;
}

.header__cta {
  margin: 14px 0 0;
  min-height: 3rem;
  padding: 0.75rem 1.15rem;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font: inherit;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
  -webkit-tap-highlight-color: transparent;
}

.header__cta:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.5);
}

.header__cta:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.9);
  outline-offset: 3px;
}

@media (max-width: 430px) {
  .header__cta {
    width: 100%;
  }
}

</style>
