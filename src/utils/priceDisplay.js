import { translate } from '../i18n/translations.js'

/**
 * Відображення суми в євро з позначкою ПДВ для UI.
 * @param {number} amount
 * @param {import('../i18n/translations.js').Locale} locale
 */
export function formatEuroExclVat(amount, locale) {
  return `${amount}€ (${translate(locale, 'price.exVat')})`
}
