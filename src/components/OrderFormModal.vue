<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
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
import { isProUnlocked } from '../constants/proUnlock.js'
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

const DEFAULTS_CLIENT = {
  depthCategory: 'small',
  windowsillDepthMm: 250,
  rollerBoxHeightMm: 400,
  rollerCategory: 'small',
}

const proUnlocked = ref(false)
const mode = ref('client') // 'client' | 'pro'
const isClientMode = computed(() => mode.value === 'client')
const isProMode = computed(() => !isClientMode.value)

const modalEl = ref(/** @type {HTMLElement | null} */ (null))

function isDesktopKeyboardFriendly() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  // Avoid opening native selects on touch devices.
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

/** @param {HTMLSelectElement} sel */
function openNativeSelect(sel) {
  try {
    sel.focus()
    if (typeof sel.showPicker === 'function') {
      sel.showPicker()
    } else {
      sel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }))
      sel.click()
    }
  } catch {
    /* ignore */
  }
}

/** @param {HTMLElement} el */
function focusNextFromElement(el) {
  const block = el?.closest?.('.window-block')
  if (!block) return
  const focusables = _focusableWithin(block)
  const i = focusables.indexOf(/** @type {any} */ (el))
  if (i < 0) return
  const next = focusables[i + 1]
  if (next && typeof next.focus === 'function') {
    next.focus()
    return
  }
  // If last field in block, jump to submit.
  const root = modalEl.value
  const submit = root?.querySelector?.('.actions .btn--primary')
  if (submit && typeof submit.focus === 'function') submit.focus()
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    proUnlocked.value = isProUnlocked()
    mode.value = proUnlocked.value ? 'pro' : 'client'
    void nextTick().then(() => {
      focusFirstField()
    })
  },
  { immediate: true },
)

function newWindowRow() {
  return reactive({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    widthMm: '',
    heightMm: '',
    rollerBoxHeightMm: DEFAULTS_CLIENT.rollerBoxHeightMm,
    sillDepthMm: DEFAULTS_CLIENT.windowsillDepthMm,
    quantity: 1,
    depthCategory: DEFAULTS_CLIENT.depthCategory,
    rollerCategory: DEFAULTS_CLIENT.rollerCategory,
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
      // Avoid touch-action: none — it breaks native <select> picker anchoring on mobile WebKit/Blink.
    } else {
      root.style.overflow = ''
      body.style.overflow = ''
    }
  },
  { immediate: true },
)

watch(
  () => props.typeId,
  () => {
    windows.value = [newWindowRow()]
    proUnlocked.value = isProUnlocked()
    mode.value = proUnlocked.value ? 'pro' : 'client'
  },
)

function _focusableWithin(root) {
  if (!root) return []
  const all = Array.from(
    root.querySelectorAll(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
    ),
  )
  return all.filter((el) => {
    const h = /** @type {HTMLElement} */ (el)
    if (h.getAttribute('aria-hidden') === 'true') return false
    if (h.tabIndex < 0) return false
    // visible-ish
    return !!(h.offsetWidth || h.offsetHeight || h.getClientRects().length)
  })
}

function focusFirstField() {
  const root = modalEl.value
  if (!root) return
  const firstBlock = root.querySelector('.window-block')
  if (!firstBlock) return
  const focusables = _focusableWithin(firstBlock)
  // Prefer width input first if present.
  const widthInput = firstBlock.querySelector('input')
  const candidate = widthInput || focusables[0]
  if (candidate && typeof candidate.focus === 'function') candidate.focus()
}

