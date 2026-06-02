import { CONTACT_EMAIL } from '../constants/contact.js'
import { translate } from '../i18n/translations.js'
import { collectClientLineItemsForPdf } from './proposalLineItems.js'
import { buildWindowSchematicSvg } from './windowSchematicSvg.js'

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
  return `${Math.round(Number(amount) || 0)}€`
}

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
 * }} opts
 */
export function buildProposalPdfHtml(opts) {
  const locale = opts.locale
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

  const itemBlocks = items
    .map((item) => {
      const cost =
        item.lineTotalEur != null && item.lineTotalEur > 0 ? formatEuroPlain(item.lineTotalEur) : '—'
      const svg = buildWindowSchematicSvg(item.typeId, item.win, mm)
      return `<div style="margin:0 0 8px;padding:8px 10px;border:1px solid ${BORDER};border-radius:6px;page-break-inside:avoid;">
<table style="width:100%;border-collapse:collapse;"><tr>
<td style="width:126px;vertical-align:middle;padding:0 6px 0 0;">${svg}</td>
<td style="vertical-align:middle;">
<p style="margin:0 0 4px;font-size:12px;font-weight:700;line-height:1.25;color:${TEAL};">${esc(item.title)}</p>
<p style="margin:0 0 2px;font-size:10.5px;line-height:1.35;color:${MUTED};">${esc(translate(locale, 'emailHtml.sizeLabel'))}: <strong style="color:#1c2424;">${esc(item.size)}</strong> · ${esc(translate(locale, 'emailHtml.qtyLabel'))}: <strong style="color:#1c2424;">${item.quantity} ${esc(translate(locale, 'emailHtml.qtyUnit'))}</strong></p>
<p style="margin:0;font-size:11px;font-weight:700;color:${TEAL};">${esc(translate(locale, 'emailHtml.costLabel'))}: ${esc(cost)}</p>
</td>
</tr></table>
</div>`
    })
    .join('')

  const discountBlock =
    discountEur > 0
      ? `<p style="margin:0 0 4px;font-size:10px;color:${MUTED};">${esc(translate(locale, 'summary.discountLabel'))} −${esc(formatEuroPlain(discountEur))} (${discountPct}%)</p>`
      : ''

  let travelBlock = ''
  if (travel) {
    let travelStr = translate(locale, 'summary.travelDiscussedShort')
    if (travel.over100) travelStr = translate(locale, 'summary.travelDiscussedShort')
    else if (travel.travelEur === 0) travelStr = translate(locale, 'summary.travelFree')
    else if (typeof travel.travelEur === 'number') travelStr = formatEuroPlain(travel.travelEur)
    travelBlock = `<p style="margin:0 0 4px;font-size:10px;color:${MUTED};">${esc(translate(locale, 'summary.travelTransportTotal'))} ${esc(travelStr)}</p>`
  }

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1c2424;padding:4px 6px;max-width:680px;font-size:11px;line-height:1.4;">
<div style="text-align:center;padding:0 0 10px;border-bottom:2px solid ${GOLD};">
<p style="margin:0;font-size:20px;font-weight:800;letter-spacing:0.1em;color:${TEAL};">ALLEXO</p>
${quoteRef ? `<p style="margin:4px 0 0;font-size:10px;color:${MUTED};">${esc(translate(locale, 'emailHtml.quoteReferenceLabel'))}: <strong style="color:${TEAL};">${esc(quoteRef)}</strong></p>` : ''}
</div>
<p style="margin:10px 0 3px;font-size:11px;">${esc(translate(locale, 'emailHtml.clientGreeting').replace('{name}', name))}</p>
<p style="margin:0 0 3px;font-size:11px;">${esc(translate(locale, 'emailHtml.clientThanks'))}</p>
<p style="margin:0 0 10px;font-size:11px;">${esc(translate(locale, 'emailHtml.clientIntro'))}</p>
<p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${MUTED};">${esc(translate(locale, 'emailHtml.yourOrder'))}</p>
${itemBlocks || `<p style="color:${MUTED};font-size:11px;">${esc(translate(locale, 'emailHtml.noLineItems'))}</p>`}
<div style="margin:12px 0 0;padding:12px 8px;text-align:center;border-top:2px solid ${GOLD};">
<p style="margin:0 0 4px;font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};">${esc(translate(locale, 'emailHtml.grandTotalLabel'))}</p>
<p style="margin:0;font-size:24px;font-weight:800;line-height:1.1;color:${TEAL};">${esc(formatEuroPlain(total))}</p>
<p style="margin:3px 0 0;font-size:10px;color:${MUTED};">(${esc(vat)})</p>
${discountBlock}
${travelBlock}
</div>
<p style="margin:8px 0 0;font-size:10px;text-align:center;color:#1c2424;line-height:1.4;">${esc(translate(locale, 'emailHtml.planningNote'))}</p>
<p style="margin:4px 0 0;font-size:10px;text-align:center;color:${MUTED};line-height:1.4;">${esc(translate(locale, 'emailHtml.pdfPriceIncludes'))}</p>
<div style="margin-top:8px;padding:8px 0 0;border-top:1px solid ${BORDER};text-align:center;font-size:10px;color:${MUTED};">
<p style="margin:0 0 3px;font-weight:700;color:${TEAL};">ALLEXO</p>
<p style="margin:0;">${esc(CONTACT_EMAIL)} · +32 493 86 07 53 · Brugge, Belgium</p>
</div>
</div>`
}

/**
 * @param {Parameters<typeof buildProposalPdfHtml>[0] & { filename?: string }} opts
 */
export async function downloadProposalPdf(opts) {
  const html = buildProposalPdfHtml(opts)
  const host = document.createElement('div')
  host.innerHTML = html
  host.style.cssText = 'position:fixed;left:0;top:0;width:680px;opacity:0;pointer-events:none;z-index:-1;'
  document.body.appendChild(host)

  const date = new Date().toISOString().slice(0, 10)
  const filename = opts.filename || `ALLEXO-proposal-${date}.pdf`

  try {
    const html2pdf = (await import('html2pdf.js')).default
    await html2pdf()
      .set({
        margin: [8, 10, 8, 10],
        filename,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      })
      .from(host.firstElementChild || host)
      .save()
  } finally {
    document.body.removeChild(host)
  }
}
