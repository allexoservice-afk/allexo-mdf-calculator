<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getTypeById, isSimplifiedProductLine } from '../constants/calculatorTypes.js'
import { normalizeMaterialId } from '../constants/materialTypes.js'
import { normalizeStoredWindow, normalizeWindowQuantity } from '../constants/sizeCategories.js'
import { useLocale } from '../i18n/useLocale.js'
import { translate } from '../i18n/translations.js'
import {
  quoteRollerBoxOnlyHours,
  quoteWindowHours,
  quoteWindowsillOnlyHours,
  orderBufferedWorkHours,
  winSlopeQuoteArgs,
  normalizeSlopeDeepSurchargePct,
} from '../pricing/windowQuote.js'
import { quoteLineWindowEuros, quoteLineWindowsillAddonEuros } from '../pricing/quoteLineWindow.js'
import { parseTravelKmInput, travelFareFromBrugge } from '../utils/travelFromBrugge.js'
import { approxWorkDays, formatWorkDaysApproxLabel, formatWorkHoursDisplay } from '../utils/workTimeDisplay.js'
import EmailRequestModal from './EmailRequestModal.vue'
import GetQuoteLeadModal from './GetQuoteLeadModal.vue'
import MaterialsModal from './MaterialsModal.vue'
import PdfPreviewModal from './PdfPreviewModal.vue'
import WindowSchematicPreview from './WindowSchematicPreview.vue'
import { formatEuroExclVat } from '../utils/priceDisplay.js'
import {
  lineWindowEligibleForAutoQuote,
  lineWindowOversized,
  orderHasInvalidWindowDimensions,
  windowEligibleForAutoQuote,
} from '../utils/windowDimensions.js'
import { CONTACT_EMAIL_HREF, CONTACT_PHONE_HREF } from '../constants/contact.js'
import { isProUnlocked } from '../constants/proUnlock.js'
import { useProManualDiscount } from '../composables/useProManualDiscount.js'
import {
  MIN_ORDER_EUR,
  discountEurosFor,
  effectiveDiscountPercent,
  mdfSubtotalEurosForOrderLines,
  payableWorkEurosForOrderLines,
} from '../pricing/orderDiscount.js'
import { preloadProposalPdfEngine } from '../utils/proposalPdf.js'
import {
  formatLinearMeters,
  orderLinearMetersTotals,
  windowSillLinearMetersTotal,
  windowSlopesLinearMetersTotal,
} from '../utils/linearMeters.js'
import { orderMaterialStock } from '../utils/materialStock.js'

const props = defineProps({
  lines: { type: Array, required: true },
  quoteOpen: { type: Boolean, default: false },
})

const emit = defineEmits(['remove', 'edit', 'clear', 'update:quoteOpen', 'addAnother'])

const { locale, t } = useLocale()
const { manualDiscountPct, setManualDiscount, toggleManualDiscount, PRO_MANUAL_DISCOUNT_OPTIONS } =
  useProManualDiscount()

const discountManualActive = computed(
  () => proActive.value && manualDiscountPct.value != null && manualDiscountPct.value > 0,
)

const discountOpen = ref(false)

const discountCurrentLabel = computed(() =>
  manualDiscountPct.value == null
    ? t('summary.proDiscountAuto')
    : `−${manualDiscountPct.value}%`,
)

const travelOpen = ref(false)

const travelCurrentLabel = computed(() => {
  const km = parseTravelKmInput(travelKmInput.value)
  if (km == null || km <= 0) return '—'
  return `${km} ${t('summary.kmUnit')}`
})

function formatWindowMm(mm) {
  if (mm == null || Number.isNaN(mm)) return '—'
  return `${Math.round(mm)} ${t('common.mm')}`
}

/** @param {Record<string, unknown>} win */
function windowQty(win) {
  return normalizeWindowQuantity(win.quantity)
}

/** @param {Record<string, unknown>} line */
function lineTypeTitle(line) {
  const typeId = String(line.typeId ?? '')
  if (normalizeMaterialId(line.materialId) === 'pvc') {
    const pvc = t(`types.${typeId}.title_pvc`)
    if (pvc !== `types.${typeId}.title_pvc`) return pvc
  }
  return t(`types.${typeId}.title`)
}

/** @param {Record<string, unknown>} line @param {Record<string, unknown>} win */
function slopeDeepLineSummary(line, win) {
  if (normalizeMaterialId(line.materialId) === 'pvc') return null
  if (!win.slopeDeepOver25Cm) return null
  const pct = normalizeSlopeDeepSurchargePct(win.slopeDeepSurchargePct)
  return translate(locale.value, 'summary.slopeDeepLine').replace('{pct}', String(pct))
}