/** @param {KeyboardEvent} e */
function focusNextFieldOnEnter(e) {
  const isEnter = e.key === 'Enter' || e.code === 'Enter' || e.keyCode === 13 || e.which === 13
  if (!isEnter) return
  const target = /** @type {HTMLElement | null} */ (e.target)
  const block = target?.closest?.('.window-block')
  if (!block) return

  // Special handling for <select>: first Enter opens dropdown, second Enter advances.
  if (target && target.tagName === 'SELECT') {
    const sel = /** @type {HTMLSelectElement} */ (/** @type {any} */ (target))
    const armed = sel.dataset.allexoEnterArmed === '1'
    if (!armed) {
      e.preventDefault()
      sel.dataset.allexoEnterArmed = '1'
      sel.dataset.allexoAutoAdvance = '1'
      // Try to open dropdown
      openNativeSelect(sel)
      // Safety: if user doesn't pick, don't keep it armed forever.
      window.setTimeout(() => {
        try {
          if (sel.dataset.allexoEnterArmed === '1') sel.dataset.allexoEnterArmed = '0'
        } catch {
          /* ignore */
        }
      }, 2500)
      return
    }
    // If it was armed, treat Enter as "confirm & next"
    sel.dataset.allexoEnterArmed = '0'
    sel.dataset.allexoAutoAdvance = '0'
  }

  if (target) {
    e.preventDefault()
    focusNextFromElement(target)
  }
}

/** @param {FocusEvent} e */
function onSelectFocus(e) {
  const sel = /** @type {HTMLSelectElement | null} */ (e.target)
  if (!sel || sel.tagName !== 'SELECT') return
  if (!isDesktopKeyboardFriendly()) return
  // Open on focus (desktop), and allow auto-advance after selection.
  sel.dataset.allexoAutoAdvance = '1'
  openNativeSelect(sel)
  window.setTimeout(() => {
    try {
      if (sel.dataset.allexoAutoAdvance === '1') sel.dataset.allexoAutoAdvance = '0'
    } catch {
      /* ignore */
    }
  }, 2500)
}

/** @param {Event} e */
function onSelectChange(e) {
  const sel = /** @type {HTMLSelectElement | null} */ (e.target)
  if (!sel || sel.tagName !== 'SELECT') return
  // Advance only when the dropdown was opened via keyboard flow.
  if (sel.dataset.allexoAutoAdvance !== '1') return
  sel.dataset.allexoAutoAdvance = '0'
  sel.dataset.allexoEnterArmed = '0'
  void nextTick().then(() => {
    focusNextFromElement(sel)
  })
}
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

    // У режимі “Клієнт” показуємо лише ширину/висоту/кількість і підставляємо інші параметри автоматично.
    if (isClientMode.value) {
      // Для “Підвіконник” та “Короб ролети” клієнт вводить тільки довжину (ширину).
      if (tid !== 'windowsill' && tid !== 'roller_box') {
        const hMm = parseMm(formW.heightMm)
        if (!Number.isFinite(hMm) || hMm <= 0) e.heightMm = t('form.errHeight')
        else if (hMm < MIN_WINDOW_SIDE_MM) e.heightMm = t('form.errMinWindowSize')
      }
      return e
    }

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

/** @param {number} index */
function removeWindow(index) {
  if (windows.value.length <= 1) return
  windows.value = windows.value.filter((_, i) => i !== index)
}

function buildSubmitPayload(extra = /** @type {Record<string, unknown>} */ ({})) {
  if (!props.typeId) return null
  const ty = getTypeById(props.typeId)
  return {
    typeId: props.typeId,
    uiMode: isClientMode.value ? 'client' : 'pro',
    ...extra,
    windows: windows.value.map((formW) => {
      const widthMm = parseMm(formW.widthMm)
      if (props.typeId === 'roller_box') {
        const rollerBoxHeightMm = isClientMode.value
          ? DEFAULTS_CLIENT.rollerBoxHeightMm
          : Number(formW.rollerBoxHeightMm)
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
        const windowsillDepthMm = isClientMode.value ? DEFAULTS_CLIENT.windowsillDepthMm : Number(formW.sillDepthMm)
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
        depthCategory: isClientMode.value
          ? DEFAULTS_CLIENT.depthCategory
          : isValidSizeCategory(String(formW.depthCategory))
            ? formW.depthCategory
            : 'small',
        windowsillDepthMm: ty?.hasSill
          ? (isClientMode.value ? DEFAULTS_CLIENT.windowsillDepthMm : Number(formW.sillDepthMm))
          : null,
        windowsillCategory: null,
        rollerCategory: ty?.hasRoller
          ? (isClientMode.value
              ? DEFAULTS_CLIENT.rollerCategory
              : isValidSizeCategory(String(formW.rollerCategory))
                ? formW.rollerCategory
                : 'small')
          : null,
        profileLengthM: windowProfileLengthMeters(widthMm, heightMm),
        quantity: normalizeWindowQuantity(formW.quantity),
      }
    }),
  }
}

