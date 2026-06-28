import { windowProfileLengthMeters } from '../utils/mdfFormulas.js'
import { normalizeSlopeDeepSurchargePct } from '../pricing/windowQuote.js'

/**
 * @typedef {'small' | 'medium' | 'large' | 'custom'} SizeCategoryId
 * @deprecated Лише для legacy-даних; нові рядки використовують slopeDeepOver25Cm.
 */

export const SIZE_CATEGORY_OPTIONS = [
  { id: /** @type {SizeCategoryId} */ ('small') },
  { id: /** @type {SizeCategoryId} */ ('medium') },
  { id: /** @type {SizeCategoryId} */ ('large') },
  { id: /** @type {SizeCategoryId} */ ('custom') },
]

/** Мінімальна / максимальна кількість однакових вікон у рядку форми. */
export const WINDOW_QUANTITY_MIN = 1
export const WINDOW_QUANTITY_MAX = 10

/** @type {readonly number[]} */
const _windowQuantities = []
for (let q = WINDOW_QUANTITY_MIN; q <= WINDOW_QUANTITY_MAX; q++) {
  _windowQuantities.push(q)
}
export const WINDOW_QUANTITIES = Object.freeze(_windowQuantities)

/** @param {unknown} raw */
export function normalizeWindowQuantity(raw) {
  const n = Number(raw)
  if (Number.isInteger(n) && n >= WINDOW_QUANTITY_MIN && n <= WINDOW_QUANTITY_MAX) return n
  return 1
}

/** @param {string} id */
export function isValidSizeCategory(id) {
  return SIZE_CATEGORY_OPTIONS.some((o) => o.id === id)
}

/** Категорія за розміром у міліметрах (legacy). */
/** @param {number} mm */
export function mmToSizeCategory(mm) {
  if (typeof mm !== 'number' || Number.isNaN(mm)) return /** @type {SizeCategoryId} */ ('small')
  if (mm <= 200) return 'small'
  if (mm <= 300) return 'medium'
  if (mm <= 400) return 'large'
  return 'custom'
}

/** @deprecated Висота короба більше не вводиться — залишено для legacy. */
export const ROLLER_BOX_HEIGHT_MM_OPTIONS = Object.freeze([300, 400, 500, 600])

/** @deprecated Глибина підвіконника більше не вводиться — залишено для legacy. */
export const WINDOWSILL_DEPTH_MM_OPTIONS = Object.freeze([150, 200, 250, 300, 350, 400])

/** @deprecated use ROLLER_BOX_HEIGHT_MM_OPTIONS */
export const ROLLER_BOX_HEIGHT_CM_OPTIONS = Object.freeze(ROLLER_BOX_HEIGHT_MM_OPTIONS.map((mm) => mm / 10))
/** @deprecated use WINDOWSILL_DEPTH_MM_OPTIONS */
export const WINDOWSILL_DEPTH_CM_OPTIONS = Object.freeze(WINDOWSILL_DEPTH_MM_OPTIONS.map((mm) => mm / 10))

/**
 * Legacy: depthCategory → глибина відкосу понад 25 см.
 * @param {unknown} o
 */
function legacySlopeDeepFromRecord(o) {
  if (typeof o.slopeDeepOver25Cm === 'boolean') return o.slopeDeepOver25Cm
  if (typeof o.depthCategory === 'string' && o.depthCategory !== 'small') return true
  if (typeof o.slopeDepthCm === 'number' && o.slopeDepthCm > 25) return true
  return false
}

/**
 * Нормалізує вікно з localStorage.
 * @param {unknown} raw
 * @param {string | null | undefined} [typeId]
 */
export function normalizeStoredWindow(raw, typeId) {
  if (!raw || typeof raw !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (raw)

  let widthMm = Number(o.widthMm)
  if (!Number.isFinite(widthMm) && typeof o.widthCm === 'number') {
    widthMm = o.widthCm * 10
  }
  if (!Number.isFinite(widthMm) && o.widthCm != null && o.widthCm !== '') {
    const cm = Number(String(o.widthCm).replace(',', '.'))
    if (Number.isFinite(cm) && cm > 0) widthMm = cm * 10
  }

  const slopeDeepOver25Cm = legacySlopeDeepFromRecord(o)
  const slopeDeepSurchargePct = normalizeSlopeDeepSurchargePct(o.slopeDeepSurchargePct)
  const quantity = normalizeWindowQuantity(o.quantity)

  if (typeId === 'roller_box') {
    if (!Number.isFinite(widthMm)) return null
    return {
      widthMm,
      heightMm: widthMm,
      slopeDeepOver25Cm: false,
      slopeDeepSurchargePct: 15,
      profileLengthM: widthMm / 1000,
      quantity,
    }
  }

  if (typeId === 'windowsill') {
    if (!Number.isFinite(widthMm)) return null
    return {
      widthMm,
      heightMm: widthMm,
      slopeDeepOver25Cm: false,
      slopeDeepSurchargePct: 15,
      profileLengthM: widthMm / 1000,
      quantity,
    }
  }

  let heightMm = Number(o.heightMm)
  if (!Number.isFinite(heightMm) && typeof o.heightCm === 'number') {
    heightMm = o.heightCm * 10
  }

  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm)) return null

  const profileLengthM =
    typeof o.profileLengthM === 'number' && Number.isFinite(o.profileLengthM)
      ? o.profileLengthM
      : windowProfileLengthMeters(widthMm, heightMm)

  return {
    widthMm,
    heightMm,
    slopeDeepOver25Cm,
    slopeDeepSurchargePct,
    profileLengthM,
    quantity,
  }
}
