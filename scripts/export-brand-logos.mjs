import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const svgDir = path.join(root, 'brand', 'svg')
const pngDir = path.join(root, 'brand', 'png')

/** @type {{ file: string, width: number, height?: number, out: string }[]} */
const exports = [
  { file: 'allexo-icon.svg', width: 512, height: 512, out: 'facebook-profile-512.png' },
  { file: 'allexo-icon.svg', width: 1800, height: 1800, out: 'icon-print-1800.png' },
  { file: 'allexo-horizontal.svg', width: 2400, height: 576, out: 'car-horizontal-2400.png' },
  { file: 'allexo-horizontal.svg', width: 1600, height: 384, out: 'facebook-cover-1600.png' },
  { file: 'allexo-horizontal-light.svg', width: 2400, height: 576, out: 'car-horizontal-light-2400.png' },
  { file: 'allexo-stacked.svg', width: 1800, height: 2138, out: 'tshirt-stacked-1800.png' },
  { file: 'allexo-badge.svg', width: 3000, height: 840, out: 'vehicle-badge-3000.png' },
  { file: 'allexo-horizontal.svg', width: 3600, height: 864, out: 'print-horizontal-3600.png' },
]

await fs.mkdir(pngDir, { recursive: true })

for (const item of exports) {
  const input = path.join(svgDir, item.file)
  const output = path.join(pngDir, item.out)
  const svg = await fs.readFile(input)
  const height = item.height ?? Math.round(item.width * 0.24)
  await sharp(svg, { density: 300 })
    .resize(item.width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(output)
  console.log(`✓ ${item.out}`)
}

console.log(`\nPNG files saved to ${pngDir}`)
