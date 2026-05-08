<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getTypeById, isSimplifiedProductLine } from '../constants/calculatorTypes.js'
import { normalizeStoredWindow, normalizeWindowQuantity } from '../constants/sizeCategories.js'
import { useLocale } from '../i18n/useLocale.js'
import { sizeCategoryLabel, translate } from '../i18n/translations.js'
import {
  quoteRollerBoxOnlyHours,
  quoteRollerBoxOnlyRoundedEuros,
  quoteWindowHours,
  quoteWindowRoundedEuros,
  quoteWindowsillAddonRoundedEuros,
  quoteWindowsillOnlyHours,
  quoteWindowsillOnlyRoundedEuros,
} from '../pricing/windowQuote.js'
import { buildAllexoOfferText } from '../utils/offerText.js'
import { parseTravelKmInput, travelFareFromBrugge } from '../utils/travelFromBrugge.js'
import WhatsAppRequestModal from './WhatsAppRequestModal.vue'
import { formatEuroExclVat } from '../utils/priceDisplay.js'
import {
  lineWindowEligibleForAutoQuote,
  lineWindowOversized,
  orderHasInvalidWindowDimensions,
  windowEligibleForAutoQuote,
} from '../utils/windowDimensions.js'
import { CONTACT_EMAIL_HREF, CONTACT_PHONE_HREF } from '../constants/contact.js'
import { isProUnlocked } from '../constants/proUnlock.js'

const props = defineProps({
  lines: { type: Array, required: true },
})

const emit = defineEmits(['remove', 'clear'])

const { locale, t } = useLocale()

function formatWindowMm(mm) {
  if (mm == null || Number.isNaN(mm)) return '—'
  return `${Math.round(mm)} ${t('common.mm')}`
}

/** @param {Record<string, unknown>} win */
function rollerBoxHeightLineSummary(win) {
  const mm = Math.round(Number(win.rollerBoxHeightMm ?? win.heightMm))
  return translate(locale.value, 'summary.rollerBoxHeightLine').replace('{n}', String(mm))
}

/** @param {Record<string, unknown>} win */
function sillDepthLineSummary(win) {
  const mm = Math.round(Number(win.windowsillDepthMm ?? win.heightMm))
  return translate(locale.value, 'summary.sillDepthLine').replace('{n}', String(mm))
}

/** @param {Record<string, unknown>} win */
function windowQty(win) {
  return normalizeWindowQuantity(win.quantity)
}

/** @param {Record<string, unknown>} line @param {Record<string, unknown>} win */
function windowEntryHeading(line, win) {
  const q = windowQty(win)
  if (line.typeId === 'roller_box') {
    const w = Math.round(Number(win.widthMm))
    const hb = Math.round(Number(win.rollerBoxHeightMm ?? win.heightMm))
    const dims = `${w}×${hb} ${t('common.mm')}`
    if (q > 1) return `${dims} × ${q} ${t('summary.pcs')}`
    return dims
  }
  if (line.typeId === 'windowsill') {
    const w = Math.round(Number(win.widthMm))
    const d = Math.round(Number(win.windowsillDepthMm ?? win.heightMm))
    const dims = `${w}×${d} ${t('common.mm')}`
    if (q > 1) return `${dims} × ${q} ${t('summary.pcs')}`
    return dims
  }
  const w = Math.round(Number(win.widthMm))
  const h = Math.round(Number(win.heightMm))
  const dims = `${w}×${h} ${t('common.mm')}`
  if (q > 1) return `${t('summary.windowLabel')} ${dims} × ${q} ${t('summary.pcs')}`
  return `${t('summary.windowLabel')} ${dims}`
}

/** @param {Record<string, unknown>} line @param {Record<string, unknown>} win */
function windowDimsLabel(line, win) {
  if (line.typeId === 'roller_box') {
    const w = Math.round(Number(win.widthMm))
    const hb = Math.round(Number(win.rollerBoxHeightMm ?? win.heightMm))
    return `${w}×${hb} ${t('common.mm')}`
  }
  if (line.typeId === 'windowsill') {
    const w = Math.round(Number(win.widthMm))
    const d = Math.round(Number(win.windowsillDepthMm ?? win.heightMm))
    return `${w}×${d} ${t('common.mm')}`
  }
  const w = Math.round(Number(win.widthMm))
  const h = Math.round(Number(win.heightMm))
  return `${w}×${h} ${t('common.mm')}`
}

const proActive = ref(false)
function syncProActive() {
  proActive.value = isProUnlocked()
}

