/**
 * Оптимізація фото для галереї (Sharp).
 *
 * Джерело:  source/works-original/  (будь-які .jpg / .jpeg / .png / .webp / .heic / .heif)
 * Результат: public/images/works/
 *   work1-thumb.webp … work50-thumb.webp  (ширина 720px, WebP quality 80)
 *   work1-large.webp … work50-large.webp   (ширина max 1600px, WebP quality 85)
 *
 * Файли в originals сортуються за іменем; перші до 50 отримують номери work1 … work50.
 *
 * Запуск: pnpm run optimize:work-images
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import convert from 'heic-convert'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const sourceDir = path.join(rootDir, 'source', 'works-original')
const outputDir = path.join(rootDir, 'public', 'images', 'works')

const MAX = 50
const THUMB_WIDTH = 720
const THUMB_WEBP_Q = 80
const LARGE_WIDTH = 1600
const LARGE_WEBP_Q = 85

const SOURCE_EXT = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
  '.JPG',
  '.JPEG',
  '.PNG',
  '.WEBP',
  '.HEIC',
  '.HEIF',
])
const OUTPUT_NAME_RE = /^work\d+-(thumb|large)\.webp$/i
const HEIC_EXT = new Set(['.heic', '.heif', '.HEIC', '.HEIF'])

/** @param {string} inputPath */
async function openSharp(inputPath) {
  const ext = path.extname(inputPath)
  if (HEIC_EXT.has(ext)) {
    const jpegBuffer = await convert({
      buffer: fs.readFileSync(inputPath),
      format: 'JPEG',
      quality: 1,
    })
    return sharp(jpegBuffer)
  }
  return sharp(inputPath)
}

function listSourceFiles() {
  if (!fs.existsSync(sourceDir)) return []
  return fs
    .readdirSync(sourceDir)
    .filter((name) => {
      if (OUTPUT_NAME_RE.test(name)) return false
      return SOURCE_EXT.has(path.extname(name))
    })
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
}

async function main() {
  if (!fs.existsSync(sourceDir)) {
    console.error('Немає папки з оригіналами. Створи:', sourceDir)
    process.exit(1)
  }

  fs.mkdirSync(outputDir, { recursive: true })

  const sources = listSourceFiles()
  if (sources.length === 0) {
    console.error('У папці немає зображень:', sourceDir)
    process.exit(1)
  }

  const nFiles = Math.min(MAX, sources.length)
  if (sources.length > MAX) {
    console.warn(`Знайдено ${sources.length} файлів — обробляю лише перші ${MAX} (за сортуванням імені).`)
  }

  for (let i = 0; i < nFiles; i++) {
    const n = i + 1
    const input = path.join(sourceDir, sources[i])
    const base = await openSharp(input)
    const meta = await base.metadata()
    const thumbPath = path.join(outputDir, `work${n}-thumb.webp`)
    const largePath = path.join(outputDir, `work${n}-large.webp`)

    await base
      .clone()
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: THUMB_WEBP_Q, effort: 4 })
      .toFile(thumbPath)

    await base
      .clone()
      .rotate()
      .resize({ width: LARGE_WIDTH, withoutEnlargement: true })
      .webp({ quality: LARGE_WEBP_Q, effort: 4 })
      .toFile(largePath)

    console.log(`[${n}/${nFiles}] ${sources[i]} → thumb + large (${meta.width}×${meta.height})`)
  }

  for (const name of fs.readdirSync(outputDir)) {
    const m = name.match(/^work(\d+)-(thumb|large)\.webp$/i)
    if (m && Number(m[1]) > nFiles) {
      fs.unlinkSync(path.join(outputDir, name))
      console.log(`Видалено зайвий: ${name}`)
    }
  }

  const metaDir = path.join(rootDir, 'src', 'generated')
  const metaPath = path.join(metaDir, 'works-gallery.json')
  fs.mkdirSync(metaDir, { recursive: true })
  fs.writeFileSync(
    metaPath,
    `${JSON.stringify({ count: nFiles, version: Date.now() }, null, 2)}\n`,
  )

  console.log(`Готово. Пар: ${nFiles}. Вихід: ${outputDir}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
