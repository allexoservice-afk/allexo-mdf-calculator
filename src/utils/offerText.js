import { getTypeById } from '../constants/calculatorTypes.js'
import { normalizeMaterialId } from '../constants/materialTypes.js'
import { normalizeStoredWindow, normalizeWindowQuantity } from '../constants/sizeCategories.js'
import { MIN_ORDER_EUR, mdfSubtotalEurosForOrderLines, payableWorkEurosForOrderLines } from '../pricing/orderDiscount.js'
import { quoteLineWindowEuros, quoteLineWindowsillAddonEuros } from '../pricing/quoteLineWindow.js'
import {
  quoteRollerBoxOnlyHours,
  quoteWindowHours,
  quoteWindowsillOnlyHours,
  orderBufferedWorkHours,
  winSlopeQuoteArgs,
  normalizeSlopeDeepSurchargePct,
} from '../pricing/windowQuote.js'
import { formatEuroExclVat } from './priceDisplay.js'
import { lineWindowEligibleForAutoQuote, orderHasOversizedWindows, windowEligibleForAutoQuote } from './windowDimensions.js'
import { formatLinearMeters, orderLinearMetersTotals, windowSillLinearMetersTotal, windowSlopesLinearMetersTotal } from './linearMeters.js'
import { formatCutPiecesSummary, formatMmAsMeters, orderMaterialStock } from './materialStock.js'
import { formatWorkDaysApproxLabel } from './workTimeDisplay.js'
import { isProUnlocked } from '../constants/proUnlock.js'
import {
  translate,
  typeTitle,
  windowsCountPhrase,
} from '../i18n/translations.js'

/** @param {Record<string, unknown>} line */
function windowsForLine(line) {
  const tid = typeof line.typeId === 'string' ? line.typeId : undefined
  if (Array.isArray(line.windows) && line.windows.length > 0) {
    return line.windows.map((w) => normalizeStoredWindow(w, tid)).filter(Boolean)
  }
  if (typeof line.widthCm === 'number' || typeof line.widthMm === 'number') {
    const one = normalizeStoredWindow(
      {
        widthMm: line.widthMm,
        heightMm: line.heightMm,
        widthCm: line.widthCm,
        heightCm: line.heightCm,
        slopeDepthCm: line.slopeDepthCm,
        sillWidthCm: line.sillWidthCm,
        rollerBoxHeightCm: line.rollerBoxHeightCm,
        rollerBoxHeightMm: line.rollerBoxHeightMm,
        sillDepthCm: line.sillDepthCm,
        windowsillDepthMm: line.windowsillDepthMm,
        depthCategory: line.depthCategory,
        windowsillCategory: null,
        rollerCategory: line.rollerCategory,
        profileLengthM: line.profileLengthM,
        quantity: line.quantity,
      },
      tid,
    )
    return one ? [one] : []
  }
  return []
}

/** @param {Record<string, unknown>} line @param {Record<string, unknown>} win */
function windowPriceEuros(line, win) {
  return quoteLineWindowEuros(line, win)
}

/** @param {Record<string, unknown>} line */
function lineSubtotalEuros(line) {
  return windowsForLine(line).reduce(
    (s, w) => s + windowPriceEuros(line, w) * normalizeWindowQuantity(w.quantity),
    0,
  )
}

/** @param {number} h */
function formatHoursForOffer(h) {
  const r = Math.round(h * 10) / 10
  if (Number.isInteger(r)) return String(r)
  return String(r)
}

/**
 * Метадані виїзду для тексту пропозиції (копіювання / e-mail).
 * @typedef {{ distanceKm: number, workTotalEur: number, travelEur: number, over100: boolean }} OfferTravelMeta
 */

/**
 * Текст пропозиції для копіювання / e-mail.
 * @param {unknown[]} lines
 * @param {import('../i18n/translations.js').Locale} locale
 * @param {OfferTravelMeta | null} [travelMeta]
 * @param {{ forceClientProposalPricing?: boolean }} [options] Якщо true — показувати суми в рядках і підсумки (лист клієнту після заявки), незалежно від Pro.
 */
