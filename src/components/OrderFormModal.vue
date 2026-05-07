<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { getTypeById, isSimplifiedProductLine } from '../constants/calculatorTypes.js'
import {
  isValidSizeCategory,
  normalizeWindowQuantity,
  ROLLER_BOX_HEIGHT_MM_OPTIONS,
  SIZE_CATEGORY_OPTIONS,
  WINDOWSILL_DEPTH_MM_OPTIONS,
  WINDOW_QUANTITIES,
} from '../constants/sizeCategories.js'
import { useLocale } from '../i18n/useLocale.js'
import {
  quoteRollerBoxOnlyRoundedEuros,
  quoteWindowRoundedEuros,
  quoteWindowsillOnlyRoundedEuros,
} from '../pricing/windowQuote.js'
import { formatEuroExclVat } from '../utils/priceDisplay.js'
import { windowProfileLengthMeters } from '../utils/mdfFormulas.js'
import {
  MIN_WINDOW_SIDE_MM,
  windowEligibleForAutoQuote,
  windowExceedsStandardMax,
  windowSidesMeetMinimum,
} from '../utils/windowDimensions.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** @type {import('vue').PropType<import('../constants/calculatorTypes.js').CalculatorTypeId | null>} */
  typeId: { type: String, default: null },
})

const emit = defineEmits(['close', 'submit'])

const { locale, t } = useLocale()

function newWindowRow() {
  return reactive({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    widthMm: '',
    heightMm: '',
    rollerBoxHeightMm: 300,
    sillDepthMm: 150,
    quantity: 1,
    depthCategory: 'small',
    rollerCategory: 'small',
  })
}

const windows = ref([newWindowRow()])

const currentType = computed(() => (props.typeId ? getTypeById(props.typeId) : null))

const isSimplifiedLine = computed(() => isSimplifiedProductLine(props.typeId))
const isWithSillType = computed(() => props.typeId === 'with_sill')

/** Явні залежності для live-ціни: зміна ширини / глибини / кількості завжди інвалідує прев’ю. */
const orderFormPriceDeps = computed(() =>
  windows.value
    .map((w) =>
      [
        w.id,
        w.widthMm,
        w.heightMm,
        w.sillDepthMm,
        w.rollerBoxHeightMm,
        w.quantity,
        w.depthCategory,
        w.rollerCategory,
      ].join('\u001f'),
    )
    .join('\u001e'),
)

const formTitle = computed(() => (props.typeId ? t(`types.${props.typeId}.title`) : ''))
const formHint = computed(() => (props.typeId ? t(`types.${props.typeId}.hint`) : ''))
const formHintRoller = computed(() => (props.typeId ? t(`types.${props.typeId}.hintRoller`) : ''))

// Lock background scroll while modal is open.
watch(
  () => props.open,
  (isOpen) => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const body = document.body
    if (!root || !body) return

    if (isOpen) {
      root.style.overflow = 'hidden'
      body.style.overflow = 'hidden'
      body.style.touchAction = 'none'
    } else {
      root.style.overflow = ''
      body.style.overflow = ''
      body.style.touchAction = ''
    }
  },
  { immediate: true },
)

watch(
  () => props.typeId,
  () => {
    windows.value = [newWindowRow()]
  },
)

