/**
 * Спільна HTML-розмітка пропозиції (PDF і email) — схеми вікон, суми, час.
 */
import { CONTACT_EMAIL } from '../constants/contact.js'
import { translate } from '../i18n/translations.js'
import { formatEuroNumber } from './priceDisplay.js'
import { collectClientLineItemsForPdf, computeBufferedWorkHours } from './proposalLineItems.js'
import { buildWindowSchematicSvg } from './windowSchematicSvg.js'
import { formatWorkTimePdfLines } from './workTimeDisplay.js'

const TEAL = '#0f3d3e'
const GOLD = '#c4a35a'
const MUTED = '#5c6b6b'
const BORDER = '#d9e3e3'

/** @param {string} s */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** @param {number} amount */
function formatEuroPlain(amount) {
  return `${formatEuroNumber(amount)}€`
}

/**
 * @param {Record<string, unknown>} leadData
 */
export function proposalPricingFromLead(leadData) {
  const calc = leadData.calculation_data ?? leadData.calculation_details
  const pricing =
    calc && typeof calc === 'object' && calc.pricing && typeof calc.pricing === 'object'
      ? /** @type {Record<string, unknown>} */ (calc.pricing)
      : {}
  const travel =
    calc && typeof calc === 'object' && calc.travel != null ? calc.travel : null
  return {
    discountEuros: Number(pricing.discount_eur) || Number(leadData.discount) || 0,
    discountPercent: Number(pricing.discount_percent) || 0,
    travelMeta: travel,
  }
}

/**
 * @typedef {'pdf' | 'email'} ProposalContentVariant
 */

/**
 * @param {{
 *   lines: unknown[]
 *   locale: import('../i18n/translations.js').Locale
 *   estimatedTotalEur: number
 *   discountEuros?: number
 *   discountPercent?: number
 *   clientName?: string
 *   quoteReference?: string
 *   travelMeta?: { travelEur?: number, over100?: boolean, distanceKm?: number } | null
 *   variant?: ProposalContentVariant
 *   showTopHeader?: boolean
 *   showBottomContacts?: boolean
 * }} opts
 */
