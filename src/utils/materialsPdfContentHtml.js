/**
 * HTML-розмітка PDF для матеріалів: розкрій та прайс.
 */
import { CONTACT_EMAIL } from '../constants/contact.js'
import { translate } from '../i18n/translations.js'
import { formatLinearMeters } from './linearMeters.js'
import { formatCutPiecesSummary, formatMmAsMeters } from './materialStock.js'
import { formatEuroNumber } from './priceDisplay.js'

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

function pdfHeader(locale, titleKey, date) {
  return `<div style="text-align:center;padding:0 0 10px;border-bottom:2px solid ${GOLD};">
<p style="margin:0;font-size:20px;font-weight:800;letter-spacing:0.1em;color:${TEAL};">ALLEXO</p>
<p style="margin:8px 0 0;font-size:14px;font-weight:700;color:${TEAL};">${esc(translate(locale, titleKey))}</p>
<p style="margin:4px 0 0;font-size:10px;color:${MUTED};">${esc(date)}</p>
</div>`
}

function pdfFooter() {
  return `<div style="margin-top:12px;padding:10px 0 0;border-top:1px solid ${BORDER};text-align:center;font-size:10px;color:${MUTED};">
<p style="margin:0 0 4px;font-weight:700;color:${TEAL};">ALLEXO</p>
<p style="margin:0;">${esc(CONTACT_EMAIL)} · +32 493 86 07 53 · Brugge, Belgium</p>
</div>`
}

