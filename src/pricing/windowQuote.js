/**
 * Внутрішній розрахунок ціни та часу (не експортувати коефіцієнти та константи в UI).
 * @module pricing/windowQuote
 */

import { mmToSizeCategory } from '../constants/sizeCategories.js'

/**
 * @typedef {import('../constants/sizeCategories.js').SizeCategoryId} SizeCategoryId
 */

/** Базова ставка за погонний метр профілю (€/м), без ПДВ; коефіцієнти нижче множаться на цю базу. */
const _BASE_PER_M = 51

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

const _WINDOWSILL_COEFF = /** @type {Record<SizeCategoryId, number>} */ ({
  small: 1.15,
  medium: 1.25,
  large: 1.35,
  custom: 1.5,
})

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

/**
 * Ціна за вікно в €, округлена вгору до кратних 5€.
 */
export function quoteWindowRoundedEuros(
  widthMm,
  heightMm,
  depthCategory,
  hasSill,
  hasRoller,
  windowsillCategory,
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
    const ws = windowsillCategory ?? 'small'
    price *= _pick(_WINDOWSILL_COEFF, ws)
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
 * Коефіцієнт підвіконника для типу «лише підвіконник» за фіксованою глибиною (15–40 см).
 * @param {number} windowsillDepthMm
 */
function _windowsillStandaloneCoeff(windowsillDepthMm) {
  const d = Math.round(Number(windowsillDepthMm))
  switch (d) {
    case 150:
    case 200:
      return 1.15
    case 250:
    case 300:
      return 1.25
    case 350:
    case 400:
      return 1.35
    default:
      return _pick(_WINDOWSILL_COEFF, mmToSizeCategory(windowsillDepthMm))
  }
}

/** Мінімальна ціна за один підвіконник (лише тип «Підвіконник»), € без ПДВ. */
const _WINDOWSILL_STANDALONE_MIN_EUR = 80

/**
 * Ціна лише підвіконника, € (без ПДВ), за шириною в см і коефіцієнтом глибини.
 * widthCm = widthMm / 10, widthM = widthCm / 100, basePrice = widthM × 51, calculated = basePrice × коеф. глибини;
 * не менше `_WINDOWSILL_STANDALONE_MIN_EUR` €, далі округлення вгору до 5€.
 * @param {number} widthMm ширина в мм (поле «Ширина», см × 10)
 * @param {number} windowsillDepthMm глибина в мм (лише коефіцієнт 15–40 см)
 */
export function quoteWindowsillOnlyRoundedEuros(widthMm, windowsillDepthMm) {
  if (!Number.isFinite(widthMm) || widthMm <= 0) return 0
  const widthCm = widthMm / 10
  const widthM = widthCm / 100
  const basePrice = widthM * _BASE_PER_M
  const windowsillCoefficient = _windowsillStandaloneCoeff(windowsillDepthMm)
  const calculatedPrice = basePrice * windowsillCoefficient
  const floored = Math.max(calculatedPrice, _WINDOWSILL_STANDALONE_MIN_EUR)
  return _roundUpToFiveEuros(floored)
}

/** Орієнтовний час на один «короб ролети» (год). */
export function quoteRollerBoxOnlyHours() {
  return 1.5
}

/** Орієнтовний час на один підвіконник (год). */
export function quoteWindowsillOnlyHours() {
  return 1
}
