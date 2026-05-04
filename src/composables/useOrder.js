import { ref, watch } from 'vue'
import { normalizeStoredWindow } from '../constants/sizeCategories.js'

const STORAGE_KEY = 'allexo-mdf-order'

/**
 * @typedef {import('../constants/calculatorTypes.js').CalculatorTypeId} CalculatorTypeId
 */

/**
 * @typedef {import('../constants/sizeCategories.js').SizeCategoryId} SizeCategoryId
 */

/**
 * @typedef {Object} OrderWindow
 * @property {number} widthMm
 * @property {number} heightMm
 * @property {SizeCategoryId} depthCategory
 * @property {SizeCategoryId | null} windowsillCategory
 * @property {SizeCategoryId | null} rollerCategory
 * @property {number} profileLengthM
 * @property {number} quantity
 */

/**
 * @typedef {Object} OrderLine
 * @property {string} key
 * @property {CalculatorTypeId} typeId
 * @property {OrderWindow[]} windows
 */

/** @param {unknown} line */
function migrateLine(line) {
  if (!line || typeof line !== 'object') return null
  const l = /** @type {Record<string, unknown>} */ (line)
  const key = typeof l.key === 'string' && l.key ? l.key : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  if (!l.typeId || typeof l.typeId !== 'string') return null

  if (Array.isArray(l.windows) && l.windows.length > 0) {
    const windows = l.windows.map((w) => normalizeStoredWindow(w, l.typeId)).filter(Boolean)
    if (!windows.length) return null
    return {
      key,
      typeId: /** @type {CalculatorTypeId} */ (l.typeId),
      windows: /** @type {OrderWindow[]} */ (windows),
    }
  }
  const hasLegacyCm =
    typeof l.widthCm === 'number' &&
    typeof l.heightCm === 'number' &&
    !Array.isArray(l.windows)
  const hasFlatMm =
    typeof l.widthMm === 'number' &&
    typeof l.heightMm === 'number' &&
    !Array.isArray(l.windows)

  if (hasLegacyCm || hasFlatMm) {
    const one = normalizeStoredWindow(
      {
        widthMm: l.widthMm,
        heightMm: l.heightMm,
        widthCm: l.widthCm,
        heightCm: l.heightCm,
        slopeDepthCm: l.slopeDepthCm,
        sillWidthCm: l.sillWidthCm,
        rollerBoxHeightCm: l.rollerBoxHeightCm,
        rollerBoxHeightMm: l.rollerBoxHeightMm,
        sillDepthCm: l.sillDepthCm,
        windowsillDepthMm: l.windowsillDepthMm,
        depthCategory: l.depthCategory,
        windowsillCategory: l.windowsillCategory,
        rollerCategory: l.rollerCategory,
        profileLengthM: l.profileLengthM,
      },
      l.typeId,
    )
    if (!one) return null
    return {
      key,
      typeId: /** @type {CalculatorTypeId} */ (l.typeId),
      windows: [one],
    }
  }
  return null
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(migrateLine).filter(Boolean)
  } catch {
    return []
  }
}

function saveToStorage(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore quota / private mode */
  }
}

export function useOrder() {
  const lines = ref(/** @type {OrderLine[]} */ (loadFromStorage()))

  watch(
    lines,
    (v) => {
      saveToStorage(v)
    },
    { deep: true },
  )

  /**
   * @param {Omit<OrderLine, 'key'>} payload
   */
  function addLine(payload) {
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    lines.value = [...lines.value, { ...payload, key }]
  }

  /** @param {string} key */
  function removeLine(key) {
    lines.value = lines.value.filter((l) => l.key !== key)
  }

  function clearOrder() {
    lines.value = []
  }

  return { lines, addLine, removeLine, clearOrder }
}
