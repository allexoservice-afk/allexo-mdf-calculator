<script setup>
import { computed, ref, watch } from 'vue'
import { useLocale } from '../i18n/useLocale.js'
import { CONTACT_WHATSAPP_HREF } from '../constants/contact.js'
import { CATALOG_PRODUCTS, productsForCategory } from '../constants/partnerCatalog.js'
import { formatEuroNumber } from '../utils/priceDisplay.js'

const props = defineProps({
  /** @type {import('vue').PropType<'doors' | 'windowsills'>} */
  initialTab: { type: String, default: 'doors' },
})

const emit = defineEmits(['back'])

const { locale, t } = useLocale()

/** @type {import('vue').Ref<'doors' | 'windowsills'>} */
const tab = ref(props.initialTab === 'windowsills' ? 'windowsills' : 'doors')

/** @type {import('vue').Ref<(typeof CATALOG_PRODUCTS)[number] | null>} */
const selected = ref(null)

const brokenImages = ref(/** @type {Record<string, boolean>} */ ({}))

watch(
  () => props.initialTab,
  (v) => {
    tab.value = v === 'windowsills' ? 'windowsills' : 'doors'
  },
)

const products = computed(() => {
  const list = productsForCategory(tab.value)
  if (tab.value === 'doors') {
    const order = { model: 0, leaf: 1, accessory: 2 }
    return [...list].sort((a, b) => (order[a.kind] ?? 9) - (order[b.kind] ?? 9))
  }
  return list
})

/** @param {(typeof CATALOG_PRODUCTS)[number]} product */
function priceLabel(product) {
  if (product.priceFrom == null || !Number.isFinite(product.priceFrom)) {
    return t('catalog.priceOnRequest')
  }
  return `${t('catalog.priceFrom')} ${formatEuroNumber(product.priceFrom)}€`
}

/** @param {(typeof CATALOG_PRODUCTS)[number]} product */
function kindLabel(product) {
  return t(`catalog.kind.${product.kind}`)
}

/** @param {(typeof CATALOG_PRODUCTS)[number]} product */
function waHref(product) {
  const msg = t('catalog.waMessage')
    .replace('{name}', product.name)
    .replace('{category}', t(`catalog.tabs.${product.category}`))
  return `${CONTACT_WHATSAPP_HREF}?text=${encodeURIComponent(msg)}`
}

/** @param {(typeof CATALOG_PRODUCTS)[number]} product */
function openProduct(product) {
  selected.value = product
}

function closeProduct() {
  selected.value = null
}

/** @param {string} id */
function onImgError(id) {
  brokenImages.value = { ...brokenImages.value, [id]: true }
}
</script>

