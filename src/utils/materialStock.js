/**
 * Розрахунок заготовок 6 м з урахуванням відходів при розкрої.
 *
 * Для закупівлі та розпилу довжини деталей округлюються ВГОРУ до 0,5 м
 * (1.0 / 1.5 / 2.0 / 2.5 / 3.0 / 3.5 …), бо точну довжину майстер відрізає
 * на об'єкті. Налішник додатково +15 см на кожну деталь через запил 45°.
 */

import { getTypeById } from '../constants/calculatorTypes.js'
import { MIN_WINDOW_SIDE_MM, windowSidesMeetMinimum } from './windowDimensions.js'

/** Довжина заготовки від постачальника, мм */
export const STOCK_BAR_MM = 6000

/** Макс. довжина однієї деталі для транспорту, мм */
export const MAX_TRANSPORT_PIECE_MM = 3000

/** Крок округлення довжини деталі для розпилу, мм */
export const ROUND_STEP_MM = 500

/** Надбавка на налішник (запил 45° на кутах), мм */
export const TRIM_45_ADDON_MM = 150

const WINDOWSILL_WIDTH_ADDON_MM = 300

/**
 * @typedef {Object} MaterialCategoryPlan
 * @property {number} bars Кількість 6-метрових заготовок
 * @property {number} wasteMm Сумарний відхід, мм
 * @property {number} pieceCount Кількість деталей
 * @property {number} roundedTotalMm Сумарна довжина округлених деталей, мм
 * @property {number} exactTotalMm Точна сумарна довжина (погонаж), мм
 * @property {Array<{ lengthMm: number, count: number }>} pieces Згрупований список розпилу (округлені довжини)
 * @property {number} transportWarnCount Деталей довших за 3 м
 * @property {number} oversizeCount Деталей довших за 6 м
 */

/** @param {number} mm @param {number} [step] */
export function roundUpToStep(mm, step = ROUND_STEP_MM) {
  const n = Number(mm)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.ceil(n / step) * step
}

/**
 * Best-fit decreasing: мінімізує кількість заготовок.
 * @param {number[]} piecesMm
 * @param {number} [barLengthMm]
 */
export function packStockBars(piecesMm, barLengthMm = STOCK_BAR_MM) {
  const pieces = piecesMm
    .map((p) => Math.round(Number(p)))
    .filter((p) => Number.isFinite(p) && p > 0)

  if (!pieces.length) {
    return { bars: 0, wasteMm: 0, pieceCount: 0, totalLengthMm: 0, oversizeCount: 0, transportWarnCount: 0 }
  }

  let bars = 0
  let wasteMm = 0
  let oversizeCount = 0
  const transportWarnCount = pieces.filter((p) => p > MAX_TRANSPORT_PIECE_MM).length
  const fittable = []

  for (const piece of pieces) {
    if (piece > barLengthMm) {
      oversizeCount += 1
      const need = Math.ceil(piece / barLengthMm)
      bars += need
      wasteMm += need * barLengthMm - piece
    } else {
      fittable.push(piece)
    }
  }

  const sorted = [...fittable].sort((a, b) => b - a)
  /** @type {number[]} залишок у кожній палці */
  const remnants = []

  for (const piece of sorted) {
    let bestIdx = -1
    let bestLeft = Infinity
    for (let i = 0; i < remnants.length; i++) {
      const left = remnants[i] - piece
      if (left >= 0 && left < bestLeft) {
        bestLeft = left
        bestIdx = i
      }
    }
    if (bestIdx >= 0) {
      remnants[bestIdx] -= piece
    } else {
      remnants.push(barLengthMm - piece)
    }
  }

  bars += remnants.length
  wasteMm += remnants.reduce((s, r) => s + r, 0)

  return {
    bars,
    wasteMm,
    pieceCount: pieces.length,
    totalLengthMm: pieces.reduce((s, p) => s + p, 0),
    oversizeCount,
    transportWarnCount,
  }
}

/** @param {number[]} piecesMm */
function groupPieces(piecesMm) {
  const map = new Map()
  for (const p of piecesMm) {
    if (p > 0) map.set(p, (map.get(p) || 0) + 1)
  }
  return [...map.entries()]
    .map(([lengthMm, count]) => ({ lengthMm, count }))
    .sort((a, b) => b.lengthMm - a.lengthMm)
}

/**
 * План закупівлі/розпилу для однієї категорії матеріалу.
 * @param {number[]} rawPiecesMm Точні довжини деталей (мм)
 * @returns {MaterialCategoryPlan}
 */
export function materialCategoryPlan(rawPiecesMm) {
  const exactTotalMm = rawPiecesMm.reduce((s, p) => (p > 0 ? s + p : s), 0)
  const rounded = rawPiecesMm.map((p) => roundUpToStep(p)).filter((p) => p > 0)
  const pack = packStockBars(rounded)
  return {
    bars: pack.bars,
    wasteMm: pack.wasteMm,
    pieceCount: rounded.length,
    roundedTotalMm: pack.totalLengthMm,
    exactTotalMm,
    pieces: groupPieces(rounded),
    transportWarnCount: pack.transportWarnCount,
    oversizeCount: pack.oversizeCount,
  }
}