function parseNum(v) {
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

/** Користувач вводить мм. */
function parseMm(v) {
  const mm = parseNum(v)
  if (!Number.isFinite(mm) || mm <= 0) return NaN
  return mm
}

const windowErrors = computed(() => {
  void locale.value
  const tid = props.typeId
  return windows.value.map((formW) => {
    const e = {}
    const wMm = parseMm(formW.widthMm)
    if (!Number.isFinite(wMm) || wMm <= 0) e.widthMm = t('form.errWidth')
    else if (wMm < MIN_WINDOW_SIDE_MM) e.widthMm = t('form.errMinWindowSize')

    if (tid === 'roller_box') {
      const rhMm = Number(formW.rollerBoxHeightMm)
      if (!ROLLER_BOX_HEIGHT_MM_OPTIONS.includes(rhMm)) e.rollerBoxHeightMm = t('form.errRollerBoxSelect')
    } else if (tid === 'windowsill') {
      const dMm = Number(formW.sillDepthMm)
      if (!WINDOWSILL_DEPTH_MM_OPTIONS.some((mm) => Number(mm) === dMm)) {
        e.sillDepthMm = t('form.errSillDepthSelect')
      }
    } else {
      const hMm = parseMm(formW.heightMm)
      if (!Number.isFinite(hMm) || hMm <= 0) e.heightMm = t('form.errHeight')
      else if (hMm < MIN_WINDOW_SIDE_MM) e.heightMm = t('form.errMinWindowSize')

      if (!isValidSizeCategory(String(formW.depthCategory))) e.depthCategory = t('form.errCategory')

      const ty = currentType.value
      if (ty?.hasSill) {
        const dMm = Number(formW.sillDepthMm)
        if (!WINDOWSILL_DEPTH_MM_OPTIONS.some((mm) => Number(mm) === dMm)) {
          e.sillDepthMm = t('form.errSillDepthSelect')
        }
      }
      if (ty?.hasRoller && !isValidSizeCategory(String(formW.rollerCategory))) {
        e.rollerCategory = t('form.errCategory')
      }
    }
    return e
  })
})

const isValid = computed(() => windowErrors.value.every((err) => Object.keys(err).length === 0))

/** @param {Record<string, unknown>} formW */
function formWindowIsOversized(formW) {
  const w = parseMm(formW.widthMm)
  if (props.typeId === 'roller_box') {
    const rhMm = Number(formW.rollerBoxHeightMm)
    const rh = Number.isFinite(rhMm) ? rhMm : NaN
    return (
      Number.isFinite(w) &&
      w >= MIN_WINDOW_SIDE_MM &&
      ROLLER_BOX_HEIGHT_MM_OPTIONS.includes(rhMm) &&
      windowExceedsStandardMax(w, rh)
    )
  }
  if (props.typeId === 'windowsill') {
    const dMm = Number(formW.sillDepthMm)
    const d = Number.isFinite(dMm) ? dMm : NaN
    return (
      Number.isFinite(w) &&
      w >= MIN_WINDOW_SIDE_MM &&
      WINDOWSILL_DEPTH_MM_OPTIONS.some((mm) => Number(mm) === dMm) &&
      windowExceedsStandardMax(w, d)
    )
  }
  const h = parseMm(formW.heightMm)
  return (
    Number.isFinite(w) &&
    w >= MIN_WINDOW_SIDE_MM &&
    Number.isFinite(h) &&
    h >= MIN_WINDOW_SIDE_MM &&
    windowExceedsStandardMax(w, h)
  )
}

const formHasAnyOversized = computed(() => windows.value.some((formW) => formWindowIsOversized(formW)))

const primarySubmitLabel = computed(() => {
  void locale.value
  return formHasAnyOversized.value ? t('form.getExactQuote') : t('form.addToOrder')
})

function addWindow() {
  windows.value = [...windows.value, newWindowRow()]
}

/** @param {number} index */
function removeWindow(index) {
  if (windows.value.length <= 1) return
  windows.value = windows.value.filter((_, i) => i !== index)
}

function onSubmit() {
  if (!isValid.value || !props.typeId) return
  const ty = getTypeById(props.typeId)
  emit('submit', {
    typeId: props.typeId,
    windows: windows.value.map((formW) => {
      const widthMm = parseMm(formW.widthMm)
      if (props.typeId === 'roller_box') {
        const rollerBoxHeightMm = Number(formW.rollerBoxHeightMm)
        return {
          widthMm,
          rollerBoxHeightMm,
          heightMm: rollerBoxHeightMm,
          depthCategory: 'small',
          windowsillCategory: null,
          rollerCategory: null,
          profileLengthM: windowProfileLengthMeters(widthMm, rollerBoxHeightMm),
          quantity: normalizeWindowQuantity(formW.quantity),
        }
      }
      if (props.typeId === 'windowsill') {
        const windowsillDepthMm = Number(formW.sillDepthMm)
        return {
          widthMm,
          windowsillDepthMm,
          heightMm: windowsillDepthMm,
          depthCategory: 'small',
          windowsillCategory: null,
          rollerCategory: null,
          profileLengthM: windowProfileLengthMeters(widthMm, windowsillDepthMm),
          quantity: normalizeWindowQuantity(formW.quantity),
        }
      }
      const heightMm = parseMm(formW.heightMm)
      return {
        widthMm,
        heightMm,
        depthCategory: isValidSizeCategory(String(formW.depthCategory))
          ? formW.depthCategory
          : 'small',
        windowsillDepthMm: ty?.hasSill ? Number(formW.sillDepthMm) : null,
        windowsillCategory: null,
        rollerCategory: ty?.hasRoller
          ? isValidSizeCategory(String(formW.rollerCategory))
            ? formW.rollerCategory
            : 'small'
          : null,
        profileLengthM: windowProfileLengthMeters(widthMm, heightMm),
        quantity: normalizeWindowQuantity(formW.quantity),
      }
    }),
  })
  emit('close')
}

function onBackdrop(e) {
  if (e.target === e.currentTarget) emit('close')
}

/**
 * Live-прев’ю ціни: спочатку збираємо «відбиток» усіх полів рядків,
 * щоб Vue гарантовано відстежував зміни widthMm / sillDepthMm / quantity.
 */
const windowPreviews = computed(() => {
  void locale.value
  void props.typeId
  void props.open
  void orderFormPriceDeps.value

  const rows = windows.value

  const tid = props.typeId
  const ty = currentType.value
  if (!tid || !ty) return []

  return rows.map((formW) => {
    const qty = normalizeWindowQuantity(formW.quantity)
    let showPreview = false
    let oversized = false
    let unitEuros = 0

    if (tid === 'windowsill') {
    const wMm = parseMm(formW.widthMm)
    const dMm = Number(formW.sillDepthMm)
      const depthOk =
      Number.isFinite(dMm) && WINDOWSILL_DEPTH_MM_OPTIONS.some((mm) => Number(mm) === dMm)
      const widthOk = Number.isFinite(wMm) && wMm >= MIN_WINDOW_SIDE_MM
      showPreview =
        widthOk &&
        depthOk &&
        Number.isFinite(dMm) &&
        !windowExceedsStandardMax(wMm, dMm)
      oversized =
        widthOk &&
        depthOk &&
        Number.isFinite(dMm) &&
        windowExceedsStandardMax(wMm, dMm)
      if (showPreview) unitEuros = quoteWindowsillOnlyRoundedEuros(wMm, dMm)
    } else if (tid === 'roller_box') {
    const wMm = parseMm(formW.widthMm)
    const rhMm = Number(formW.rollerBoxHeightMm)
    const rollerOk = ROLLER_BOX_HEIGHT_MM_OPTIONS.some((mm) => Number(mm) === rhMm)
      const widthOk = Number.isFinite(wMm) && wMm >= MIN_WINDOW_SIDE_MM
      showPreview =
        widthOk &&
        rollerOk &&
        Number.isFinite(rhMm) &&
        !windowExceedsStandardMax(wMm, rhMm)
      oversized =
        widthOk &&
        rollerOk &&
        Number.isFinite(rhMm) &&
        windowExceedsStandardMax(wMm, rhMm)
      if (showPreview) unitEuros = quoteRollerBoxOnlyRoundedEuros(wMm, rhMm)
    } else {
    const wMm = parseMm(formW.widthMm)
    const hMm = parseMm(formW.heightMm)
      showPreview = windowEligibleForAutoQuote(wMm, hMm)
      oversized =
        Number.isFinite(wMm) &&
        Number.isFinite(hMm) &&
        windowSidesMeetMinimum(wMm, hMm) &&
        windowExceedsStandardMax(wMm, hMm)
      if (showPreview) {
        const depth = isValidSizeCategory(String(formW.depthCategory)) ? formW.depthCategory : 'small'
        const ws = ty.hasSill
          ? (WINDOWSILL_DEPTH_MM_OPTIONS.some((mm) => Number(mm) === Number(formW.sillDepthMm))
              ? Number(formW.sillDepthMm)
              : 150)
          : null
        const roller = ty.hasRoller
          ? isValidSizeCategory(String(formW.rollerCategory))
            ? formW.rollerCategory
            : 'small'
          : null
        unitEuros = quoteWindowRoundedEuros(
          wMm,
          hMm,
          /** @type {import('../constants/sizeCategories.js').SizeCategoryId} */ (depth),
          ty.hasSill,
          ty.hasRoller,
          ws != null ? Number(ws) : null,
          roller != null ? /** @type {import('../constants/sizeCategories.js').SizeCategoryId} */ (roller) : null,
        )
      }
    }

    return {
      showPreview,
      oversized,
      unitEuros,
      lineTotalEuros: unitEuros * qty,
      qty,
    }
  })
})

function sizeLabel(id) {
  return t(`sizes.${id}`)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && currentType"
      class="backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-form-title"
      @click="onBackdrop"
    >
      <div class="modal" :class="{ 'modal--no-inner-scroll': isWithSillType }" @click.stop>
        <div class="modal__head">
          <h2 id="order-form-title" class="modal__title">{{ formTitle }}</h2>
          <button type="button" class="modal__close" :aria-label="t('common.close')" @click="emit('close')">
            ×
          </button>
        </div>
        <div class="modal__hints">
          <p class="modal__hint">{{ formHint }}</p>
          <p v-if="formHintRoller" class="modal__hint">{{ formHintRoller }}</p>
        </div>
        <form class="form" @submit.prevent="onSubmit">
          <div
            v-for="(win, idx) in windows"
            :key="win.id"
            class="window-block"
          >
            <div class="window-block__head">
              <h3 class="window-block__title">{{ t('form.window') }} {{ idx + 1 }}</h3>
              <button
                v-if="windows.length > 1"
                type="button"
                class="btn-win-remove"
                @click="removeWindow(idx)"
              >
                {{ t('form.removeWindow') }}
              </button>
            </div>

            <div v-if="isSimplifiedLine && props.typeId === 'roller_box'" class="row row--dims">
              <label class="field">
                <span class="field__label">{{ t('form.widthMm') }}</span>
                <input
                  v-model="windows[idx].widthMm"
                  type="text"
                  inputmode="decimal"
                  class="field__input"
                  :placeholder="t('form.placeholderWidth')"
                  :class="{ 'field__input--error': windowErrors[idx]?.widthMm }"
                />
                <span v-if="windowErrors[idx]?.widthMm" class="field__err">{{
                  windowErrors[idx].widthMm
                }}</span>
              </label>
              <label class="field">
                <span class="field__label">{{ t('form.rollerBoxHeightCm') }}</span>
                <select
                  v-model.number="windows[idx].rollerBoxHeightMm"
                  class="field__input"
                  autocomplete="off"
                  :class="{ 'field__input--error': windowErrors[idx]?.rollerBoxHeightMm }"
                >
                  <option v-for="mm in ROLLER_BOX_HEIGHT_MM_OPTIONS" :key="mm" :value="mm">
                    {{ mm }} {{ t('common.mm') }}
                  </option>
                </select>
                <span v-if="windowErrors[idx]?.rollerBoxHeightMm" class="field__err">{{
                  windowErrors[idx].rollerBoxHeightMm
                }}</span>
              </label>
            </div>
            <div v-else-if="isSimplifiedLine && props.typeId === 'windowsill'" class="row row--dims">
              <label class="field">
                <span class="field__label">{{ t('form.widthMm') }}</span>
                <input
                  v-model="windows[idx].widthMm"
                  type="text"
                  inputmode="decimal"
                  class="field__input"
                  :placeholder="t('form.placeholderWidth')"
                  :class="{ 'field__input--error': windowErrors[idx]?.widthMm }"
                />
                <span v-if="windowErrors[idx]?.widthMm" class="field__err">{{
                  windowErrors[idx].widthMm
                }}</span>
              </label>
              <label class="field">
                <span class="field__label">{{ t('form.sillDepthCm') }}</span>
                <select
                  v-model.number="windows[idx].sillDepthMm"
                  class="field__input"
                  autocomplete="off"
                  :class="{ 'field__input--error': windowErrors[idx]?.sillDepthMm }"
                >
                  <option v-for="mm in WINDOWSILL_DEPTH_MM_OPTIONS" :key="mm" :value="mm">
                    {{ mm }} {{ t('common.mm') }}
                  </option>
                </select>
                <span v-if="windowErrors[idx]?.sillDepthMm" class="field__err">{{
                  windowErrors[idx].sillDepthMm
                }}</span>
              </label>
            </div>
            <div v-else class="row row--dims">
              <label class="field">
                <span class="field__label">{{ t('form.widthMm') }}</span>
                <input
                  v-model="windows[idx].widthMm"
                  type="text"
                  inputmode="decimal"
                  class="field__input"
                  :placeholder="t('form.placeholderWidth')"
                  :class="{ 'field__input--error': windowErrors[idx]?.widthMm }"
                />
                <span v-if="windowErrors[idx]?.widthMm" class="field__err">{{
                  windowErrors[idx].widthMm
                }}</span>
              </label>
              <label class="field">
                <span class="field__label">{{ t('form.heightMm') }}</span>
                <input
                  v-model="windows[idx].heightMm"
                  type="text"
                  inputmode="decimal"
                  class="field__input"
                  :placeholder="t('form.placeholderHeight')"
                  :class="{ 'field__input--error': windowErrors[idx]?.heightMm }"
                />
                <span v-if="windowErrors[idx]?.heightMm" class="field__err">{{
                  windowErrors[idx].heightMm
                }}</span>
              </label>
            </div>
            <label class="field field--compact">
              <span class="field__label">{{ t('form.windowQuantity') }}</span>
              <select v-model.number="windows[idx].quantity" class="field__input">
                <option v-for="q in WINDOW_QUANTITIES" :key="q" :value="q">{{ q }}</option>
              </select>
            </label>
            <p v-if="!isSimplifiedLine" class="dims-hint">{{ t('form.minSizeHint') }}</p>
            <p v-else class="dims-hint">{{ t('form.minSizeHintSimplified') }}</p>

            <label v-if="!isSimplifiedLine" class="field">
              <span class="field__label">{{ t('form.depthMm') }}</span>
              <select
                v-model="windows[idx].depthCategory"
                class="field__input"
                :class="{ 'field__input--error': windowErrors[idx]?.depthCategory }"
              >
                <option
                  v-for="opt in SIZE_CATEGORY_OPTIONS"
                  :key="opt.id"
                  :value="opt.id"
                >
                  {{ sizeLabel(opt.id) }}
                </option>
              </select>
              <span v-if="windowErrors[idx]?.depthCategory" class="field__err">{{
                windowErrors[idx].depthCategory
              }}</span>
            </label>

            <label v-if="!isSimplifiedLine && currentType.hasSill" class="field">
              <span class="field__label">{{ t('form.sillDepthCm') }}</span>
              <select
                v-model.number="windows[idx].sillDepthMm"
                class="field__input"
                autocomplete="off"
                :class="{ 'field__input--error': windowErrors[idx]?.sillDepthMm }"
              >
                <option v-for="mm in WINDOWSILL_DEPTH_MM_OPTIONS" :key="mm" :value="mm">
                  {{ mm }} {{ t('common.mm') }}
                </option>
              </select>
              <span v-if="windowErrors[idx]?.sillDepthMm" class="field__err">{{
                windowErrors[idx].sillDepthMm
              }}</span>
            </label>

            <label v-if="!isSimplifiedLine && currentType.hasRoller" class="field">
              <span class="field__label">{{ t('form.rollerMm') }}</span>
              <select
                v-model="windows[idx].rollerCategory"
                class="field__input"
                :class="{ 'field__input--error': windowErrors[idx]?.rollerCategory }"
              >
                <option
                  v-for="opt in SIZE_CATEGORY_OPTIONS"
                  :key="opt.id"
                  :value="opt.id"
                >
                  {{ sizeLabel(opt.id) }}
                </option>
              </select>
              <span v-if="windowErrors[idx]?.rollerCategory" class="field__err">{{
                windowErrors[idx].rollerCategory
              }}</span>
            </label>

            <p v-if="windowPreviews[idx]?.showPreview" class="window-preview-price">
              <template v-if="windowPreviews[idx].qty > 1">
                {{ t('form.pricePerUnit') }} {{ formatEuroExclVat(windowPreviews[idx].unitEuros, locale) }} ·
                {{ t('form.quantityLabel') }} {{ windowPreviews[idx].qty }} ·
                {{ t('form.lineTotal') }} {{ formatEuroExclVat(windowPreviews[idx].lineTotalEuros, locale) }}
              </template>
              <template v-else>
                {{ t('form.price') }} {{ formatEuroExclVat(windowPreviews[idx].unitEuros, locale) }}
              </template>
            </p>
            <p v-else-if="windowPreviews[idx]?.oversized" class="window-preview-price window-preview-price--individual">
              {{ t('form.largeSizesInfo') }}
            </p>
            <p v-else class="window-preview-price window-preview-price--placeholder">
              {{ t('form.enterDimensions') }}
            </p>
          </div>

          <button type="button" class="btn-add-window" @click="addWindow">
            {{ t('form.addWindow') }}
          </button>

          <div class="actions">
            <button type="button" class="btn btn--ghost" @click="emit('close')">{{ t('form.cancel') }}</button>
            <button type="submit" class="btn btn--primary" :disabled="!isValid">{{ primarySubmitLabel }}</button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: rgba(28, 36, 36, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right))
    max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
  box-sizing: border-box;
}

