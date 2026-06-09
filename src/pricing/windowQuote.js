/**
 * Внутрішній розрахунок ціни та часу (не експортувати коефіцієнти та константи в UI).
 * @module pricing/windowQuote
 */

import { mmToSizeCategory } from '../constants/sizeCategories.js'
import { windowProfileLengthMeters } from '../utils/mdfFormulas.js'

/**
 * @typedef {import('../constants/sizeCategories.js').SizeCategoryId} SizeCategoryId
 */

/** Базова ставка за погонний метр профілю (€/м), без ПДВ; коефіцієнти нижче множаться на цю базу. */
const _BASE_PER_M = 53

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

/** Надбавка за ролету/ізоляцію (частина фіксована за категорією короба). */
const _ROLLER_HOURS = /** @type {Record<SizeCategoryId, number>} */ ({
  small: 1,
  medium: 1.5,
  large: 2,
  custom: 2.5,
})

/**
 * Час від розмірів вікна (год):
 * T = setup + L×perM + max(0, A − areaThreshold)×perM²
 * L — погонні метри профілю відкосів (ширина + 2×висота), A — площа отвору (м²).
 */
const _TIME_SETUP_H = 0.5
const _TIME_PER_PROFILE_M = 0.55
const _TIME_AREA_THRESHOLD_M2 = 2.5
const _TIME_PER_M2_ABOVE = 0.2

/** @param {number} value */
function _roundUpToFiveEuros(value) {
  return Math.ceil(value / 5) * 5
}

/** @param {Record<SizeCategoryId, number>} map @param {SizeCategoryId} key */
function _pick(map, key) {
  return map[key] ?? map.small
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

/** @param {number | null | undefined} windowsillDepthMm */
function _windowsillDepthExtraHours(windowsillDepthMm) {
  const depthMm = Number(windowsillDepthMm)
  if (!Number.isFinite(depthMm)) return 0
  const depthCm = Math.round(depthMm / 10)
  const clamped = Math.min(40, Math.max(15, depthCm))
  const steps = Math.floor((clamped - 15) / 5)
  return steps * 0.08
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
 * @param {number} widthMm
 * @param {number} heightMm
 * @param {boolean} hasSill
 * @param {boolean} hasRoller
 * @param {SizeCategoryId} depthCategory
 * @param {SizeCategoryId | null | undefined} rollerCategory
 * @param {number | null | undefined} [windowsillDepthMm]
 */
export function quoteWindowHours(
  widthMm,
  heightMm,
  hasSill,
  hasRoller,
  depthCategory,
  rollerCategory,
  windowsillDepthMm,
) {
  let h = _dimensionBaseHours(widthMm, heightMm)
  h += _pick(_DEPTH_HOURS, depthCategory ?? 'small')
  if (hasSill) {
    const sillM = (widthMm + _WINDOWSILL_WIDTH_ADDON_MM) / 1000
    h += 0.25 + sillM * 0.2 + _windowsillDepthExtraHours(windowsillDepthMm)
  }
  if (hasRoller) {
    const rollCat = rollerCategory ?? 'small'
    h += _pick(_ROLLER_HOURS, rollCat) * 0.45 + (widthMm / 1000) * 0.12
  }
  return _roundHours(h)
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
 * widthCm = widthMm / 10, widthM = widthCm / 100, price = widthM × 53 × 1.5 (+ надбавка за глибину).
 * @param {number} widthMm ширина в мм (поле «Ширина», см × 10)
 * @param {number} windowsillDepthMm глибина в мм (15–40 см, крок 5 см)
 */
export function quoteWindowsillOnlyRoundedEuros(widthMm, windowsillDepthMm) {
  if (!Number.isFinite(widthMm) || widthMm <= 0) return 0
  const widthM = widthMm / 1000
  const perM = _BASE_PER_M * _WINDOWSILL_BASE_COEFF + _windowsillExtraPerMeter(windowsillDepthMm)
  return _roundUpToFiveEuros(widthM * perM)
}

/**
 * Орієнтовний час на один «короб ролети» (год).
 * @param {number} widthMm
 * @param {number} rollerBoxHeightMm
 */
export function quoteRollerBoxOnlyHours(widthMm, rollerBoxHeightMm) {
  const widthM = widthMm / 1000
  const cat = mmToSizeCategory(rollerBoxHeightMm)
  const h = 0.4 + widthM * 0.35 + _pick(_ROLLER_HOURS, cat) * 0.35
  return _roundHours(h)
}

/**
 * Орієнтовний час на один підвіконник (год).
 * @param {number} widthMm
 * @param {number | null | undefined} windowsillDepthMm
 */
export function quoteWindowsillOnlyHours(widthMm, windowsillDepthMm) {
  const widthM = widthMm / 1000
  const h = 0.35 + widthM * 0.3 + _windowsillDepthExtraHours(windowsillDepthMm)
  return _roundHours(h)
}
