import { getTypeById } from '../constants/calculatorTypes.js'
import { normalizeStoredWindow, normalizeWindowQuantity } from '../constants/sizeCategories.js'
import {
  quoteRollerBoxOnlyHours,
  quoteRollerBoxOnlyRoundedEuros,
  quoteWindowHours,
  quoteWindowRoundedEuros,
  quoteWindowsillAddonRoundedEuros,
  quoteWindowsillOnlyHours,
  quoteWindowsillOnlyRoundedEuros,
} from '../pricing/windowQuote.js'
import { formatEuroExclVat } from './priceDisplay.js'
import { lineWindowEligibleForAutoQuote, orderHasOversizedWindows, windowEligibleForAutoQuote } from './windowDimensions.js'
import { isProUnlocked } from '../constants/proUnlock.js'
import {
  sizeCategoryLabel,
  translate,
  typeTitle,
  windowsCountPhrase,
} from '../i18n/translations.js'

const _TIME_BUFFER_COEFF = 1.44
const _MIN_ORDER_EUR = 500

function _discountPercentFor(eur) {
  const v = Number(eur)
  if (!Number.isFinite(v) || v <= 0) return 0
  if (v >= 3000) return 10
  if (v >= 2000) return 7
  if (v >= 1500) return 5
  if (v >= 1000) return 3
  return 0
}

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
  if (!win) return 0
  const tid = line.typeId
  if (tid === 'roller_box') {
    const wm = Number(win.widthMm)
    const rh = Number(win.rollerBoxHeightMm ?? win.heightMm)
    if (!lineWindowEligibleForAutoQuote('roller_box', win)) return 0
    return quoteRollerBoxOnlyRoundedEuros(wm, rh)
  }
  if (tid === 'windowsill') {
    const wm = Number(win.widthMm)
    const d = Number(win.windowsillDepthMm ?? win.heightMm)
    if (!lineWindowEligibleForAutoQuote('windowsill', win)) return 0
    return quoteWindowsillOnlyRoundedEuros(wm, d)
  }
  const ty = getTypeById(tid)
  if (!ty) return 0
  const wm = Number(win.widthMm)
  const hm = Number(win.heightMm)
  if (!windowEligibleForAutoQuote(wm, hm)) return 0
  return quoteWindowRoundedEuros(
    wm,
    hm,
    /** @type {import('../constants/sizeCategories.js').SizeCategoryId} */ (win.depthCategory),
    ty.hasSill,
    ty.hasRoller,
    typeof win.windowsillDepthMm === 'number' ? win.windowsillDepthMm : null,
    win.rollerCategory != null
      ? /** @type {import('../constants/sizeCategories.js').SizeCategoryId} */ (win.rollerCategory)
      : null,
  )
}

/** @param {number} h */
function formatHoursForOffer(h) {
  const r = Math.round(h * 10) / 10
  if (Number.isInteger(r)) return String(r)
  return String(r)
}

/**
 * Метадані виїзду для тексту пропозиції (копіювання / WhatsApp / e-mail).
 * @typedef {{ distanceKm: number, workTotalEur: number, travelEur: number, over100: boolean }} OfferTravelMeta
 */

/**
 * Текст пропозиції для копіювання / WhatsApp / e-mail.
 * @param {unknown[]} lines
 * @param {import('../i18n/translations.js').Locale} locale
 * @param {OfferTravelMeta | null} [travelMeta]
 */