.modal {
  width: min(100%, 420px);
  max-width: calc(100vw - 1.5rem);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
  background: var(--allexo-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: 1.25rem 1.25rem 0;
  padding-bottom: max(0.5rem, env(safe-area-inset-bottom, 0px));
}

/* Для “Відкоси з підвіконником” прибираємо внутрішній вертикальний скрол. */
.modal--no-inner-scroll {
  overflow-y: visible;
}

@media (min-width: 640px) {
  .modal {
    padding: 1.5rem;
    padding-bottom: max(1rem, env(safe-area-inset-bottom, 0px));
  }
}

.modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  flex-shrink: 0;
}

.modal__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--allexo-teal);
  line-height: 1.25;
  min-width: 0;
  overflow-wrap: break-word;
}

.modal__close {
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  border: none;
  background: var(--allexo-bg);
  color: var(--allexo-text);
  border-radius: var(--radius);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.modal__close:hover {
  background: var(--allexo-border);
}

.modal__hints {
  margin: 0 0 1.1rem;
  flex-shrink: 0;
}

.modal__hint {
  margin: 0 0 0.4rem;
  font-size: 0.875rem;
  color: var(--allexo-muted);
  line-height: 1.45;
  overflow-wrap: break-word;
}

.modal__hint:last-child {
  margin-bottom: 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
  overflow-x: hidden;
  overflow-y: visible;
  padding-bottom: 0.5rem;
}

.window-block {
  min-width: 0;
  padding: 1rem;
  background: var(--allexo-bg);
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  overflow-x: hidden;
}

.window-block__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.window-block__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--allexo-teal);
}