<template>
  <section class="pcat" :aria-label="t('catalog.aria')">
    <div class="pcat__bar">
      <button type="button" class="pcat__back" @click="emit('back')">
        ← {{ t('catalog.back') }}
      </button>
      <p class="pcat__badge">{{ t('catalog.proBadge') }}</p>
    </div>

    <header class="pcat__hero">
      <h1 class="pcat__title">{{ t('catalog.title') }}</h1>
      <p class="pcat__lead">{{ t('catalog.lead') }}</p>
    </header>

    <div class="pcat__tabs" role="tablist" :aria-label="t('catalog.tabsAria')">
      <button
        type="button"
        role="tab"
        class="pcat__tab"
        :class="{ 'pcat__tab--active': tab === 'doors' }"
        :aria-selected="tab === 'doors'"
        @click="tab = 'doors'"
      >
        {{ t('catalog.tabs.doors') }}
        <span class="pcat__tab-count">{{ productsForCategory('doors').length }}</span>
      </button>
      <button
        type="button"
        role="tab"
        class="pcat__tab"
        :class="{ 'pcat__tab--active': tab === 'windowsills' }"
        :aria-selected="tab === 'windowsills'"
        @click="tab = 'windowsills'"
      >
        {{ t('catalog.tabs.windowsills') }}
        <span class="pcat__tab-count">{{ productsForCategory('windowsills').length }}</span>
      </button>
    </div>

    <p class="pcat__note">{{ t('catalog.note') }}</p>

    <div class="pcat__grid">
      <article
        v-for="product in products"
        :key="product.id"
        class="pcat-card"
      >
        <button type="button" class="pcat-card__media" @click="openProduct(product)">
          <img
            v-if="product.image && !brokenImages[product.id]"
            class="pcat-card__img"
            :src="product.image"
            :alt="product.name"
            loading="lazy"
            decoding="async"
            @error="onImgError(product.id)"
          />
          <span v-else class="pcat-card__ph" aria-hidden="true">{{ product.name.slice(0, 2) }}</span>
          <span class="pcat-card__kind">{{ kindLabel(product) }}</span>
        </button>
        <div class="pcat-card__body">
          <h2 class="pcat-card__name">{{ product.name }}</h2>
          <p v-if="product.sizeHint" class="pcat-card__hint">{{ product.sizeHint }}</p>
          <p v-else-if="product.description" class="pcat-card__hint">
            {{ product.description.slice(0, 90) }}{{ product.description.length > 90 ? '…' : '' }}
          </p>
          <p class="pcat-card__price">{{ priceLabel(product) }}</p>
          <div class="pcat-card__actions">
            <button type="button" class="pcat-card__btn pcat-card__btn--ghost" @click="openProduct(product)">
              {{ t('catalog.moreInfo') }}
            </button>
            <a class="pcat-card__btn pcat-card__btn--wa" :href="waHref(product)" target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </div>
        </div>
      </article>
    </div>

    <section class="pcat__upsell" :aria-label="t('catalog.upsellTitle')">
      <h2 class="pcat__upsell-title">{{ t('catalog.upsellTitle') }}</h2>
      <p class="pcat__upsell-text">{{ t('catalog.upsellText') }}</p>
      <ul class="pcat__upsell-list">
        <li>{{ t('catalog.why1') }}</li>
        <li>{{ t('catalog.why2') }}</li>
        <li>{{ t('catalog.why3') }}</li>
      </ul>
    </section>

    <Teleport to="body">
      <div
        v-if="selected"
        class="pcat-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="selected.name"
      >
        <button type="button" class="pcat-modal__backdrop" :aria-label="t('common.close')" @click="closeProduct" />
        <div class="pcat-modal__panel">
          <button type="button" class="pcat-modal__close" :aria-label="t('common.close')" @click="closeProduct">
            ×
          </button>
          <div class="pcat-modal__media">
            <img
              v-if="selected.image && !brokenImages[selected.id]"
              class="pcat-modal__img"
              :src="selected.image"
              :alt="selected.name"
            />
            <span v-else class="pcat-modal__ph">{{ selected.name.slice(0, 2) }}</span>
          </div>
          <div class="pcat-modal__body">
            <p class="pcat-modal__kind">{{ kindLabel(selected) }}</p>
            <h2 class="pcat-modal__name">{{ selected.name }}</h2>
            <p v-if="selected.sizeHint" class="pcat-modal__hint">{{ selected.sizeHint }}</p>
            <p class="pcat-modal__price">{{ priceLabel(selected) }}</p>
            <p v-if="selected.note" class="pcat-modal__note">{{ selected.note }}</p>
            <p class="pcat-modal__text">{{ selected.description || t('catalog.detailText') }}</p>
            <ul v-if="selected.bullets?.length" class="pcat-modal__bullets">
              <li v-for="(b, i) in selected.bullets" :key="i">{{ b }}</li>
            </ul>
            <div v-if="selected.specs?.length" class="pcat-modal__block">
              <h3 class="pcat-modal__block-title">{{ t('catalog.specsTitle') }}</h3>
              <dl class="pcat-modal__specs">
                <template v-for="(spec, i) in selected.specs" :key="i">
                  <dt>{{ spec.label }}</dt>
                  <dd>{{ spec.value }}</dd>
                </template>
              </dl>
            </div>
            <div v-if="selected.sizes?.length" class="pcat-modal__block">
              <h3 class="pcat-modal__block-title">{{ t('catalog.sizesTitle') }}</h3>
              <table class="pcat-modal__sizes">
                <thead>
                  <tr>
                    <th>{{ t('catalog.sizeHeight') }}</th>
                    <th>{{ t('catalog.sizeWidth') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, i) in selected.sizes" :key="i">
                    <td>{{ row.heightCm }}</td>
                    <td>{{ row.widthsCm }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="selected.stockSizes?.length" class="pcat-modal__block">
              <h3 class="pcat-modal__block-title">{{ t('catalog.stockSizesTitle') }}</h3>
              <p class="pcat-modal__stock">{{ selected.stockSizes.join(' · ') }}</p>
            </div>
            <p class="pcat-modal__extra" v-if="selected.description || selected.specs?.length || selected.sizes?.length || selected.bullets?.length">
              {{ t('catalog.detailText') }}
            </p>
            <div class="pcat-modal__actions">
              <a
                class="pcat-card__btn pcat-card__btn--wa"
                :href="waHref(selected)"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ t('catalog.askWhatsApp') }}
              </a>
              <a
                class="pcat-card__btn pcat-card__btn--ghost"
                :href="selected.partnerUrl"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ t('catalog.openPartner') }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.pcat {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding-bottom: 2rem;
}

