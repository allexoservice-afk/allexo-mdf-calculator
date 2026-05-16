import { translate } from '../i18n/translations.js'
import { buildAllexoOfferText } from './offerText.js'

/**
 * Повний текст пропозиції для клієнта (email / SMS): суми, час, термін, без «формули» в сенсі коефіцієнтів — лише готові цифри та опис з калькулятора.
 * @param {unknown[]} lines
 * @param {import('../i18n/translations.js').Locale} locale
 * @param {null | { distanceKm: number, workTotalEur: number, travelEur: number, over100: boolean }} travelMeta
 * @param {string} clientName
 * @param {string} leadTimeNote
 */
export function buildClientProposalPlain(lines, locale, travelMeta, clientName, leadTimeNote) {
  const nm = String(clientName || '').trim() || translate(locale, 'proposal.clientFallbackName')
  const core = buildAllexoOfferText(lines, locale, travelMeta, { forceClientProposalPricing: true })
  const disclaimer = translate(locale, 'getQuote.waDisclaimer')
  const tail = [
    '',
    translate(locale, 'proposal.specificLeadTime'),
    String(leadTimeNote || '').trim() || '—',
    '',
    disclaimer,
  ].join('\n')
  return `${translate(locale, 'proposal.greeting').replace('{name}', nm)}\n\n${translate(locale, 'proposal.intro')}\n\n${core}${tail}`.trim()
}