onMounted(() => {
  syncProActive()
  if (typeof window !== 'undefined') {
    window.addEventListener('allexo-pro-change', syncProActive)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('allexo-pro-change', syncProActive)
  }
})

const isPublicMode = computed(() => !proActive.value)

/** @param {string | undefined} id */
function catLabel(id) {
  return sizeCategoryLabel(locale.value, String(id))
}

const _TIME_BUFFER_COEFF = 1.44

/** @param {number} h */
function _roundUpToHalfHour(h) {
  if (!Number.isFinite(h) || h <= 0) return 0
  return Math.ceil(h * 2) / 2
}

/** @param {number} h */
function formatHoursDisplay(h) {
  const r = Math.round(h * 10) / 10
  if (Number.isInteger(r)) return String(r)
  return String(r)
}

/** @param {number} h */
function formatWorkDaysApprox(h) {
  const hh = _roundUpToHalfHour(h)
  // Не показуємо “рівно 1 день”, щоб не створювати небезпечне очікування.
  if (hh <= 8) return t('summary.workDays1to2')
  if (hh <= 16) return t('summary.workDays1to2')
  const minDays = Math.floor(hh / 8)
  return translate(locale.value, 'summary.workDays2plus').replace('{n}', String(Math.max(minDays, 2)))
}

/** @param {Record<string, unknown>} line */
function windowsForLine(line) {
  const tid = typeof line.typeId === 'string' ? line.typeId : undefined
  if (Array.isArray(line.windows) && line.windows.length > 0) {
    return line.windows.map((w) => normalizeStoredWindow(w, tid)).filter(Boolean)
  }
  if (typeof line.widthCm === 'number' || typeof line.widthMm === 'number') {
    const one = normalizeStoredWindow(
      {
        widthMm: line.widthMm,
        heightMm: line.heightMm,
        widthCm: line.widthCm,
        heightCm: line.heightCm,
        slopeDepthCm: line.slopeDepthCm,
        sillWidthCm: line.sillWidthCm,
        rollerBoxHeightCm: line.rollerBoxHeightCm,
        rollerBoxHeightMm: line.rollerBoxHeightMm,
        sillDepthCm: line.sillDepthCm,
        windowsillDepthMm: line.windowsillDepthMm,
        depthCategory: line.depthCategory,
        windowsillCategory: null,
        rollerCategory: line.rollerCategory,
        profileLengthM: line.profileLengthM,
        quantity: line.quantity,
      },
      tid,
    )
    return one ? [one] : []
  }
  return []
}

/** @param {Record<string, unknown>} line @param {Record<string, unknown>} win */
function windowPriceEuros(line, win) {
  if (!win) return 0
  const tid = line.typeId
  if (tid === 'roller_box') {
    const wm = Number(win.widthMm)
    const rh = Number(win.rollerBoxHeightMm ?? win.heightMm)
    if (!lineWindowEligibleForAutoQuote('roller_box', win)) return 0
    return quoteRollerBoxOnlyRoundedEuros(wm, rh)
  }
  if (tid === 'windowsill') {
    const wm = Number(win.widthMm)
    const d = Number(win.windowsillDepthMm ?? win.heightMm)
    if (!lineWindowEligibleForAutoQuote('windowsill', win)) return 0
    return quoteWindowsillOnlyRoundedEuros(wm, d)
  }
  const ty = getTypeById(tid)
  if (!ty) return 0
  const wm = Number(win.widthMm)
  const hm = Number(win.heightMm)
  if (!windowEligibleForAutoQuote(wm, hm)) return 0
  return quoteWindowRoundedEuros(
    wm,
    hm,
    /** @type {import('../constants/sizeCategories.js').SizeCategoryId} */ (win.depthCategory),
    ty.hasSill,
    ty.hasRoller,
    typeof win.windowsillDepthMm === 'number' ? win.windowsillDepthMm : null,
    win.rollerCategory != null
      ? /** @type {import('../constants/sizeCategories.js').SizeCategoryId} */ (win.rollerCategory)
      : null,
  )
}

/** @param {Record<string, unknown>} line @param {Record<string, unknown>} win */
function windowsillAddonPriceEuros(line, win) {
  const ty = getTypeById(line.typeId)
  if (!ty?.hasSill) return 0
  const wm = Number(win.widthMm)
  if (!Number.isFinite(wm) || wm <= 0) return 0
  const d = typeof win.windowsillDepthMm === 'number' ? win.windowsillDepthMm : null
  return quoteWindowsillAddonRoundedEuros(wm, d)
}

