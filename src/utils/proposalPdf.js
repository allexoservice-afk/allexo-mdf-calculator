import { buildProposalContentHtml } from './proposalContentHtml.js'

/**
 * @param {Parameters<typeof buildProposalContentHtml>[0]} opts
 */
export function buildProposalPdfHtml(opts) {
  return buildProposalContentHtml({ ...opts, variant: 'pdf' })
}

/** @param {string} [customName] */
export function proposalPdfFilename(customName) {
  if (customName) return customName
  const date = new Date().toISOString().slice(0, 10)
  return `ALLEXO-proposal-${date}.pdf`
}

/** @type {Promise<typeof import('html2pdf.js').default> | null} */
let html2pdfModulePromise = null

/** Підвантажити html2pdf.js заздалегідь (поки користувач дивиться підсумок). */
export function preloadProposalPdfEngine() {
  if (typeof window === 'undefined') return
  if (!html2pdfModulePromise) {
    html2pdfModulePromise = import('html2pdf.js').then((m) => m.default)
  }
}

/** @returns {Promise<typeof import('html2pdf.js').default>} */
async function getHtml2Pdf() {
  preloadProposalPdfEngine()
  return /** @type {Promise<typeof import('html2pdf.js').default>} */ (html2pdfModulePromise)
}

function yieldToMain() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })
}

/** @returns {boolean} */
function isMobilePdfRender() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 768px)').matches
}

function pdfCanvasScale() {
  if (isMobilePdfRender()) return 1
  const mem = typeof navigator !== 'undefined' ? navigator.deviceMemory : undefined
  if (typeof mem === 'number' && mem <= 4) return 1.5
  return 2
}

/** @param {string} filename */
function getPdfRenderOpts(filename) {
  const mobile = isMobilePdfRender()
  const scale = pdfCanvasScale()
  return {
    margin: [8, 10, 8, 10],
    filename,
    image: { type: 'jpeg', quality: mobile ? 0.8 : 0.92 },
    html2canvas: {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
    pagebreak: { mode: ['css', 'legacy'] },
  }
}

/** @param {unknown} raw */
function normalizePdfBlob(raw) {
  if (raw instanceof Blob) return raw
  if (raw instanceof ArrayBuffer) return new Blob([raw], { type: 'application/pdf' })
  if (ArrayBuffer.isView(raw)) {
    return new Blob([raw], { type: 'application/pdf' })
  }
  throw new Error('Invalid PDF output')
}

/**
 * @param {HTMLElement} element
 * @param {string} filename
 */
/**
 * @param {Parameters<typeof buildProposalPdfHtml>[0]} opts
 * @returns {HTMLElement}
 */
function mountProposalPdfHost(opts) {
  const html = buildProposalPdfHtml(opts)
  const host = document.createElement('div')
  host.innerHTML = html
  host.style.cssText =
    'position:fixed;left:0;top:0;width:680px;opacity:0;pointer-events:none;z-index:-1;overflow:hidden;'
  document.body.appendChild(host)
  return /** @type {HTMLElement} */ (host.firstElementChild || host)
}

async function renderProposalPdfBlob(element, filename) {
  const html2pdf = await getHtml2Pdf()
  const raw = await html2pdf()
    .set(getPdfRenderOpts(filename))
    .from(element)
    .toPdf()
    .then(function exportPdfBlob() {
      const out = this.prop.pdf.output('blob')
      return out instanceof Promise ? out : out
    })
  const blob = normalizePdfBlob(raw)
  if (!blob.size) throw new Error('Empty PDF')
  return blob
}

/**
 * @param {Parameters<typeof buildProposalPdfHtml>[0] & { filename?: string }} opts
 * @returns {Promise<{ blob: Blob, filename: string }>}
 */
export async function generateProposalPdfBlob(opts) {
  await yieldToMain()
  preloadProposalPdfEngine()

  const filename = proposalPdfFilename(opts.filename)
  const element = mountProposalPdfHost(opts)

  try {
    await yieldToMain()
    const blob = await renderProposalPdfBlob(element, filename)
    return { blob, filename }
  } finally {
    const host = element.parentElement
    if (host?.parentNode) host.parentNode.removeChild(host)
  }
}

/**
 * @param {Parameters<typeof buildProposalPdfHtml>[0] & { filename?: string }} opts
 */
export async function saveProposalPdf(opts) {
  const { blob, filename } = await generateProposalPdfBlob(opts)
  const { downloadPdfBlob } = await import('./shareProposalPdf.js')
  downloadPdfBlob(blob, filename)
}

/**
 * @param {Parameters<typeof buildProposalPdfHtml>[0] & { filename?: string }} opts
 */
export async function downloadProposalPdf(opts) {
  try {
    const { blob, filename } = await generateProposalPdfBlob(opts)
    const { downloadPdfBlob } = await import('./shareProposalPdf.js')
    downloadPdfBlob(blob, filename)
  } catch (err) {
    console.warn('PDF blob export failed, falling back to save()', err)
    await saveProposalPdf(opts)
  }
}
