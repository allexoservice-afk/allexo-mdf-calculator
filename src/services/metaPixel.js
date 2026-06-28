/** Meta (Facebook) Pixel ID — базовий код у index.html (PageView). Тут лише додаткові події. */
export const META_PIXEL_ID = '981047808085366'

/**
 * @param {unknown} value
 * @returns {value is (...args: unknown[]) => void}
 */
function isFbq(value) {
  return typeof value === 'function'
}

/**
 * @param {string} event
 * @param {Record<string, unknown>} [params]
 */
export function trackMetaEvent(event, params) {
  if (typeof window === 'undefined' || !isFbq(window.fbq)) return
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
