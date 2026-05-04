/**
 * Оптимізація фото для галереї (Sharp).
 *
 * Джерело:  public/images/works-original/  (будь-які .jpg / .jpeg / .png / .webp)
 * Результат: public/images/works/
 *   work1-thumb.webp … work15-thumb.webp  (ширина 320px, WebP quality 75)
 *   work1-large.webp … work15-large.webp   (ширина max 1600px, WebP quality 85)
 *
 * Файли в originals сортуються за іменем; перші до 15 отримують номери work1 … work15.
 *
 * Запуск: pnpm run optimize:work-images
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const sourceDir = path.join(rootDir, 'public', 'images', 'works-original')
const outputDir = path.join(rootDir, 'public', 'images', 'works')

const MAX = 15
const THUMB_WIDTH = 320
const THUMB_WEBP_Q = 75
const LARGE_WIDTH = 1600
const LARGE_WEBP_Q = 85

const SOURCE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG', '.WEBP'])

function listSourceFiles() {
  if (!fs.existsSync(sourceDir)) return []
  return fs
    .readdirSync(sourceDir)
    .filter((name) => SOURCE_EXT.has(path.extname(name)))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
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
    const meta = await sharp(input).metadata()
    const thumbPath = path.join(outputDir, `work${n}-thumb.webp`)
    const largePath = path.join(outputDir, `work${n}-large.webp`)

    await sharp(input)
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: THUMB_WEBP_Q, effort: 4 })
      .toFile(thumbPath)

    await sharp(input)
      .rotate()
      .resize({ width: LARGE_WIDTH, withoutEnlargement: true })
      .webp({ quality: LARGE_WEBP_Q, effort: 4 })
      .toFile(largePath)

    console.log(`[${n}/${nFiles}] ${sources[i]} → thumb + large (${meta.width}×${meta.height})`)
  }

  console.log(`Готово. Пар: ${nFiles}. Вихід: ${outputDir}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
