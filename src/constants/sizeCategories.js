import { windowProfileLengthMeters } from '../utils/mdfFormulas.js'

/**
 * @typedef {'small' | 'medium' | 'large' | 'custom'} SizeCategoryId
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

/** Категорія за розміром у міліметрах. */
/** @param {number} mm */
export function mmToSizeCategory(mm) {
  if (typeof mm !== 'number' || Number.isNaN(mm)) return /** @type {SizeCategoryId} */ ('small')
  if (mm <= 200) return 'small'
  if (mm <= 300) return 'medium'
  if (mm <= 400) return 'large'
  return 'custom'
}

/** Варіанти висоти короба ролети (мм). */
export const ROLLER_BOX_HEIGHT_MM_OPTIONS = Object.freeze([300, 400, 500, 600])

/** Варіанти глибини підвіконника (мм). */
export const WINDOWSILL_DEPTH_MM_OPTIONS = Object.freeze([150, 200, 250, 300, 350, 400])

// Legacy exports kept (backward compatibility for stored data).
/** @deprecated use ROLLER_BOX_HEIGHT_MM_OPTIONS */
export const ROLLER_BOX_HEIGHT_CM_OPTIONS = Object.freeze(ROLLER_BOX_HEIGHT_MM_OPTIONS.map((mm) => mm / 10))
/** @deprecated use WINDOWSILL_DEPTH_MM_OPTIONS */
export const WINDOWSILL_DEPTH_CM_OPTIONS = Object.freeze(WINDOWSILL_DEPTH_MM_OPTIONS.map((mm) => mm / 10))

/** @param {number} mm */
export function isAllowedRollerBoxHeightMm(mm) {
  return typeof mm === 'number' && !Number.isNaN(mm) && ROLLER_BOX_HEIGHT_MM_OPTIONS.includes(mm)
}

/** @param {number} mm */
export function isAllowedWindowsillDepthMm(mm) {
  return typeof mm === 'number' && !Number.isNaN(mm) && WINDOWSILL_DEPTH_MM_OPTIONS.includes(mm)
}

/**
 * Нормалізує вікно з localStorage (мм, категорії або legacy см).
 * @param {unknown} raw
 * @param {string | null | undefined} [typeId] тип рядка замовлення (для «короб ролети» / «підвіконник»)
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

  if (typeId === 'roller_box') {
    let rollerBoxHeightMm = Number(o.rollerBoxHeightMm)
    if (!Number.isFinite(rollerBoxHeightMm) && typeof o.rollerBoxHeightCm === 'number') {
      rollerBoxHeightMm = o.rollerBoxHeightCm * 10
    }
    if (!Number.isFinite(rollerBoxHeightMm) && typeof o.heightCm === 'number') {
      rollerBoxHeightMm = o.heightCm * 10
    }
    if (!Number.isFinite(rollerBoxHeightMm) && typeof o.heightMm === 'number') {
      rollerBoxHeightMm = o.heightMm
    }
    if (!Number.isFinite(widthMm) || !Number.isFinite(rollerBoxHeightMm)) return null
    if (!isAllowedRollerBoxHeightMm(rollerBoxHeightMm)) return null
    const quantity = normalizeWindowQuantity(o.quantity)
    return {
      widthMm,
      heightMm: rollerBoxHeightMm,
      rollerBoxHeightMm,
      depthCategory: /** @type {SizeCategoryId} */ ('small'),
      windowsillCategory: null,
      rollerCategory: null,
      profileLengthM: windowProfileLengthMeters(widthMm, rollerBoxHeightMm),
      quantity,
    }
  }

  if (typeId === 'windowsill') {
    let windowsillDepthMm = Number(o.windowsillDepthMm)
    if (!Number.isFinite(windowsillDepthMm) && typeof o.sillDepthCm === 'number') {
      windowsillDepthMm = o.sillDepthCm * 10
    }
    if (!Number.isFinite(windowsillDepthMm) && typeof o.windowsillDepthCm === 'number') {
      windowsillDepthMm = o.windowsillDepthCm * 10
    }
    if (!Number.isFinite(windowsillDepthMm) && typeof o.heightCm === 'number') {
      windowsillDepthMm = o.heightCm * 10
    }
    if (!Number.isFinite(windowsillDepthMm) && typeof o.heightMm === 'number') {
      windowsillDepthMm = o.heightMm
    }
    if (!Number.isFinite(widthMm) || !Number.isFinite(windowsillDepthMm)) return null
    if (!isAllowedWindowsillDepthMm(windowsillDepthMm)) return null
    const quantity = normalizeWindowQuantity(o.quantity)
    return {
      widthMm,
      heightMm: windowsillDepthMm,
      windowsillDepthMm,
      depthCategory: /** @type {SizeCategoryId} */ ('small'),
      windowsillCategory: null,
      rollerCategory: null,
      profileLengthM: windowProfileLengthMeters(widthMm, windowsillDepthMm),
      quantity,
    }
  }

  let heightMm = Number(o.heightMm)
  if (!Number.isFinite(heightMm) && typeof o.heightCm === 'number') {
    heightMm = o.heightCm * 10
  }

  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm)) return null

  let depthCategory = /** @type {SizeCategoryId} */ ('small')
  if (typeof o.depthCategory === 'string' && isValidSizeCategory(o.depthCategory)) {
    depthCategory = /** @type {SizeCategoryId} */ (o.depthCategory)
  } else if (typeof o.slopeDepthCm === 'number') {
    depthCategory = mmToSizeCategory(o.slopeDepthCm * 10)
  }

  /** @type {number | null} */
  let windowsillDepthMm = null
  if (typeof o.windowsillDepthMm === 'number' && Number.isFinite(o.windowsillDepthMm)) {
    windowsillDepthMm = o.windowsillDepthMm
  } else if (typeof o.sillDepthCm === 'number' && Number.isFinite(o.sillDepthCm)) {
    windowsillDepthMm = o.sillDepthCm * 10
  } else if (typeof o.windowsillDepthCm === 'number' && Number.isFinite(o.windowsillDepthCm)) {
    windowsillDepthMm = o.windowsillDepthCm * 10
  }

  /** @type {SizeCategoryId | null} */
  let rollerCategory = null
  if (typeof o.rollerCategory === 'string' && isValidSizeCategory(o.rollerCategory)) {
    rollerCategory = /** @type {SizeCategoryId} */ (o.rollerCategory)
  } else if (typeof o.rollerBoxHeightCm === 'number') {
    rollerCategory = mmToSizeCategory(o.rollerBoxHeightCm * 10)
  }

  const profileLengthM =
    typeof o.profileLengthM === 'number' && Number.isFinite(o.profileLengthM)
      ? o.profileLengthM
      : windowProfileLengthMeters(widthMm, heightMm)

  const quantity = normalizeWindowQuantity(o.quantity)

  return {
    widthMm,
    heightMm,
    depthCategory,
    windowsillDepthMm,
    rollerCategory,
    profileLengthM,
    quantity,
  }
}
