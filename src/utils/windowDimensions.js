import { isSimplifiedProductLine } from '../constants/calculatorTypes.js'
import { normalizeStoredWindow } from '../constants/sizeCategories.js'

/** Мінімальна ширина / висота вікна, мм (включно). */
export const MIN_WINDOW_SIDE_MM = 300

/** Мінімум другої величини (висота короба / глибина підвіконника), мм. */
export const MIN_SECONDARY_DIM_MM = 100

/** Максимум для автоматичного прорахунку: ширина, мм (включно). */
export const STANDARD_MAX_WIDTH_MM = 6000

/** Максимум для автоматичного прорахунку: висота, мм (включно). */
export const STANDARD_MAX_HEIGHT_MM = 4000

/**
 * Розміри перевищують стандартний діапазон калькулятора (потрібен індивідуальний прорахунок).
 * @param {number} widthMm
 * @param {number} heightMm
 */
export function windowExceedsStandardMax(widthMm, heightMm) {
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm)) return false
  return widthMm > STANDARD_MAX_WIDTH_MM || heightMm > STANDARD_MAX_HEIGHT_MM
}

/**
 * Чи можна показувати автоматичну ціну за цими мм (мінімум виконано і не більше стандарту).
 * @param {number} widthMm
 * @param {number} heightMm
 */
export function windowEligibleForAutoQuote(widthMm, heightMm) {
  return windowSidesMeetMinimum(widthMm, heightMm) && !windowExceedsStandardMax(widthMm, heightMm)
}

/**
 * Чи задовольняють числові мм мінімуму (обидва боки ≥ MIN).
 * @param {number} widthMm
 * @param {number} heightMm
 */
export function windowSidesMeetMinimum(widthMm, heightMm) {
  return (
    Number.isFinite(widthMm) &&
    Number.isFinite(heightMm) &&
    widthMm >= MIN_WINDOW_SIDE_MM &&
    heightMm >= MIN_WINDOW_SIDE_MM
  )
}

/**
 * @param {string | undefined | null} typeId
 * @param {Record<string, unknown>} win
 */
export function lineWindowEligibleForAutoQuote(typeId, win) {
  const wm = Number(win.widthMm)
  if (typeId === 'roller_box' || typeId === 'windowsill') {
    return Number.isFinite(wm) && wm >= MIN_WINDOW_SIDE_MM && !windowExceedsStandardMax(wm, wm)
  }
  const hm = Number(win.heightMm)
  return windowEligibleForAutoQuote(wm, hm)
}

/**
 * @param {string | undefined | null} typeId
 * @param {Record<string, unknown>} win
 */
export function lineWindowOversized(typeId, win) {
  const wm = Number(win.widthMm)
  if (typeId === 'roller_box' || typeId === 'windowsill') {
    return Number.isFinite(wm) && wm >= MIN_WINDOW_SIDE_MM && windowExceedsStandardMax(wm, wm)
  }
  const hm = Number(win.heightMm)
  return windowSidesMeetMinimum(wm, hm) && windowExceedsStandardMax(wm, hm)
}

/**
 * @param {string | undefined} typeId
 * @param {Record<string, unknown>} w
 */
function simplifiedLineHasInvalidDims(typeId, w) {
  const wm = Number(w.widthMm)
  if (typeId === 'roller_box' || typeId === 'windowsill') {
    return !Number.isFinite(wm) || wm < MIN_WINDOW_SIDE_MM
  }
  return false
}

/**
 * Чи є в рядку замовлення вікно з некоректними або замалими розмірами.
 * @param {unknown} line
 */
export function lineHasInvalidWindowDimensions(line) {
  if (!line || typeof line !== 'object') return true
  const L = /** @type {Record<string, unknown>} */ (line)
  const typeId = typeof L.typeId === 'string' ? L.typeId : undefined

  if (Array.isArray(L.windows) && L.windows.length > 0) {
    for (const raw of L.windows) {
      const w = normalizeStoredWindow(raw, typeId)
      if (!w) return true
      if (isSimplifiedProductLine(typeId)) {
        if (simplifiedLineHasInvalidDims(typeId, w)) return true
      } else if (!windowSidesMeetMinimum(Number(w.widthMm), Number(w.heightMm))) {
        return true
      }
    }
    return false
  }

  const one = normalizeStoredWindow(
    {
      widthMm: L.widthMm,
      heightMm: L.heightMm,
      widthCm: L.widthCm,
      heightCm: L.heightCm,
      slopeDepthCm: L.slopeDepthCm,
      sillWidthCm: L.sillWidthCm,
      rollerBoxHeightCm: L.rollerBoxHeightCm,
      rollerBoxHeightMm: L.rollerBoxHeightMm,
      sillDepthCm: L.sillDepthCm,
      windowsillDepthMm: L.windowsillDepthMm,
      depthCategory: L.depthCategory,
      windowsillCategory: null,
      rollerCategory: L.rollerCategory,
      profileLengthM: L.profileLengthM,
      quantity: L.quantity,
    },
    typeId,
  )
  if (!one) return true
  if (isSimplifiedProductLine(typeId)) return simplifiedLineHasInvalidDims(typeId, one)
  return !windowSidesMeetMinimum(Number(one.widthMm), Number(one.heightMm))
}

/**
 * @param {unknown[]} lines
 * @returns {boolean} true якщо є хоч одне вікно нижче мінімуму або без валідних мм
 */
export function orderHasInvalidWindowDimensions(lines) {
  if (!Array.isArray(lines) || !lines.length) return false
  return lines.some(lineHasInvalidWindowDimensions)
}

/**
 * @param {unknown} line
 */
export function lineHasOversizedWindow(line) {
  if (!line || typeof line !== 'object') return false
  const L = /** @type {Record<string, unknown>} */ (line)
  const typeId = typeof L.typeId === 'string' ? L.typeId : undefined

  if (Array.isArray(L.windows) && L.windows.length > 0) {
    for (const raw of L.windows) {
      const w = normalizeStoredWindow(raw, typeId)
      if (w && lineWindowOversized(typeId, w)) return true
    }
    return false
  }

  const one = normalizeStoredWindow(
    {
      widthMm: L.widthMm,
      heightMm: L.heightMm,
      widthCm: L.widthCm,
      heightCm: L.heightCm,
      slopeDepthCm: L.slopeDepthCm,
      sillWidthCm: L.sillWidthCm,
      rollerBoxHeightCm: L.rollerBoxHeightCm,
      rollerBoxHeightMm: L.rollerBoxHeightMm,
      sillDepthCm: L.sillDepthCm,
      windowsillDepthMm: L.windowsillDepthMm,
      depthCategory: L.depthCategory,
      windowsillCategory: null,
      rollerCategory: L.rollerCategory,
      profileLengthM: L.profileLengthM,
      quantity: L.quantity,
    },
    typeId,
  )
  if (!one) return false
  return lineWindowOversized(typeId, one)
}

/**
 * @param {unknown[]} lines
 */
export function orderHasOversizedWindows(lines) {
  if (!Array.isArray(lines) || !lines.length) return false
  return lines.some(lineHasOversizedWindow)
}
