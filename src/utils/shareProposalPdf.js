/**
 * Поділитися PDF-пропозицією через системне меню (Web Share API).
 * На телефоні: WhatsApp, Telegram, Gmail, SMS тощо.
 */

/** @param {Blob} blob @param {string} filename */
export function pdfFileFromBlob(blob, filename) {
  return new File([blob], filename, { type: 'application/pdf' })
}

/** @param {File} file */
export function canSharePdfFile(file) {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false
  if (typeof navigator.canShare !== 'function') return true
  try {
    return navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

/**
 * @param {Blob} blob
 * @param {string} filename
 * @param {{ title?: string, text?: string }} [meta]
 */
export async function shareProposalPdfBlob(blob, filename, meta = {}) {
  const file = pdfFileFromBlob(blob, filename)
  if (!canSharePdfFile(file)) {
    return { ok: false, reason: 'unsupported' }
  }

  try {
    await navigator.share({
      files: [file],
      title: meta.title || 'ALLEXO',
      text: meta.text || '',
    })
    return { ok: true }
  } catch (err) {
    if (err && typeof err === 'object' && /** @type {{ name?: string }} */ (err).name === 'AbortError') {
      return { ok: true, cancelled: true }
    }
    throw err
  }
}

/** @param {Blob} blob @param {string} filename */
export function downloadPdfBlob(blob, filename) {
  if (typeof document === 'undefined') return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}
