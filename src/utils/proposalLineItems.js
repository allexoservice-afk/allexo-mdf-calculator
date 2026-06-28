/**
 * Структуровані позиції пропозиції для email (без зміни логіки цін).
 */
import { getTypeById } from '../constants/calculatorTypes.js'
import { normalizeMaterialId } from '../constants/materialTypes.js'
import { normalizeStoredWindow, normalizeWindowQuantity } from '../constants/sizeCategories.js'
import {
  quoteRollerBoxOnlyHours,
  quoteWindowHours,
  quoteWindowsillOnlyHours,
  winSlopeQuoteArgs,
  normalizeSlopeDeepSurchargePct,
} from '../pricing/windowQuote.js'
import { quoteLineWindowEuros } from '../pricing/quoteLineWindow.js'
import { lineWindowEligibleForAutoQuote, windowEligibleForAutoQuote } from './windowDimensions.js'
import { translate, typeTitle } from '../i18n/translations.js'

const TIME_BUFFER = 1.44

/** @param {Record<string, unknown>} line */
function windowsForLine(line) {
  const tid = typeof line.typeId === 'string' ? line.typeId : undefined
  if (Array.isArray(line.windows) && line.windows.length > 0) {
    return line.windows.map((w) => normalizeStoredWindow(w, tid)).filter(Boolean)
  }
  return []
}

/** @param {Record<string, unknown>} line @param {Record<string, unknown>} win */
function unitPriceEuros(line, win) {
  const tid = line.typeId
  if (tid === 'roller_box') {
    if (!lineWindowEligibleForAutoQuote('roller_box', win)) return null
  } else if (tid === 'windowsill') {
    if (!lineWindowEligibleForAutoQuote('windowsill', win)) return null
  } else if (!windowEligibleForAutoQuote(Number(win.widthMm), Number(win.heightMm))) {
    return null
  }
  const unit = quoteLineWindowEuros(line, win)
  return unit > 0 ? unit : null
}

/**
 * Спрощений розмір для клієнта (без глибин і технічних полів).
 * @param {import('../i18n/translations.js').Locale} locale
 * @param {Record<string, unknown>} line
 * @param {Record<string, unknown>} win
 */
export function formatClientSizeLabel(locale, line, win) {
  const mm = translate(locale, 'common.mm')
  const w = Math.round(Number(win.widthMm))
  if (line.typeId === 'roller_box' || line.typeId === 'windowsill') {
    return `${w} ${mm}`
  }
  const h = Math.round(Number(win.heightMm))
  return `${w} × ${h} ${mm}`
}

/**
 * Розмір для листа власнику (без категорій / JSON).
 * @param {import('../i18n/translations.js').Locale} locale
 * @param {Record<string, unknown>} line
 * @param {Record<string, unknown>} win
 * @returns {string[]}
 */
export function formatOwnerSizeLines(locale, line, win) {
  const mm = translate(locale, 'common.mm')
  const w = Math.round(Number(win.widthMm))
  if (line.typeId === 'roller_box' || line.typeId === 'windowsill') {
    return [`${w} ${mm}`]
  }
  const h = Math.round(Number(win.heightMm))
  const lines = [`${w} × ${h} ${mm}`]
  if (win.slopeDeepOver25Cm && normalizeMaterialId(line.materialId) !== 'pvc') {
    const pct = normalizeSlopeDeepSurchargePct(win.slopeDeepSurchargePct)
    lines.push(translate(locale, 'offer.slopeDeepLine').replace('{pct}', String(pct)))
  }
  return lines
}

/**
 * @param {unknown[]} lines
 * @param {import('../i18n/translations.js').Locale} locale
 */
export function collectClientLineItems(lines, locale) {
  if (!Array.isArray(lines) || !lines.length) return []

  /** @type {Array<{ title: string, size: string, quantity: number, lineTotalEur: number | null }>} */
  const items = []

  for (const raw of lines) {
    const line = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {}
    const tid = typeof line.typeId === 'string' ? line.typeId : ''
    const title = tid ? typeTitle(locale, tid, line.materialId) : '—'
    for (const win of windowsForLine(line)) {
      const qty = normalizeWindowQuantity(win.quantity)
      const unit = unitPriceEuros(line, win)
      const lineTotal = unit != null && unit > 0 ? unit * qty : null
      items.push({
        title,
        size: formatClientSizeLabel(locale, line, win),
        quantity: qty,
        lineTotalEur: lineTotal,
      })
    }
  }
  return items
}

