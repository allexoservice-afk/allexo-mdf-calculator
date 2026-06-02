import { getTypeById, isSimplifiedProductLine } from '../constants/calculatorTypes.js'

const STROKE = '#0f3d3e'
const FILL = '#e6efef'
const MDF = '#0f3d3e'
const GOLD = '#c4a35a'
const MUTED = '#5c6b6b'
const GLASS = '#f4fafa'

const VIEW_W = 200
const VIEW_H = 118
const CAPTION_Y = 112
const PAD_L = 14
const PAD_R = 14
const PAD_T = 10
const PAD_B = 22

const SVG_OPEN = `xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" width="120" height="71" role="img" aria-hidden="true"`

/**
 * @param {number} wMm
 * @param {number} hMm
 * @param {number} maxW
 * @param {number} maxH
 * @param {number} [minDrawH]
 */
function fitRect(wMm, hMm, maxW, maxH, minDrawH = 0) {
  const aspect = Math.max(wMm, 1) / Math.max(hMm, 1)
  let w = maxW
  let h = w / aspect
  if (h > maxH) {
    h = maxH
    w = h * aspect
  }
  if (minDrawH > 0 && h < minDrawH) {
    h = Math.min(maxH, minDrawH)
    w = Math.min(maxW, h * aspect)
  }
  return { w, h }
}

/** @param {string} caption */
function captionText(caption) {
  const safe = String(caption).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return `<text x="${VIEW_W / 2}" y="${CAPTION_Y}" text-anchor="middle" fill="${MUTED}" font-size="8.5" font-family="Arial,sans-serif">${safe}</text>`
}

/**
 * @param {string} typeId
 * @param {Record<string, unknown>} win
 * @param {string} mmLabel
 */
export function buildWindowSchematicSvg(typeId, win, mmLabel = 'mm') {
  const labelW = Math.round(Number(win.widthMm) || 0)
  const ty = getTypeById(typeId)
  const maxW = VIEW_W - PAD_L - PAD_R
  const maxH = VIEW_H - PAD_T - PAD_B

  if (typeId === 'roller_box') {
    const boxH = Math.round(Number(win.rollerBoxHeightMm ?? win.heightMm) || 0)
    const { w, h } = fitRect(labelW, Math.max(boxH, 1), maxW, maxH, 22)
    const x = PAD_L + (maxW - w) / 2
    const y = PAD_T + (maxH - h) / 2
    const cap = boxH > 0 ? `${labelW} × ${boxH} ${mmLabel}` : `${labelW} ${mmLabel}`
    return `<svg ${SVG_OPEN}>
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${FILL}" stroke="${STROKE}" stroke-width="2"/>
<rect x="${x + w * 0.04}" y="${y + h * 0.32}" width="${w * 0.92}" height="${h * 0.36}" rx="2" fill="${MDF}" opacity="0.85"/>
${captionText(cap)}
</svg>`
  }

  if (typeId === 'windowsill') {
    const depth = Math.round(Number(win.windowsillDepthMm ?? win.heightMm) || 0)
    const { w, h } = fitRect(labelW, Math.max(depth, 1), maxW, maxH, 22)
    const x = PAD_L + (maxW - w) / 2
    const y = PAD_T + (maxH - h) / 2
    const sillStrip = h * 0.22
    const cap = depth > 0 ? `${labelW} / ${depth} ${mmLabel}` : `${labelW} ${mmLabel}`
    return `<svg ${SVG_OPEN}>
<rect x="${x}" y="${y}" width="${w}" height="${sillStrip}" rx="2" fill="${MDF}" opacity="0.9"/>
<rect x="${x + 4}" y="${y + sillStrip - 2}" width="${w - 8}" height="${h - sillStrip}" rx="2" fill="${FILL}" stroke="${STROKE}" stroke-width="1.5"/>
${captionText(cap)}
</svg>`
  }

  const labelH = Math.round(Number(win.heightMm) || 0)
  const hasRoller = ty?.hasRoller === true
  const hasSill = ty?.hasSill === true

  const extraH = (hasRoller ? 0.12 : 0) + (hasSill ? 0.1 : 0)
  const drawH_mm = labelH * (1 + extraH)
  const { w, h } = fitRect(labelW, Math.max(drawH_mm, 1), maxW, maxH)
  const x = PAD_L + (maxW - w) / 2
  let y = PAD_T + (maxH - h) / 2

  const rollerBand = hasRoller ? h * 0.12 : 0
  const sillBand = hasSill ? h * 0.1 : 0
  const openingH = h - rollerBand - sillBand
  const cap = labelH > 0 ? `${labelW} × ${labelH} ${mmLabel}` : `${labelW} ${mmLabel}`

  const parts = [`<svg ${SVG_OPEN}>`]

  if (hasRoller) {
    parts.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${rollerBand}" rx="2" fill="${MDF}" opacity="0.88"/>`,
      `<rect x="${x + w * 0.05}" y="${y + rollerBand * 0.25}" width="${w * 0.9}" height="${rollerBand * 0.5}" rx="1" fill="${GOLD}" opacity="0.35"/>`,
    )
    y += rollerBand + 2
  }

  parts.push(
    `<rect x="${x}" y="${y}" width="${w}" height="${openingH}" rx="3" fill="${GLASS}" stroke="${STROKE}" stroke-width="2"/>`,
    `<line x1="${x + w / 2}" y1="${y + 4}" x2="${x + w / 2}" y2="${y + openingH - 4}" stroke="${STROKE}" stroke-width="1" opacity="0.3"/>`,
    `<line x1="${x + 4}" y1="${y + openingH / 2}" x2="${x + w - 4}" y2="${y + openingH / 2}" stroke="${STROKE}" stroke-width="1" opacity="0.3"/>`,
  )

  if (hasSill) {
    parts.push(
      `<rect x="${x}" y="${y + openingH + 2}" width="${w}" height="${sillBand}" rx="2" fill="${MDF}" opacity="0.85"/>`,
    )
  }

  parts.push(captionText(cap), '</svg>')
  return parts.join('')
}

/** @param {string} typeId */
export function schematicLabel(typeId) {
  if (isSimplifiedProductLine(typeId)) return typeId
  const ty = getTypeById(typeId)
  if (!ty) return 'window'
  return ty.visual
}
