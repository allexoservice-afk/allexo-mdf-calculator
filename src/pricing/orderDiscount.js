export const MIN_ORDER_EUR = 350

/** @type {readonly number[]} */
export const PRO_MANUAL_DISCOUNT_OPTIONS = [5, 10, 15, 20, 25]

/** @param {number} eur */
export function autoDiscountPercentFor(eur) {
  const v = Number(eur)
  if (!Number.isFinite(v) || v <= 0) return 0
  if (v >= 3000) return 10
  if (v >= 2000) return 7
  if (v >= 1500) return 5
  if (v >= 1000) return 3
  return 0
}

/**
 * @param {number} payableWorkEur
 * @param {number | null | undefined} manualPct
 * @param {boolean} proActive
 */
export function effectiveDiscountPercent(payableWorkEur, manualPct, proActive) {
  if (proActive && manualPct != null && manualPct > 0) {
    return manualPct
  }
  return autoDiscountPercentFor(payableWorkEur)
}

/**
 * @param {number} payableWorkEur
 * @param {number | null | undefined} manualPct
 * @param {boolean} proActive
 */
export function discountEurosFor(payableWorkEur, manualPct, proActive) {
  const pct = effectiveDiscountPercent(payableWorkEur, manualPct, proActive)
  return pct > 0 ? Math.round((payableWorkEur * pct) / 100) : 0
}

/** @param {number} orderTotalEur */
export function payableWorkEurosFor(orderTotalEur) {
  const raw = Number(orderTotalEur)
  if (!Number.isFinite(raw) || raw <= 0) return 0
  return raw < MIN_ORDER_EUR ? MIN_ORDER_EUR : raw
}
