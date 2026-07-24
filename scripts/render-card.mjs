import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import path from 'path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const html = path.join(root, 'print', 'druk', 'render.html')
const outDir = path.join(root, 'print', 'druk')

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })

await page.goto(`file://${html}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)

for (const side of ['front', 'back']) {
  const el = page.locator(`#${side}`)
  await el.screenshot({
    path: path.join(outDir, `allexo-${side}-89x59mm-300dpi.png`),
    type: 'png',
  })
}

await browser.close()
console.log('OK:', outDir)
