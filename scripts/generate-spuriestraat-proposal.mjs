/**
 * Одноразова генерація PDF для Spuriestraat (без змін у коді застосунку).
 * node scripts/generate-spuriestraat-proposal.mjs
 */
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { orderMaterialStock } from '../src/utils/materialStock.js'
import { orderMaterialPricing } from '../src/utils/materialPricing.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '../output/spuriestraat')

const REF = 'Spuriestraat — Dhiva BV'
const ORDER_REF = 'FD2000/26/00001'

/** @type {Array<{pos:string,widthMm:number,heightMm:number,qty:number}>} */
const WINDOWS = [
  { pos: '01', widthMm: 1470, heightMm: 1435, qty: 2 },
  { pos: '02', widthMm: 1470, heightMm: 1435, qty: 2 },
  { pos: '03', widthMm: 3090, heightMm: 1725, qty: 6 },
  { pos: '04', widthMm: 1440, heightMm: 1425, qty: 2 },
  { pos: '05', widthMm: 940, heightMm: 2150, qty: 2 },
  { pos: '06', widthMm: 1650, heightMm: 1415, qty: 4 },
  { pos: '07', widthMm: 1660, heightMm: 1415, qty: 2 },
  { pos: '08', widthMm: 1690, heightMm: 1415, qty: 2 },
  { pos: '09', widthMm: 1240, heightMm: 2112, qty: 2 },
  { pos: '10', widthMm: 960, heightMm: 2140, qty: 2 },
  { pos: '11', widthMm: 660, heightMm: 460, qty: 8 },
  { pos: '12', widthMm: 950, heightMm: 2140, qty: 2 },
  { pos: '13', widthMm: 1260, heightMm: 2112, qty: 2 },
  { pos: '14', widthMm: 1470, heightMm: 1435, qty: 4 },
]

const WORK_HOURS = 96
const WORK_RATE = 45
const SMALL_MATERIALS_PURCHASE = 250
const MARKUP_PCT = 25

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

/** @param {number} n */
function fmt(n) {
  const v = Math.round(n * 100) / 100
  return v % 1 === 0 ? String(v) : v.toFixed(2).replace(/0$/, '')
}

/** @param {typeof WINDOWS[0]} w */
function windowLinear(w) {
  const slopesPer = (w.widthMm + 2 * w.heightMm) / 1000
  const sillPer = (w.widthMm + 300) / 1000
  return {
    slopesPer,
    sillPer,
    slopesTotal: slopesPer * w.qty,
    sillTotal: sillPer * w.qty,
  }
}

const totals = WINDOWS.reduce(
  (acc, w) => {
    const l = windowLinear(w)
    acc.units += w.qty
    acc.slopesM += l.slopesTotal
    acc.sillM += l.sillTotal
    return acc
  },
  { units: 0, slopesM: 0, sillM: 0 },
)

