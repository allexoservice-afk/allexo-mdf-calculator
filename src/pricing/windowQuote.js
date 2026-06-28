/**
 * Внутрішній розрахунок ціни та часу (не експортувати коефіцієнти та константи в UI).
 * @module pricing/windowQuote
 */

import { normalizeMaterialId } from '../constants/materialTypes.js'
import { windowProfileLengthMeters } from '../utils/mdfFormulas.js'

/** @type {Record<import('../constants/materialTypes.js').MaterialId, { slopes: number, sill: number, roller: number }>} */
const _RATES = {
  mdf: { slopes: 37, sill: 40, roller: 78 },
  pvc: { slopes: 45, sill: 55, roller: 0 },
}

/** @param {import('../constants/materialTypes.js').MaterialId | unknown} [materialId] */
function _ratesFor(materialId) {
  return _RATES[normalizeMaterialId(materialId)]
}

const _WINDOWSILL_WIDTH_ADDON_MM = 300

/** @type {readonly number[]} */
export const PRO_SLOPE_DEPTH_SURCHARGE_OPTIONS = Object.freeze([10, 15, 20])

/** @param {unknown} raw @returns {10 | 15 | 20} */
export function normalizeSlopeDeepSurchargePct(raw) {
  const n = Number(raw)
  if (n === 10 || n === 15 || n === 20) return /** @type {10 | 15 | 20} */ (n)
  return 15
}

/**
 * @param {Record<string, unknown> | null | undefined} win
 */
export function winSlopeQuoteArgs(win) {
  return {
    deep: Boolean(win?.slopeDeepOver25Cm),
    pct: normalizeSlopeDeepSurchargePct(win?.slopeDeepSurchargePct),
  }
}

/**
 * Час від розмірів вікна (год):
 * T = setup + L×perM + max(0, A − areaThreshold)×perM²
 */
const _TIME_SETUP_H = 0.5
const _TIME_PER_PROFILE_M = 0.55
const _TIME_AREA_THRESHOLD_M2 = 2.5
const _TIME_PER_M2_ABOVE = 0.2

/** @param {number} value */
function _exactEuros(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

/** @param {number} h */
function _roundHours(h) {
  return Math.round(h * 10) / 10
}

/** @param {number} widthMm @param {number} heightMm */
function _windowAreaM2(widthMm, heightMm) {
  return (widthMm * heightMm) / 1e6
}

/**
 * @param {boolean | null | undefined} deepOver25Cm
 * @param {number | null | undefined} surchargePct
 */
function _normalizeSlopeSurchargePct(deepOver25Cm, surchargePct) {
  if (!deepOver25Cm) return 0
  const pct = Number(surchargePct)
  if (pct === 10 || pct === 15 || pct === 20) return pct
  return 15
}

/**
 * Базовий час монтажу відкосів за розміром (без підвіконника, ролети, глибини).
 * @param {number} widthMm
 * @param {number} heightMm
 */
function _dimensionBaseHours(widthMm, heightMm) {
  const L = windowProfileLengthMeters(widthMm, heightMm)
  const A = _windowAreaM2(widthMm, heightMm)
  const areaExtra = Math.max(0, A - _TIME_AREA_THRESHOLD_M2) * _TIME_PER_M2_ABOVE
  return _TIME_SETUP_H + L * _TIME_PER_PROFILE_M + areaExtra
}

/**
 * Ціна відкосів, € без ПДВ.
 * @param {number} widthMm
 * @param {number} heightMm
 * @param {boolean} [deepOver25Cm]
 * @param {number | null | undefined} [deepSurchargePct] 10 або 15
 * @param {import('../constants/materialTypes.js').MaterialId | unknown} [materialId]
 */
export function quoteSlopesRoundedEuros(
  widthMm,
  heightMm,
  deepOver25Cm = false,
  deepSurchargePct = 15,
  materialId = 'mdf',
) {
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm) || widthMm <= 0 || heightMm <= 0) return 0
  const L = windowProfileLengthMeters(widthMm, heightMm)
  let price = L * _ratesFor(materialId).slopes
  if (normalizeMaterialId(materialId) === 'mdf') {
    const pct = _normalizeSlopeSurchargePct(deepOver25Cm, deepSurchargePct)
    if (pct > 0) price *= 1 + pct / 100
  }
  return _exactEuros(price)
}

