/** Meta (Facebook) Pixel — завантаження після старту застосунку (Vue/Vite). */
export const META_PIXEL_ID = String(import.meta.env.VITE_META_PIXEL_ID || '981047808085366').trim()

/** @type {boolean} */
let initialized = false

/**
 * @param {unknown} value
 * @returns {value is (...args: unknown[]) => void}
 */
function isFbq(value) {
  return typeof value === 'function'
}

/** Ініціалізація Pixel + PageView (один раз за сесію сторінки). */
export function initMetaPixel() {
  if (typeof window === 'undefined' || initialized || !META_PIXEL_ID) return
  initialized = true

  if (!isFbq(window.fbq)) {
    const n = function fbqStub(...args) {
      if (n.callMethod) {
        n.callMethod(...args)
      } else {
        n.queue.push(args)
      }
    }
    n.queue = []
    n.loaded = true
    n.version = '2.0'
    window.fbq = n
    if (!window._fbq) window._fbq = n

    const script = document.createElement('script')
    script.async = true
    script.src = 'https://connect.facebook.net/en_US/fbevents.js'
    const first = document.getElementsByTagName('script')[0]
    first?.parentNode?.insertBefore(script, first)
  }

  window.fbq('init', META_PIXEL_ID)
  window.fbq('track', 'PageView')
}

/**
 * @param {string} event
 * @param {Record<string, unknown>} [params]
 */
export function trackMetaEvent(event, params) {
  if (typeof window === 'undefined' || !isFbq(window.fbq) || !META_PIXEL_ID) return
  if (params && Object.keys(params).length > 0) {
    window.fbq('track', event, params)
  } else {
    window.fbq('track', event)
  }
}

export function trackMetaLead() {
  trackMetaEvent('Lead')
}

export function trackMetaContact() {
  trackMetaEvent('Contact')
}

/** @param {string} [contentName] */
export function trackMetaViewContent(contentName) {
  trackMetaEvent('ViewContent', contentName ? { content_name: contentName } : undefined)
}