/** @param {Record<string, unknown>} line @param {Record<string, unknown>} win */
function windowEntryHeading(line, win) {
  const q = windowQty(win)
  if (line.typeId === 'roller_box' || line.typeId === 'windowsill') {
    const w = Math.round(Number(win.widthMm))
    const dims = `${w} ${t('common.mm')}`
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
  if (line.typeId === 'roller_box' || line.typeId === 'windowsill') {
    const w = Math.round(Number(win.widthMm))
    return `${w} ${t('common.mm')}`
  }
  const w = Math.round(Number(win.widthMm))
  const h = Math.round(Number(win.heightMm))
  return `${w}×${h} ${t('common.mm')}`
}

/** Повні розміри для клієнтського підсумку (без Pro-розбивки). */
function windowDimsLabelPublic(line, win) {
  return windowDimsLabel(line, win)
}

/** Розміри з пробілами навколо × (компактна картка). */
function windowDimsDisplay(line, win) {
  if (line.typeId === 'roller_box' || line.typeId === 'windowsill') {
    return `${Math.round(Number(win.widthMm))} ${t('common.mm')}`
  }
  const w = Math.round(Number(win.widthMm))
  const h = Math.round(Number(win.heightMm))
  return `${w} × ${h} ${t('common.mm')}`
}

/** @param {Record<string, unknown>} line */
function showLineSubtotal(line) {
  return windowsForLine(line).length > 1
}

/** @param {Record<string, unknown>} line @param {Record<string, unknown>} win */
function windowSpecsInline(line, win) {
  const parts = []
  if (isSimplifiedProductLine(line.typeId)) {
    const sill = windowSillLinearLabel(line, win)
    if (sill) parts.push(`${t('summary.specSill')}: ${sill}`)
  } else {
    const slopes = windowSlopesLinearLabel(line, win)
    if (slopes) parts.push(`${t('summary.specSlopes')}: ${slopes}`)
    const sill = windowSillLinearLabel(line, win)
    if (sill) parts.push(`${t('summary.specSill')}: ${sill}`)
    const deep = slopeDeepLineSummary(line, win)
    if (deep) parts.push(deep)
  }
  if (!isPublicMode.value && windowDisplayHours(line, win) > 0) {
    parts.push(
      `${t('summary.specTime')}: ${formatWorkHoursDisplay(windowDisplayHours(line, win), locale.value)} ${t('summary.hoursUnit')}`,
    )
  }
  return parts.join(' | ')
}

/** @param {Record<string, unknown>} line @param {Record<string, unknown>} win */
function windowPriceInline(line, win) {
  if (lineWindowOversized(line.typeId, win)) {
    return t('summary.individualQuote')
  }
  const unit = windowPriceEuros(line, win)
  const q = windowQty(win)
  if (!(unit > 0)) return '—'
  const unitStr = formatEuroExclVat(unit, locale.value)
  if (q > 1) {
    return translate(locale.value, 'summary.priceCompact')
      .replace('{unit}', unitStr)
      .replace('{qty}', String(q))
      .replace('{total}', formatEuroExclVat(unit * q, locale.value))
  }
  return translate(locale.value, 'summary.priceSingle').replace('{unit}', unitStr)
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

const globalWindowIndexMap = computed(() => {
  const map = new Map()
  let n = 0
  for (const line of props.lines) {
    const wins = windowsForLine(line)
    for (let wi = 0; wi < wins.length; wi += 1) {
      n += 1
      map.set(`${line.key}:${wi}`, n)
    }
  }
  return map
})

/** @param {string | number} lineKey @param {number} wIdx */
function globalWindowIndex(lineKey, wIdx) {
  return globalWindowIndexMap.value.get(`${lineKey}:${wIdx}`) ?? 0
}

/** Сума quantity по всіх вікнах (для орієнтовного терміну в public). */
const publicTotalWindowUnits = computed(() =>
  props.lines.reduce(
    (sum, line) => sum + windowsForLine(line).reduce((s, w) => s + windowQty(w), 0),
    0,
  ),
)

const publicLeadTimeDaysApprox = computed(() => {
  const days = approxWorkDays(orderTotalBufferedHours.value)
  return days > 0 ? days : 1
})

const publicLeadTimeNoteDisplay = computed(() => {
  if (locale.value === 'nl') {
    const daysLabel = formatWorkDaysApproxLabel(orderTotalBufferedHours.value, 'nl')
    return translate('nl', 'summary.publicLeadTimeNote').replace('{d}', daysLabel)
  }
  return translate(locale.value, 'summary.publicLeadTimeNote').replace(
    /\{d\}/g,
    String(publicLeadTimeDaysApprox.value),
  )
})

const orderWorkTime = computed(() => {
  let perWindowTotal = 0
  let quotedUnits = 0

  for (const line of props.lines) {
    const tid = line.typeId
    if (tid === 'roller_box') {
      for (const w of windowsForLine(line)) {
        if (!lineWindowEligibleForAutoQuote('roller_box', w)) continue
        const h = quoteRollerBoxOnlyHours(Number(w.widthMm))
        const qty = windowQty(w)
        perWindowTotal += h * qty
        quotedUnits += qty
      }
      continue
    }
    if (tid === 'windowsill') {
      for (const w of windowsForLine(line)) {
        if (!lineWindowEligibleForAutoQuote('windowsill', w)) continue
        const h = quoteWindowsillOnlyHours(Number(w.widthMm))
        const qty = windowQty(w)
        perWindowTotal += h * qty
        quotedUnits += qty
      }
      continue
    }
    const t = getTypeById(tid)
    if (!t) continue
    for (const w of windowsForLine(line)) {
      if (!windowEligibleForAutoQuote(Number(w.widthMm), Number(w.heightMm))) continue
      const slope = winSlopeQuoteArgs(w)
      const h = quoteWindowHours(
        Number(w.widthMm),
        Number(w.heightMm),
        t.hasSill,
        t.hasRoller,
        slope.deep,
      )
      const qty = windowQty(w)
      perWindowTotal += h * qty
      quotedUnits += qty
    }
  }

  return {
    perWindowTotal,
    quotedUnits,
    buffered: orderBufferedWorkHours(perWindowTotal, quotedUnits),
  }
})

const orderTotalBufferedHours = computed(() => orderWorkTime.value.buffered)
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
  return quoteLineWindowEuros(line, win)
}

/** @param {Record<string, unknown>} line @param {Record<string, unknown>} win */
function windowsillAddonPriceEuros(line, win) {
  return quoteLineWindowsillAddonEuros(line, win)
}

/** @param {Record<string, unknown>} win */
function windowsillAddonWidthMm(win) {
  const wMm = Math.round(Number(win.widthMm))
  if (!Number.isFinite(wMm)) return null
  return wMm + 300
}

function formatLinearMetersLabel(m) {
  if (m == null) return null
  return `${formatLinearMeters(m)} ${t('common.linearMeter')}`
}

/** @param {Record<string, unknown>} line @param {Record<string, unknown>} win */
function windowSlopesLinearLabel(line, win) {
  return formatLinearMetersLabel(
    windowSlopesLinearMetersTotal(line.typeId, win, windowQty(win)),
  )
}

/** @param {Record<string, unknown>} line @param {Record<string, unknown>} win */
function windowSillLinearLabel(line, win) {
  return formatLinearMetersLabel(windowSillLinearMetersTotal(line.typeId, win, windowQty(win)))
}

const orderLinearTotals = computed(() =>
  orderLinearMetersTotals(props.lines, windowsForLine, windowQty),
)

const orderMaterial = computed(() =>
  orderMaterialStock(props.lines, windowsForLine, windowQty),
)

/** @param {Record<string, unknown>} line */
function lineSubtotalEuros(line) {
  return windowsForLine(line).reduce((s, w) => s + windowPriceEuros(line, w) * windowQty(w), 0)
}

const orderTotalEuros = computed(() => props.lines.reduce((s, line) => s + lineSubtotalEuros(line), 0))

const minOrderApplied = computed(
  () => mdfSubtotalEuros.value > 0 && mdfSubtotalEuros.value < MIN_ORDER_EUR,
)
const mdfSubtotalEuros = computed(() => mdfSubtotalEurosForOrderLines(props.lines, lineSubtotalEuros))
const payableWorkEuros = computed(() => payableWorkEurosForOrderLines(props.lines, lineSubtotalEuros))

const discountPct = computed(() =>
  effectiveDiscountPercent(payableWorkEuros.value, manualDiscountPct.value, proActive.value),
)
const discountEuros = computed(() =>
  discountEurosFor(payableWorkEuros.value, manualDiscountPct.value, proActive.value),
)
const payableWorkAfterDiscountEuros = computed(() => payableWorkEuros.value - discountEuros.value)

/** @param {Record<string, unknown>} line @param {Record<string, unknown>} win */
function windowBaseHours(line, win) {
  const tid = line.typeId
  if (tid === 'roller_box') {
    if (!lineWindowEligibleForAutoQuote('roller_box', win)) return 0
    return quoteRollerBoxOnlyHours(Number(win.widthMm))
  }
  if (tid === 'windowsill') {
    if (!lineWindowEligibleForAutoQuote('windowsill', win)) return 0
    return quoteWindowsillOnlyHours(Number(win.widthMm))
  }
  const t = getTypeById(tid)
  if (!t) return 0
  if (!windowEligibleForAutoQuote(Number(win.widthMm), Number(win.heightMm))) return 0
  const slope = winSlopeQuoteArgs(win)
  return quoteWindowHours(
    Number(win.widthMm),
    Number(win.heightMm),
    t.hasSill,
    t.hasRoller,
    slope.deep,
  )
}

/** @param {Record<string, unknown>} line @param {Record<string, unknown>} win */
function windowDisplayHours(line, win) {
  return windowBaseHours(line, win) * windowQty(win)
}

const orderTotalHoursFormatted = computed(() =>
  formatWorkHoursDisplay(orderTotalBufferedHours.value, locale.value),
)
const orderTotalWorkDaysFormatted = computed(() =>
  formatWorkDaysApproxLabel(orderTotalBufferedHours.value, locale.value),
)

const copyNotice = ref('')
const copyNoticeIsError = ref(false)
const pdfLoading = ref(false)
const pdfPreviewOpen = ref(false)
const pdfPreviewBlob = ref(null)
const pdfPreviewFilename = ref('')
const pdfPreviewTitle = ref('')
const emailRequestModalOpen = ref(false)
const materialsModalOpen = ref(false)

watch(
  () => props.lines.length,
  (n) => {
    if (n > 0) preloadProposalPdfEngine()
  },
  { immediate: true },
)

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

const showFinalPayableLine = computed(() => orderTotalEuros.value > 0)

const finalPayableEuros = computed(() => {
  if (minOrderApplied.value && discountEuros.value === 0) return payableWorkEuros.value
  return payableWorkAfterDiscountEuros.value
})

const showOrderTiming = computed(() => orderTotalBufferedHours.value > 0)

function showSummaryNotice(msg, ms = 2500, isError = false) {
  copyNotice.value = msg
  copyNoticeIsError.value = isError
  window.setTimeout(() => {
    copyNotice.value = ''
    copyNoticeIsError.value = false
  }, ms)
}

function proposalPdfOptions() {
  return {
    lines: props.lines,
    locale: locale.value,
    estimatedTotalEur: offerTravelMeta.value ? grandTotalEuros.value : payableWorkAfterDiscountEuros.value,
    discountEuros: discountEuros.value,
    discountPercent: discountPct.value,
    travelMeta: offerTravelMeta.value,
  }
}

async function buildProposalPdfFile() {
  const { generateProposalPdfBlob } = await import('../utils/proposalPdf.js')
  return generateProposalPdfBlob(proposalPdfOptions())
}

const pdfShareText = computed(() => translate(locale.value, 'emailHtml.clientSubject'))

async function previewProposalPdfFile() {
  if (orderHasInvalidWindowDimensions(props.lines)) {
    showSummaryNotice(t('summary.errMinDimensions'), 4000, true)
    return
  }
  pdfLoading.value = true
  await nextTick()
  try {
    const { blob, filename } = await buildProposalPdfFile()
    pdfPreviewBlob.value = blob
    pdfPreviewFilename.value = filename
    pdfPreviewTitle.value = t('summary.previewPdfTitle')
    pdfPreviewOpen.value = true
  } catch (e) {
    console.error(e)
    showSummaryNotice(t('summary.pdfFailed'), 4000, true)
  } finally {
    pdfLoading.value = false
  }
}

function closePdfPreview() {
  pdfPreviewOpen.value = false
  pdfPreviewBlob.value = null
  pdfPreviewFilename.value = ''
  pdfPreviewTitle.value = ''
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
          <h3 class="line__type">{{ lineTypeTitle(line) }}</h3>

          <div
            v-for="(win, wIdx) in windowsForLine(line)"
            :key="wIdx"
            class="window-card"
          >
            <p class="window-card__position">
              {{ t('summary.windowLabel') }} {{ globalWindowIndex(line.key, wIdx) }}
            </p>
            <div
              class="window-card__visual"
              :aria-label="`${t('summary.windowLabel')} ${globalWindowIndex(line.key, wIdx)}, ${windowDimsDisplay(line, win)}`"
            >
              <WindowSchematicPreview
                :type-id="line.typeId"
                :win="win"
                :material-id="line.materialId"
                class="window-card__schematic"
              />
              <div class="window-card__meta">
                <p class="window-card__label">
                  {{ t('summary.windowLabel') }} {{ globalWindowIndex(line.key, wIdx) }}
                </p>
                <p class="window-card__dims">{{ windowDimsDisplay(line, win) }}</p>
              </div>
            </div>

            <div class="window-card__body">
              <p v-if="!isPublicMode && windowSpecsInline(line, win)" class="window-card__specs">
                {{ windowSpecsInline(line, win) }}
              </p>
              <p
                v-if="isPublicMode && windowQty(win) > 1"
                class="window-card__specs window-card__specs--qty"
              >
                {{ t('summary.dtQuantity') }}: {{ windowQty(win) }} {{ t('summary.pcs') }}
              </p>
              <p
                v-if="!isPublicMode"
                class="window-card__price"
                :class="{ 'window-card__price--individual': lineWindowOversized(line.typeId, win) }"
              >
                {{ windowPriceInline(line, win) }}
              </p>
            </div>

            <div class="window-card__actions">
              <button
                type="button"
                class="line__edit line__icon-btn"
                :aria-label="t('summary.editAriaPrefix') + ' ' + lineTypeTitle(line)"
                @click="emit('edit', line.key)"
              >
                <svg class="line__icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    fill="currentColor"
                    d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                  />
                </svg>
                <span class="line__icon-label">{{ t('summary.edit') }}</span>
              </button>
              <button
                type="button"
                class="line__remove line__icon-btn"
                :aria-label="t('summary.removeAriaPrefix') + ' ' + lineTypeTitle(line)"
                @click="emit('remove', line.key)"
              >
                <svg class="line__icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    fill="currentColor"
                    d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                  />
                </svg>
                <span class="line__icon-label">{{ t('summary.remove') }}</span>
              </button>
            </div>
          </div>

          <p v-if="!isPublicMode && showLineSubtotal(line)" class="line-subtotal">
            {{ t('summary.lineSubtotal') }} {{ formatEuroExclVat(lineSubtotalEuros(line), locale) }}
          </p>
        </li>
      </ul>

      <button
        v-if="lines.length"
        type="button"
        class="summary__add-window"
        @click="emit('addAnother')"
      >
        {{ t('summary.addAnotherWindow') }}
      </button>

      <p v-if="minOrderApplied" class="summary__min-order">
        {{ t('summary.publicMinOrderNote').replace('{amount}', formatEuroExclVat(MIN_ORDER_EUR, locale)) }}
      </p>

      <p v-if="isPublicMode && showOrderTiming" class="summary__lead-time">
        {{ publicLeadTimeNoteDisplay }}
      </p>

      <div v-if="isPublicMode" class="summary__quote-cta-wrap">
        <button type="button" class="summary__quote-cta" @click="emit('update:quoteOpen', true)">
          {{ t('getQuote.submitQuote') }}
        </button>
      </div>

      <template v-if="!isPublicMode">
      <div class="order-totals">
        <div class="order-totals__card">
          <p v-if="publicTotalWindowUnits > 0" class="order-totals__windows">
            {{ t('offer.totalWindows') }} {{ publicTotalWindowUnits }}
          </p>

          <dl class="order-totals__rows">
            <div v-if="orderLinearTotals.hasSlopes" class="order-totals__row order-totals__row--muted">
              <dt>{{ t('summary.totalSlopesLinearM') }}</dt>
              <dd>{{ formatLinearMetersLabel(orderLinearTotals.slopesM) }}</dd>
            </div>
            <div v-if="orderLinearTotals.hasSill" class="order-totals__row order-totals__row--muted">
              <dt>{{ t('summary.totalSillLinearM') }}</dt>
              <dd>{{ formatLinearMetersLabel(orderLinearTotals.sillM) }}</dd>
            </div>
          </dl>

          <button
            v-if="orderMaterial.hasSlopes || orderMaterial.hasSill || orderMaterial.hasTrim"
            type="button"
            class="order-totals__materials-btn"
            @click="materialsModalOpen = true"
          >
            <span class="order-totals__materials-btn-icon" aria-hidden="true">▦</span>
            <span>{{ t('summary.materialsBtn') }}</span>
            <span class="order-totals__materials-btn-count">
              {{ t('materials.barsBadge').replace('{n}', String(orderMaterial.totalBars)) }}
            </span>
          </button>

          <dl class="order-totals__rows">
            <div class="order-totals__row">
              <dt>{{ t('summary.workSubtotal') }}</dt>
              <dd>{{ formatEuroExclVat(orderTotalEuros, locale) }}</dd>
            </div>
            <div v-if="discountEuros > 0" class="order-totals__row order-totals__row--muted">
              <dt>
                {{ t('summary.discountLabel') }}
                <span class="order-totals__pct">
                  ({{ discountPct }}%<template v-if="discountManualActive"> · {{ t('summary.proDiscountManual') }}</template>)
                </span>
              </dt>
              <dd>−{{ formatEuroExclVat(discountEuros, locale) }}</dd>
            </div>

            <template v-if="offerTravelMeta">
              <div v-if="showFinalPayableLine" class="order-totals__row order-totals__row--muted">
                <dt>{{ t('summary.payableWorkTotal') }}</dt>
                <dd>{{ formatEuroExclVat(finalPayableEuros, locale) }}</dd>
              </div>
              <div class="order-totals__row order-totals__row--muted">
                <dt>{{ t('summary.travelTransportTotal') }}</dt>
                <dd>
                  <template v-if="offerTravelMeta.over100">{{ t('summary.travelDiscussedShort') }}</template>
                  <template v-else-if="offerTravelMeta.travelEur === 0">{{ t('summary.travelFree') }}</template>
                  <template v-else>{{ formatEuroExclVat(offerTravelMeta.travelEur, locale) }}</template>
                </dd>
              </div>
              <div class="order-totals__row order-totals__row--grand">
                <dt>{{ t('summary.grandTotal') }}</dt>
                <dd>{{ formatEuroExclVat(grandTotalEuros, locale) }}</dd>
              </div>
            </template>
            <div v-else-if="showFinalPayableLine" class="order-totals__row order-totals__row--grand">
              <dt>{{ t('summary.payableTotal') }}</dt>
              <dd>{{ formatEuroExclVat(finalPayableEuros, locale) }}</dd>
            </div>
          </dl>

          <p v-if="showOrderTiming" class="order-totals__timing">
            {{ t('summary.totalTimeLabel') }} ~{{ orderTotalHoursFormatted }} {{ t('summary.hoursUnit') }}
            <template v-if="orderTotalWorkDaysFormatted">
              · {{ t('summary.workDaysApproxPrefix') }} {{ orderTotalWorkDaysFormatted }}
            </template>
          </p>
        </div>

        <div class="pro-topbar">
          <div class="travel-block" :class="{ 'travel-block--open': travelOpen }">
            <button
              type="button"
              class="travel-block__header"
              :aria-expanded="travelOpen"
              @click="travelOpen = !travelOpen"
            >
              <span class="travel-block__title">{{ t('summary.travelBlockTitle') }}</span>
              <span class="travel-block__current">{{ travelCurrentLabel }}</span>
              <span class="travel-block__chevron" aria-hidden="true">▾</span>
            </button>
            <label v-show="travelOpen" class="travel-block__field">
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

          <div
            v-if="proActive"
            class="pro-discount"
            :class="{ 'pro-discount--open': discountOpen }"
            role="group"
            :aria-label="t('summary.proDiscountAria')"
          >
            <button
              type="button"
              class="pro-discount__header"
              :aria-expanded="discountOpen"
              @click="discountOpen = !discountOpen"
            >
              <span class="pro-discount__label">{{ t('summary.proDiscountLabel') }}</span>
              <span class="pro-discount__current">{{ discountCurrentLabel }}</span>
              <span class="pro-discount__chevron" aria-hidden="true">▾</span>
            </button>
            <div v-show="discountOpen" class="pro-discount__btns">
              <button
                v-for="pct in PRO_MANUAL_DISCOUNT_OPTIONS"
                :key="pct"
                type="button"
                class="pro-discount__btn"
                :class="{ 'pro-discount__btn--active': manualDiscountPct === pct }"
                :aria-pressed="manualDiscountPct === pct"
                @click="toggleManualDiscount(pct)"
              >
                −{{ pct }}%
              </button>
              <button
                type="button"
                class="pro-discount__btn pro-discount__btn--auto"
                :class="{ 'pro-discount__btn--active': manualDiscountPct == null }"
                :aria-pressed="manualDiscountPct == null"
                @click="setManualDiscount(null)"
              >
                {{ t('summary.proDiscountAuto') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="contact-section" aria-labelledby="contact-heading">
        <h3 id="contact-heading" class="contact-section__title">{{ t('summary.contact') }}</h3>
        <div class="contact-section__actions">
          <button type="button" class="contact-btn contact-btn--email" @click="openContactEmailModal">
            {{ t('summary.sendEmail') }}
          </button>
          <button
            type="button"
            class="contact-util-btn contact-util-btn--pdf-preview"
            :disabled="pdfLoading"
            @click="previewProposalPdfFile"
          >
            <span class="contact-util-btn__icon" aria-hidden="true">👁</span>
            {{ pdfLoading ? t('summary.pdfGenerating') : t('summary.previewPdf') }}
          </button>
        </div>

        <p
          v-if="copyNotice"
          class="contact-util-feedback"
          :class="{ 'contact-util-feedback--error': copyNoticeIsError }"
          role="status"
        >
          {{ copyNotice }}
        </p>
      </div>
      </template>
    </template>
  </section>

  <PdfPreviewModal
    :open="pdfPreviewOpen"
    :blob="pdfPreviewBlob"
    :filename="pdfPreviewFilename"
    :title="pdfPreviewTitle"
    allow-share
    :share-text="pdfShareText"
    @close="closePdfPreview"
  />

  <MaterialsModal
    :open="materialsModalOpen"
    :material="orderMaterial"
    :linear-totals="orderLinearTotals"
    :windows-count="publicTotalWindowUnits"
    @close="materialsModalOpen = false"
  />

  <EmailRequestModal
    :open="emailRequestModalOpen"
    variant="pro-lead"
    :lines="lines"
    :travel-meta="offerTravelMeta"
    :estimated-total-eur="offerTravelMeta ? grandTotalEuros : payableWorkAfterDiscountEuros"
    :order-subtotal-eur="orderTotalEuros"
    :discount-euros="discountEuros"
    :discount-percent="discountPct"
    :windows-count="publicTotalWindowUnits"
    :lead-time-note="publicLeadTimeNoteDisplay"
    @close="emailRequestModalOpen = false"
  />

  <GetQuoteLeadModal
    v-if="isPublicMode"
    :open="quoteOpen"
    :lines="lines"
    :windows-count="publicTotalWindowUnits"
    :estimated-total-eur="payableWorkAfterDiscountEuros"
    :discount-euros="discountEuros"
    :discount-percent="discountPct"
    :order-subtotal-eur="orderTotalEuros"
    :travel-meta="offerTravelMeta"
    :invalid-dims="orderHasInvalidWindowDimensions(lines)"
    :lead-time-note="publicLeadTimeNoteDisplay"
    @close="emit('update:quoteOpen', false)"
  />
</template>

<style scoped>
.summary {
  margin-top: var(--section-y-lg);
  padding: var(--card-pad);
  background: var(--allexo-surface);
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

@media (max-width: 768px) {
  .summary {
    position: relative;
    z-index: auto;
    margin-top: var(--section-y);
    padding: var(--card-pad);
    min-width: 0;
    overflow: hidden;
  }

  .summary__quote-cta,
  .summary__add-window {
    width: 100%;
    flex-direction: row;
    justify-content: stretch;
  }

  .window-card {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'position position'
      'visual actions'
      'body body';
    gap: 0.4rem 0.5rem;
    align-items: start;
  }

  .window-card__position {
    grid-area: position;
    margin: 0 0 0.15rem;
  }

  .window-card__visual {
    grid-area: visual;
  }

  .window-card__schematic :deep(.window-schematic) {
    width: 104px;
  }

  .window-card__meta .window-card__label {
    display: none;
  }

  .window-card__dims {
    display: block;
    font-size: 0.82rem;
    white-space: nowrap;
    line-height: 1.2;
  }

  .window-card__body {
    grid-area: body;
  }

  .window-card__actions {
    grid-area: actions;
    width: auto;
    flex-direction: column;
    flex-shrink: 0;
    align-self: start;
    gap: 0.35rem;
  }

  .window-card__actions .line__icon-btn {
    width: auto;
    max-width: none;
  }

  .line__icon-btn,
  .pro-discount__btn {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .pro-discount__btns {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.4rem;
  }

  .pro-discount__btn--auto {
    grid-column: 1 / -1;
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

.summary__min-order {
  margin: 0 0 1rem;
  color: var(--allexo-teal);
  font-size: 0.9rem;
  line-height: 1.45;
  font-weight: 600;
}

.summary__lead-time {
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
  gap: 0.5rem;
  padding: 0.85rem 1rem;
  background: var(--allexo-surface);
  border-radius: var(--radius);
  border: 1px solid var(--allexo-border);
}

.line__type {
  margin: 0 0 0.35rem;
  font-size: 0.92rem;
  font-weight: 650;
  color: var(--allexo-teal);
  line-height: 1.25;
}

.window-card {
  display: grid;
  grid-template-columns: minmax(0, auto) minmax(0, 1fr) auto;
  gap: 0.55rem 0.85rem;
  align-items: center;
  padding: 0.55rem 0;
  border-top: 1px solid var(--allexo-border);
}

.window-card:first-of-type {
  border-top: none;
  padding-top: 0;
}

.window-card__visual {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  min-width: 0;
  max-width: 100%;
  flex-shrink: 1;
  overflow: hidden;
}

.window-card__meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.window-card__position {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 750;
  color: var(--allexo-text);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.window-card__label {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 750;
  color: var(--allexo-text);
  text-align: left;
  line-height: 1.2;
}

.window-card__dims {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--allexo-text);
  text-align: left;
  line-height: 1.25;
  letter-spacing: 0.01em;
}

.window-card__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
  padding-top: 0.08rem;
}

.window-card__specs {
  margin: 0;
  font-size: 0.76rem;
  line-height: 1.38;
  color: var(--allexo-muted);
}

.window-card__specs--qty {
  font-weight: 600;
}

.window-card__price {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--allexo-text);
  line-height: 1.35;
}

.window-card__price--individual {
  color: var(--allexo-teal-light);
}

.window-card__actions {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex-shrink: 0;
  align-self: center;
}

.line__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-width: 2.35rem;
  min-height: 2.35rem;
  padding: 0.4rem 0.55rem;
}

.line__icon-svg {
  width: 1.05rem;
  height: 1.05rem;
  flex: 0 0 1.05rem;
}

@media (min-width: 769px) {
  .window-card__position {
    display: none;
  }

  .window-card__visual {
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
    width: auto;
    flex-shrink: 0;
    overflow: visible;
  }

  .window-card__schematic :deep(.window-schematic) {
    width: 130px;
  }

  .window-card__dims {
    font-size: 1rem;
  }

  .window-card__label {
    font-size: 0.88rem;
  }

  .window-card__specs,
  .window-card__price {
    font-size: 0.84rem;
  }

  .window-card__actions {
    flex-direction: row;
    align-self: center;
  }

  .line__icon-label {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .line__icon-btn {
    min-width: 2.35rem;
    padding: 0.4rem;
  }
}

.line-subtotal {
  margin: 0.15rem 0 0;
  padding-top: 0.55rem;
  border-top: 1px dashed var(--allexo-border);
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--allexo-teal);
}

.summary__add-window {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 0.85rem;
  min-height: 2.65rem;
  padding: 0.55rem 1rem;
  border: 1.5px dashed rgba(19, 52, 51, 0.35);
  border-radius: var(--radius);
  background: rgba(19, 52, 51, 0.03);
  color: var(--allexo-teal);
  font: inherit;
  font-size: 0.86rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease;
}

.summary__add-window:hover {
  background: rgba(19, 52, 51, 0.06);
  border-color: rgba(19, 52, 51, 0.5);
}

.pro-topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.pro-topbar > .travel-block {
  flex: 1 1 0;
  min-width: 0;
  margin-top: 0;
}

.pro-topbar > .pro-discount {
  flex: 1 1 0;
  min-width: 0;
  margin: 0;
}

.travel-block {
  margin-top: 1.25rem;
  padding: 0.35rem 0.9rem;
  background: rgba(17, 17, 17, 0.04);
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius);
}

.travel-block__header {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.5rem 0;
  background: none;
  border: 0;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

.travel-block__title {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--allexo-muted);
}

.travel-block__current {
  margin-left: auto;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--allexo-teal);
}

.travel-block__chevron {
  font-size: 0.75rem;
  color: var(--allexo-muted);
  transition: transform 0.18s ease;
}

.travel-block--open .travel-block__chevron {
  transform: rotate(180deg);
}

.travel-block__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.15rem 0 0.6rem;
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
  box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.12);
}

.order-totals {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--allexo-border);
}