/** @param {Record<string, unknown>} win */
function windowsillAddonWidthMm(win) {
  const wMm = Math.round(Number(win.widthMm))
  if (!Number.isFinite(wMm)) return null
  return wMm + 300
}

/** @param {Record<string, unknown>} win */
function windowsillDepthMm(win) {
  const mm = Number(win.windowsillDepthMm)
  if (!Number.isFinite(mm)) return null
  return Math.round(mm)
}

/** @param {Record<string, unknown>} line */
function lineSubtotalEuros(line) {
  return windowsForLine(line).reduce((s, w) => s + windowPriceEuros(line, w) * windowQty(w), 0)
}

const orderTotalEuros = computed(() => props.lines.reduce((s, line) => s + lineSubtotalEuros(line), 0))

const MIN_ORDER_EUR = 500
const minOrderApplied = computed(() => orderTotalEuros.value > 0 && orderTotalEuros.value < MIN_ORDER_EUR)
const payableWorkEuros = computed(() => (minOrderApplied.value ? MIN_ORDER_EUR : orderTotalEuros.value))

function discountPercentFor(eur) {
  const v = Number(eur)
  if (!Number.isFinite(v) || v <= 0) return 0
  if (v >= 3000) return 10
  if (v >= 2000) return 7
  if (v >= 1500) return 5
  if (v >= 1000) return 3
  return 0
}

const discountPct = computed(() => discountPercentFor(payableWorkEuros.value))
const discountEuros = computed(() =>
  discountPct.value > 0 ? Math.round((payableWorkEuros.value * discountPct.value) / 100) : 0,
)
const payableWorkAfterDiscountEuros = computed(() => payableWorkEuros.value - discountEuros.value)

/** @param {Record<string, unknown>} line @param {Record<string, unknown>} win */
function windowBaseHours(line, win) {
  const tid = line.typeId
  if (tid === 'roller_box') {
    if (!lineWindowEligibleForAutoQuote('roller_box', win)) return 0
    return quoteRollerBoxOnlyHours()
  }
  if (tid === 'windowsill') {
    if (!lineWindowEligibleForAutoQuote('windowsill', win)) return 0
    return quoteWindowsillOnlyHours()
  }
  const t = getTypeById(tid)
  if (!t) return 0
  if (!windowEligibleForAutoQuote(Number(win.widthMm), Number(win.heightMm))) return 0
  return quoteWindowHours(
    t.hasSill,
    t.hasRoller,
    /** @type {import('../constants/sizeCategories.js').SizeCategoryId} */ (win.depthCategory),
    win.rollerCategory != null
      ? /** @type {import('../constants/sizeCategories.js').SizeCategoryId} */ (win.rollerCategory)
      : null,
  )
}

/** @param {Record<string, unknown>} line @param {Record<string, unknown>} win */
function windowBufferedHoursTotal(line, win) {
  const base = windowBaseHours(line, win) * windowQty(win)
  return base * _TIME_BUFFER_COEFF
}

const orderTotalBaseHours = computed(() =>
  props.lines.reduce((sum, line) => {
    const tid = line.typeId
    if (tid === 'roller_box') {
      return (
        sum +
        windowsForLine(line).reduce((s, w) => {
          if (!lineWindowEligibleForAutoQuote('roller_box', w)) return s
          return s + quoteRollerBoxOnlyHours() * windowQty(w)
        }, 0)
      )
    }
    if (tid === 'windowsill') {
      return (
        sum +
        windowsForLine(line).reduce((s, w) => {
          if (!lineWindowEligibleForAutoQuote('windowsill', w)) return s
          return s + quoteWindowsillOnlyHours() * windowQty(w)
        }, 0)
      )
    }
    const t = getTypeById(tid)
    if (!t) return sum
    return (
      sum +
      windowsForLine(line).reduce((s, w) => {
        if (!windowEligibleForAutoQuote(Number(w.widthMm), Number(w.heightMm))) return s
        return (
          s +
          quoteWindowHours(
            t.hasSill,
            t.hasRoller,
            /** @type {import('../constants/sizeCategories.js').SizeCategoryId} */ (w.depthCategory),
            w.rollerCategory != null
              ? /** @type {import('../constants/sizeCategories.js').SizeCategoryId} */ (w.rollerCategory)
              : null,
          ) *
            windowQty(w)
        )
      }, 0)
    )
  }, 0),
)

const orderTotalBufferedHours = computed(() => orderTotalBaseHours.value * _TIME_BUFFER_COEFF)
const orderTotalHoursFormatted = computed(() => formatHoursDisplay(orderTotalBufferedHours.value))
const orderTotalWorkDaysFormatted = computed(() => formatWorkDaysApprox(orderTotalBufferedHours.value))