.pcat__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.pcat__back {
  border: none;
  background: transparent;
  color: var(--allexo-olive);
  font: inherit;
  font-weight: 650;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.35rem 0;
}

.pcat__badge {
  margin: 0;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  background: rgba(197, 162, 103, 0.18);
  color: var(--allexo-olive);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.pcat__hero {
  margin-bottom: 1.1rem;
}

.pcat__title {
  margin: 0 0 0.4rem;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 800;
  color: var(--allexo-olive);
  letter-spacing: 0.01em;
}

.pcat__lead {
  margin: 0;
  max-width: 40rem;
  font-size: 0.92rem;
  line-height: 1.5;
  color: rgba(26, 42, 42, 0.72);
}

.pcat__tabs {
  display: inline-flex;
  gap: 0.35rem;
  padding: 0.25rem;
  border-radius: 999px;
  background: rgba(19, 52, 51, 0.06);
  margin-bottom: 0.75rem;
}

.pcat__tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: rgba(26, 42, 42, 0.7);
  font: inherit;
  font-size: 0.84rem;
  font-weight: 650;
  padding: 0.45rem 0.85rem;
  cursor: pointer;
}

.pcat__tab--active {
  background: #fff;
  color: var(--allexo-olive);
  box-shadow: 0 1px 4px rgba(19, 52, 51, 0.1);
}

.pcat__tab-count {
  min-width: 1.25rem;
  height: 1.25rem;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: rgba(197, 162, 103, 0.22);
  font-size: 0.7rem;
  font-weight: 700;
}

.pcat__note {
  margin: 0 0 1rem;
  font-size: 0.78rem;
  color: rgba(26, 42, 42, 0.55);
}

.pcat__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15.5rem, 1fr));
  gap: 0.9rem;
}

.pcat-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--allexo-border);
  border-radius: 14px;
  background: #fff;
  box-shadow: var(--shadow);
  overflow: hidden;
  min-width: 0;
}

.pcat-card__media {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  margin: 0;
  padding: 0;
  border: none;
  background: #ebe8e2;
  cursor: zoom-in;
}

.pcat-card__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pcat-card__ph,
.pcat-modal__ph {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 2rem;
  font-weight: 700;
  color: rgba(19, 52, 51, 0.35);
  text-transform: uppercase;
}

.pcat-card__kind {
  position: absolute;
  left: 0.55rem;
  top: 0.55rem;
  padding: 0.18rem 0.45rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--allexo-olive);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pcat-card__body {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  padding: 0.8rem 0.85rem 0.9rem;
  flex: 1;
}

.pcat-card__name {
  margin: 0;
  font-size: 1rem;
  font-weight: 750;
  color: var(--allexo-olive);
}

.pcat-card__hint {
  margin: 0;
  font-size: 0.75rem;
  color: rgba(26, 42, 42, 0.5);
}

.pcat-card__price {
  margin: 0.15rem 0 0.35rem;
  font-size: 0.92rem;
  font-weight: 700;
  color: #1a2a2a;
}

.pcat-card__actions {
  display: flex;
  gap: 0.4rem;
  margin-top: auto;
}

.pcat-card__btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.2rem;
  padding: 0.4rem 0.55rem;
  border-radius: 10px;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
}

.pcat-card__btn--ghost {
  background: #fff;
  border-color: rgba(19, 52, 51, 0.18);
  color: var(--allexo-olive);
}

.pcat-card__btn--wa {
  background: var(--allexo-olive);
  border-color: var(--allexo-olive);
  color: #fff;
}

