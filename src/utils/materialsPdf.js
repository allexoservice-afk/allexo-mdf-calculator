import {
  buildMaterialsCutListPdfHtml,
  buildMaterialsPricePdfHtml,
} from './materialsPdfContentHtml.js'
import { generatePdfBlobFromHtml, preloadProposalPdfEngine } from './proposalPdf.js'

/** @param {string} kind @param {string} [customName] */
function materialsPdfFilename(kind, customName) {
  if (customName) return customName
  const date = new Date().toISOString().slice(0, 10)
  return `ALLEXO-materials-${kind}-${date}.pdf`
}

export function preloadMaterialsPdfEngine() {
  preloadProposalPdfEngine()
}

/**
 * @param {Parameters<typeof buildMaterialsCutListPdfHtml>[0] & { filename?: string }} opts
 */
export async function generateMaterialsCutPdfBlob(opts) {
  const filename = materialsPdfFilename('cut', opts.filename)
  const html = buildMaterialsCutListPdfHtml(opts)
  return generatePdfBlobFromHtml(html, filename)
}

/**
 * @param {Parameters<typeof buildMaterialsPricePdfHtml>[0] & { filename?: string }} opts
 */
export async function generateMaterialsPricePdfBlob(opts) {
  const filename = materialsPdfFilename('price', opts.filename)
  const html = buildMaterialsPricePdfHtml(opts)
  return generatePdfBlobFromHtml(html, filename)
}

/**
 * @param {Parameters<typeof buildMaterialsCutListPdfHtml>[0] & { filename?: string }} opts
 */
export async function downloadMaterialsCutPdf(opts) {
  const { blob, filename } = await generateMaterialsCutPdfBlob(opts)
  const { downloadPdfBlob } = await import('./shareProposalPdf.js')
  downloadPdfBlob(blob, filename)
}

/**
 * @param {Parameters<typeof buildMaterialsPricePdfHtml>[0] & { filename?: string }} opts
 */
export async function downloadMaterialsPricePdf(opts) {
  const { blob, filename } = await generateMaterialsPricePdfBlob(opts)
  const { downloadPdfBlob } = await import('./shareProposalPdf.js')
  downloadPdfBlob(blob, filename)
}

/** @deprecated use downloadMaterialsCutPdf */
export async function downloadMaterialsPdf(opts) {
  return downloadMaterialsCutPdf(opts)
}
