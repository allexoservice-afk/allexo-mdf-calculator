/**
 * Єдина точка розрахунку ціни вікна / рядка замовлення.
 * @module pricing/quoteLineWindow
 */
import { getTypeById } from '../constants/calculatorTypes.js'
import { normalizeMaterialId } from '../constants/materialTypes.js'
import { lineWindowEligibleForAutoQuote, windowEligibleForAutoQuote } from '../utils/windowDimensions.js'
import {
  quoteRollerBoxOnlyRoundedEuros,
  quoteWindowRoundedEuros,
  quoteWindowsillAddonRoundedEuros,
  quoteWindowsillOnlyRoundedEuros,
  winSlopeQuoteArgs,
} from './windowQuote.js'

/**
 * @param {Record<string, unknown>} line
 * @param {Record<string, unknown>} win
 */
export function quoteLineWindowEuros(line, win) {
  if (!win) return 0
  const materialId = normalizeMaterialId(line.materialId)
  const tid = line.typeId
  if (tid === 'roller_box') {
    const wm = Number(win.widthMm)
    if (!lineWindowEligibleForAutoQuote('roller_box', win)) return 0
    return quoteRollerBoxOnlyRoundedEuros(wm, materialId)
  }
  if (tid === 'windowsill') {
    const wm = Number(win.widthMm)
    if (!lineWindowEligibleForAutoQuote('windowsill', win)) return 0
    return quoteWindowsillOnlyRoundedEuros(wm, materialId)
  }
  const ty = getTypeById(tid)
  if (!ty) return 0
  const wm = Number(win.widthMm)
  const hm = Number(win.heightMm)
  if (!windowEligibleForAutoQuote(wm, hm)) return 0
  const slope = winSlopeQuoteArgs(win)
  return quoteWindowRoundedEuros(
    wm,
    hm,
    ty.hasSill,
    ty.hasRoller,
    slope.deep,
    slope.pct,
    materialId,
  )
}

/**
 * @param {Record<string, unknown>} line
 * @param {Record<string, unknown>} win
 */
export function quoteLineWindowsillAddonEuros(line, win) {
  const ty = getTypeById(line.typeId)
  if (!ty?.hasSill) return 0
  const wm = Number(win.widthMm)
  if (!Number.isFinite(wm) || wm <= 0) return 0
  return quoteWindowsillAddonRoundedEuros(wm, normalizeMaterialId(line.materialId))
}