export function buildAllexoOfferText(lines, locale, travelMeta) {
  if (!Array.isArray(lines) || !lines.length) return ''

  const proPricing = isProUnlocked()
  const parts = []
  parts.push(translate(locale, 'offer.header'))
  parts.push('')
  parts.push(translate(locale, 'offer.workTypes'))

  for (const line of lines) {
    const L = /** @type {Record<string, unknown>} */ (line)
    const t = getTypeById(L.typeId)
    const title = t ? typeTitle(locale, String(L.typeId)) : String(L.typeId)
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
    const itemTitle = typeTitle(locale, String(L.typeId))
    for (const win of wins) {
      const wMm = Math.round(Number(win.widthMm))
      const qty = normalizeWindowQuantity(win.quantity)
      if (L.typeId === 'roller_box') {
        const hbMm = Math.round(Number(win.rollerBoxHeightMm ?? win.heightMm))
        let winHead = `- ${itemTitle}: ${wMm} ${translate(locale, 'common.mm')}`
        if (qty > 1) winHead += ` × ${qty} ${translate(locale, 'offer.pcs')}`
        parts.push(winHead)
        parts.push(`- ${translate(locale, 'offer.rollerBoxHeightLine').replace('{n}', String(hbMm))}`)
      } else if (L.typeId === 'windowsill') {
        const dMm = Math.round(Number(win.windowsillDepthMm ?? win.heightMm))
        let winHead = `- ${itemTitle}: ${wMm} ${translate(locale, 'common.mm')}`
        if (qty > 1) winHead += ` × ${qty} ${translate(locale, 'offer.pcs')}`
        parts.push(winHead)
        parts.push(`- ${translate(locale, 'offer.sillDepthLine').replace('{n}', String(dMm))}`)
      } else {
        const hMm = Math.round(Number(win.heightMm))
        let winHead = `- ${translate(locale, 'offer.windowLine')} ${wMm} × ${hMm} ${translate(locale, 'common.mm')}`
        if (qty > 1) winHead += ` × ${qty} ${translate(locale, 'offer.pcs')}`
        parts.push(winHead)
        parts.push(
          `- ${translate(locale, 'offer.depth')} ${sizeCategoryLabel(locale, String(win.depthCategory))}`,
        )
        parts.push(`- ${translate(locale, 'offer.sill')} ${t.hasSill ? translate(locale, 'offer.yes') : translate(locale, 'offer.no')}`)
        if (t.hasSill) {
          const dMm = typeof win.windowsillDepthMm === 'number' ? Math.round(Number(win.windowsillDepthMm)) : null
          const wSillMm = wMm + 300
          parts.push(`- ${translate(locale, 'offer.sillWidthLine').replace('{n}', String(wSillMm))}`)
          if (dMm != null) {
            parts.push(`- ${translate(locale, 'offer.sillDepthLine').replace('{n}', String(dMm))}`)
          }
          if (proPricing) {
            parts.push(
              `- ${translate(locale, 'offer.sillPriceLine')} ${formatEuroExclVat(
                quoteWindowsillAddonRoundedEuros(Number(win.widthMm), win.windowsillDepthMm),
                locale,
              )}`,
            )
          }
        }
        parts.push(
          `- ${translate(locale, 'offer.roller')} ${t.hasRoller ? translate(locale, 'offer.yes') : translate(locale, 'offer.no')}`,
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
  const totalH = lines.reduce((sum, line) => {
    const L = /** @type {Record<string, unknown>} */ (line)
    const tid = L.typeId
    if (tid === 'roller_box') {
      return (
        sum +
        windowsForLine(L).reduce((s, w) => {
          if (!lineWindowEligibleForAutoQuote('roller_box', w)) return s
          return s + quoteRollerBoxOnlyHours() * normalizeWindowQuantity(w.quantity)
        }, 0)
      )
    }
    if (tid === 'windowsill') {
      return (
        sum +
        windowsForLine(L).reduce((s, w) => {
          if (!lineWindowEligibleForAutoQuote('windowsill', w)) return s
          return s + quoteWindowsillOnlyHours() * normalizeWindowQuantity(w.quantity)
        }, 0)
      )
    }
    const t = getTypeById(tid)
    if (!t) return sum
    return (
      sum +
      windowsForLine(L).reduce((s, w) => {
        if (!windowEligibleForAutoQuote(Number(w.widthMm), Number(w.heightMm))) return s
        const h =
          quoteWindowHours(
            t.hasSill,
            t.hasRoller,
            /** @type {import('../constants/sizeCategories.js').SizeCategoryId} */ (w.depthCategory),
            w.rollerCategory != null
              ? /** @type {import('../constants/sizeCategories.js').SizeCategoryId} */ (w.rollerCategory)
              : null,
          ) * normalizeWindowQuantity(w.quantity)
        return s + h
      }, 0)
    )
  }, 0)

  parts.push(`${translate(locale, 'offer.totalWindows')} ${totalWin}`)

  if (proPricing) {
    parts.push('')
    parts.push(`${translate(locale, 'summary.workSubtotal')} ${formatEuroExclVat(totalEur, locale)}`)

    // Minimum order + discount (work subtotal only, excl. VAT)
    if (totalEur > 0 && totalEur < _MIN_ORDER_EUR) {
      const diff = _MIN_ORDER_EUR - totalEur
      parts.push(`${translate(locale, 'summary.minOrderDiffPrefix')} ${formatEuroExclVat(diff, locale)}`)
    }
    const baseForDiscount = totalEur > 0 && totalEur < _MIN_ORDER_EUR ? _MIN_ORDER_EUR : totalEur
    const pct = _discountPercentFor(baseForDiscount)
    const disc = pct > 0 ? Math.round((baseForDiscount * pct) / 100) : 0
    const payableWork = baseForDiscount - disc
    if (disc > 0) {
      parts.push(`${translate(locale, 'summary.discountLabel')} -${formatEuroExclVat(disc, locale)} (${pct}%)`)
    }
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
  const bufferedH = totalH * _TIME_BUFFER_COEFF
  parts.push(
    `${translate(locale, 'offer.estHours')} ${formatHoursForOffer(bufferedH)} ${translate(locale, 'offer.hoursSuffix')}`,
  )
  parts.push(translate(locale, 'offer.includes'))
  parts.push(translate(locale, 'offer.leadTime'))

  if (orderHasOversizedWindows(lines)) {
    parts.push('')
    parts.push(translate(locale, 'offer.oversizedStandardNote'))
  }

  return parts.join('\n').trimEnd()
}
