import { getTypeById, isSimplifiedProductLine } from '../constants/calculatorTypes.js'
import { buildTypeVisualSvg } from './typeVisualSvg.js'

/**
 * @param {number} n
 * @param {string} mmLabel
 */
function dimLabel(n, mmLabel) {
  if (!n || n <= 0) return ''
  return `${n} ${mmLabel}`
}

/**
 * @param {string} typeId
 * @param {Record<string, unknown>} win
 * @param {string} mmLabel
 * @param {string} [materialId]
 */
export function buildWindowSchematicSvg(typeId, win, mmLabel = 'mm', materialId = 'mdf') {
  const labelW = Math.round(Number(win.widthMm) || 0)
  const labelH = Math.round(Number(win.heightMm) || 0)
  const boxH = Math.round(Number(win.rollerBoxHeightMm ?? win.heightMm) || 0)
  const depth = Math.round(Number(win.windowsillDepthMm ?? win.heightMm) || 0)

  let widthLabel = ''
  let heightLabel = ''

  if (typeId === 'roller_box') {
    widthLabel = dimLabel(labelW, mmLabel)
    heightLabel = dimLabel(boxH, mmLabel)
  } else if (typeId === 'windowsill') {
    widthLabel = dimLabel(labelW, mmLabel)
    heightLabel = dimLabel(depth, mmLabel)
  } else {
    widthLabel = dimLabel(labelW, mmLabel)
    heightLabel = dimLabel(labelH, mmLabel)
  }

  const ty = getTypeById(typeId)
  const variant = ty?.visual || 'no-sill'

  return buildTypeVisualSvg(variant, {
    widthLabel,
    heightLabel,
    displayWidth: 130,
    frameFill: materialId === 'pvc' ? '#ffffff' : undefined,
  })
}

/** @param {string} typeId */
export function schematicLabel(typeId) {
  if (isSimplifiedProductLine(typeId)) return typeId
  const ty = getTypeById(typeId)
  if (!ty) return 'window'
  return ty.visual
}
