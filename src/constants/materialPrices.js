/** Довжина однієї заготовки від постачальника, м */
export const MATERIAL_BAR_LENGTH_M = 6

/** Націнка на матеріали, % */
export const MATERIAL_MARKUP_PCT = 25

/**
 * Закупівельні ціни (€/пог. м для профілів, €/шт для заглушок).
 * Джерело: внутрішня таблиця ALLEXO.
 */
export const MATERIAL_STOCK_PRICES = {
  slopes: { pricePerLm: 6.95 },
  trim: { pricePerLm: 2.6 },
  sill: { pricePerLm: 20.3 },
  sillEndCap: { pricePerPiece: 3.15, piecesPerSillPiece: 2 },
}
