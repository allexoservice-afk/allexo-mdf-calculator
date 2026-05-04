<script setup>
import { useLocale } from '../i18n/useLocale.js'

const { t } = useLocale()
</script>

<template>
  <div class="header__text">
    <p class="header__brand">ALLEXO</p>
    <h1 class="header__title">{{ t('hero.title') }}</h1>
    <p class="header__tag">{{ t('hero.subtitle') }}</p>
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
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--allexo-accent-soft);
}

.header__title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.22;
  max-width: 100%;
  text-wrap: balance;
  overflow-wrap: break-word;
  hyphens: auto;
}

@media (max-width: 430px) {
  .header__title {
    font-size: 1.08rem;
    line-height: 1.2;
  }
}

@media (min-width: 640px) {
  .header__title {
    font-size: clamp(1.875rem, 2.2vw, 2rem);
    line-height: 1.25;
  }
}

.header__tag {
  margin: 12px 0 0;
  font-size: 1.125rem;
  line-height: 1.52;
  opacity: 0.85;
  max-width: 32rem;
  text-wrap: balance;
  overflow-wrap: break-word;
}
</style>