.pro-discount {
  margin: 0 0 1rem;
  padding: 0.35rem 0.9rem;
  background: rgba(17, 17, 17, 0.05);
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius);
}

.pro-discount__header {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.5rem 0;
  background: none;
  border: 0;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

.pro-discount__label {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--allexo-muted);
}

.pro-discount__current {
  margin-left: auto;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--allexo-teal);
}

.pro-discount__chevron {
  font-size: 0.75rem;
  color: var(--allexo-muted);
  transition: transform 0.18s ease;
}

.pro-discount--open .pro-discount__chevron {
  transform: rotate(180deg);
}

.pro-discount__btns {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding: 0.15rem 0 0.6rem;
}

.pro-discount__btn {
  min-width: 3.1rem;
  padding: 0.45rem 0.65rem;
  font-size: 0.88rem;
  font-weight: 700;
  font-family: inherit;
  color: var(--allexo-teal);
  background: var(--allexo-surface);
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius);
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.pro-discount__btn:hover {
  border-color: var(--allexo-teal);
}

.pro-discount__btn--active {
  color: #fff;
  background: var(--allexo-teal);
  border-color: var(--allexo-teal);
}

.pro-discount__btn--auto {
  min-width: auto;
  padding-inline: 0.85rem;
}

.order-totals__card {
  padding: 1rem 1.05rem;
  background: var(--allexo-surface);
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius);
}

