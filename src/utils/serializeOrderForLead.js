/**
 * Безпечний знімок замовлення для JSON (без функцій / циклічних посилань).
 * @param {unknown[]} lines
 * @returns {Record<string, unknown>}
 */
export function serializeOrderLinesForLead(lines) {
  if (!Array.isArray(lines)) return { lines: [] }
  return {
    lines: lines.map((raw) => {
      const L = /** @type {Record<string, unknown>} */ (raw && typeof raw === 'object' ? raw : {})
      return {
        key: L.key,
        typeId: L.typeId,
        materialId: L.materialId,
        windows: Array.isArray(L.windows) ? L.windows : [],
        widthMm: L.widthMm,
        heightMm: L.heightMm,
        widthCm: L.widthCm,
        heightCm: L.heightCm,
        quantity: L.quantity,
        slopeDeepOver25Cm: L.slopeDeepOver25Cm,
        slopeDeepSurchargePct: L.slopeDeepSurchargePct,
        profileLengthM: L.profileLengthM,
      }
    }),
  }
}