.window-preview-price {
  margin: 0.15rem 0 0;
  padding-top: 0.75rem;
  border-top: 1px solid var(--allexo-border);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--allexo-teal);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.window-preview-price--placeholder {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--allexo-muted);
}

.window-preview-price--individual {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--allexo-teal-light);
}

.btn-win-remove {
  min-height: 2.75rem;
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--allexo-muted);
  background: var(--allexo-surface);
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius);
  cursor: pointer;
}

.btn-win-remove:hover {
  color: var(--allexo-text);
  border-color: var(--allexo-muted);
}

.btn-add-window {
  width: 100%;
  min-height: 2.75rem;
  padding: 0.95rem 1.35rem;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--allexo-teal);
  background: var(--allexo-accent);
  border: 2px solid var(--allexo-accent);
  border-radius: var(--radius);
  cursor: pointer;
  box-shadow: var(--shadow);
}

.btn-add-window:hover {
  background: var(--allexo-accent-soft);
  border-color: var(--allexo-teal-light);
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.75rem;
}

/* Вузькі поля ширини/висоти — без зайвої ширини на десктопі */
.row--dims {
  grid-template-columns: minmax(0, 8.75rem) minmax(0, 8.75rem);
  width: fit-content;
  max-width: 100%;
}

@media (max-width: 420px) {
  .row {
    grid-template-columns: 1fr;
  }

  .row--dims {
    width: auto;
    grid-template-columns: 1fr;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.field__label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--allexo-muted);
}

