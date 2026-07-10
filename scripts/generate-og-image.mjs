import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '../public/og-image.png')

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a1a1a"/>
      <stop offset="55%" stop-color="#111111"/>
      <stop offset="100%" stop-color="#0a0a0a"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#d4b76a"/>
      <stop offset="50%" stop-color="#c4a35a"/>
      <stop offset="100%" stop-color="#a88942"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="10" height="630" fill="url(#gold)"/>
  <rect x="0" y="618" width="1200" height="12" fill="url(#gold)" opacity="0.85"/>
  <circle cx="1040" cy="120" r="180" fill="#c4a35a" opacity="0.06"/>
  <circle cx="180" cy="520" r="140" fill="#c4a35a" opacity="0.05"/>

  <text x="88" y="250" fill="url(#gold)" font-family="Arial, Helvetica, sans-serif" font-size="108" font-weight="800" letter-spacing="18">ALLEXO</text>

  <text x="92" y="330" fill="#f5f1ea" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="600">Professionele binnenafwerking van ramen</text>
  <text x="92" y="382" fill="#f5f1ea" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="600">MDF &amp; PVC · België</text>

  <text x="92" y="470" fill="#c4a35a" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="600" letter-spacing="1">Netjes afgewerkt · Kwaliteit · Factuur mogelijk</text>

  <text x="92" y="545" fill="#9a948c" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="500">allexo.be</text>
</svg>`

const png = await sharp(Buffer.from(svg)).png({ quality: 92 }).toBuffer()
writeFileSync(outPath, png)
console.log(`Wrote ${outPath} (${png.length} bytes)`)