function formatPdfDate(locale) {
  return new Date().toLocaleDateString(locale === 'uk' ? 'uk-UA' : locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * @param {import('../i18n/translations.js').Locale} locale
 * @param {ReturnType<import('./materialStock.js').orderMaterialStock>['slopes']} pack
 * @param {string} title
 */
function cutCategoryBlock(locale, pack, title, extraNote) {
  if (!pack?.pieceCount) return ''
  const pieceLabel = (count, meters) =>
    translate(locale, 'materials.pieceLine').replace('{n}', String(count)).replace('{m}', meters)
  const cuts = formatCutPiecesSummary(pack.pieces, pieceLabel)
  const bars = translate(locale, 'summary.stockBarsLine').replace('{n}', String(pack.bars))
  const waste =
    pack.wasteMm > 0
      ? `<p style="margin:4px 0 0;font-size:10px;color:${MUTED};">${esc(translate(locale, 'materials.wasteLine').replace('{n}', formatMmAsMeters(pack.wasteMm)))}</p>`
      : ''
  const note = extraNote
    ? `<p style="margin:6px 0 0;font-size:9.5px;font-style:italic;color:${MUTED};line-height:1.4;">${esc(extraNote)}</p>`
    : ''

  return `<div style="margin:0 0 10px;padding:10px 12px;border:1px solid ${BORDER};border-radius:8px;page-break-inside:avoid;">
<p style="margin:0 0 6px;font-size:12px;font-weight:700;color:${TEAL};">${esc(title)}</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 6px;font-size:10.5px;">
<tr>
<td style="padding:2px 8px 2px 0;color:${MUTED};">${esc(translate(locale, 'materials.colQty'))}</td>
<td style="padding:2px 0;font-weight:600;color:#1c2424;">${pack.bars}</td>
</tr>
<tr>
<td style="padding:2px 8px 2px 0;color:${MUTED};">${esc(translate(locale, 'materials.colLength'))}</td>
<td style="padding:2px 0;font-weight:600;color:#1c2424;">6 m</td>
</tr>
</table>
<p style="margin:0 0 4px;font-size:11px;font-weight:600;color:${TEAL};">${esc(bars)}</p>
${
  cuts
    ? `<p style="margin:0;font-size:10.5px;line-height:1.45;color:#1c2424;"><span style="display:block;margin-bottom:2px;font-size:9px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${MUTED};">${esc(translate(locale, 'materials.cutListTitle'))}</span>${esc(cuts)}</p>`
    : ''
}
${waste}
${note}
</div>`
}

/**
 * @param {{
 *   locale: import('../i18n/translations.js').Locale
 *   material: ReturnType<import('./materialStock.js').orderMaterialStock>
 *   linearTotals?: { slopesM?: number, sillM?: number, hasSlopes?: boolean, hasSill?: boolean }
 *   windowsCount?: number
 * }} opts
 */
export function buildMaterialsCutListPdfHtml(opts) {
  const locale = opts.locale
  const material = opts.material
  const linearTotals = opts.linearTotals
  const windowsCount = Number(opts.windowsCount) || 0

  const metaRows = []
  if (windowsCount > 0) {
    metaRows.push(`${esc(translate(locale, 'offer.totalWindows'))} ${windowsCount}`)
  }
  if (linearTotals?.hasSlopes) {
    metaRows.push(
      `${esc(translate(locale, 'summary.totalSlopesLinearM'))}: ${esc(formatLinearMeters(linearTotals.slopesM))} ${esc(translate(locale, 'common.linearMeter'))}`,
    )
  }
  if (linearTotals?.hasSill) {
    metaRows.push(
      `${esc(translate(locale, 'summary.totalSillLinearM'))}: ${esc(formatLinearMeters(linearTotals.sillM))} ${esc(translate(locale, 'common.linearMeter'))}`,
    )
  }

  const categories = [
    material.hasSlopes
      ? cutCategoryBlock(locale, material.slopes, translate(locale, 'summary.dtStockSlopes'))
      : '',
    material.hasSill
      ? cutCategoryBlock(locale, material.sill, translate(locale, 'summary.dtStockSill'))
      : '',
    material.hasTrim
      ? cutCategoryBlock(
          locale,
          material.trim,
          translate(locale, 'summary.dtStockTrim'),
          translate(locale, 'materials.trimNote'),
        )
      : '',
  ].join('')

  const totalBars =
    material.totalBars > 0
      ? `<p style="margin:0 0 12px;padding:8px 10px;font-size:12px;font-weight:700;color:${TEAL};background:#f4f7f7;border-radius:6px;">${esc(translate(locale, 'materials.totalBars').replace('{n}', String(material.totalBars)))}</p>`
      : ''

  const warn =
    material.transportWarnCount > 0
      ? `<p style="margin:10px 0 0;font-size:10px;line-height:1.4;color:#b45309;">${esc(translate(locale, 'summary.materialTransportWarn'))}</p>`
      : ''

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1c2424;padding:4px 6px;max-width:680px;font-size:11px;line-height:1.4;">
${pdfHeader(locale, 'materials.cutPdfTitle', formatPdfDate(locale))}
<p style="margin:12px 0 8px;font-size:10px;color:${MUTED};line-height:1.45;">${esc(translate(locale, 'materials.cutPdfSubtitle'))}</p>
${
  metaRows.length
    ? `<div style="margin:0 0 12px;padding:8px 10px;border:1px solid ${BORDER};border-radius:6px;font-size:10.5px;line-height:1.5;color:#1c2424;">${metaRows.map((r) => `<p style="margin:0 0 4px;">${r}</p>`).join('')}</div>`
    : ''
}
${totalBars}
${categories || `<p style="color:${MUTED};">${esc(translate(locale, 'summary.empty'))}</p>`}
${warn}
${pdfFooter()}
</div>`
}

/** @param {import('./materialPricing.js').MaterialPriceRow} row @param {import('../i18n/translations.js').Locale} locale */
function priceRowHtml(row, locale) {
  const unitLabel =
    row.unitKind === 'lm'
      ? translate(locale, 'materials.pricePerLm')
      : translate(locale, 'materials.pricePerPiece')
  return `<tr style="page-break-inside:avoid;">
<td style="padding:6px 8px;border-bottom:1px solid ${BORDER};font-size:10px;font-weight:600;color:#1c2424;">${esc(row.name)}</td>
<td style="padding:6px 8px;border-bottom:1px solid ${BORDER};font-size:10px;text-align:right;color:#1c2424;">${row.qty}</td>
<td style="padding:6px 8px;border-bottom:1px solid ${BORDER};font-size:10px;text-align:right;color:#1c2424;">${row.lengthM}</td>
<td style="padding:6px 8px;border-bottom:1px solid ${BORDER};font-size:10px;text-align:right;color:#1c2424;">${formatEuroNumber(row.totalLm)}</td>
<td style="padding:6px 8px;border-bottom:1px solid ${BORDER};font-size:10px;text-align:right;color:#1c2424;">${formatEuroNumber(row.unitPrice)} ${esc(unitLabel)}</td>
<td style="padding:6px 8px;border-bottom:1px solid ${BORDER};font-size:10px;text-align:right;color:#1c2424;">${formatEuroNumber(row.purchaseEur)}€</td>
<td style="padding:6px 8px;border-bottom:1px solid ${BORDER};font-size:10px;text-align:right;color:#1c2424;">${formatEuroNumber(row.markupEur)}€</td>
<td style="padding:6px 8px;border-bottom:1px solid ${BORDER};font-size:10px;text-align:right;font-weight:700;color:${TEAL};">${formatEuroNumber(row.totalEur)}€</td>
</tr>`
}

/**
 * @param {{
 *   locale: import('../i18n/translations.js').Locale
 *   pricing: ReturnType<import('./materialPricing.js').orderMaterialPricing>
 *   windowsCount?: number
 * }} opts
 */
export function buildMaterialsPricePdfHtml(opts) {
  const locale = opts.locale
  const pricing = opts.pricing
  const windowsCount = Number(opts.windowsCount) || 0

  const rows = pricing.rows.map((r) => priceRowHtml(r, locale)).join('')

  const meta =
    windowsCount > 0
      ? `<p style="margin:12px 0 8px;font-size:10.5px;color:#1c2424;">${esc(translate(locale, 'offer.totalWindows'))} ${windowsCount}</p>`
      : ''

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1c2424;padding:4px 6px;max-width:720px;font-size:11px;line-height:1.4;">
${pdfHeader(locale, 'materials.pricePdfTitle', formatPdfDate(locale))}
<p style="margin:12px 0 8px;font-size:10px;color:${MUTED};line-height:1.45;">${esc(translate(locale, 'materials.pricePdfSubtitle'))}</p>
${meta}
<table style="width:100%;border-collapse:collapse;margin:0 0 10px;">
<thead>
<tr style="background:#f4f7f7;">
<th style="padding:6px 8px;text-align:left;font-size:9px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:${MUTED};border-bottom:2px solid ${BORDER};">${esc(translate(locale, 'materials.colMaterial'))}</th>
<th style="padding:6px 8px;text-align:right;font-size:9px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:${MUTED};border-bottom:2px solid ${BORDER};">${esc(translate(locale, 'materials.colQty'))}</th>
<th style="padding:6px 8px;text-align:right;font-size:9px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:${MUTED};border-bottom:2px solid ${BORDER};">${esc(translate(locale, 'materials.colLength'))}</th>
<th style="padding:6px 8px;text-align:right;font-size:9px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:${MUTED};border-bottom:2px solid ${BORDER};">${esc(translate(locale, 'materials.colTotalLm'))}</th>
<th style="padding:6px 8px;text-align:right;font-size:9px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:${MUTED};border-bottom:2px solid ${BORDER};">${esc(translate(locale, 'materials.colPrice'))}</th>
<th style="padding:6px 8px;text-align:right;font-size:9px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:${MUTED};border-bottom:2px solid ${BORDER};">${esc(translate(locale, 'materials.colPurchase'))}</th>
<th style="padding:6px 8px;text-align:right;font-size:9px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:${MUTED};border-bottom:2px solid ${BORDER};">${pricing.markupPct}%</th>
<th style="padding:6px 8px;text-align:right;font-size:9px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:${MUTED};border-bottom:2px solid ${BORDER};">${esc(translate(locale, 'materials.colTotal'))}</th>
</tr>
</thead>
<tbody>
${rows}
</tbody>
<tfoot>
<tr>
<td colspan="5" style="padding:8px 8px 4px;text-align:right;font-size:10px;font-weight:700;color:${MUTED};">${esc(translate(locale, 'materials.colPurchase'))}</td>
<td style="padding:8px 8px 4px;text-align:right;font-size:10px;font-weight:700;color:#1c2424;">${formatEuroNumber(pricing.purchaseTotal)}€</td>
<td style="padding:8px 8px 4px;text-align:right;font-size:10px;font-weight:700;color:#1c2424;">${formatEuroNumber(pricing.markupTotal)}€</td>
<td style="padding:8px 8px 4px;text-align:right;font-size:11px;font-weight:800;color:${TEAL};">${formatEuroNumber(pricing.grandTotal)}€</td>
</tr>
</tfoot>
</table>
${pdfFooter()}
</div>`
}

/** @deprecated use buildMaterialsCutListPdfHtml */
export function buildMaterialsPdfHtml(opts) {
  return buildMaterialsCutListPdfHtml(opts)
}
