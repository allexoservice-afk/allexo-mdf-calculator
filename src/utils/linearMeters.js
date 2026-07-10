import { getTypeById } from '../constants/calculatorTypes.js'
import { windowProfileLengthMeters } from './mdfFormulas.js'
import {
  MIN_WINDOW_SIDE_MM,
  windowSidesMeetMinimum,
} from './windowDimensions.js'

const WINDOWSILL_WIDTH_ADDON_MM = 300

/** @param {number} m */
export function formatLinearMeters(m) {
  if (!Number.isFinite(m)) return '—'
  const rounded = Math.round(m * 100) / 100
  return String(rounded)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')
}

/** @param {string | undefined | null} typeId @param {Record<string, unknown>} win */
export function windowSlopesLinearMeters(typeId, win) {
  if (typeId === 'roller_box' || typeId === 'windowsill') return null
  const wm = Number(win.widthMm)
  const hm = Number(win.heightMm)
  if (!windowSidesMeetMinimum(wm, hm)) return null
  const m = windowProfileLengthMeters(wm, hm)
  return m > 0 ? m : null
}

/** @param {string | undefined | null} typeId @param {Record<string, unknown>} win */
export function windowSillLinearMeters(typeId, win) {
  const wm = Number(win.widthMm)
  if (!Number.isFinite(wm) || wm <= 0) return null

  if (typeId === 'windowsill') {
    if (!Number.isFinite(wm) || wm < MIN_WINDOW_SIDE_MM) return null
    return wm / 1000
  }

  const ty = getTypeById(typeId)
  if (!ty?.hasSill) return null
  const hm = Number(win.heightMm)
  if (!windowSidesMeetMinimum(wm, hm)) return null
  return (wm + WINDOWSILL_WIDTH_ADDON_MM) / 1000
}

/** @param {string | undefined | null} typeId @param {Record<string, unknown>} win @param {number} qty */
export function windowSlopesLinearMetersTotal(typeId, win, qty) {
  const unit = windowSlopesLinearMeters(typeId, win)
  if (unit == null) return null
  return unit * qty
}

/** @param {string | undefined | null} typeId @param {Record<string, unknown>} win @param {number} qty */
export function windowSillLinearMetersTotal(typeId, win, qty) {
  const unit = windowSillLinearMeters(typeId, win)
  if (unit == null) return null
  return unit * qty
}

/**
 * @param {unknown[]} lines
 * @param {(line: Record<string, unknown>) => Record<string, unknown>[]} windowsForLine
 * @param {(win: Record<string, unknown>) => number} windowQtyFn
 */
export function orderLinearMetersTotals(lines, windowsForLine, windowQtyFn) {
  let slopesM = 0
  let sillM = 0
  let hasSlopes = false
  let hasSill = false

  if (!Array.isArray(lines)) {
    return { slopesM: 0, sillM: 0, hasSlopes: false, hasSill: false }
  }

  for (const line of lines) {
    const L = /** @type {Record<string, unknown>} */ (line)
    const tid = typeof L.typeId === 'string' ? L.typeId : ''
    for (const win of windowsForLine(L)) {
      const qty = windowQtyFn(win)
      const slopes = windowSlopesLinearMetersTotal(tid, win, qty)
      if (slopes != null) {
        slopesM += slopes
        hasSlopes = true
      }
      const sill = windowSillLinearMetersTotal(tid, win, qty)
      if (sill != null) {
        sillM += sill
        hasSill = true
      }
    }
  }

  return {
    slopesM: Math.round(slopesM * 100) / 100,
    sillM: Math.round(sillM * 100) / 100,
    hasSlopes,
    hasSill,
  }
}

/** @param {string | undefined | null} typeId @param {Record<string, unknown>} win */
export function windowHasLinearMeters(typeId, win) {
  return windowSlopesLinearMeters(typeId, win) != null || windowSillLinearMeters(typeId, win) != null
}