/** @type {Record<'uk'|'nl', Record<string, string>>} */
const T = {
  uk: {
    title: 'Пропозиція — матеріали та роботи',
    ref: 'Об’єкт',
    order: 'Замовлення',
    windowsTitle: 'Вікна',
    pos: 'Поз.',
    size: 'Розмір (мм)',
    qty: 'Кількість',
    slopesLm: 'Відкоси (пог. м)',
    sillLm: 'Підвіконник (пог. м)',
    totalWindows: 'Вікон загалом',
    totalSlopes: 'Відкоси загалом',
    totalSill: 'Підвіконник загалом',
    materialsTitle: 'Матеріали та вартість',
    colMaterial: 'Матеріал',
    colQty: 'Кількість',
    colLength: 'Довжина',
    colTotalLm: 'Разом (м)',
    colPrice: 'Ціна',
    colPurchase: 'Закупівля',
    colTotal: 'Разом',
    slopes: 'Відкос (Kassementen)',
    trim: 'Налішник (Chambrant)',
    sill: 'Підвіконник (Venstertabletten)',
    endCap: 'Заглушки підвіконника',
    small: 'Дрібні матеріали (піна, силікон, акрил, фіксол, з’єднувачі, кутники, саморізи, хімія)',
    labor: 'Робочі години',
    priceLm: '€/м',
    pricePiece: '€/шт',
    priceHour: '€/год',
    grandTotal: 'Загальна сума',
    exVat: 'без ПДВ',
    date: new Date().toLocaleDateString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric' }),
  },
  nl: {
    title: 'Offerte — materialen en werk',
    ref: 'Project',
    order: 'Bestelling',
    windowsTitle: 'Ramen',
    pos: 'Pos.',
    size: 'Afmeting (mm)',
    qty: 'Aantal',
    slopesLm: 'Kassementen (lm)',
    sillLm: 'Venstertabletten (lm)',
    totalWindows: 'Totaal ramen',
    totalSlopes: 'Totaal kassementen',
    totalSill: 'Totaal venstertabletten',
    materialsTitle: 'Materialen en kosten',
    colMaterial: 'Materiaal',
    colQty: 'aantal',
    colLength: 'lengte',
    colTotalLm: 'Totaal',
    colPrice: 'Prijs',
    colPurchase: 'Inkoop',
    colTotal: 'Totaal',
    slopes: 'Kassementen',
    trim: 'Chambrant',
    sill: 'Venstertabletten',
    endCap: 'Sluitstukken tabletten',
    small: 'Kleine materialen (purschuim, silicone, acryl, fixol, verbinders, hoeken, schroeven, reiniging)',
    labor: 'Werkuren',
    priceLm: '€/m',
    pricePiece: '€/st',
    priceHour: '€/u',
    grandTotal: 'Totaal',
    exVat: 'excl. btw',
    date: new Date().toLocaleDateString('nl-BE', { year: 'numeric', month: 'long', day: 'numeric' }),
  },
}

/** Реальний розхід матеріалу за розмірами вікон (логіка калькулятора). */
const ORDER_LINES = [
  {
    typeId: 'with_sill',
    windows: WINDOWS.map((w) => ({ widthMm: w.widthMm, heightMm: w.heightMm, quantity: w.qty })),
  },
]
const windowsForLine = (L) => L.windows
const windowQty = (w) => w.quantity ?? 1

const MATERIAL = orderMaterialStock(ORDER_LINES, windowsForLine, windowQty)
const PRICING = orderMaterialPricing(MATERIAL, (k) => k)

/** Реальний розхід + дрібні матеріали + робота. */
function materialRows(locale) {
  const t = T[locale]
  const smallMarkup = SMALL_MATERIALS_PURCHASE * (MARKUP_PCT / 100)
  const smallTotal = SMALL_MATERIALS_PURCHASE + smallMarkup
  const laborTotal = WORK_HOURS * WORK_RATE

  const nameByKey = { slopes: t.slopes, trim: t.trim, sill: t.sill, sillEndCap: t.endCap }
  const rows = PRICING.rows.map((r) => ({
    name: nameByKey[r.key] || r.key,
    qty: r.qty,
    length: r.lengthM,
    totalLm: r.totalLm,
    price: r.unitPrice,
    unit: r.unitKind === 'lm' ? t.priceLm : t.pricePiece,
    purchase: r.purchaseEur,
    markup: r.markupEur,
    total: r.totalEur,
  }))

  rows.push({
    name: t.small,
    qty: 1,
    length: 1,
    totalLm: 1,
    price: SMALL_MATERIALS_PURCHASE,
    unit: '€',
    purchase: SMALL_MATERIALS_PURCHASE,
    markup: smallMarkup,
    total: smallTotal,
  })

  rows.push({
    name: t.labor,
    qty: WORK_HOURS,
    length: 1,
    totalLm: WORK_HOURS,
    price: WORK_RATE,
    unit: t.priceHour,
    purchase: laborTotal,
    markup: 0,
    total: laborTotal,
    labor: true,
  })

  return rows
}