const copyNotice = ref('')
const copyNoticeIsError = ref(false)
const emailRequestModalOpen = ref(false)

const travelKmInput = ref('')

const offerTravelMeta = computed(() => {
  const km = parseTravelKmInput(travelKmInput.value)
  if (km == null) return null
  const { euros, over100 } = travelFareFromBrugge(km)
  return {
    distanceKm: km,
    workTotalEur: payableWorkAfterDiscountEuros.value,
    travelEur: euros,
    over100,
  }
})

const grandTotalEuros = computed(() => {
  const m = offerTravelMeta.value
  if (!m) return payableWorkAfterDiscountEuros.value
  if (m.over100) return m.workTotalEur
  return m.workTotalEur + m.travelEur
})

function showSummaryNotice(msg, ms = 2500, isError = false) {
  copyNotice.value = msg
  copyNoticeIsError.value = isError
  window.setTimeout(() => {
    copyNotice.value = ''
    copyNoticeIsError.value = false
  }, ms)
}

async function copyProposal() {
  if (orderHasInvalidWindowDimensions(props.lines)) {
    showSummaryNotice(t('summary.errMinDimensions'), 4000, true)
    return
  }
  const text = buildAllexoOfferText(props.lines, locale.value, offerTravelMeta.value)
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('aria-hidden', 'true')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    try {
      document.execCommand('copy')
    } finally {
      document.body.removeChild(ta)
    }
  }
  showSummaryNotice(t('summary.copied'))
}

/** Номер у міжнародному форматі без + (для https://wa.me/…) */
const CONTACT_WHATSAPP_PHONE = '32493860753'

