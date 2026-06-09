/**
 * Структуровані позиції пропозиції для email (без зміни логіки цін).
 */
import { getTypeById } from '../constants/calculatorTypes.js'
import { normalizeStoredWindow, normalizeWindowQuantity } from '../constants/sizeCategories.js'
import {
  quoteRollerBoxOnlyHours,
  quoteRollerBoxOnlyRoundedEuros,
  quoteWindowHours,
  quoteWindowRoundedEuros,
  quoteWindowsillOnlyRoundedEuros,
  quoteWindowsillOnlyHours,
} from '../pricing/windowQuote.js'
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
    return quoteRollerBoxOnlyRoundedEuros(Number(win.widthMm), Number(win.rollerBoxHeightMm ?? win.heightMm))
  }
  if (tid === 'windowsill') {
    if (!lineWindowEligibleForAutoQuote('windowsill', win)) return null
    return quoteWindowsillOnlyRoundedEuros(Number(win.widthMm), Number(win.windowsillDepthMm ?? win.heightMm))
  }
  const ty = getTypeById(tid)
  if (!ty) return null
  if (!windowEligibleForAutoQuote(Number(win.widthMm), Number(win.heightMm))) return null
  return quoteWindowRoundedEuros(
    Number(win.widthMm),
    Number(win.heightMm),
    /** @type {import('../constants/sizeCategories.js').SizeCategoryId} */ (win.depthCategory),
    ty.hasSill,
    ty.hasRoller,
    typeof win.windowsillDepthMm === 'number' ? win.windowsillDepthMm : null,
    win.rollerCategory != null
      ? /** @type {import('../constants/sizeCategories.js').SizeCategoryId} */ (win.rollerCategory)
      : null,
  )
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
  if (line.typeId === 'roller_box') {
    const h = Math.round(Number(win.rollerBoxHeightMm ?? win.heightMm))
    return [`${w} × ${h} ${mm}`]
  }
  if (line.typeId === 'windowsill') {
    const d = Math.round(Number(win.windowsillDepthMm ?? win.heightMm))
    return [`${w} ${mm}`, `${d} ${mm} ${translate(locale, 'emailHtml.ownerDepthSuffix')}`]
  }
  const h = Math.round(Number(win.heightMm))
  return [`${w} × ${h} ${mm}`]
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
    const title = tid ? typeTitle(locale, tid) : '—'
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
    const title = tid ? typeTitle(locale, tid) : '—'
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
    const title = tid ? typeTitle(locale, tid) : '—'
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

/** @deprecated Use collectClientLineItems or collectOwnerLineItems */
export function collectProposalLineItems(lines, locale) {
  return collectClientLineItems(lines, locale).map((item) => ({
    ...item,
    details: [],
    unitEur: item.lineTotalEur != null && item.quantity > 0 ? item.lineTotalEur / item.quantity : null,
  }))
}

/**
 * @param {unknown[]} lines
 */
export function computeBufferedWorkHours(lines) {
  if (!Array.isArray(lines) || !lines.length) return 0
  let totalH = 0
  for (const raw of lines) {
    const L = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {}
    const tid = L.typeId
    if (tid === 'roller_box') {
      totalH += windowsForLine(L).reduce((s, w) => {
        if (!lineWindowEligibleForAutoQuote('roller_box', w)) return s
        return (
          s +
          quoteRollerBoxOnlyHours(
            Number(w.widthMm),
            Number(w.rollerBoxHeightMm ?? w.heightMm),
          ) *
            normalizeWindowQuantity(w.quantity)
        )
      }, 0)
      continue
    }
    if (tid === 'windowsill') {
      totalH += windowsForLine(L).reduce((s, w) => {
        if (!lineWindowEligibleForAutoQuote('windowsill', w)) return s
        return (
          s +
          quoteWindowsillOnlyHours(
            Number(w.widthMm),
            typeof w.windowsillDepthMm === 'number' ? w.windowsillDepthMm : null,
          ) *
            normalizeWindowQuantity(w.quantity)
        )
      }, 0)
      continue
    }
    const t = getTypeById(tid)
    if (!t) continue
    totalH += windowsForLine(L).reduce((s, w) => {
      if (!windowEligibleForAutoQuote(Number(w.widthMm), Number(w.heightMm))) return s
      return (
        s +
        quoteWindowHours(
          Number(w.widthMm),
          Number(w.heightMm),
          t.hasSill,
          t.hasRoller,
          /** @type {import('../constants/sizeCategories.js').SizeCategoryId} */ (w.depthCategory),
          w.rollerCategory != null
            ? /** @type {import('../constants/sizeCategories.js').SizeCategoryId} */ (w.rollerCategory)
            : null,
          typeof w.windowsillDepthMm === 'number' ? w.windowsillDepthMm : null,
        ) * normalizeWindowQuantity(w.quantity)
      )
    }, 0)
  }
  const buffered = totalH * TIME_BUFFER
  return Math.round(buffered * 10) / 10
}