function onSubmit() {
  if (!isValid.value) return
  const payload = buildSubmitPayload()
  if (!payload) return
  emit('submit', payload)
  emit('close')
}

function addWindow() {
  // In client/public UX: treat “add another window” as “add this item and pick another type”.
  if (!isValid.value) return
  const payload = buildSubmitPayload({ uiIntent: 'pickType' })
  if (!payload) return
  emit('submit', payload)
  emit('close')
  window.setTimeout(() => {
    const el = document.getElementById('calculator')
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 0)
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
        const depth = isClientMode.value
          ? DEFAULTS_CLIENT.depthCategory
          : isValidSizeCategory(String(formW.depthCategory))
            ? formW.depthCategory
            : 'small'
        const ws = ty.hasSill
          ? (isClientMode.value
              ? DEFAULTS_CLIENT.windowsillDepthMm
              : WINDOWSILL_DEPTH_MM_OPTIONS.some((mm) => Number(mm) === Number(formW.sillDepthMm))
                ? Number(formW.sillDepthMm)
                : DEFAULTS_CLIENT.windowsillDepthMm)
          : null
        const roller = ty.hasRoller
          ? (isClientMode.value
              ? DEFAULTS_CLIENT.rollerCategory
              : isValidSizeCategory(String(formW.rollerCategory))
                ? formW.rollerCategory
                : 'small')
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
      <div
        ref="modalEl"
        class="modal"
        :class="{ 'modal--no-inner-scroll': isWithSillType }"
        @click.stop
      >
        <div class="modal__scroll">
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
          <div class="mode-badge" aria-label="Mode">
            <span class="mode-badge__pill" :class="{ 'mode-badge__pill--pro': isProMode }">
              {{ isProMode ? t('form.modePro') : t('form.modeClient') }}
            </span>
          </div>
          <form id="allexo-order-modal-form" class="form" @submit.prevent="onSubmit">
            <div
              v-for="(win, idx) in windows"
              :key="win.id"
              class="window-block"
              @keydown="focusNextFieldOnEnter"
            >
            <div class="window-block__head">
              <h3 class="window-block__title">
                {{ t('form.window') }} {{ idx + 1 }}
                <span class="window-block__sub">{{ t('form.enterWindowDims') }}</span>
              </h3>
              <button
                v-if="windows.length > 1"
                type="button"
                class="btn-win-remove"
                @click="removeWindow(idx)"
              >
                {{ t('form.removeWindow') }}
              </button>
            </div>

            <div
              v-if="isClientMode && (props.typeId === 'windowsill' || props.typeId === 'roller_box')"
              class="row row--dims row--single"
            >
              <label class="field">
                <span class="field__label">{{ t('form.widthMm') }}</span>
                <input
                  v-model="windows[idx].widthMm"
                  type="text"
                  inputmode="decimal"
                  class="field__input"
                  :placeholder="t('form.placeholderWidth')"
                  :class="{ 'field__input--error': windowErrors[idx]?.widthMm }"
                  @keydown="focusNextFieldOnEnter"
                />
                <span v-if="windowErrors[idx]?.widthMm" class="field__err">{{
                  windowErrors[idx].widthMm
                }}</span>
              </label>
            </div>
            <div v-else-if="isClientMode" class="row row--dims">
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
                  @keydown="focusNextFieldOnEnter"
                />
                <span v-if="windowErrors[idx]?.heightMm" class="field__err">{{
                  windowErrors[idx].heightMm
                }}</span>
              </label>
            </div>
            <div v-else-if="isSimplifiedLine && props.typeId === 'roller_box'" class="row row--dims">
              <label class="field">
                <span class="field__label">{{ t('form.widthMm') }}</span>
                <input
                  v-model="windows[idx].widthMm"
                  type="text"
                  inputmode="decimal"
                  class="field__input"
                  :placeholder="t('form.placeholderWidth')"
                  :class="{ 'field__input--error': windowErrors[idx]?.widthMm }"
                  @keydown="focusNextFieldOnEnter"
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
                  @keydown="focusNextFieldOnEnter"
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
                  @keydown="focusNextFieldOnEnter"
                />
                <span v-if="windowErrors[idx]?.heightMm" class="field__err">{{
                  windowErrors[idx].heightMm
                }}</span>
              </label>
            </div>
            <label class="field field--compact">
              <span class="field__label">{{ t('form.windowQuantity') }}</span>
              <select
                v-model.number="windows[idx].quantity"
                class="field__input"
                @focus="onSelectFocus"
                @change="onSelectChange"
                @blur="($event) => ($event.target.dataset.allexoEnterArmed = '0')"
              >
                <option v-for="q in WINDOW_QUANTITIES" :key="q" :value="q">{{ q }}</option>
              </select>
            </label>
            <p v-if="!isSimplifiedLine && !isClientMode" class="dims-hint">{{ t('form.minSizeHint') }}</p>
            <p v-else class="dims-hint">{{ t('form.minSizeHintSimplified') }}</p>

            <label v-if="!isSimplifiedLine && !isClientMode" class="field">
              <span class="field__label">{{ t('form.depthMm') }}</span>
              <select
                v-model="windows[idx].depthCategory"
                class="field__input"
                :class="{ 'field__input--error': windowErrors[idx]?.depthCategory }"
                @focus="onSelectFocus"
                @change="onSelectChange"
                @blur="($event) => ($event.target.dataset.allexoEnterArmed = '0')"
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

            <label v-if="!isSimplifiedLine && !isClientMode && currentType.hasSill" class="field">
              <span class="field__label">{{ t('form.sillDepthCm') }}</span>
              <select
                v-model.number="windows[idx].sillDepthMm"
                class="field__input"
                autocomplete="off"
                :class="{ 'field__input--error': windowErrors[idx]?.sillDepthMm }"
                @focus="onSelectFocus"
                @change="onSelectChange"
                @blur="($event) => ($event.target.dataset.allexoEnterArmed = '0')"
              >
                <option v-for="mm in WINDOWSILL_DEPTH_MM_OPTIONS" :key="mm" :value="mm">
                  {{ mm }} {{ t('common.mm') }}
                </option>
              </select>
              <span v-if="windowErrors[idx]?.sillDepthMm" class="field__err">{{
                windowErrors[idx].sillDepthMm
              }}</span>
            </label>

            <label v-if="!isSimplifiedLine && !isClientMode && currentType.hasRoller" class="field">
              <span class="field__label">{{ t('form.rollerMm') }}</span>
              <select
                v-model="windows[idx].rollerCategory"
                class="field__input"
                :class="{ 'field__input--error': windowErrors[idx]?.rollerCategory }"
                @focus="onSelectFocus"
                @change="onSelectChange"
                @blur="($event) => ($event.target.dataset.allexoEnterArmed = '0')"
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
            </div>

            <button
              type="button"
              class="btn-add-window"
              :class="{ 'btn-add-window--subtle': isClientMode }"
              @click="addWindow"
            >
              {{ t('form.addWindow') }}
            </button>
          </form>
        </div>

        <div class="modal__footer">
          <div class="actions">
            <button type="button" class="btn btn--ghost" @click="emit('close')">{{ t('form.cancel') }}</button>
            <button
              type="submit"
              class="btn btn--primary"
              form="allexo-order-modal-form"
              :disabled="!isValid"
            >
              {{ primarySubmitLabel }}
            </button>
          </div>
        </div>
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

@media (max-width: 768px) {
  .backdrop {
    /* Scroll on backdrop (not overflow:hidden) so native selects anchor to the viewport correctly. */
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    align-items: flex-start;
    justify-content: center;
    padding: max(0.5rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right))
      max(0.5rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left));
  }
}

