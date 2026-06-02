import { buildCalculationData } from './buildCalculationData.js'
import { buildClientEmailHtml, buildClientEmailPlain, buildClientEmailWhatsApp } from './emailHtmlTemplates.js'

/**
 * @param {unknown[]} lines
 * @param {import('../i18n/translations.js').Locale} locale
 * @param {{
 *   estimatedTotalEur: number
 *   orderSubtotalEur: number
 *   discountEuros?: number
 *   discountPercent?: number
 *   windowsCount: number
 *   positionsCount: number
 *   travelMeta?: object | null
 *   leadTimeNote?: string
 *   clientName?: string
 *   quoteReference?: string
 *   skipClientCta?: boolean
 * }} options
 * @returns {Record<string, unknown>}
 */
function leadDataFromOrder(lines, locale, options) {
  const calculation_data = buildCalculationData(lines, {
    estimatedTotalEur: options.estimatedTotalEur,
    orderSubtotalEur: options.orderSubtotalEur,
    discountEuros: options.discountEuros ?? 0,
    discountPercent: options.discountPercent ?? 0,
    windowsCount: options.windowsCount,
    positionsCount: options.positionsCount,
    locale,
    travelMeta: options.travelMeta ?? null,
    leadTimeNote: options.leadTimeNote ?? '',
  })

  return {
    language: locale,
    name: options.clientName ?? '',
    total_price: options.estimatedTotalEur,
    quote_reference: options.quoteReference ?? '',
    skipClientCta: options.skipClientCta === true,
    calculation_data,
  }
}

/**
 * Професійна пропозиція (plain) — той самий формат, що лист клієнту.
 * @param {unknown[]} lines
 * @param {import('../i18n/translations.js').Locale} locale
 * @param {Parameters<typeof leadDataFromOrder>[2]} options
 */
export function buildClientProposalPlainFromOrder(lines, locale, options) {
  return buildClientEmailPlain(leadDataFromOrder(lines, locale, options))
}

/**
 * Пропозиція для WhatsApp (*жирний*, структура як у HTML-листі).
 * @param {unknown[]} lines
 * @param {import('../i18n/translations.js').Locale} locale
 * @param {Parameters<typeof leadDataFromOrder>[2]} options
 */
export function buildClientProposalWhatsAppFromOrder(lines, locale, options) {
  return buildClientEmailWhatsApp(leadDataFromOrder(lines, locale, options))
}

/**
 * @param {unknown[]} lines
 * @param {import('../i18n/translations.js').Locale} locale
 * @param {Parameters<typeof leadDataFromOrder>[2]} options
 */
export function buildClientProposalHtmlFromOrder(lines, locale, options) {
  return buildClientEmailHtml(leadDataFromOrder(lines, locale, options))
}
