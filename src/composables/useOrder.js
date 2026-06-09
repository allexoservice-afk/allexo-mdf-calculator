import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { normalizeStoredWindow } from '../constants/sizeCategories.js'
import { isProUnlocked } from '../constants/proUnlock.js'

/** @deprecated Legacy: was used for all users; public sessions no longer read/write this. */
const LEGACY_ORDER_KEY = 'allexo-mdf-order'
/** Pro-only persistence (never loaded in public / client mode). */
const PRO_ORDER_KEY = 'allexo-mdf-order-pro'

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
 * @property {number | null | undefined} windowsillDepthMm
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
        windowsillCategory: null,
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

function parseOrderLines(raw) {
  try {
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(migrateLine).filter(Boolean)
  } catch {
    return []
  }
}

function loadProOrderFromStorage() {
  try {
    let raw = localStorage.getItem(PRO_ORDER_KEY)
    if (!raw) {
      raw = localStorage.getItem(LEGACY_ORDER_KEY)
      if (raw) {
        localStorage.setItem(PRO_ORDER_KEY, raw)
        localStorage.removeItem(LEGACY_ORDER_KEY)
      }
    }
    return parseOrderLines(raw)
  } catch {
    return []
  }
}

function saveProOrderToStorage(items) {
  try {
    localStorage.setItem(PRO_ORDER_KEY, JSON.stringify(items))
  } catch {
    /* ignore quota / private mode */
  }
}

function stripLegacyPublicOrderKey() {
  try {
    localStorage.removeItem(LEGACY_ORDER_KEY)
  } catch {
    /* ignore */
  }
}

function applyOrderPersistenceMode(linesRef) {
  if (isProUnlocked()) {
    linesRef.value = loadProOrderFromStorage()
  } else {
    stripLegacyPublicOrderKey()
    linesRef.value = []
  }
}

export function useOrder() {
  const lines = ref(/** @type {OrderLine[]} */ ([]))

  applyOrderPersistenceMode(lines)

  watch(
    lines,
    (v) => {
      if (isProUnlocked()) saveProOrderToStorage(v)
    },
    { deep: true },
  )

  function onProChange() {
    applyOrderPersistenceMode(lines)
  }

  onMounted(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('allexo-pro-change', onProChange)
    }
  })

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('allexo-pro-change', onProChange)
    }
  })

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

  /**
   * @param {string} key
   * @param {Omit<OrderLine, 'key'>} payload
   */
  function updateLine(key, payload) {
    lines.value = lines.value.map((l) => (l.key === key ? { ...payload, key } : l))
  }

  function clearOrder() {
    lines.value = []
  }

  return { lines, addLine, updateLine, removeLine, clearOrder }
}