/**
 * Позиції з даними для PDF-схеми вікна.
 * @param {unknown[]} lines
 * @param {import('../i18n/translations.js').Locale} locale
 */
export function collectClientLineItemsForPdf(lines, locale) {
  if (!Array.isArray(lines) || !lines.length) return []

  /** @type {Array<{ title: string, size: string, quantity: number, lineTotalEur: number | null, typeId: string, win: Record<string, unknown>, windowIndex: number }>} */
  const items = []
  let windowIndex = 0

  for (const raw of lines) {
    const line = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {}
    const tid = typeof line.typeId === 'string' ? line.typeId : ''
    const title = tid ? typeTitle(locale, tid, line.materialId) : '—'
    for (const win of windowsForLine(line)) {
      windowIndex += 1
      const qty = normalizeWindowQuantity(win.quantity)
      const unit = unitPriceEuros(line, win)
      const lineTotal = unit != null && unit > 0 ? unit * qty : null
      items.push({
        title,
        size: formatClientSizeLabel(locale, line, win),
        quantity: qty,
        lineTotalEur: lineTotal,
        typeId: tid,
        win: /** @type {Record<string, unknown>} */ (win),
        windowIndex,
      })
    }
  }
  return items
}

/**
 * @param {unknown[]} lines
 * @param {import('../i18n/translations.js').Locale} locale
 */
export function collectOwnerLineItems(lines, locale) {
  if (!Array.isArray(lines) || !lines.length) return []

  /** @type {Array<{ title: string, sizeLines: string[], quantity: number, lineTotalEur: number | null }>} */
  const items = []

  for (const raw of lines) {
    const line = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {}
    const tid = typeof line.typeId === 'string' ? line.typeId : ''
    const title = tid ? typeTitle(locale, tid, line.materialId) : '—'
    for (const win of windowsForLine(line)) {
      const qty = normalizeWindowQuantity(win.quantity)
      const unit = unitPriceEuros(line, win)
      const lineTotal = unit != null && unit > 0 ? unit * qty : null
      items.push({
        title,
        sizeLines: formatOwnerSizeLines(locale, line, win),
        quantity: qty,
        lineTotalEur: lineTotal,
      })
    }
  }
  return items
}

/**
 * Орієнтовний час робіт (год) з буфером.
 * @param {unknown[]} lines
 */
export function estimateBufferedWorkHours(lines) {
  if (!Array.isArray(lines) || !lines.length) return 0

  const totalH = lines.reduce((sum, raw) => {
    const line = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {}
    const tid = line.typeId
    if (tid === 'roller_box') {
      return (
        sum +
        windowsForLine(line).reduce((s, w) => {
          if (!lineWindowEligibleForAutoQuote('roller_box', w)) return s
          return s + quoteRollerBoxOnlyHours(Number(w.widthMm)) * normalizeWindowQuantity(w.quantity)
        }, 0)
      )
    }
    if (tid === 'windowsill') {
      return (
        sum +
        windowsForLine(line).reduce((s, w) => {
          if (!lineWindowEligibleForAutoQuote('windowsill', w)) return s
          return s + quoteWindowsillOnlyHours(Number(w.widthMm)) * normalizeWindowQuantity(w.quantity)
        }, 0)
      )
    }
    const t = getTypeById(tid)
    if (!t) return sum
    return (
      sum +
      windowsForLine(line).reduce((s, w) => {
        if (!windowEligibleForAutoQuote(Number(w.widthMm), Number(w.heightMm))) return s
        const slope = winSlopeQuoteArgs(w)
        return (
          s +
          quoteWindowHours(
            Number(w.widthMm),
            Number(w.heightMm),
            t.hasSill,
            t.hasRoller,
            slope.deep,
          ) *
            normalizeWindowQuantity(w.quantity)
        )
      }, 0)
    )
  }, 0)

  return totalH * TIME_BUFFER
}

/** @param {unknown[]} lines */
export function computeBufferedWorkHours(lines) {
  return estimateBufferedWorkHours(lines)
}