function openWhatsAppDirect() {
  const total = formatEuroExclVat(orderTotalEuros.value, locale.value)
  const count = Array.isArray(props.lines) ? props.lines.length : 0
  const types = Array.from(
    new Set(
      (props.lines ?? [])
        .map((l) => String(l?.typeId ?? ''))
        .filter(Boolean)
        .map((id) => t(`types.${id}.title`)),
    ),
  ).join(', ')

  const text =
    `Доброго дня!\n` +
    `Хочу отримати прорахунок:\n` +
    `Сума: ${total}\n` +
    `Кількість позицій: ${count}\n` +
    `Тип робіт: ${types || '—'}\n` +
    `Можете уточнити деталі?`

  const url = `https://wa.me/${CONTACT_WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

function openContactEmailModal() {
  emailRequestModalOpen.value = true
}
</script>

<template>
  <section class="summary" aria-labelledby="summary-heading">
    <div class="summary__head">
      <h2 id="summary-heading" class="summary__title">{{ t('summary.title') }}</h2>
      <button
        v-if="lines.length"
        type="button"
        class="summary__clear"
        :aria-label="t('summary.clearAria')"
        @click="emit('clear')"
      >
        {{ t('summary.clear') }}
      </button>
    </div>

    <p v-if="lines.length" class="summary__intro">
      {{ t('app.intro') }}
    </p>

    <p v-if="!lines.length" class="summary__empty">{{ t('summary.empty') }}</p>

    <template v-else>
      <ul class="list">
        <li v-for="line in lines" :key="line.key" class="line">
          <div class="line__main">
            <h3 class="line__type">{{ t('types.' + line.typeId + '.title') }}</h3>

            <div
              v-for="(win, wIdx) in windowsForLine(line)"
              :key="wIdx"
              class="window-entry"
            >
              <h4 v-if="!isPublicMode" class="window-entry__title">{{ windowEntryHeading(line, win) }}</h4>
              <p v-else class="window-entry__title window-entry__title--public">{{ windowDimsLabel(line, win) }}</p>

              <dl v-if="!isPublicMode && isSimplifiedProductLine(line.typeId)" class="dims">
                <div class="dims__row">
                  <dt>{{ t('summary.dtWidth') }}</dt>
                  <dd>{{ formatWindowMm(win.widthMm) }}</dd>
                </div>
                <p v-if="line.typeId === 'roller_box'" class="dims-explicit">{{ rollerBoxHeightLineSummary(win) }}</p>
                <p v-else-if="line.typeId === 'windowsill'" class="dims-explicit">{{ sillDepthLineSummary(win) }}</p>
              </dl>
              <dl v-else-if="!isPublicMode" class="dims">
                <div class="dims__row">
                  <dt>{{ t('summary.dtDepth') }}</dt>
                  <dd>{{ catLabel(win.depthCategory) }}</dd>
                </div>
                <div
                  v-if="getTypeById(line.typeId)?.hasSill"
                  class="dims__row"
                >
                  <dt>{{ t('summary.dtSill') }}</dt>
                  <dd>
                    <template v-if="windowsillAddonWidthMm(win) != null">
                      {{ windowsillAddonWidthMm(win) }} {{ t('common.mm') }}
                    </template>
                    <template v-else>—</template>
                  </dd>
                </div>
                <div
                  v-if="getTypeById(line.typeId)?.hasSill"
                  class="dims__row"
                >
                  <dt>{{ t('summary.dtSillDepthCm') }}</dt>
                  <dd>
                    <template v-if="windowsillDepthMm(win) != null">
                      {{ windowsillDepthMm(win) }} {{ t('common.mm') }}
                    </template>
                    <template v-else>—</template>
                  </dd>
                </div>
                <div
                  v-if="getTypeById(line.typeId)?.hasRoller && win.rollerCategory != null"
                  class="dims__row"
                >
                  <dt>{{ t('summary.dtRoller') }}</dt>
                  <dd>{{ catLabel(win.rollerCategory) }}</dd>
                </div>
              </dl>
              <template
                v-if="lineWindowOversized(line.typeId, win)"
              >
                <p class="window-price window-price--individual">
                  {{ t('summary.priceLabel') }} {{ t('summary.individualQuote') }}
                </p>
              </template>
              <template v-else-if="windowPriceEuros(line, win) > 0">
                <dl v-if="!isPublicMode" class="dims dims--price">
                  <div class="dims__row">
                    <dt>{{ t('summary.dtPricePerUnit') }}</dt>
                    <dd>{{ formatEuroExclVat(windowPriceEuros(line, win), locale) }}</dd>
                  </div>
                  <div class="dims__row">
                    <dt>{{ t('summary.dtQuantity') }}</dt>
                    <dd>{{ windowQty(win) }}</dd>
                  </div>
                  <div class="dims__row">
                    <dt>{{ t('summary.dtLineTotal') }}</dt>
                    <dd>{{ formatEuroExclVat(windowPriceEuros(line, win) * windowQty(win), locale) }}</dd>
                  </div>
                  <div v-if="getTypeById(line.typeId)?.hasSill" class="dims__row">
                    <dt>{{ t('summary.dtSillPrice') }}</dt>
                    <dd>{{ formatEuroExclVat(windowsillAddonPriceEuros(line, win), locale) }}</dd>
                  </div>
                </dl>
                <dl v-else class="dims dims--price dims--price-public">
                  <div class="dims__row">
                    <dt>{{ t('summary.dtQuantity') }}</dt>
                    <dd>{{ windowQty(win) }}</dd>
                  </div>
                  <div class="dims__row">
                    <dt>{{ t('summary.dtLineTotal') }}</dt>
                    <dd>{{ formatEuroExclVat(windowPriceEuros(line, win) * windowQty(win), locale) }}</dd>
                  </div>
                </dl>
              </template>
              <p v-else class="window-price">
                {{ t('summary.priceLabel') }} {{ formatEuroExclVat(windowPriceEuros(line, win), locale) }}
              </p>

              <div class="window-time" v-if="windowBufferedHoursTotal(line, win) > 0">
                <p class="window-time__main">
                  {{ t('summary.windowTimeLabel') }} {{ formatHoursDisplay(windowBufferedHoursTotal(line, win)) }}
                  {{ t('summary.hoursUnit') }}
                </p>
                <p v-if="!isPublicMode" class="window-time__note">{{ t('summary.windowTimeDisclaimer') }}</p>
              </div>
            </div>

            <p class="line-subtotal">
              {{ t('summary.lineSubtotal') }} {{ formatEuroExclVat(lineSubtotalEuros(line), locale) }}
            </p>
          </div>
          <button
            type="button"
            class="line__remove"
            :aria-label="t('summary.removeAriaPrefix') + ' ' + t('types.' + line.typeId + '.title')"
            @click="emit('remove', line.key)"
          >
            {{ t('summary.remove') }}
          </button>
        </li>
      </ul>

      <div class="travel-block">
        <h3 class="travel-block__title">{{ t('summary.travelBlockTitle') }}</h3>
        <label class="travel-block__field">
          <span class="travel-block__label">{{ t('summary.travelDistanceLabel') }}</span>
          <input
            v-model="travelKmInput"
            type="text"
            class="travel-block__input"
            inputmode="decimal"
            autocomplete="off"
            :placeholder="t('summary.travelDistancePlaceholder')"
          />
        </label>
      </div>

      <div class="order-totals">
        <template v-if="!offerTravelMeta">
          <p class="order-totals__line">
            {{ t('summary.workSubtotal') }} {{ formatEuroExclVat(orderTotalEuros, locale) }}
          </p>
          <p v-if="minOrderApplied" class="order-totals__min">
            {{ t('summary.minOrderDiffPrefix') }} {{ formatEuroExclVat(MIN_ORDER_EUR - orderTotalEuros, locale) }}
          </p>
          <p v-if="discountEuros > 0" class="order-totals__min">
            {{ t('summary.discountLabel') }} −{{ formatEuroExclVat(discountEuros, locale) }}
            <span class="order-totals__min-note">({{ discountPct }}%)</span>
          </p>
          <p v-if="minOrderApplied" class="order-totals__line order-totals__line--grand">
            {{ t('summary.payableTotal') }} {{ formatEuroExclVat(payableWorkEuros, locale) }}
          </p>
          <p v-else-if="discountEuros > 0" class="order-totals__line order-totals__line--grand">
            {{ t('summary.payableTotal') }} {{ formatEuroExclVat(payableWorkAfterDiscountEuros, locale) }}
          </p>
        </template>
        <template v-else>
          <p class="order-totals__line">
            {{ t('summary.workSubtotal') }} {{ formatEuroExclVat(orderTotalEuros, locale) }}
          </p>
          <p v-if="minOrderApplied" class="order-totals__min">
            {{ t('summary.minOrderDiffPrefix') }} {{ formatEuroExclVat(MIN_ORDER_EUR - orderTotalEuros, locale) }}
          </p>
          <p v-if="discountEuros > 0" class="order-totals__min">
            {{ t('summary.discountLabel') }} −{{ formatEuroExclVat(discountEuros, locale) }}
            <span class="order-totals__min-note">({{ discountPct }}%)</span>
          </p>
          <p v-if="minOrderApplied" class="order-totals__line order-totals__line--grand">
            {{ t('summary.payableWorkTotal') }} {{ formatEuroExclVat(payableWorkEuros, locale) }}
          </p>
          <p class="order-totals__line order-totals__line--secondary">
            {{ t('summary.travelTransportTotal') }}
            <template v-if="offerTravelMeta.over100">{{ t('summary.travelDiscussedShort') }}</template>
            <template v-else-if="offerTravelMeta.travelEur === 0">{{ t('summary.travelFree') }}</template>
            <template v-else>{{ formatEuroExclVat(offerTravelMeta.travelEur, locale) }}</template>
          </p>
          <p class="order-totals__line order-totals__line--grand">
            {{ t('summary.grandTotal') }} {{ formatEuroExclVat(grandTotalEuros, locale) }}
          </p>
        </template>
        <p class="order-totals__time">
          {{ t('summary.totalTimeLabel') }} ~{{ orderTotalHoursFormatted }} {{ t('summary.hoursUnit') }}
        </p>
        <p class="order-totals__days">
          {{ t('summary.workDaysApproxPrefix') }} {{ orderTotalWorkDaysFormatted }}
        </p>
        <p class="order-totals__fast">
          {{ t('summary.fastExecutionNoDismantle') }}
        </p>
        <p class="order-totals__includes">
          {{ t('summary.turnkeyIncludes') }}
        </p>
        <p class="order-totals__discount-policy">
          {{ t('summary.discountPolicy') }}
        </p>
      </div>

      <div class="contact-section" aria-labelledby="contact-heading">
        <h3 id="contact-heading" class="contact-section__title">{{ t('summary.contact') }}</h3>
        <div class="contact-section__actions">
          <div class="contact-wa-block">
            <button
              id="contact-whatsapp-request"
              type="button"
              class="contact-btn contact-btn--whatsapp"
              @click="openWhatsAppDirect"
            >
              {{ t('summary.whRequest') }}
            </button>
            <p class="contact-wa-hint">
              {{ t('summary.whHint') }}
            </p>
            <p class="contact-wa-call">
              {{ t('summary.callAlternative') }}
              <a class="contact-wa-call__link" :href="CONTACT_PHONE_HREF" :aria-label="t('contacts.phoneAria')">
                {{ t('contacts.phoneDisplay') }}
              </a>
            </p>
          </div>
          <button type="button" class="contact-btn contact-btn--email" @click="openContactEmailModal">
            {{ t('summary.sendEmail') }}
          </button>
        </div>

        <div class="contact-section__utils">
          <button type="button" class="contact-util-btn" @click="copyProposal">
            <span class="contact-util-btn__icon" aria-hidden="true">⧉</span>
            {{ t('summary.copyOffer') }}
          </button>
          <p
            v-if="copyNotice"
            class="contact-util-feedback"
            :class="{ 'contact-util-feedback--error': copyNoticeIsError }"
            role="status"
          >
            {{ copyNotice }}
          </p>
        </div>
      </div>

      <div class="direct-contacts" aria-labelledby="direct-contacts-heading">
        <h3 id="direct-contacts-heading" class="direct-contacts__title">{{ t('contacts.title') }}</h3>
        <p class="direct-contacts__hint">{{ t('contacts.directHint') }}</p>
        <p class="direct-contacts__row">
          <a
            class="direct-contacts__link"
            :href="CONTACT_PHONE_HREF"
            :aria-label="t('contacts.phoneAria')"
          >{{ t('contacts.phoneDisplay') }}</a>
        </p>
        <p class="direct-contacts__row">
          <a
            class="direct-contacts__link"
            :href="CONTACT_EMAIL_HREF"
            :aria-label="t('contacts.emailAria')"
          >{{ t('contacts.emailDisplay') }}</a>
        </p>
      </div>
    </template>
  </section>

  <WhatsAppRequestModal
    channel="email"
    :open="emailRequestModalOpen"
    :lines="lines"
    :travel-meta="offerTravelMeta"
    @close="emailRequestModalOpen = false"
  />
</template>

<style scoped>
.summary {
  margin-top: 2.5rem;
  padding: 1.5rem;
  background: var(--allexo-surface);
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

@media (max-width: 639px) {
  .summary {
    padding: 1rem max(1rem, env(safe-area-inset-left)) 1rem max(1rem, env(safe-area-inset-right));
  }
}

.summary__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.summary__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--allexo-teal);
}

.summary__intro {
  margin: 0 0 1rem;
  color: var(--allexo-muted);
  font-size: 0.9rem;
  line-height: 1.45;
}

.summary__clear {
  flex-shrink: 0;
  min-height: 2.75rem;
  padding: 0.45rem 0.95rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--allexo-muted);
  background: var(--allexo-bg);
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius);
  cursor: pointer;
}

.summary__clear:hover {
  color: var(--allexo-text);
  border-color: var(--allexo-muted);
  background: var(--allexo-surface);
}

.summary__empty {
  margin: 0;
  color: var(--allexo-muted);
  font-size: 0.95rem;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.line {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--allexo-bg);
  border-radius: var(--radius);
  border: 1px solid var(--allexo-border);
}

@media (min-width: 560px) {
  .line {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
}

.line__type {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--allexo-teal);
}

.window-entry {
  margin-bottom: 0.85rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid var(--allexo-border);
}

.window-entry:last-of-type {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.window-entry__title {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--allexo-muted);
}

.window-entry__title--public {
  font-size: 0.95rem;
  font-weight: 750;
  color: var(--allexo-text);
  letter-spacing: -0.01em;
}

.dims--price-public .dims__row dd {
  font-weight: 750;
}

.dims {
  margin: 0;
  display: grid;
  gap: 0.35rem;
}

.dims--price {
  margin-top: 0.35rem;
}

.dims__row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  font-size: 0.875rem;
}

.dims__row dt {
  margin: 0;
  color: var(--allexo-muted);
  font-weight: 500;
}

.dims__row dd {
  margin: 0;
  font-weight: 600;
  text-align: right;
}

.dims-explicit {
  margin: 0.15rem 0 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--allexo-text);
  line-height: 1.4;
}

.window-price {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--allexo-text);
}

.window-price--individual {
  color: var(--allexo-teal-light);
}

.window-time {
  margin-top: 0.55rem;
}

.window-time__main {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--allexo-muted);
}

.window-time__note {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--allexo-muted);
  opacity: 0.9;
}

.line-subtotal {
  margin: 0.85rem 0 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--allexo-teal);
}

.travel-block {
  margin-top: 1.25rem;
  padding: 1rem;
  background: var(--allexo-bg);
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius);
}

.travel-block__title {
  margin: 0 0 0.65rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--allexo-teal);
}

.travel-block__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-width: 16rem;
}

.travel-block__label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--allexo-muted);
}

.travel-block__input {
  min-height: 2.75rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius);
  font-size: 1rem;
  background: var(--allexo-surface);
  font-family: inherit;
}

.travel-block__input:focus {
  outline: none;
  border-color: var(--allexo-teal);
  box-shadow: 0 0 0 3px rgba(15, 61, 62, 0.12);
}

.order-totals {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 2px solid var(--allexo-border);
}

.order-totals__line {
  margin: 0 0 0.35rem;
  font-size: 1rem;
  font-weight: 700;
  color: var(--allexo-teal);
}

.order-totals__line--secondary {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--allexo-muted);
}

.order-totals__line--grand {
  margin-top: 0.25rem;
  padding-top: 0.45rem;
  border-top: 1px solid var(--allexo-border);
  font-size: 1.05rem;
}

.order-totals__min {
  margin: 0.1rem 0 0.4rem;
  font-size: 0.9rem;
  font-weight: 650;
  color: var(--allexo-muted);
}

.order-totals__min-note {
  opacity: 0.75;
  font-weight: 700;
}

.order-totals__discount-policy {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--allexo-muted);
}

.order-totals__time {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--allexo-muted);
}

.order-totals__days {
  margin: 0.15rem 0 0;
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--allexo-muted);
}

.order-totals__fast {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--allexo-muted);
}

.order-totals__includes {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--allexo-muted);
}

.contact-section {
  margin-top: 1.35rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--allexo-border);
}

.contact-section__title {
  margin: 0 0 0.85rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--allexo-teal);
}

.contact-section__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.contact-section__utils {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
}

.contact-util-btn {
  padding: 0.35rem 0;
  min-height: 2.25rem;
  border: none;
  background: transparent;
  color: var(--allexo-teal);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
  -webkit-tap-highlight-color: transparent;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.contact-util-btn:hover {
  color: var(--allexo-teal-light);
}

.contact-util-btn__icon {
  font-size: 1rem;
  line-height: 1;
}

.contact-util-feedback {
  margin: 0;
  font-size: 0.85rem;
  color: var(--allexo-muted);
}

.contact-util-feedback--error {
  color: var(--allexo-danger);
  font-weight: 600;
}

.contact-wa-block {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.contact-wa-hint {
  margin: 0.4rem 0 0;
  padding: 0 0.15rem;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--allexo-muted);
}

.contact-wa-call {
  margin: 0.35rem 0 0;
  padding: 0 0.15rem;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--allexo-muted);
}

.contact-wa-call__link {
  margin-left: 0.35rem;
  color: var(--allexo-teal);
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.contact-wa-call__link:hover {
  color: var(--allexo-teal-light);
}

.contact-btn {
  width: 100%;
  padding: 0.95rem 1.25rem;
  font-size: 1.05rem;
  font-weight: 700;
  font-family: inherit;
  line-height: 1.3;
  border-radius: var(--radius);
  cursor: pointer;
  border: 2px solid transparent;
  box-shadow: var(--shadow);
}

.contact-btn--whatsapp {
  padding: 1.15rem 1.4rem;
  min-height: 3.35rem;
  font-size: 1.12rem;
  line-height: 1.35;
  color: #fff;
  background: #25d366;
  border-color: #1ebe57;
  box-shadow: var(--shadow-md);
}

.contact-btn--whatsapp:hover {
  background: #20bd5a;
  border-color: #1aa34d;
}

.contact-btn--email {
  min-height: 2.75rem;
  color: var(--allexo-teal);
  background: var(--allexo-surface);
  border-color: #6b8cae;
}

.contact-btn--email:hover {
  background: #f0f4f8;
  border-color: #547896;
}

.direct-contacts {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--allexo-border);
}

.direct-contacts__title {
  margin: 0 0 0.35rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--allexo-teal);
}

.direct-contacts__hint {
  margin: 0 0 0.45rem;
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--allexo-muted);
}

.direct-contacts__row {
  margin: 0.2rem 0 0;
}

.direct-contacts__link {
  display: inline-block;
  min-height: 2.75rem;
  line-height: 2.35rem;
  padding: 0.2rem 0;
  font-size: 0.85rem;
  color: var(--allexo-teal);
  text-decoration: none;
  word-break: break-word;
}

.direct-contacts__link:hover {
  text-decoration: underline;
}

.line__remove {
  flex-shrink: 0;
  align-self: flex-start;
  min-height: 2.75rem;
  padding: 0.45rem 0.95rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--allexo-danger);
  background: #fff;
  border: 1px solid rgba(180, 35, 24, 0.35);
  border-radius: var(--radius);
  cursor: pointer;
}

.line__remove:hover {
  background: #fef3f2;
}
</style>