.order-totals__windows {
  margin: 0 0 0.75rem;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--allexo-muted);
}

.order-totals__materials-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  margin: 0.65rem 0 0.85rem;
  padding: 0.65rem 0.85rem;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: inherit;
  color: var(--allexo-teal);
  background: var(--allexo-bg);
  border: 1px solid var(--allexo-teal);
  border-radius: var(--radius);
  cursor: pointer;
  text-align: left;
}

.order-totals__materials-btn:hover {
  background: var(--allexo-surface);
}

.order-totals__materials-btn-icon {
  flex-shrink: 0;
  font-size: 1rem;
  line-height: 1;
}

.order-totals__materials-btn-count {
  margin-left: auto;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--allexo-muted);
}

.order-totals__rows {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.order-totals__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
}

.order-totals__row dt {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--allexo-teal);
}

.order-totals__row dd {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--allexo-teal);
  text-align: right;
  white-space: nowrap;
}

.order-totals__row--muted dt,
.order-totals__row--muted dd {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--allexo-muted);
}

.order-totals__pct {
  font-size: 0.82rem;
  font-weight: 600;
  opacity: 0.85;
}

.order-totals__row--grand {
  margin-top: 0.35rem;
  padding-top: 0.65rem;
  border-top: 2px solid var(--allexo-border);
}

