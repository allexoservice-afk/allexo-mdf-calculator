/** @param {string} text */
function trimForWhatsApp(text) {
  const s = String(text || '').trim()
  const maxLen = 6500
  if (s.length <= maxLen) return s
  return `${s.slice(0, maxLen - 1)}…`
}

/**
 * Відкрити WhatsApp з готовим текстом.
 * @param {string} phoneDigits E.164 без +, напр. 32493860753
 * @param {string} text
 */
export function openWhatsAppChat(phoneDigits, text) {
  if (typeof window === 'undefined') return
  const phone = String(phoneDigits || '').replace(/\D/g, '')
  const msg = trimForWhatsApp(text)
  if (!msg) return
  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`
  // На телефоні window.open часто не відкриває додаток — потрібен перехід у тій самій вкладці
  window.location.assign(url)
}
