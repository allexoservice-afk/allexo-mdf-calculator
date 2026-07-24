/**
 * QR для звороту візитки → https://allexo.be/
 * Запуск: node scripts/generate-business-card-qr.mjs
 */
import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'print', 'druk')
const url = process.argv[2] || 'https://allexo.be/'

fs.mkdirSync(outDir, { recursive: true })

await QRCode.toFile(path.join(outDir, 'allexo-qr-site.png'), url, {
  errorCorrectionLevel: 'H',
  type: 'png',
  margin: 2,
  width: 1200,
  color: { dark: '#000000', light: '#FFFFFF' },
})

await QRCode.toFile(path.join(outDir, 'allexo-qr-site.svg'), url, {
  errorCorrectionLevel: 'H',
  type: 'svg',
  margin: 2,
  color: { dark: '#000000', light: '#FFFFFF' },
})

console.log(`QR → ${url}`)
console.log(`PNG/SVG: ${outDir}/allexo-qr-site.*`)
