import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const publicDir = path.join(root, 'public')

/** @param {Buffer} input */
async function knockOutBlackBackground(input, threshold = 34) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (r <= threshold && g <= threshold && b <= threshold) data[i + 3] = 0
  }
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer()
}

/** @param {Buffer} input */
async function trimTransparent(input) {
  return sharp(input).trim().png().toBuffer()
}

/** AX + ALLEXO з public/allexo-logo.png — без MDF, без круглого фону */
async function exportHeaderLogo() {
  const source = path.join(publicDir, 'allexo-logo.png')

  const monogramRaw = await sharp(source)
    .extract({ left: 188, top: 118, width: 648, height: 348 })
    .png()
    .toBuffer()

  const wordmarkRaw = await sharp(source)
    .extract({ left: 108, top: 488, width: 808, height: 148 })
    .png()
    .toBuffer()

  const monogram = await trimTransparent(await knockOutBlackBackground(monogramRaw))
  const wordmark = await trimTransparent(await knockOutBlackBackground(wordmarkRaw))

  const monoMeta = await sharp(monogram).metadata()
  const wordMeta = await sharp(wordmark).metadata()
  const gap = 12
  const canvasWidth = Math.max(monoMeta.width, wordMeta.width)
  const canvasHeight = monoMeta.height + gap + wordMeta.height

  const monoLeft = Math.round((canvasWidth - monoMeta.width) / 2)
  const wordLeft = Math.round((canvasWidth - wordMeta.width) / 2)

  const composed = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: monogram, left: monoLeft, top: 0 },
      { input: wordmark, left: wordLeft, top: monoMeta.height + gap },
    ])
    .png()
    .toBuffer()

  const finalTrimmed = await trimTransparent(composed)
  const meta = await sharp(finalTrimmed).metadata()
  const targetHeight = 500
  const targetWidth = Math.round((meta.width / meta.height) * targetHeight)

  const logo = await sharp(finalTrimmed)
    .resize(targetWidth, targetHeight, { fit: 'inside', withoutEnlargement: false })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer()

  const logoMeta = await sharp(logo).metadata()
  await fs.writeFile(path.join(publicDir, 'allexo-header-logo.png'), logo)
  await fs.writeFile(path.join(publicDir, 'allexo-header-logo-transparent.png'), logo)

  const previewPad = 48
  const previewW = logoMeta.width + previewPad * 2
  const previewH = logoMeta.height + previewPad * 2
  const preview = await sharp({
    create: {
      width: previewW,
      height: previewH,
      channels: 3,
      background: { r: 10, g: 10, b: 10 },
    },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toBuffer()

  await fs.writeFile(path.join(publicDir, 'allexo-header-logo-dark-preview.png'), preview)

  console.log(`  composed ${logoMeta.width}×${logoMeta.height}px`)
}

await exportHeaderLogo()
console.log('✓ public/allexo-header-logo.png')
console.log('✓ public/allexo-header-logo-transparent.png')
console.log('✓ public/allexo-header-logo-dark-preview.png')