/** @param {string | undefined | null} typeId @param {Record<string, unknown>} win */
export function windowSlopePiecesMm(typeId, win) {
  if (typeId === 'roller_box' || typeId === 'windowsill') return []
  const wm = Number(win.widthMm)
  const hm = Number(win.heightMm)
  if (!windowSidesMeetMinimum(wm, hm)) return []
  return [hm, hm, wm]
}

/** @param {string | undefined | null} typeId @param {Record<string, unknown>} win */
export function windowSillPiecesMm(typeId, win) {
  const wm = Number(win.widthMm)
  if (!Number.isFinite(wm) || wm <= 0) return []

  if (typeId === 'windowsill') {
    if (wm < MIN_WINDOW_SIDE_MM) return []
    return [wm]
  }

  const ty = getTypeById(typeId)
  if (!ty?.hasSill) return []
  const hm = Number(win.heightMm)
  if (!windowSidesMeetMinimum(wm, hm)) return []
  return [wm + WINDOWSILL_WIDTH_ADDON_MM]
}

/** Налішник: бок + бок + верх, кожна деталь +15 см на запил 45°. */
export function windowTrimPiecesMm(typeId, win) {
  return windowSlopePiecesMm(typeId, win).map((p) => p + TRIM_45_ADDON_MM)
}

/** @param {number[]} pieces @param {number} qty */
function expandPieces(pieces, qty) {
  const out = []
  const n = Math.max(1, Math.round(qty))
  for (let i = 0; i < n; i++) out.push(...pieces)
  return out
}

/**
 * @param {string | undefined | null} typeId
 * @param {Record<string, unknown>} win
 * @param {number} qty
 */
export function windowMaterialStock(typeId, win, qty) {
  const slopesPieces = expandPieces(windowSlopePiecesMm(typeId, win), qty)
  const sillPieces = expandPieces(windowSillPiecesMm(typeId, win), qty)
  const trimPieces = expandPieces(windowTrimPiecesMm(typeId, win), qty)

  return {
    slopes: materialCategoryPlan(slopesPieces),
    sill: materialCategoryPlan(sillPieces),
    trim: materialCategoryPlan(trimPieces),
    hasSlopes: slopesPieces.length > 0,
    hasSill: sillPieces.length > 0,
    hasTrim: trimPieces.length > 0,
  }
}

/**
 * @param {unknown[]} lines
 * @param {(line: Record<string, unknown>) => Record<string, unknown>[]} windowsForLine
 * @param {(win: Record<string, unknown>) => number} windowQtyFn
 */
export function orderMaterialStock(lines, windowsForLine, windowQtyFn) {
  const slopesPieces = []
  const sillPieces = []
  const trimPieces = []

  if (!Array.isArray(lines)) return emptyOrderMaterialStock()

  for (const line of lines) {
    const L = /** @type {Record<string, unknown>} */ (line)
    const tid = typeof L.typeId === 'string' ? L.typeId : ''
    for (const win of windowsForLine(L)) {
      const qty = windowQtyFn(win)
      slopesPieces.push(...expandPieces(windowSlopePiecesMm(tid, win), qty))
      sillPieces.push(...expandPieces(windowSillPiecesMm(tid, win), qty))
      trimPieces.push(...expandPieces(windowTrimPiecesMm(tid, win), qty))
    }
  }

  const slopes = materialCategoryPlan(slopesPieces)
  const sill = materialCategoryPlan(sillPieces)
  const trim = materialCategoryPlan(trimPieces)

  return {
    slopes,
    sill,
    trim,
    hasSlopes: slopesPieces.length > 0,
    hasSill: sillPieces.length > 0,
    hasTrim: trimPieces.length > 0,
    totalBars: slopes.bars + sill.bars + trim.bars,
    transportWarnCount:
      slopes.transportWarnCount + sill.transportWarnCount + trim.transportWarnCount,
    oversizeCount: slopes.oversizeCount + sill.oversizeCount + trim.oversizeCount,
  }
}

function emptyOrderMaterialStock() {
  const empty = materialCategoryPlan([])
  return {
    slopes: empty,
    sill: empty,
    trim: empty,
    hasSlopes: false,
    hasSill: false,
    hasTrim: false,
    totalBars: 0,
    transportWarnCount: 0,
    oversizeCount: 0,
  }
}

/** @param {number} mm */
export function formatMmAsMeters(mm) {
  if (!Number.isFinite(mm)) return '—'
  const m = Math.round((mm / 1000) * 100) / 100
  return String(m)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')
}

/**
 * @param {Array<{ lengthMm: number, count: number }>} pieces
 * @param {(count: number, meters: string) => string} labelFn
 */
export function formatCutPiecesSummary(pieces, labelFn) {
  if (!pieces?.length) return ''
  return pieces
    .map(({ lengthMm, count }) => labelFn(count, formatMmAsMeters(lengthMm)))
    .join(', ')
}
