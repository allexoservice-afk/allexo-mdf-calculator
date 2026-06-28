import { roundEuroCents } from '../utils/priceDisplay.js'
import { normalizeMaterialId } from '../constants/materialTypes.js'

export const MIN_ORDER_EUR = 250

/** @type {readonly number[]} */
export const PRO_MANUAL_DISCOUNT_OPTIONS = [5, 10, 15, 20, 25]

/**
 * @param {number | null | undefined} manualPct
 * @param {boolean} proActive
 */
export function effectiveDiscountPercent(_payableWorkEur, manualPct, proActive) {
  if (proActive && manualPct != null && manualPct > 0) {
    return manualPct
  }
  return 0
}

/**
 * @param {number} payableWorkEur
 * @param {number | null | undefined} manualPct
 * @param {boolean} proActive
 */
export function discountEurosFor(payableWorkEur, manualPct, proActive) {
  const pct = effectiveDiscountPercent(payableWorkEur, manualPct, proActive)
  if (pct <= 0) return 0
  return roundEuroCents((payableWorkEur * pct) / 100)
}

/** @param {number} orderTotalEur */
export function payableWorkEurosFor(orderTotalEur) {
  const raw = Number(orderTotalEur)
  if (!Number.isFinite(raw) || raw <= 0) return 0
  return raw < MIN_ORDER_EUR ? MIN_ORDER_EUR : roundEuroCents(raw)
}

/**
 * Підсумок до оплати з урахуванням мінімуму лише для MDF.
 * @param {number} mdfSubtotalEur
 * @param {number} pvcSubtotalEur
 */
export function payableWorkEurosForMaterialSplit(mdfSubtotalEur, pvcSubtotalEur) {
  const mdf = Number(mdfSubtotalEur)
  const pvc = Number(pvcSubtotalEur)
  const mdfPayable = payableWorkEurosFor(Number.isFinite(mdf) && mdf > 0 ? mdf : 0)
  const pvcPayable = Number.isFinite(pvc) && pvc > 0 ? roundEuroCents(pvc) : 0
  return mdfPayable + pvcPayable
}

/**
 * @param {Array<{ materialId?: unknown }>} lines
 * @param {(line: Record<string, unknown>) => number} lineSubtotalFn
 */
export function payableWorkEurosForOrderLines(lines, lineSubtotalFn) {
  let mdf = 0
  let pvc = 0
  for (const line of lines) {
    const sub = lineSubtotalFn(/** @type {Record<string, unknown>} */ (line))
    if (normalizeMaterialId(line.materialId) === 'pvc') pvc += sub
    else mdf += sub
  }
  return payableWorkEurosForMaterialSplit(mdf, pvc)
}

/**
 * @param {Array<{ materialId?: unknown }>} lines
 * @param {(line: Record<string, unknown>) => number} lineSubtotalFn
 */
export function mdfSubtotalEurosForOrderLines(lines, lineSubtotalFn) {
  let mdf = 0
  for (const line of lines) {
    if (normalizeMaterialId(line.materialId) === 'pvc') continue
    mdf += lineSubtotalFn(/** @type {Record<string, unknown>} */ (line))
  }
  return mdf
}