.order-totals__row--grand dt,
.order-totals__row--grand dd {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--allexo-text);
}

.order-totals__timing {
  margin: 0.75rem 0 0;
  padding-top: 0.65rem;
  border-top: 1px dashed var(--allexo-border);
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--allexo-muted);
  text-align: center;
  line-height: 1.4;
}

.order-totals__notes {
  margin: 0.75rem 0 0;
  padding: 0.7rem 0.9rem;
  list-style: none;
  background: var(--allexo-bg);
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius);
}

.order-totals__notes li {
  position: relative;
  padding-left: 0.9rem;
  font-size: 0.81rem;
  font-weight: 500;
  line-height: 1.45;
  color: var(--allexo-muted);
}

.order-totals__notes li::before {
  content: '·';
  position: absolute;
  left: 0;
  font-weight: 700;
  color: var(--allexo-teal);
  opacity: 0.55;
}

.order-totals__notes li + li {
  margin-top: 0.38rem;
}

.order-totals__public-lead {
  margin: 0.45rem 0 0;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--allexo-muted);
  line-height: 1.45;
  text-wrap: balance;
}

.order-totals__public-no-price {
  margin: 0.45rem 0 0;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--allexo-muted);
  line-height: 1.45;
  text-wrap: balance;
}

.order-totals__payable-includes {
  margin: 0.5rem 0 0;
  padding: 0.55rem 0.65rem;
  font-size: 0.84rem;
  font-weight: 550;
  color: var(--allexo-muted);
  line-height: 1.45;
  text-wrap: balance;
  background: rgba(17, 17, 17, 0.04);
  border-radius: var(--radius);
  border: 1px solid rgba(17, 17, 17, 0.08);
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
  flex-direction: row;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 0.5rem;
}