export function buildAllexoOfferText(lines, locale, travelMeta, options) {
  if (!Array.isArray(lines) || !lines.length) return ''

  const proPricing = options?.forceClientProposalPricing === true || isProUnlocked()
  const parts = []
  parts.push(translate(locale, 'offer.header'))
  parts.push('')
  parts.push(translate(locale, 'offer.workTypes'))

  for (const line of lines) {
    const L = /** @type {Record<string, unknown>} */ (line)
    const t = getTypeById(L.typeId)
    const title = t ? typeTitle(locale, String(L.typeId), L.materialId) : String(L.typeId)
    const n = windowsForLine(L).reduce((acc, w) => acc + normalizeWindowQuantity(w.quantity), 0)
    parts.push(`- ${title} – ${windowsCountPhrase(locale, n)}`)
  }

  parts.push('')
  parts.push(translate(locale, 'offer.details'))

  for (const line of lines) {
    const L = /** @type {Record<string, unknown>} */ (line)
    const t = getTypeById(L.typeId)
    if (!t) continue
    const wins = windowsForLine(L)
    const itemTitle = typeTitle(locale, String(L.typeId), L.materialId)
    for (const win of wins) {
      const wMm = Math.round(Number(win.widthMm))
      const qty = normalizeWindowQuantity(win.quantity)
      if (L.typeId === 'roller_box' || L.typeId === 'windowsill') {
        let winHead = `- ${itemTitle}: ${wMm} ${translate(locale, 'common.mm')}`
        if (qty > 1) winHead += ` × ${qty} ${translate(locale, 'offer.pcs')}`
        parts.push(winHead)
        if (proPricing && L.typeId === 'windowsill') {
          const sillM = windowSillLinearMetersTotal('windowsill', win, qty)
          if (sillM != null) {
            parts.push(
              `- ${translate(locale, 'summary.dtSillLinearM')}: ${formatLinearMeters(sillM)} ${translate(locale, 'common.linearMeter')}`,
            )
          }
        }
      } else {
        const hMm = Math.round(Number(win.heightMm))
        let winHead = `- ${translate(locale, 'offer.windowLine')} ${wMm} × ${hMm} ${translate(locale, 'common.mm')}`
        if (qty > 1) winHead += ` × ${qty} ${translate(locale, 'offer.pcs')}`
        parts.push(winHead)
        if (win.slopeDeepOver25Cm && normalizeMaterialId(L.materialId) !== 'pvc') {
          const pct = normalizeSlopeDeepSurchargePct(win.slopeDeepSurchargePct)
          parts.push(
            `- ${translate(locale, 'offer.slopeDeepLine').replace('{pct}', String(pct))}`,
          )
        }
        parts.push(`- ${translate(locale, 'offer.sill')} ${t.hasSill ? translate(locale, 'offer.yes') : translate(locale, 'offer.no')}`)
        if (t.hasSill) {
          const wSillMm = wMm + 300
          parts.push(`- ${translate(locale, 'offer.sillWidthLine').replace('{n}', String(wSillMm))}`)
          if (proPricing) {
            parts.push(
              `- ${translate(locale, 'offer.sillPriceLine')} ${formatEuroExclVat(
                quoteLineWindowsillAddonEuros(L, win),
                locale,
              )}`,
            )
          }
        }
        if (proPricing) {
          const slopesM = windowSlopesLinearMetersTotal(String(L.typeId), win, qty)
          if (slopesM != null) {
            parts.push(
              `- ${translate(locale, 'summary.dtSlopesLinearM')}: ${formatLinearMeters(slopesM)} ${translate(locale, 'common.linearMeter')}`,
            )
          }
          const sillM = windowSillLinearMetersTotal(String(L.typeId), win, qty)
          if (sillM != null) {
            parts.push(
              `- ${translate(locale, 'summary.dtSillLinearM')}: ${formatLinearMeters(sillM)} ${translate(locale, 'common.linearMeter')}`,
            )
          }
        }
        parts.push(
          `- ${translate(locale, 'offer.roller')} ${t.hasRoller && normalizeMaterialId(L.materialId) !== 'pvc' ? translate(locale, 'offer.yes') : translate(locale, 'offer.no')}`,
        )
      }
      const unitEur = windowPriceEuros(L, win)
      const canPrice =
        L.typeId === 'roller_box'
          ? lineWindowEligibleForAutoQuote('roller_box', win)
          : L.typeId === 'windowsill'
            ? lineWindowEligibleForAutoQuote('windowsill', win)
            : windowEligibleForAutoQuote(Number(win.widthMm), Number(win.heightMm))
      if (canPrice && unitEur > 0) {
        if (proPricing) {
          parts.push(`- ${translate(locale, 'offer.pricePerUnit')} ${formatEuroExclVat(unitEur, locale)}`)
          parts.push(`- ${translate(locale, 'offer.quantity')} ${qty}`)
          parts.push(
            `- ${translate(locale, 'offer.lineTotal')} ${formatEuroExclVat(unitEur * qty, locale)}`,
          )
        } else {
          parts.push(`- ${translate(locale, 'offer.priceOnRequestShort')}`)
        }
      } else {
        parts.push(`- ${translate(locale, 'offer.price')} ${translate(locale, 'offer.individualPriceShort')}`)
      }
      parts.push('')
    }
  }

  const totalWin = lines.reduce(
    (s, line) =>
      s +
      windowsForLine(/** @type {Record<string, unknown>} */ (line)).reduce(
        (acc, w) => acc + normalizeWindowQuantity(w.quantity),
        0,
      ),
    0,
  )
  const totalEur = lines.reduce(
    (s, line) =>
      s +
      windowsForLine(/** @type {Record<string, unknown>} */ (line)).reduce(
        (ss, w) =>
          ss +
          windowPriceEuros(/** @type {Record<string, unknown>} */ (line), w) * normalizeWindowQuantity(w.quantity),
        0,
      ),
    0,
  )
  const totalH = lines.reduce(
    (acc, line) => {
      const L = /** @type {Record<string, unknown>} */ (line)
      const tid = L.typeId
      if (tid === 'roller_box') {
        windowsForLine(L).forEach((w) => {
          if (!lineWindowEligibleForAutoQuote('roller_box', w)) return
          const qty = normalizeWindowQuantity(w.quantity)
          acc.hours += quoteRollerBoxOnlyHours(Number(w.widthMm)) * qty
          acc.units += qty
        })
        return acc
      }
      if (tid === 'windowsill') {
        windowsForLine(L).forEach((w) => {
          if (!lineWindowEligibleForAutoQuote('windowsill', w)) return
          const qty = normalizeWindowQuantity(w.quantity)
          acc.hours += quoteWindowsillOnlyHours(Number(w.widthMm)) * qty
          acc.units += qty
        })
        return acc
      }
      const t = getTypeById(tid)
      if (!t) return acc
      windowsForLine(L).forEach((w) => {
        if (!windowEligibleForAutoQuote(Number(w.widthMm), Number(w.heightMm))) return
        const slope = winSlopeQuoteArgs(w)
        const qty = normalizeWindowQuantity(w.quantity)
        acc.hours +=
          quoteWindowHours(
            Number(w.widthMm),
            Number(w.heightMm),
            t.hasSill,
            t.hasRoller,
            slope.deep,
          ) * qty
        acc.units += qty
      })
      return acc
    },
    { hours: 0, units: 0 },
  )

  parts.push(`${translate(locale, 'offer.totalWindows')} ${totalWin}`)

  if (proPricing) {
    const linearTotals = orderLinearMetersTotals(lines, windowsForLine, (w) =>
      normalizeWindowQuantity(w.quantity),
    )
    if (linearTotals.hasSlopes) {
      parts.push(
        `${translate(locale, 'summary.totalSlopesLinearM')}: ${formatLinearMeters(linearTotals.slopesM)} ${translate(locale, 'common.linearMeter')}`,
      )
    }
    if (linearTotals.hasSill) {
      parts.push(
        `${translate(locale, 'summary.totalSillLinearM')}: ${formatLinearMeters(linearTotals.sillM)} ${translate(locale, 'common.linearMeter')}`,
      )
    }
    const material = orderMaterialStock(lines, windowsForLine, (w) =>
      normalizeWindowQuantity(w.quantity),
    )
    const pieceLabel = (count, meters) =>
      translate(locale, 'materials.pieceLine').replace('{n}', String(count)).replace('{m}', meters)
    if (material.hasSlopes) {
      parts.push(
        `${translate(locale, 'summary.dtStockSlopes')}: ${translate(locale, 'summary.stockBarsLine').replace('{n}', String(material.slopes.bars))}`,
      )
      const cuts = formatCutPiecesSummary(material.slopes.pieces, pieceLabel)
      if (cuts) parts.push(`  ${translate(locale, 'materials.cutListTitle')}: ${cuts}`)
      if (material.slopes.wasteMm > 0) {
        parts.push(
          `  ${translate(locale, 'materials.wasteLine').replace('{n}', formatMmAsMeters(material.slopes.wasteMm))}`,
        )
      }
    }
    if (material.hasSill) {
      parts.push(
        `${translate(locale, 'summary.dtStockSill')}: ${translate(locale, 'summary.stockBarsLine').replace('{n}', String(material.sill.bars))}`,
      )
      const cuts = formatCutPiecesSummary(material.sill.pieces, pieceLabel)
      if (cuts) parts.push(`  ${translate(locale, 'materials.cutListTitle')}: ${cuts}`)
      if (material.sill.wasteMm > 0) {
        parts.push(
          `  ${translate(locale, 'materials.wasteLine').replace('{n}', formatMmAsMeters(material.sill.wasteMm))}`,
        )
      }
    }
    if (material.hasTrim) {
      parts.push(
        `${translate(locale, 'summary.dtStockTrim')}: ${translate(locale, 'summary.stockBarsLine').replace('{n}', String(material.trim.bars))}`,
      )
      const cuts = formatCutPiecesSummary(material.trim.pieces, pieceLabel)
      if (cuts) parts.push(`  ${translate(locale, 'materials.cutListTitle')}: ${cuts}`)
      if (material.trim.wasteMm > 0) {
        parts.push(
          `  ${translate(locale, 'materials.wasteLine').replace('{n}', formatMmAsMeters(material.trim.wasteMm))}`,
        )
      }
    }
    parts.push('')
    parts.push(`${translate(locale, 'summary.workSubtotal')} ${formatEuroExclVat(totalEur, locale)}`)

    // Minimum order + discount (work subtotal only, excl. VAT)
    const mdfSubtotal = mdfSubtotalEurosForOrderLines(lines, lineSubtotalEuros)
    if (mdfSubtotal > 0 && mdfSubtotal < MIN_ORDER_EUR) {
      parts.push(
        `${translate(locale, 'form.minOrderHint').replace('{amount}', formatEuroExclVat(MIN_ORDER_EUR, locale))}`,
      )
    }
    const payableWork = payableWorkEurosForOrderLines(lines, lineSubtotalEuros)
    if (payableWork > 0 && payableWork !== totalEur) {
      parts.push(`${translate(locale, 'summary.payableTotal')} ${formatEuroExclVat(payableWork, locale)}`)
    }

    if (travelMeta != null) {
      parts.push(
        `${translate(locale, 'offer.distanceFromBrugge')} ${travelMeta.distanceKm} ${translate(locale, 'offer.km')}`,
      )
      if (travelMeta.over100) {
        parts.push(
          `${translate(locale, 'summary.travelTransportTotal')} ${translate(locale, 'summary.travelDiscussedShort')}`,
        )
      } else if (travelMeta.travelEur === 0) {
        parts.push(
          `${translate(locale, 'summary.travelTransportTotal')} ${translate(locale, 'summary.travelFree')}`,
        )
      } else {
        parts.push(
          `${translate(locale, 'summary.travelTransportTotal')} ${formatEuroExclVat(travelMeta.travelEur, locale)}`,
        )
      }
      const grandEur = travelMeta.over100 ? travelMeta.workTotalEur : travelMeta.workTotalEur + travelMeta.travelEur
      parts.push(`${translate(locale, 'summary.grandTotal')} ${formatEuroExclVat(grandEur, locale)}`)
    }
  } else {
    parts.push('')
    parts.push(translate(locale, 'offer.publicOfferFooter'))
    if (travelMeta != null) {
      parts.push(
        `${translate(locale, 'offer.distanceFromBrugge')} ${travelMeta.distanceKm} ${translate(locale, 'offer.km')}`,
      )
      parts.push(translate(locale, 'offer.publicTravelNote'))
    }
  }

  parts.push('')
  const bufferedH = orderBufferedWorkHours(totalH.hours, totalH.units)
  if (options?.forceClientProposalPricing === true) {
    const daysLabel = formatWorkDaysApproxLabel(bufferedH, locale)
    if (daysLabel) {
      parts.push(
        `${translate(locale, 'offer.estWorkDays')} ${translate(locale, 'summary.workDaysApproxPrefix')} ${daysLabel}`,
      )
    }
  } else {
    parts.push(
      `${translate(locale, 'offer.estHours')} ${formatHoursForOffer(bufferedH)} ${translate(locale, 'offer.hoursSuffix')}`,
    )
    parts.push(translate(locale, 'offer.leadTime'))
  }
  parts.push(translate(locale, 'offer.includes'))

  if (orderHasOversizedWindows(lines)) {
    parts.push('')
    parts.push(translate(locale, 'offer.oversizedStandardNote'))
  }

  return parts.join('\n').trimEnd()
}