.pcat__upsell {
  margin-top: 1.5rem;
  padding: 1rem 1.1rem;
  border-radius: 14px;
  border: 1px solid rgba(19, 52, 51, 0.1);
  background: rgba(19, 52, 51, 0.04);
}

.pcat__upsell-title {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
  color: var(--allexo-olive);
}

.pcat__upsell-text {
  margin: 0 0 0.55rem;
  font-size: 0.88rem;
  line-height: 1.45;
  color: rgba(26, 42, 42, 0.72);
}

.pcat__upsell-list {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.86rem;
  line-height: 1.55;
  color: rgba(26, 42, 42, 0.78);
}

.pcat-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.pcat-modal__backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: rgba(26, 25, 23, 0.62);
  cursor: pointer;
}

.pcat-modal__panel {
  position: relative;
  z-index: 1;
  width: min(100%, 34rem);
  max-height: min(90vh, 44rem);
  overflow: auto;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-md);
}

.pcat-modal__close {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  z-index: 2;
  width: 2.2rem;
  height: 2.2rem;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
  color: var(--allexo-olive);
}

.pcat-modal__media {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: #ebe8e2;
}

.pcat-modal__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pcat-modal__body {
  padding: 1rem 1.1rem 1.2rem;
}

.pcat-modal__kind {
  margin: 0 0 0.25rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(26, 42, 42, 0.5);
}

.pcat-modal__name {
  margin: 0 0 0.25rem;
  font-size: 1.25rem;
  color: var(--allexo-olive);
}

.pcat-modal__hint,
.pcat-modal__text {
  margin: 0 0 0.45rem;
  font-size: 0.88rem;
  line-height: 1.45;
  color: rgba(26, 42, 42, 0.7);
}

.pcat-modal__note {
  margin: 0 0 0.55rem;
  padding: 0.45rem 0.55rem;
  border-radius: 10px;
  background: rgba(19, 52, 51, 0.06);
  font-size: 0.82rem;
  line-height: 1.4;
  color: var(--allexo-olive);
}

.pcat-modal__bullets {
  margin: 0 0 0.75rem;
  padding-left: 1.1rem;
  font-size: 0.86rem;
  line-height: 1.45;
  color: rgba(26, 42, 42, 0.78);
}

.pcat-modal__bullets li + li {
  margin-top: 0.25rem;
}

.pcat-modal__block {
  margin: 0 0 0.85rem;
}

.pcat-modal__block-title {
  margin: 0 0 0.4rem;
  font-size: 0.78rem;
  font-weight: 750;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--allexo-olive);
}

.pcat-modal__specs {
  margin: 0;
  display: grid;
  grid-template-columns: minmax(5.5rem, 7.5rem) 1fr;
  gap: 0.35rem 0.65rem;
  font-size: 0.84rem;
  line-height: 1.4;
}

.pcat-modal__specs dt {
  margin: 0;
  font-weight: 700;
  color: rgba(26, 42, 42, 0.78);
}

.pcat-modal__specs dd {
  margin: 0;
  color: rgba(26, 42, 42, 0.7);
}

.pcat-modal__sizes {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.84rem;
}

.pcat-modal__sizes th,
.pcat-modal__sizes td {
  padding: 0.35rem 0.45rem;
  border-bottom: 1px solid rgba(26, 42, 42, 0.1);
  text-align: left;
  vertical-align: top;
}

.pcat-modal__sizes th {
  font-weight: 700;
  color: rgba(26, 42, 42, 0.65);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.pcat-modal__stock {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.45;
  color: rgba(26, 42, 42, 0.7);
}

.pcat-modal__extra {
  margin: 0 0 0.85rem;
  font-size: 0.8rem;
  line-height: 1.4;
  color: rgba(26, 42, 42, 0.55);
}

.pcat-modal__price {
  margin: 0 0 0.7rem;
  font-size: 1.05rem;
  font-weight: 750;
}

.pcat-modal__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.pcat-modal__actions .pcat-card__btn {
  flex: 1 1 10rem;
}

@media (max-width: 768px) {
  .pcat__grid {
    grid-template-columns: 1fr;
  }

  .pcat__tabs {
    width: 100%;
  }

  .pcat__tab {
    flex: 1;
    justify-content: center;
  }
}
</style>