/**
 * Ціна ролети по ширині вікна, € без ПДВ.
 * @param {number} widthMm
 * @param {import('../constants/materialTypes.js').MaterialId | unknown} [materialId]
 */
export function quoteRollerRoundedEuros(widthMm, materialId = 'mdf') {
  if (!Number.isFinite(widthMm) || widthMm <= 0) return 0
  return _exactEuros((widthMm / 1000) * _ratesFor(materialId).roller)
}

/**
 * Ціна підвіконника (разом з вікном): ширина + 30 см, € без ПДВ.
 * @param {number} windowWidthMm
 * @param {import('../constants/materialTypes.js').MaterialId | unknown} [materialId]
 */
export function quoteWindowsillAddonRoundedEuros(windowWidthMm, materialId = 'mdf') {
  if (!Number.isFinite(windowWidthMm) || windowWidthMm <= 0) return 0
  const widthM = (windowWidthMm + _WINDOWSILL_WIDTH_ADDON_MM) / 1000
  return _exactEuros(widthM * _ratesFor(materialId).sill)
}

/**
 * Ціна за вікно в € (сума позицій).
 * @param {number} widthMm
 * @param {number} heightMm
 * @param {boolean} hasSill
 * @param {boolean} hasRoller
 * @param {boolean} [slopeDeepOver25Cm]
 * @param {number | null | undefined} [slopeDeepSurchargePct]
 * @param {import('../constants/materialTypes.js').MaterialId | unknown} [materialId]
 */
export function quoteWindowRoundedEuros(
  widthMm,
  heightMm,
  hasSill,
  hasRoller,
  slopeDeepOver25Cm = false,
  slopeDeepSurchargePct = 15,
  materialId = 'mdf',
) {
  let price = quoteSlopesRoundedEuros(
    widthMm,
    heightMm,
    slopeDeepOver25Cm,
    slopeDeepSurchargePct,
    materialId,
  )
  if (hasRoller) price += quoteRollerRoundedEuros(widthMm, materialId)
  if (hasSill) price += quoteWindowsillAddonRoundedEuros(widthMm, materialId)
  return price
}

/**
 * Орієнтовний час на одне вікно (год).
 * @param {number} widthMm
 * @param {number} heightMm
 * @param {boolean} hasSill
 * @param {boolean} hasRoller
 * @param {boolean} [slopeDeepOver25Cm]
 */
export function quoteWindowHours(widthMm, heightMm, hasSill, hasRoller, slopeDeepOver25Cm = false) {
  let h = _dimensionBaseHours(widthMm, heightMm)
  if (slopeDeepOver25Cm) h += 0.45
  if (hasSill) {
    const sillM = (widthMm + _WINDOWSILL_WIDTH_ADDON_MM) / 1000
    h += 0.25 + sillM * 0.2
  }
  if (hasRoller) {
    h += 1.1 + (widthMm / 1000) * 0.12
  }
  return _roundHours(h)
}

/**
 * Ціна лише короба ролети (без бокових відкосів), €.
 * @param {number} widthMm
 * @param {import('../constants/materialTypes.js').MaterialId | unknown} [materialId]
 */
export function quoteRollerBoxOnlyRoundedEuros(widthMm, materialId = 'mdf') {
  return quoteRollerRoundedEuros(widthMm, materialId)
}

/**
 * Ціна лише підвіконника, € (без ПДВ), за шириною в мм.
 * @param {number} widthMm
 * @param {import('../constants/materialTypes.js').MaterialId | unknown} [materialId]
 */
export function quoteWindowsillOnlyRoundedEuros(widthMm, materialId = 'mdf') {
  if (!Number.isFinite(widthMm) || widthMm <= 0) return 0
  return _exactEuros((widthMm / 1000) * _ratesFor(materialId).sill)
}

/**
 * Орієнтовний час на один «короб ролети» (год).
 * @param {number} widthMm
 */
export function quoteRollerBoxOnlyHours(widthMm) {
  const widthM = widthMm / 1000
  return _roundHours(0.4 + widthM * 0.35 + 0.35)
}

/**
 * Орієнтовний час на один підвіконник (год).
 * @param {number} widthMm
 */
export function quoteWindowsillOnlyHours(widthMm) {
  const widthM = widthMm / 1000
  return _roundHours(0.35 + widthM * 0.3)
}