.modal {
  width: min(100%, 460px);
  max-width: calc(100vw - 2rem);
  max-height: min(90vh, 90dvh);
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  background: var(--allexo-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.modal__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding: 1.35rem 1.35rem 0.65rem;
}

.modal__footer {
  flex-shrink: 0;
  background: var(--allexo-surface);
  padding: 0.65rem 1.35rem max(0.75rem, env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--allexo-border);
}

/* Для “Відкоси з підвіконником”: один зовнішній скрол замість вкладеного. */
.modal.modal--no-inner-scroll {
  overflow-y: auto;
  max-height: min(90vh, 90dvh);
}

.modal.modal--no-inner-scroll .modal__scroll {
  flex: 0 1 auto;
  overflow: visible;
  min-height: 0;
}

.modal.modal--no-inner-scroll .modal__footer {
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .modal {
    width: 92vw;
    max-width: 92vw;
    /* Don’t clip native select popovers; inner .modal__scroll still scrolls the form. */
    overflow-x: hidden;
    overflow-y: visible;
    margin-top: auto;
    margin-bottom: auto;
  }

  .modal.modal--no-inner-scroll {
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .modal__scroll {
    padding: 0.85rem 0.85rem 0.45rem;
  }

  .modal__footer {
    padding: 0.55rem 0.85rem max(0.65rem, env(safe-area-inset-bottom, 0px));
    box-shadow: 0 -8px 24px rgba(28, 36, 36, 0.07);
  }

  .modal__hints {
    margin-bottom: 0.65rem;
  }

  .modal__hint {
    font-size: 0.8125rem;
    line-height: 1.4;
  }

  .mode-badge {
    margin-bottom: 0.55rem;
  }

  .form {
    gap: 0.75rem;
    padding-bottom: 0.15rem;
  }

  .window-block {
    padding: 0.85rem;
    gap: 0.8rem;
  }

  .modal__close {
    width: 2.35rem;
    height: 2.35rem;
    font-size: 1.28rem;
  }

  .field {
    gap: 0.3rem;
  }

  .field__label {
    font-size: 0.74rem;
  }

  .field__input {
    min-height: 2.45rem;
    padding: 0.5rem 0.65rem;
    font-size: 0.98rem;
  }

  .field--compact {
    max-width: none;
  }

  /* Native <select> list position: anchor to full field width; avoid clipping quirks. */
  select.field__input {
    display: block;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  .row,
  .row--dims {
    grid-template-columns: 1fr;
    gap: 0.875rem;
  }

  .row--single {
    grid-template-columns: 1fr;
  }

  .btn-add-window {
    min-height: 2.5rem;
    padding: 0.62rem 1rem;
    font-size: 1rem;
    margin-top: 0.15rem;
  }

  .actions {
    margin-top: 0;
    padding: 0;
    position: static;
    background: transparent;
    border-top: none;
    box-shadow: none;
  }
}

@media (min-width: 769px) {
  .modal {
    width: min(100%, 680px);
    max-width: calc(100vw - 2rem);
  }

  .modal__scroll {
    padding: 1.75rem 1.75rem 1rem;
  }

  .modal__footer {
    padding: 0.75rem 1.75rem max(1rem, env(safe-area-inset-bottom, 0px));
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

.mode-badge {
  margin: 0 0 0.9rem;
}

.mode-badge__pill {
  display: inline-flex;
  align-items: center;
  min-height: 2.1rem;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  border: 1px solid var(--allexo-border);
  background: var(--allexo-bg);
  color: var(--allexo-muted);
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.mode-badge__pill--pro {
  color: var(--allexo-teal);
  background: rgba(196, 163, 90, 0.16);
  border-color: rgba(196, 163, 90, 0.38);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
  overflow-x: hidden;
  overflow-y: visible;
  padding-bottom: 0.25rem;
}

.window-block {
  min-width: 0;
  padding: 1.15rem;
  background: var(--allexo-bg);
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
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

.window-block__sub {
  margin-left: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--allexo-muted);
}

@media (max-width: 420px) {
  .window-block__sub {
    display: block;
    margin: 0.2rem 0 0;
  }
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

.btn-add-window--subtle {
  background: transparent;
  border-color: var(--allexo-border);
  color: var(--allexo-teal);
  box-shadow: none;
}

.btn-add-window--subtle:hover {
  background: var(--allexo-bg);
  border-color: var(--allexo-muted);
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
}

/* Вузькі поля ширини/висоти — без зайвої ширини на десктопі */
.row--dims {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  width: 100%;
  max-width: 100%;
}

.row--single {
  grid-template-columns: minmax(0, 8.75rem);
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
  max-width: none;
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
  align-items: center;
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
