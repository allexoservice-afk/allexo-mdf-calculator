import { serializeOrderLinesForLead } from './serializeOrderForLead.js'

/**
 * Повний знімок розрахунку для Supabase `calculation_details` (JSON).
 * @param {unknown[]} lines
 * @param {{
 *   estimatedTotalEur: number
 *   orderSubtotalEur: number
 *   discountEuros: number
 *   discountPercent: number
 *   windowsCount: number
 *   positionsCount: number
 *   locale: string
 *   travelMeta?: object | null
 *   leadTimeNote?: string
 * }} meta
 */
export function buildCalculationData(lines, meta) {
  const snapshot = serializeOrderLinesForLead(lines)
  return {
    ...snapshot,
    pricing: {
      order_subtotal_eur: Number(meta.orderSubtotalEur) || 0,
      discount_eur: Number(meta.discountEuros) || 0,
      discount_percent: Number(meta.discountPercent) || 0,
      estimated_total_eur: Number(meta.estimatedTotalEur) || 0,
      windows_count: Math.max(0, Math.round(Number(meta.windowsCount) || 0)),
      positions_count: Math.max(0, Math.round(Number(meta.positionsCount) || 0)),
    },
    travel: meta.travelMeta ?? null,
    locale: meta.locale,
    lead_time_note: meta.leadTimeNote ?? '',
  }
}