export function buildProposalContentHtml(opts) {
  const locale = opts.locale
  const variant = opts.variant ?? 'pdf'
  const isEmail = variant === 'email'
  const showTopHeader = opts.showTopHeader !== false
  const showBottomContacts = opts.showBottomContacts !== false

  const items = collectClientLineItemsForPdf(opts.lines, locale)
  const total = Number(opts.estimatedTotalEur) || 0
  const vat = translate(locale, 'price.exVat')
  const name =
    String(opts.clientName || '').trim() || translate(locale, 'proposal.clientFallbackName')
  const quoteRef = String(opts.quoteReference || '').trim()
  const mm = translate(locale, 'common.mm')
  const discountEur = Number(opts.discountEuros) || 0
  const discountPct = Number(opts.discountPercent) || 0
  const travel = opts.travelMeta

  const svgColW = isEmail ? 150 : 136
  const titleFs = isEmail ? '14px' : '12px'
  const metaFs = isEmail ? '13px' : '10.5px'
  const costFs = isEmail ? '14px' : '11px'
  const positionFs = isEmail ? '10px' : '9px'
  const bodyFs = isEmail ? '15px' : '11px'
  const sectionFs = isEmail ? '12px' : '10px'
  const totalFs = isEmail ? '36px' : '24px'
  const totalLabelFs = isEmail ? '11px' : '9px'
  const footerFs = isEmail ? '12px' : '10px'
  const itemPad = isEmail ? '14px 16px' : '8px 10px'
  const itemMargin = isEmail ? '0 0 12px' : '0 0 8px'

  const itemBlocks = items
    .map((item) => {
      const cost =
        item.lineTotalEur != null && item.lineTotalEur > 0 ? formatEuroPlain(item.lineTotalEur) : '—'
      const svg = buildWindowSchematicSvg(item.typeId, item.win, mm)
      const positionLabel =
        item.windowIndex > 0
          ? translate(locale, 'summary.positionLabel').replace('{n}', String(item.windowIndex))
          : ''
      return `<div style="position:relative;margin:${itemMargin};padding:${itemPad};border:1px solid ${BORDER};border-radius:8px;page-break-inside:avoid;">
${positionLabel ? `<p style="position:absolute;top:8px;right:10px;margin:0;font-size:${positionFs};font-weight:700;letter-spacing:0.02em;color:${TEAL};">${esc(positionLabel)}</p>` : ''}
<table role="presentation" style="width:100%;border-collapse:collapse;"><tr>
<td style="width:${svgColW}px;vertical-align:middle;padding:0 8px 0 0;">${svg}</td>
<td style="vertical-align:middle;padding-right:${positionLabel ? (isEmail ? '64px' : '58px') : '0'};">
<p style="margin:0 0 6px;font-size:${titleFs};font-weight:700;line-height:1.25;color:${TEAL};">${esc(item.title)}</p>
<p style="margin:0 0 4px;font-size:${metaFs};line-height:1.35;color:${MUTED};">${esc(translate(locale, 'emailHtml.sizeLabel'))}: <strong style="color:#1c2424;">${esc(item.size)}</strong> · ${esc(translate(locale, 'emailHtml.qtyLabel'))}: <strong style="color:#1c2424;">${item.quantity} ${esc(translate(locale, 'emailHtml.qtyUnit'))}</strong></p>
<p style="margin:0;font-size:${costFs};font-weight:700;color:${TEAL};">${esc(translate(locale, 'emailHtml.costLabel'))}: ${esc(cost)}</p>
</td>
</tr></table>
</div>`
    })
    .join('')

  const discountBlock =
    discountEur > 0
      ? `<p style="margin:0 0 6px;font-size:${footerFs};color:${MUTED};">${esc(translate(locale, 'summary.discountLabel'))} −${esc(formatEuroPlain(discountEur))} (${discountPct}%)</p>`
      : ''

  const workHours = computeBufferedWorkHours(opts.lines)
  const { hoursLine, daysLine } = formatWorkTimePdfLines(workHours, locale)
  const workTimeBlock =
    hoursLine && daysLine
      ? `<p style="margin:8px 0 0;font-size:${footerFs};text-align:center;color:#1c2424;line-height:1.45;">${esc(hoursLine)}</p>
<p style="margin:4px 0 0;font-size:${footerFs};text-align:center;color:#1c2424;line-height:1.45;">${esc(daysLine)}</p>`
      : ''

  let travelBlock = ''
  if (travel && typeof travel === 'object') {
    const t = /** @type {{ travelEur?: number, over100?: boolean }} */ (travel)
    let travelStr = translate(locale, 'summary.travelDiscussedShort')
    if (t.over100) travelStr = translate(locale, 'summary.travelDiscussedShort')
    else if (t.travelEur === 0) travelStr = translate(locale, 'summary.travelFree')
    else if (typeof t.travelEur === 'number') travelStr = formatEuroPlain(t.travelEur)
    travelBlock = `<p style="margin:0 0 6px;font-size:${footerFs};color:${MUTED};">${esc(translate(locale, 'summary.travelTransportTotal'))} ${esc(travelStr)}</p>`
  }

  const headerBlock = showTopHeader
    ? `<div style="text-align:center;padding:0 0 10px;border-bottom:2px solid ${GOLD};">
<p style="margin:0;font-size:${isEmail ? '22px' : '20px'};font-weight:800;letter-spacing:0.1em;color:${TEAL};">ALLEXO</p>
${quoteRef ? `<p style="margin:6px 0 0;font-size:${footerFs};color:${MUTED};">${esc(translate(locale, 'emailHtml.quoteReferenceLabel'))}: <strong style="color:${TEAL};">${esc(quoteRef)}</strong></p>` : ''}
</div>`
    : ''

  const contactsBlock = showBottomContacts
    ? `<div style="margin-top:${isEmail ? '12px' : '8px'};padding:10px 0 0;border-top:1px solid ${BORDER};text-align:center;font-size:${footerFs};color:${MUTED};">
<p style="margin:0 0 4px;font-weight:700;color:${TEAL};">ALLEXO</p>
<p style="margin:0;">${esc(CONTACT_EMAIL)} · +32 493 86 07 53 · Brugge, Belgium</p>
</div>`
    : ''

  const wrapperStyle = isEmail
    ? `font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c2424;font-size:${bodyFs};line-height:1.5;`
    : `font-family:Arial,Helvetica,sans-serif;color:#1c2424;padding:4px 6px;max-width:680px;font-size:11px;line-height:1.4;`

  return `<div style="${wrapperStyle}">
${headerBlock}
<p style="margin:${showTopHeader ? '12px' : '0'} 0 6px;font-size:${bodyFs};">${esc(translate(locale, 'emailHtml.clientGreeting').replace('{name}', name))}</p>
<p style="margin:0 0 6px;font-size:${bodyFs};">${esc(translate(locale, 'emailHtml.clientThanks'))}</p>
<p style="margin:0 0 16px;font-size:${bodyFs};">${esc(translate(locale, 'emailHtml.clientIntro'))}</p>
<p style="margin:0 0 10px;font-size:${sectionFs};font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${MUTED};">${esc(translate(locale, 'emailHtml.yourOrder'))}</p>
${itemBlocks || `<p style="color:${MUTED};font-size:${bodyFs};">${esc(translate(locale, 'emailHtml.noLineItems'))}</p>`}
<div style="margin:16px 0 0;padding:${isEmail ? '18px 12px' : '12px 8px'};text-align:center;border-top:2px solid ${GOLD};">
<p style="margin:0 0 6px;font-size:${totalLabelFs};font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};">${esc(translate(locale, 'emailHtml.grandTotalLabel'))}</p>
<p style="margin:0;font-size:${totalFs};font-weight:800;line-height:1.1;color:${TEAL};">${esc(formatEuroPlain(total))}</p>
<p style="margin:6px 0 0;font-size:${footerFs};color:${MUTED};">(${esc(vat)})</p>
${discountBlock}
${travelBlock}
${workTimeBlock}
</div>
<p style="margin:10px 0 0;font-size:${footerFs};text-align:center;color:${MUTED};line-height:1.45;">${esc(translate(locale, 'emailHtml.pdfPriceIncludes'))}</p>
${contactsBlock}
</div>`
}