.field__input {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-height: 2.75rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius);
  font-size: 1rem;
  background: var(--allexo-surface);
}

.row--dims .field__input {
  max-width: 8.75rem;
}

@media (max-width: 420px) {
  .row--dims .field__input {
    max-width: none;
  }
}

/* Довгі підписи в select (категорії) — без горизонтального виносу модалки */
.window-block > .field:not(.field--compact) .field__input {
  max-width: min(20rem, 100%);
}

@media (max-width: 420px) {
  .window-block > .field:not(.field--compact) .field__input {
    max-width: none;
  }
}

select.field__input {
  cursor: pointer;
  appearance: auto;
  text-overflow: ellipsis;
}

.field__input:focus {
  outline: none;
  border-color: var(--allexo-teal);
  box-shadow: 0 0 0 3px rgba(15, 61, 62, 0.12);
}

.field__input--error:focus {
  border-color: var(--allexo-danger);
  box-shadow: 0 0 0 3px rgba(180, 35, 24, 0.15);
}

.field__input--error {
  border-color: var(--allexo-danger);
  box-shadow: 0 0 0 1px var(--allexo-danger);
}

.dims-hint {
  margin: -0.2rem 0 0;
  font-size: 0.75rem;
  line-height: 1.35;
  color: var(--allexo-muted);
}

.field__err {
  font-size: 0.75rem;
  color: var(--allexo-danger);
}

.field--compact {
  max-width: 12rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: auto;
  padding-top: 0.75rem;
  padding-bottom: max(0.65rem, env(safe-area-inset-bottom, 0px));
  position: sticky;
  bottom: 0;
  z-index: 2;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, var(--allexo-surface) 12%);
  border-top: 1px solid var(--allexo-border);
}

.btn {
  min-height: 2.75rem;
  padding: 0.65rem 1.15rem;
  border-radius: var(--radius);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btn--ghost {
  background: transparent;
  color: var(--allexo-muted);
}

.btn--ghost:hover {
  background: var(--allexo-bg);
  color: var(--allexo-text);
}

.btn--primary {
  background: var(--allexo-teal);
  color: #fff;
}

.btn--primary:hover:not(:disabled) {
  background: var(--allexo-teal-light);
}

.btn--primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