.contact-util-btn {
  flex: 1 1 calc(50% - 0.25rem);
  min-width: 0;
  padding: 0.55rem 0.6rem;
  min-height: 2.75rem;
  border: 1px solid var(--allexo-border);
  border-radius: var(--radius);
  background: var(--allexo-surface);
  color: var(--allexo-teal);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.contact-util-btn:hover {
  color: var(--allexo-teal-light);
}

.contact-util-btn:disabled {
  opacity: 0.55;
  cursor: wait;
}

.contact-util-btn--pdf-share {
  color: #fff;
  background: var(--allexo-teal);
  border-color: var(--allexo-teal);
  transition:
    background 0.18s,
    color 0.18s;
}

.contact-util-btn--pdf-share:hover {
  color: #fff;
  background: var(--allexo-teal-light);
  border-color: var(--allexo-teal-light);
}

.contact-util-btn--pdf-share:disabled {
  opacity: 0.65;
}

.contact-util-btn__icon {
  font-size: 1rem;
  line-height: 1;
}

.contact-section__copy-hint {
  margin: 0.35rem 0 0;
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--allexo-muted);
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

.contact-btn {
  flex: 1 1 calc(50% - 0.25rem);
  min-width: 0;
  padding: 0.55rem 0.6rem;
  font-size: 0.9rem;
  font-weight: 700;
  font-family: inherit;
  line-height: 1.3;
  border-radius: var(--radius);
  cursor: pointer;
  border: 1px solid transparent;
}

.contact-btn--email {
  min-height: 2.75rem;
  color: var(--allexo-text);
  background: var(--allexo-surface);
  border-color: var(--allexo-border);
}

.contact-btn--email:hover {
  background: var(--allexo-bg);
  color: var(--allexo-teal);
  border-color: var(--allexo-teal);
}

.summary__quote-cta-wrap {
  margin-top: 1.25rem;
}

.summary__quote-cta {
  width: 100%;
  min-height: 3.15rem;
  padding: 0.85rem 1.25rem;
  font-size: 1.05rem;
  font-weight: 800;
  font-family: inherit;
  color: #fff;
  background: var(--allexo-teal);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  box-shadow: var(--shadow-md);
  transition:
    background 0.18s,
    color 0.18s;
}

.summary__quote-cta:hover {
  background: var(--allexo-teal-light);
  color: #fff;
}

.line__edit,
.line__remove {
  min-height: 2.75rem;
  padding: 0.45rem 0.95rem;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: var(--radius);
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
}

.line__edit {
  color: var(--allexo-teal);
  background: #fff;
  border: 1px solid rgba(15, 61, 62, 0.28);
}

.line__edit:hover {
  background: rgba(15, 61, 62, 0.05);
}

.line__remove {
  color: var(--allexo-danger);
  background: #fff;
  border: 1px solid rgba(180, 35, 24, 0.35);
}

.line__remove:hover {
  background: #fef3f2;
}
</style>
