/** Спільні SVG-схеми типів вікон (як на головній сторінці). */

const STROKE = '#0f3d3e'
const GOLD = '#c4a35a'
const GLASS = '#e8f4f3'
const SILL = '#1a5c5e'
const MUTED = '#5c6b6b'

export const TYPE_VISUAL_WIDTH = 116
export const TYPE_VISUAL_HEIGHT = 76

const ART_X = 34
const ART_Y = 22
const DIM_TOP_Y = 14
const DIM_TEXT_OFFSET = 8
const DIM_LEFT_X = 16
const VIEW_W = 166
const VIEW_H = 98
const VIEW_PAD_TOP = 10
const DIM_STROKE = 1.6
const DIM_TICK = 3.5

/** @param {string} s */
function escSvgText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
}

/**
 * @param {number} x1
 * @param {number} x2
 * @param {number} y
 * @param {string} label
 */
function horizontalDimension(x1, x2, y, label) {
  if (!label) return ''
  const mid = (x1 + x2) / 2
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${GOLD}" stroke-width="${DIM_STROKE}"/>
<line x1="${x1}" y1="${y - DIM_TICK}" x2="${x1}" y2="${y + DIM_TICK}" stroke="${GOLD}" stroke-width="${DIM_STROKE}"/>
<line x1="${x2}" y1="${y - DIM_TICK}" x2="${x2}" y2="${y + DIM_TICK}" stroke="${GOLD}" stroke-width="${DIM_STROKE}"/>
<text x="${mid}" y="${y - DIM_TEXT_OFFSET}" text-anchor="middle" dominant-baseline="auto" fill="${STROKE}" font-size="9.5" font-weight="700" font-family="Arial,sans-serif">${escSvgText(label)}</text>`
}

/**
 * @param {number} x
 * @param {number} y1
 * @param {number} y2
 * @param {string} label
 */
function verticalDimension(x, y1, y2, label) {
  if (!label) return ''
  const mid = (y1 + y2) / 2
  return `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${GOLD}" stroke-width="${DIM_STROKE}"/>
<line x1="${x - DIM_TICK}" y1="${y1}" x2="${x + DIM_TICK}" y2="${y1}" stroke="${GOLD}" stroke-width="${DIM_STROKE}"/>
<line x1="${x - DIM_TICK}" y1="${y2}" x2="${x + DIM_TICK}" y2="${y2}" stroke="${GOLD}" stroke-width="${DIM_STROKE}"/>
<text x="${x - 6}" y="${mid}" text-anchor="middle" fill="${STROKE}" font-size="9.5" font-weight="700" font-family="Arial,sans-serif" transform="rotate(-90 ${x - 6} ${mid})">${escSvgText(label)}</text>`
}

/**
 * @param {string} variant
 * @param {string} [frameFill] Колір рамки/відкосів (MDF — золото, PVC — білий)
 * @returns {string}
 */
export function typeVisualInnerMarkup(variant, frameFill = GOLD) {
  const F = frameFill
  switch (variant) {
    case 'no-sill':
      return `<path fill="${F}" stroke="${STROKE}" stroke-width="1" stroke-linejoin="miter" stroke-miterlimit="8" d="M 30 16 L 86 16 L 78 24 L 38 24 Z"/>
<path fill="${F}" stroke="${STROKE}" stroke-width="1" stroke-linejoin="miter" stroke-miterlimit="8" d="M 30 16 L 38 24 L 38 64 L 30 64 Z"/>
<path fill="${F}" stroke="${STROKE}" stroke-width="1" stroke-linejoin="miter" stroke-miterlimit="8" d="M 86 16 L 86 64 L 78 64 L 78 24 Z"/>
<rect x="38" y="24" width="40" height="40" fill="${GLASS}" stroke="${STROKE}" stroke-width="1"/>
<line x1="58" y1="24" x2="58" y2="64" stroke="${STROKE}" stroke-width="0.75" opacity="0.24"/>`

    case 'with-sill':
      return `<path fill="${F}" stroke="${STROKE}" stroke-width="1" stroke-linejoin="miter" stroke-miterlimit="8" d="M 30 16 L 86 16 L 78 24 L 38 24 Z"/>
<path fill="${F}" stroke="${STROKE}" stroke-width="1" stroke-linejoin="miter" stroke-miterlimit="8" d="M 30 16 L 38 24 L 38 64 L 30 64 Z"/>
<path fill="${F}" stroke="${STROKE}" stroke-width="1" stroke-linejoin="miter" stroke-miterlimit="8" d="M 86 16 L 86 64 L 78 64 L 78 24 Z"/>
<rect x="38" y="24" width="40" height="40" fill="${GLASS}" stroke="${STROKE}" stroke-width="1"/>
<line x1="58" y1="24" x2="58" y2="64" stroke="${STROKE}" stroke-width="0.75" opacity="0.24"/>
<rect x="25" y="64" width="66" height="2.5" fill="${SILL}" stroke="${STROKE}" stroke-width="1"/>`

    case 'roller':
      return `<rect x="22" y="4" width="72" height="14" fill="${F}" stroke="${STROKE}" stroke-width="1"/>
<line x1="26" y1="7.5" x2="90" y2="7.5" stroke="${STROKE}" stroke-width="0.6" opacity="0.36"/>
<line x1="26" y1="11" x2="90" y2="11" stroke="${STROKE}" stroke-width="0.6" opacity="0.36"/>
<line x1="26" y1="14.5" x2="90" y2="14.5" stroke="${STROKE}" stroke-width="0.6" opacity="0.36"/>
<rect x="30" y="18" width="8" height="40" fill="${F}" stroke="${STROKE}" stroke-width="1"/>
<rect x="78" y="18" width="8" height="40" fill="${F}" stroke="${STROKE}" stroke-width="1"/>
<rect x="38" y="18" width="40" height="40" fill="${GLASS}" stroke="${STROKE}" stroke-width="1"/>
<line x1="58" y1="18" x2="58" y2="58" stroke="${STROKE}" stroke-width="0.75" opacity="0.24"/>`

    case 'sill-roller':
      return `<rect x="22" y="4" width="72" height="14" fill="${F}" stroke="${STROKE}" stroke-width="1"/>
<line x1="26" y1="7.5" x2="90" y2="7.5" stroke="${STROKE}" stroke-width="0.6" opacity="0.36"/>
<line x1="26" y1="11" x2="90" y2="11" stroke="${STROKE}" stroke-width="0.6" opacity="0.36"/>
<line x1="26" y1="14.5" x2="90" y2="14.5" stroke="${STROKE}" stroke-width="0.6" opacity="0.36"/>
<rect x="30" y="18" width="8" height="40" fill="${F}" stroke="${STROKE}" stroke-width="1"/>
<rect x="78" y="18" width="8" height="40" fill="${F}" stroke="${STROKE}" stroke-width="1"/>
<rect x="38" y="18" width="40" height="40" fill="${GLASS}" stroke="${STROKE}" stroke-width="1"/>
<line x1="58" y1="18" x2="58" y2="58" stroke="${STROKE}" stroke-width="0.75" opacity="0.24"/>
<rect x="25" y="58" width="66" height="2.5" fill="${SILL}" stroke="${STROKE}" stroke-width="1"/>`

    case 'roller-box-only':
      return `<rect x="22" y="8" width="72" height="14" fill="${F}" stroke="${STROKE}" stroke-width="1"/>
<line x1="26" y1="11.5" x2="90" y2="11.5" stroke="${STROKE}" stroke-width="0.6" opacity="0.36"/>
<line x1="26" y1="15" x2="90" y2="15" stroke="${STROKE}" stroke-width="0.6" opacity="0.36"/>
<line x1="26" y1="18.5" x2="90" y2="18.5" stroke="${STROKE}" stroke-width="0.6" opacity="0.36"/>
<rect x="38" y="22" width="40" height="40" fill="${GLASS}" stroke="${STROKE}" stroke-width="1"/>
<line x1="58" y1="22" x2="58" y2="62" stroke="${STROKE}" stroke-width="0.75" opacity="0.24"/>`

    case 'sill-only':
      return `<rect x="38" y="22" width="40" height="40" fill="${GLASS}" stroke="${STROKE}" stroke-width="1"/>
<line x1="58" y1="22" x2="58" y2="62" stroke="${STROKE}" stroke-width="0.75" opacity="0.24"/>
<rect x="34" y="62" width="48" height="2" fill="${SILL}" stroke="${STROKE}" stroke-width="1"/>`

    default:
      return `<rect x="38" y="24" width="40" height="40" fill="${GLASS}" stroke="${STROKE}" stroke-width="1"/>
<line x1="58" y1="24" x2="58" y2="64" stroke="${STROKE}" stroke-width="0.75" opacity="0.24"/>`
  }
}

/**
 * @param {string} variant
 * @param {{
 *   widthLabel?: string
 *   heightLabel?: string
 *   displayWidth?: number
 *   frameFill?: string
 * }} [opts]
 */
export function buildTypeVisualSvg(variant, opts = {}) {
  const displayWidth = opts.displayWidth ?? 130
  const frameFill = opts.frameFill || GOLD
  const totalViewH = VIEW_H + VIEW_PAD_TOP
  const displayHeight = Math.round((displayWidth * totalViewH) / VIEW_W)
  const artRight = ART_X + TYPE_VISUAL_WIDTH
  const artBottom = ART_Y + TYPE_VISUAL_HEIGHT

  const widthDim = horizontalDimension(ART_X, artRight, DIM_TOP_Y, opts.widthLabel || '')
  const heightDim = verticalDimension(DIM_LEFT_X, ART_Y, artBottom, opts.heightLabel || '')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${-VIEW_PAD_TOP} ${VIEW_W} ${totalViewH}" width="${displayWidth}" height="${displayHeight}" overflow="visible" role="img" aria-hidden="true">
${widthDim}
${heightDim}
<g transform="translate(${ART_X} ${ART_Y})">${typeVisualInnerMarkup(variant, frameFill)}</g>
</svg>`
}
