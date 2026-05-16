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
        windows: Array.isArray(L.windows) ? L.windows : [],
        widthMm: L.widthMm,
        heightMm: L.heightMm,
        widthCm: L.widthCm,
        heightCm: L.heightCm,
        quantity: L.quantity,
        depthCategory: L.depthCategory,
        rollerCategory: L.rollerCategory,
        windowsillDepthMm: L.windowsillDepthMm,
        rollerBoxHeightMm: L.rollerBoxHeightMm,
        profileLengthM: L.profileLengthM,
      }
    }),
  }
}
