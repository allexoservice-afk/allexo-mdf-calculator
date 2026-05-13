/**
 * Внутрішній розрахунок ціни та часу (не експортувати коефіцієнти та константи в UI).
 * @module pricing/windowQuote
 */

import { mmToSizeCategory } from '../constants/sizeCategories.js'

/**
 * @typedef {import('../constants/sizeCategories.js').SizeCategoryId} SizeCategoryId
 */

/** Базова ставка за погонний метр профілю (€/м), без ПДВ; коефіцієнти нижче множаться на цю базу. */
const _BASE_PER_M = 60

const _DEPTH_COEFF = /** @type {Record<SizeCategoryId, number>} */ ({
  small: 1.0,
  medium: 1.2,
  large: 1.4,
  custom: 1.7,
})

const _ROLLER_COEFF = /** @type {Record<SizeCategoryId, number>} */ ({
  small: 1.3,
  medium: 1.5,
  large: 1.7,
  custom: 2.0,
})

const _INSULATION = /** @type {Record<SizeCategoryId, number>} */ ({
  small: 30,
  medium: 50,
  large: 70,
  custom: 90,
})

const _WINDOWSILL_WIDTH_ADDON_MM = 300
const _WINDOWSILL_BASE_COEFF = 1.3

const _DEPTH_HOURS = /** @type {Record<SizeCategoryId, number>} */ ({
  small: 0,
  medium: 0.3,
  large: 0.6,
  custom: 1,
})

const _ROLLER_HOURS = /** @type {Record<SizeCategoryId, number>} */ ({
  small: 1,
  medium: 1.5,
  large: 2,
  custom: 2.5,
})

/** @param {number} value */
function _roundUpToFiveEuros(value) {
  return Math.ceil(value / 5) * 5
}

/** @param {Record<SizeCategoryId, number>} map @param {SizeCategoryId} key */
function _pick(map, key) {
  return map[key] ?? map.small
}

/** @param {number | null | undefined} windowsillDepthMm */
function _windowsillExtraPerMeter(windowsillDepthMm) {
  // +5 €/m for every +5 cm depth step starting from 15 cm
  const depthMm = Number(windowsillDepthMm)
  if (!Number.isFinite(depthMm)) return 0
  const depthCm = Math.round(depthMm / 10)
  const clamped = Math.min(40, Math.max(15, depthCm))
  const steps = Math.floor((clamped - 15) / 5)
  return steps * 5
}

/**
 * Ціна підвіконника (окремо), € без ПДВ, округлення вгору до 5€.
 * - ширина = widthMm + 30 см (для підвіконника разом з вікном)
 * - коефіцієнт завжди 1.5
 * - глибина додає +5 €/м за кожні +5 см (від 15 см)
 * @param {number} windowWidthMm
 * @param {number | null | undefined} windowsillDepthMm
 */
export function quoteWindowsillAddonRoundedEuros(windowWidthMm, windowsillDepthMm) {
  if (!Number.isFinite(windowWidthMm) || windowWidthMm <= 0) return 0
  const widthM = (windowWidthMm + _WINDOWSILL_WIDTH_ADDON_MM) / 1000
  const perM = _BASE_PER_M * _WINDOWSILL_BASE_COEFF + _windowsillExtraPerMeter(windowsillDepthMm)
  return _roundUpToFiveEuros(widthM * perM)
}

/**
 * Ціна за вікно в €, округлена вгору до кратних 5€.
 */
export function quoteWindowRoundedEuros(
  widthMm,
  heightMm,
  depthCategory,
  hasSill,
  hasRoller,
  windowsillDepthMm,
  rollerCategory,
) {
  const widthM = widthMm / 1000
  const heightM = heightMm / 1000
  const d = _pick(_DEPTH_COEFF, depthCategory)

  let price
  if (!hasRoller) {
    price = (2 * heightM + widthM) * _BASE_PER_M * d
  } else {
    const rollCat = rollerCategory ?? 'small'
    const r = _pick(_ROLLER_COEFF, rollCat)
    const ins = _pick(_INSULATION, rollCat)
    const sidePrice = 2 * heightM * _BASE_PER_M * d
    const topPrice = widthM * _BASE_PER_M * d * r
    price = sidePrice + topPrice + ins + 10
  }

  if (hasSill) {
    // підвіконник рахується окремо і додається до ціни відкосів
    price += quoteWindowsillAddonRoundedEuros(widthMm, windowsillDepthMm)
  }

  return _roundUpToFiveEuros(price)
}

/**
 * Орієнтовний час на одне вікно (год).
 */
export function quoteWindowHours(hasSill, hasRoller, depthCategory, rollerCategory) {
  let h = 2
  if (hasSill) h += 0.5
  h += _pick(_DEPTH_HOURS, depthCategory ?? 'small')
  if (hasRoller) {
    h += _pick(_ROLLER_HOURS, rollerCategory ?? 'small')
  }
  return h
}

/**
 * Ціна лише короба ролети (без бокових відкосів), €, округлення як у повному вікні.
 * @param {number} widthMm
 * @param {number} rollerBoxHeightMm
 */
export function quoteRollerBoxOnlyRoundedEuros(widthMm, rollerBoxHeightMm) {
  const widthM = widthMm / 1000
  const cat = mmToSizeCategory(rollerBoxHeightMm)
  const r = _pick(_ROLLER_COEFF, cat)
  const ins = _pick(_INSULATION, cat)
  const price = widthM * _BASE_PER_M * r + ins + 10
  return _roundUpToFiveEuros(price)
}

/**
 * Ціна лише підвіконника, € (без ПДВ), за шириною в см і коефіцієнтом глибини.
 * widthCm = widthMm / 10, widthM = widthCm / 100, price = widthM × 60 × 1.5 (+ надбавка за глибину).
 * @param {number} widthMm ширина в мм (поле «Ширина», см × 10)
 * @param {number} windowsillDepthMm глибина в мм (15–40 см, крок 5 см)
 */
export function quoteWindowsillOnlyRoundedEuros(widthMm, windowsillDepthMm) {
  if (!Number.isFinite(widthMm) || widthMm <= 0) return 0
  const widthM = widthMm / 1000
  const perM = _BASE_PER_M * _WINDOWSILL_BASE_COEFF + _windowsillExtraPerMeter(windowsillDepthMm)
  return _roundUpToFiveEuros(widthM * perM)
}

/** Орієнтовний час на один «короб ролети» (год). */
export function quoteRollerBoxOnlyHours() {
  return 1.5
}

/** Орієнтовний час на один підвіконник (год). */
export function quoteWindowsillOnlyHours() {
  return 1
}
