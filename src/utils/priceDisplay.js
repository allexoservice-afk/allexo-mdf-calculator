import { translate } from '../i18n/translations.js'

/** @param {number} amount */
export function roundEuroCents(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

/** @param {number} amount */
export function formatEuroNumber(amount) {
  const v = roundEuroCents(amount)
  if (v % 1 === 0) return String(v)
  return v.toFixed(2).replace(/0$/, '')
}

/** Бельгійський/NL формат для email-пропозицій: «505,50 €». @param {number} amount */
export function formatEuroNlEmail(amount) {
  const v = roundEuroCents(amount)
  return `${v.toFixed(2).replace('.', ',')} €`
}

/**
 * Сума в email-пропозиції (лише відображення; NL — кома та пробіл перед €).
 * @param {number} amount
 * @param {import('../i18n/translations.js').Locale} locale
 */
export function formatEuroEmailPlain(amount, locale) {
  if (locale === 'nl') return formatEuroNlEmail(amount)
  return `${formatEuroNumber(amount)}€`
}

/**
 * Сума в email-пропозиції з позначкою excl. btw.
 * @param {number} amount
 * @param {import('../i18n/translations.js').Locale} locale
 */
export function formatEuroEmailExclVat(amount, locale) {
  if (locale === 'nl') {
    return `${formatEuroNlEmail(amount)} (${translate(locale, 'price.exVat')})`
  }
  return formatEuroExclVat(amount, locale)
}

/**
 * Відображення суми в євро з позначкою ПДВ для UI.
 * @param {number} amount
 * @param {import('../i18n/translations.js').Locale} locale
 */
export function formatEuroExclVat(amount, locale) {
  return `${formatEuroNumber(amount)}€ (${translate(locale, 'price.exVat')})`
}