/** @param {'uk'|'nl'} locale */
function buildHtml(locale) {
  const t = T[locale]
  const rows = materialRows(locale)

  const windowRows = WINDOWS.map((w) => {
    const l = windowLinear(w)
    return `<tr>
<td style="padding:5px 6px;border-bottom:1px solid ${BORDER};font-weight:600;">${w.pos}</td>
<td style="padding:5px 6px;border-bottom:1px solid ${BORDER};">${w.widthMm} × ${w.heightMm}</td>
<td style="padding:5px 6px;border-bottom:1px solid ${BORDER};text-align:right;">${w.qty}</td>
<td style="padding:5px 6px;border-bottom:1px solid ${BORDER};text-align:right;">${fmt(l.slopesTotal)}</td>
<td style="padding:5px 6px;border-bottom:1px solid ${BORDER};text-align:right;">${fmt(l.sillTotal)}</td>
</tr>`
  }).join('')

  const matRows = rows
    .map(
      (r) => `<tr>
<td style="padding:5px 6px;border-bottom:1px solid ${BORDER};font-size:10px;font-weight:600;">${esc(r.name)}</td>
<td style="padding:5px 6px;border-bottom:1px solid ${BORDER};text-align:right;">${r.qty}</td>
<td style="padding:5px 6px;border-bottom:1px solid ${BORDER};text-align:right;">${r.length}</td>
<td style="padding:5px 6px;border-bottom:1px solid ${BORDER};text-align:right;">${fmt(r.totalLm)}</td>
<td style="padding:5px 6px;border-bottom:1px solid ${BORDER};text-align:right;">${fmt(r.price)} ${esc(r.unit)}</td>
<td style="padding:5px 6px;border-bottom:1px solid ${BORDER};text-align:right;">${fmt(r.purchase)}€</td>
<td style="padding:5px 6px;border-bottom:1px solid ${BORDER};text-align:right;">${r.labor ? '—' : `${fmt(r.markup)}€`}</td>
<td style="padding:5px 6px;border-bottom:1px solid ${BORDER};text-align:right;font-weight:700;color:${TEAL};">${fmt(r.total)}€</td>
</tr>`,
    )
    .join('')

  const purchaseSum = rows.reduce((s, r) => s + r.purchase, 0)
  const markupSum = rows.reduce((s, r) => s + r.markup, 0)
  const grandTotal = rows.reduce((s, r) => s + r.total, 0)

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1c2424;padding:4px 8px;max-width:720px;font-size:11px;line-height:1.4;">
<div style="text-align:center;padding:0 0 10px;border-bottom:2px solid ${GOLD};">
<p style="margin:0;font-size:20px;font-weight:800;letter-spacing:0.1em;color:${TEAL};">ALLEXO</p>
<p style="margin:8px 0 0;font-size:14px;font-weight:700;color:${TEAL};">${esc(t.title)}</p>
<p style="margin:4px 0 0;font-size:10px;color:${MUTED};">${esc(t.date)}</p>
<p style="margin:6px 0 0;font-size:10px;color:${MUTED};">${esc(t.ref)}: ${esc(REF)} · ${esc(t.order)}: ${esc(ORDER_REF)}</p>
</div>

<p style="margin:14px 0 6px;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${MUTED};">${esc(t.windowsTitle)}</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 10px;">
<thead><tr style="background:#f4f7f7;">
<th style="padding:5px 6px;text-align:left;font-size:9px;color:${MUTED};">${esc(t.pos)}</th>
<th style="padding:5px 6px;text-align:left;font-size:9px;color:${MUTED};">${esc(t.size)}</th>
<th style="padding:5px 6px;text-align:right;font-size:9px;color:${MUTED};">${esc(t.qty)}</th>
<th style="padding:5px 6px;text-align:right;font-size:9px;color:${MUTED};">${esc(t.slopesLm)}</th>
<th style="padding:5px 6px;text-align:right;font-size:9px;color:${MUTED};">${esc(t.sillLm)}</th>
</tr></thead>
<tbody>${windowRows}</tbody>
<tfoot>
<tr>
<td colspan="2" style="padding:6px;font-weight:700;">${esc(t.totalWindows)}: ${totals.units}</td>
<td></td>
<td style="padding:6px;text-align:right;font-weight:700;color:${TEAL};">${fmt(totals.slopesM)}</td>
<td style="padding:6px;text-align:right;font-weight:700;color:${TEAL};">${fmt(totals.sillM)}</td>
</tr>
</tfoot>
</table>

<p style="margin:14px 0 6px;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${MUTED};">${esc(t.materialsTitle)}</p>
<table style="width:100%;border-collapse:collapse;">
<thead><tr style="background:#f4f7f7;">
<th style="padding:5px 6px;text-align:left;font-size:9px;color:${MUTED};">${esc(t.colMaterial)}</th>
<th style="padding:5px 6px;text-align:right;font-size:9px;color:${MUTED};">${esc(t.colQty)}</th>
<th style="padding:5px 6px;text-align:right;font-size:9px;color:${MUTED};">${esc(t.colLength)}</th>
<th style="padding:5px 6px;text-align:right;font-size:9px;color:${MUTED};">${esc(t.colTotalLm)}</th>
<th style="padding:5px 6px;text-align:right;font-size:9px;color:${MUTED};">${esc(t.colPrice)}</th>
<th style="padding:5px 6px;text-align:right;font-size:9px;color:${MUTED};">${esc(t.colPurchase)}</th>
<th style="padding:5px 6px;text-align:right;font-size:9px;color:${MUTED};">${MARKUP_PCT}%</th>
<th style="padding:5px 6px;text-align:right;font-size:9px;color:${MUTED};">${esc(t.colTotal)}</th>
</tr></thead>
<tbody>${matRows}</tbody>
<tfoot>
<tr>
<td colspan="5" style="padding:8px 6px 4px;text-align:right;font-weight:700;color:${MUTED};">${esc(t.colPurchase)}</td>
<td style="padding:8px 6px 4px;text-align:right;font-weight:700;">${fmt(purchaseSum)}€</td>
<td style="padding:8px 6px 4px;text-align:right;font-weight:700;">${fmt(markupSum)}€</td>
<td style="padding:8px 6px 4px;text-align:right;font-weight:800;font-size:12px;color:${TEAL};">${fmt(grandTotal)}€</td>
</tr>
</tfoot>
</table>
<p style="margin:8px 0 0;font-size:9px;text-align:center;color:${MUTED};">(${esc(t.exVat)})</p>

<div style="margin-top:14px;padding:10px 0 0;border-top:1px solid ${BORDER};text-align:center;font-size:10px;color:${MUTED};">
<p style="margin:0 0 4px;font-weight:700;color:${TEAL};">ALLEXO</p>
<p style="margin:0;">info@allexo.be · +32 493 86 07 53 · Brugge, Belgium</p>
</div>
</div>`
}

async function htmlToPdf(htmlPath, pdfPath) {
  const outDir = dirname(pdfPath)
  const result = spawnSync(
    'libreoffice',
    ['--headless', '--convert-to', 'pdf', '--outdir', outDir, htmlPath],
    { stdio: 'inherit' },
  )
  if (result.status !== 0) {
    throw new Error(`libreoffice PDF failed for ${htmlPath}`)
  }
  const generated = join(outDir, `${htmlPath.split('/').pop().replace(/\.html$/, '')}.pdf`)
  if (generated !== pdfPath) {
    await rename(generated, pdfPath)
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  for (const locale of /** @type {const} */ (['uk', 'nl'])) {
    const html = buildHtml(locale)
    const base = `ALLEXO-Spuriestraat-${locale}-${new Date().toISOString().slice(0, 10)}`
    const htmlPath = join(OUT_DIR, `${base}.html`)
    const pdfPath = join(OUT_DIR, `${base}.pdf`)
    await writeFile(htmlPath, `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${base}</title></head><body>${html}</body></html>`, 'utf8')
    await htmlToPdf(htmlPath, pdfPath)
    console.log('Written:', pdfPath)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
