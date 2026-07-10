import {
  MATERIAL_BAR_LENGTH_M,
  MATERIAL_MARKUP_PCT,
  MATERIAL_STOCK_PRICES,
} from '../constants/materialPrices.js'
import { roundEuroCents } from './priceDisplay.js'

/**
 * @typedef {Object} MaterialPriceRow
 * @property {string} key
 * @property {string} name
 * @property {number} qty
 * @property {number} lengthM
 * @property {number} totalLm
 * @property {number} unitPrice
 * @property {'lm' | 'piece'} unitKind
 * @property {number} purchaseEur
 * @property {number} markupEur
 * @property {number} totalEur
 */

/**
 * @param {string} key
 * @param {ReturnType<import('./materialStock.js').materialCategoryPlan>} pack
 * @param {string} name
 * @returns {MaterialPriceRow | null}
 */
function barMaterialRow(key, pack, name) {
  const prices = MATERIAL_STOCK_PRICES[/** @type {keyof typeof MATERIAL_STOCK_PRICES} */ (key)]
  if (!pack?.bars || !prices || !('pricePerLm' in prices)) return null

  const qty = pack.bars
  const lengthM = MATERIAL_BAR_LENGTH_M
  const totalLm = qty * lengthM
  const purchaseEur = roundEuroCents(totalLm * prices.pricePerLm)
  const markupEur = roundEuroCents((purchaseEur * MATERIAL_MARKUP_PCT) / 100)
  const totalEur = roundEuroCents(purchaseEur + markupEur)

  return {
    key,
    name,
    qty,
    lengthM,
    totalLm,
    unitPrice: prices.pricePerLm,
    unitKind: 'lm',
    purchaseEur,
    markupEur,
    totalEur,
  }
}

/**
 * @param {number} sillPieceCount
 * @param {string} name
 * @returns {MaterialPriceRow | null}
 */
function sillEndCapRow(sillPieceCount, name) {
  const prices = MATERIAL_STOCK_PRICES.sillEndCap
  const qty = Math.max(0, Math.round(sillPieceCount)) * prices.piecesPerSillPiece
  if (!qty) return null

  const purchaseEur = roundEuroCents(qty * prices.pricePerPiece)
  const markupEur = roundEuroCents((purchaseEur * MATERIAL_MARKUP_PCT) / 100)
  const totalEur = roundEuroCents(purchaseEur + markupEur)

  return {
    key: 'sillEndCap',
    name,
    qty,
    lengthM: 1,
    totalLm: qty,
    unitPrice: prices.pricePerPiece,
    unitKind: 'piece',
    purchaseEur,
    markupEur,
    totalEur,
  }
}

/**
 * @param {ReturnType<import('./materialStock.js').orderMaterialStock>} material
 * @param {(key: 'slopes' | 'sill' | 'trim' | 'sillEndCap') => string} nameFn
 */
export function orderMaterialPricing(material, nameFn) {
  /** @type {MaterialPriceRow[]} */
  const rows = []

  if (material.hasSlopes) {
    const row = barMaterialRow('slopes', material.slopes, nameFn('slopes'))
    if (row) rows.push(row)
  }
  if (material.hasSill) {
    const row = barMaterialRow('sill', material.sill, nameFn('sill'))
    if (row) rows.push(row)
    const caps = sillEndCapRow(material.sill.pieceCount, nameFn('sillEndCap'))
    if (caps) rows.push(caps)
  }
  if (material.hasTrim) {
    const row = barMaterialRow('trim', material.trim, nameFn('trim'))
    if (row) rows.push(row)
  }

  const purchaseTotal = roundEuroCents(rows.reduce((s, r) => s + r.purchaseEur, 0))
  const markupTotal = roundEuroCents(rows.reduce((s, r) => s + r.markupEur, 0))
  const grandTotal = roundEuroCents(rows.reduce((s, r) => s + r.totalEur, 0))

  return {
    rows,
    purchaseTotal,
    markupTotal,
    markupPct: MATERIAL_MARKUP_PCT,
    grandTotal,
    hasRows: rows.length > 0,
  }
}
