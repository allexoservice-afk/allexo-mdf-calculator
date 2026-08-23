import { CONTACT_EMAIL, CONTACT_PHONE_HREF } from '../constants/contact.js'
import { translate } from '../i18n/translations.js'
import { formatEuroEmailExclVat, formatEuroEmailPlain, formatEuroExclVat } from './priceDisplay.js'
import {
  collectClientLineItems,
  collectOwnerLineItems,
  computeBufferedWorkHours,
} from './proposalLineItems.js'
import { buildProposalContentHtml, proposalPricingFromLead } from './proposalContentHtml.js'
import { quoteReferenceFromLead } from './quoteReference.js'
import { approxWorkDays } from './workTimeDisplay.js'

const TEAL = '#0f3d3e'
const GOLD = '#c4a35a'
const MUTED = '#5c6b6b'
const BORDER = '#d9e3e3'
const BG = '#f6f8f8'

/** @param {string} s */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** @param {string} inner @param {string} [lang] */
function emailShell(inner, lang = 'uk') {
  return `<!DOCTYPE html>
<html lang="${esc(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ALLEXO</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#1c2424;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${BORDER};border-radius:10px;overflow:hidden;">
${inner}
</table>
</td></tr>
</table>
</body>
</html>`
}

/**
 * @param {import('../i18n/translations.js').Locale} locale
 * @param {string} quoteRef
 */
function clientHeader(locale, quoteRef) {
  const refLine = quoteRef
    ? `<p style="margin:12px 0 0;font-size:14px;color:${MUTED};">${esc(translate(locale, 'emailHtml.quoteReferenceLabel'))}: <strong style="color:${TEAL};font-weight:700;">${esc(quoteRef)}</strong></p>`
    : ''
  return `<tr><td style="padding:28px 24px 16px;text-align:center;border-bottom:2px solid ${GOLD};">
<p style="margin:0;font-size:28px;font-weight:800;letter-spacing:0.14em;color:${TEAL};">ALLEXO</p>
${refLine}
</td></tr>`
}

function ownerHeader() {
  return `<tr><td style="padding:28px 24px 12px;text-align:center;border-bottom:2px solid ${GOLD};">
<p style="margin:0;font-size:28px;font-weight:800;letter-spacing:0.14em;color:${TEAL};">ALLEXO</p>
</td></tr>`
}

/**
 * @param {import('../i18n/translations.js').Locale} locale
 * @param {ReturnType<typeof collectClientLineItems>[number]} item
 */
function clientItemCardHtml(locale, item) {
  const cost =
    item.lineTotalEur != null && item.lineTotalEur > 0
      ? formatEuroEmailExclVat(item.lineTotalEur, locale)
      : '—'
  const qty = `${item.quantity} ${translate(locale, 'emailHtml.qtyUnit')}`

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;border:1px solid ${BORDER};border-radius:8px;">
<tr><td style="padding:16px 18px;">
<p style="margin:0 0 12px;font-size:17px;font-weight:700;color:${TEAL};line-height:1.3;">${esc(item.title)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;">
<tr>
<td style="padding:3px 0;color:${MUTED};width:42%;vertical-align:top;">${esc(translate(locale, 'emailHtml.sizeLabel'))}</td>
<td style="padding:3px 0;font-weight:600;">${esc(item.size)}</td>
</tr>
<tr>
<td style="padding:3px 0;color:${MUTED};vertical-align:top;">${esc(translate(locale, 'emailHtml.qtyLabel'))}</td>
<td style="padding:3px 0;font-weight:600;">${esc(qty)}</td>
</tr>
<tr>
<td style="padding:3px 0;color:${MUTED};vertical-align:top;">${esc(translate(locale, 'emailHtml.costLabel'))}</td>
<td style="padding:3px 0;font-weight:700;color:${TEAL};">${esc(cost)}</td>
</tr>
</table>
</td></tr>
</table>`
}

/** @param {Record<string, unknown>} leadData */
function linesFromLead(leadData) {
  const calc = leadData.calculation_data ?? leadData.calculation_details
  if (!calc || typeof calc !== 'object') return []
  const lines = /** @type {unknown} */ (/** @type {Record<string, unknown>} */ (calc).lines)
  return Array.isArray(lines) ? lines : []
}

/** @param {import('../i18n/translations.js').Locale} locale */
function localeDisplayName(locale) {
  const map = {
    uk: 'Українська',
    en: 'English',
    nl: 'Nederlands',
    fr: 'Français',
  }
  return map[locale] || locale
}

/** @param {import('../i18n/translations.js').Locale} locale */
function localeToHtmlLang(locale) {
  return locale === 'uk' ? 'uk' : locale
}

/** @param {number} amount @param {import('../i18n/translations.js').Locale} locale */
function formatEuroAmount(amount, locale) {
  return formatEuroEmailPlain(amount, locale)
}

/**
 * @param {import('../i18n/translations.js').Locale} locale
 * @param {number} totalHours
 */
function clientWorkTimeText(locale, totalHours) {
  const days = approxWorkDays(totalHours)
  if (days <= 0) return translate(locale, 'emailHtml.workTimeDay1')
  if (days === 1) return translate(locale, 'emailHtml.workTimeDay1')
  if (days === 2) return translate(locale, 'emailHtml.workTimeDays2')
  return translate(locale, 'emailHtml.workTimeDaysN').replace('{n}', String(days))
}

/**
 * @param {import('../i18n/translations.js').Locale} locale
 * @param {number} amount
 * @param {boolean} [skipCta]
 */
function clientGrandTotalHtml(locale, amount, skipCta = false) {
  const euro = formatEuroAmount(amount, locale)
  const vat = translate(locale, 'price.exVat')
  const cta = skipCta
    ? ''
    : `<p style="margin:22px 0 0;font-size:15px;line-height:1.5;color:#1c2424;max-width:420px;margin-left:auto;margin-right:auto;">${esc(translate(locale, 'emailHtml.ctaReply'))}</p>`

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-top:2px solid ${GOLD};">
<tr><td align="center" style="padding:26px 16px 8px;">
<p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};">${esc(translate(locale, 'emailHtml.grandTotalLabel'))}</p>
<p style="margin:0;font-size:40px;font-weight:800;line-height:1.05;color:${TEAL};">${esc(euro)}</p>
<p style="margin:10px 0 0;font-size:14px;color:${MUTED};">(${esc(vat)})</p>
${cta}
</td></tr>
</table>`
}

/**
 * @param {Record<string, unknown>} leadData
 */
export function buildClientEmailHtml(leadData) {
  const locale = /** @type {import('../i18n/translations.js').Locale} */ (
    typeof leadData.language === 'string' ? leadData.language : 'uk'
  )
  const name = String(leadData.name || '').trim() || translate(locale, 'proposal.clientFallbackName')
  const quoteRef = quoteReferenceFromLead(leadData)
  const lines = linesFromLead(leadData)
  const totalAmount = Number(leadData.total_price) || 0
  const { discountEuros, discountPercent, travelMeta } = proposalPricingFromLead(leadData)
  const skipCta = leadData.skipClientCta === true

  const proposalContent = buildProposalContentHtml({
    lines,
    locale,
    estimatedTotalEur: totalAmount,
    discountEuros,
    discountPercent,
    clientName: name,
    quoteReference: quoteRef,
    travelMeta: /** @type {Parameters<typeof buildProposalContentHtml>[0]['travelMeta']} */ (travelMeta),
    variant: 'email',
    showTopHeader: false,
    showBottomContacts: false,
  })

  const ctaBlock = skipCta
    ? ''
    : `<p style="margin:20px 0 0;font-size:15px;line-height:1.5;color:#1c2424;text-align:center;">${esc(translate(locale, 'emailHtml.ctaReply'))}</p>`

  const body = `${clientHeader(locale, quoteRef)}
<tr><td style="padding:20px 20px 8px;">
${proposalContent}
${ctaBlock}
<p style="margin:16px 0 8px;font-size:14px;text-align:center;color:#1c2424;">${esc(translate(locale, 'emailHtml.planningNote'))}</p>
<p style="margin:0 0 6px;font-size:14px;color:${MUTED};text-align:center;">${esc(translate(locale, 'emailHtml.preliminaryNote'))}</p>
<p style="margin:0 0 24px;font-size:14px;color:${MUTED};text-align:center;">${esc(translate(locale, 'emailHtml.finalPriceNote'))}</p>
</td></tr>
<tr><td style="padding:18px 24px 26px;background:${BG};border-top:1px solid ${BORDER};text-align:center;">
<p style="margin:0 0 10px;font-size:15px;font-weight:700;color:${TEAL};">ALLEXO</p>
<p style="margin:0;font-size:15px;"><a href="mailto:${esc(CONTACT_EMAIL)}" style="color:${TEAL};text-decoration:none;">${esc(CONTACT_EMAIL)}</a></p>
<p style="margin:8px 0 0;font-size:15px;"><a href="${esc(CONTACT_PHONE_HREF)}" style="color:${TEAL};text-decoration:none;">+32 493 86 07 53</a></p>
<p style="margin:8px 0 0;font-size:14px;color:${MUTED};">Brugge, Belgium</p>
</td></tr>`

  return emailShell(body, localeToHtmlLang(locale))
}

/**
 * @param {ReturnType<typeof collectOwnerLineItems>[number]} item
 */
function ownerItemBlockHtml(item) {
  const price =
    item.lineTotalEur != null && item.lineTotalEur > 0
      ? formatEuroExclVat(item.lineTotalEur, 'uk')
      : '—'
  const sizes = item.sizeLines.map((l) => esc(l)).join('<br>')
  const qty = `${item.quantity} шт`

  return `<div style="margin:0 0 16px;padding:14px 16px;border:1px solid ${BORDER};border-radius:8px;background:#fafbfb;">
<p style="margin:0 0 6px;font-size:16px;font-weight:700;color:${TEAL};">${esc(item.title)}</p>
<p style="margin:0 0 8px;font-size:15px;line-height:1.45;">${sizes}</p>
<p style="margin:0 0 4px;font-size:15px;">${esc(qty)}</p>
<p style="margin:0;font-size:16px;font-weight:700;color:${TEAL};">${esc(price)}</p>
</div>`
}

/**
 * @param {Record<string, unknown>} leadData
 */
export function buildOwnerEmailHtml(leadData) {
  const clientLocale = /** @type {import('../i18n/translations.js').Locale} */ (
    typeof leadData.language === 'string' ? leadData.language : 'uk'
  )
  const lines = linesFromLead(leadData)
  const items = collectOwnerLineItems(lines, 'uk')
  const total = formatEuroExclVat(Number(leadData.total_price) || 0, clientLocale)
  const hours = computeBufferedWorkHours(lines)
  const hoursStr = Number.isFinite(hours) && hours > 0 ? String(hours) : '—'
  const dash = '—'
  const city = String(leadData.city || '').trim() || dash
  const comment = String(leadData.comment || '').trim() || dash
  const quoteRef = quoteReferenceFromLead(leadData)
  const refBlock = quoteRef
    ? `<p style="margin:0 0 6px;font-size:14px;color:${MUTED};">Номер заявки:</p>
<p style="margin:0 0 22px;font-size:22px;font-weight:800;color:${TEAL};letter-spacing:0.04em;">${esc(quoteRef)}</p>`
    : ''

  const orderBlocks = items.length ? items.map((item) => ownerItemBlockHtml(item)).join('') : `<p style="margin:0;color:${MUTED};">${dash}</p>`

  const body = `${ownerHeader()}
<tr><td style="padding:24px;">
<h1 style="margin:0 0 16px;font-size:19px;font-weight:800;color:${TEAL};">Нова заявка з сайту ALLEXO</h1>
${refBlock}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;font-size:15px;">
<tr><td style="padding:4px 0;width:110px;color:${MUTED};vertical-align:top;">Ім'я</td><td style="padding:4px 0;"><strong>${esc(leadData.name)}</strong></td></tr>
<tr><td style="padding:4px 0;color:${MUTED};vertical-align:top;">Телефон</td><td style="padding:4px 0;"><a href="tel:${esc(String(leadData.phone || ''))}" style="color:${TEAL};">${esc(leadData.phone)}</a></td></tr>
<tr><td style="padding:4px 0;color:${MUTED};vertical-align:top;">Email</td><td style="padding:4px 0;"><a href="mailto:${esc(String(leadData.email || ''))}" style="color:${TEAL};">${esc(leadData.email)}</a></td></tr>
<tr><td style="padding:4px 0;color:${MUTED};vertical-align:top;">Місто</td><td style="padding:4px 0;">${esc(city)}</td></tr>
<tr><td style="padding:4px 0;color:${MUTED};vertical-align:top;">Коментар</td><td style="padding:4px 0;">${esc(comment)}</td></tr>
</table>
<hr style="border:none;border-top:1px solid ${BORDER};margin:22px 0;">
<p style="margin:0 0 14px;font-size:15px;font-weight:700;color:${TEAL};">Замовлення</p>
${orderBlocks}
<hr style="border:none;border-top:1px solid ${BORDER};margin:22px 0;">
<p style="margin:0 0 10px;font-size:15px;font-weight:700;color:${TEAL};">Підсумок</p>
<p style="margin:4px 0;font-size:15px;">Позицій: <strong>${leadData.positions_count ?? (items.length || dash)}</strong></p>
<p style="margin:4px 0;font-size:15px;">Вікон: <strong>${leadData.windows_count ?? dash}</strong></p>
<p style="margin:14px 0 6px;font-size:22px;font-weight:800;color:${TEAL};">Разом: ${esc(total)}</p>
<p style="margin:4px 0;font-size:15px;">Орієнтовний час: <strong>${esc(hoursStr)} год</strong></p>
<p style="margin:10px 0 0;font-size:14px;color:${MUTED};">Мова заявки: ${esc(localeDisplayName(clientLocale))}</p>
</td></tr>`

  return emailShell(body, 'uk')
}

/**
 * @param {Record<string, unknown>} leadData
 */
export function buildClientEmailPlain(leadData) {
  const locale = /** @type {import('../i18n/translations.js').Locale} */ (
    typeof leadData.language === 'string' ? leadData.language : 'uk'
  )
  const name = String(leadData.name || '').trim() || translate(locale, 'proposal.clientFallbackName')
  const quoteRef = quoteReferenceFromLead(leadData)
  const lines = linesFromLead(leadData)
  const items = collectClientLineItems(lines, locale)
  const totalAmount = Number(leadData.total_price) || 0
  const hours = computeBufferedWorkHours(lines)
  const workTimeText = clientWorkTimeText(locale, hours)
  const vat = translate(locale, 'price.exVat')
  const skipCta = leadData.skipClientCta === true

  const itemBlocks = items.flatMap((item) => {
    const cost =
      item.lineTotalEur != null && item.lineTotalEur > 0
        ? formatEuroEmailExclVat(item.lineTotalEur, locale)
        : '—'
    return [
      item.title,
      `${translate(locale, 'emailHtml.sizeLabel')}: ${item.size}`,
      `${translate(locale, 'emailHtml.qtyLabel')}: ${item.quantity} ${translate(locale, 'emailHtml.qtyUnit')}`,
      `${translate(locale, 'emailHtml.costLabel')}: ${cost}`,
      '---',
    ]
  })

  return [
    'ALLEXO',
    ...(quoteRef
      ? [`${translate(locale, 'emailHtml.quoteReferenceLabel')}: ${quoteRef}`, '']
      : []),
    translate(locale, 'emailHtml.clientGreeting').replace('{name}', name),
    translate(locale, 'emailHtml.clientThanks'),
    translate(locale, 'emailHtml.clientIntro'),
    '',
    translate(locale, 'emailHtml.yourOrder'),
    '',
    ...itemBlocks,
    '---',
    '━━━━━━━━━━━━━━━━━━━━',
    translate(locale, 'emailHtml.grandTotalLabel').toUpperCase(),
    '',
    formatEuroAmount(totalAmount, locale),
    `(${vat})`,
    '━━━━━━━━━━━━━━━━━━━━',
    '',
    ...(skipCta ? [] : [translate(locale, 'emailHtml.ctaReply'), '']),
    workTimeText,
    translate(locale, 'emailHtml.planningNote'),
    '',
    translate(locale, 'emailHtml.preliminaryNote'),
    translate(locale, 'emailHtml.finalPriceNote'),
    '',
    'ALLEXO',
    CONTACT_EMAIL,
    '+32 493 86 07 53',
    'Brugge, Belgium',
  ].join('\n')
}

/** @param {string} s */
function waBold(s) {
  return `*${String(s).replace(/[*_~`]/g, '')}*`
}

/**
 * Пропозиція для WhatsApp — структурований текст із *жирним* (підтримка WhatsApp).
 * @param {Record<string, unknown>} leadData
 */
export function buildClientEmailWhatsApp(leadData) {
  const locale = /** @type {import('../i18n/translations.js').Locale} */ (
    typeof leadData.language === 'string' ? leadData.language : 'uk'
  )
  const name = String(leadData.name || '').trim() || translate(locale, 'proposal.clientFallbackName')
  const quoteRef = quoteReferenceFromLead(leadData)
  const lines = linesFromLead(leadData)
  const items = collectClientLineItems(lines, locale)
  const totalAmount = Number(leadData.total_price) || 0
  const hours = computeBufferedWorkHours(lines)
  const workTimeText = clientWorkTimeText(locale, hours)
  const vat = translate(locale, 'price.exVat')
  const sep = '══════════════════════'

  const itemBlocks = items.flatMap((item) => {
    const cost =
      item.lineTotalEur != null && item.lineTotalEur > 0
        ? formatEuroEmailExclVat(item.lineTotalEur, locale)
        : '—'
    return [
      '',
      waBold(item.title),
      `▸ ${translate(locale, 'emailHtml.sizeLabel')}: ${item.size}`,
      `▸ ${translate(locale, 'emailHtml.qtyLabel')}: ${item.quantity} ${translate(locale, 'emailHtml.qtyUnit')}`,
      `▸ ${translate(locale, 'emailHtml.costLabel')}: ${waBold(cost)} (${vat})`,
    ]
  })

  const yourOrder = translate(locale, 'emailHtml.yourOrder').replace(/:$/, '').trim()

  return [
    waBold('ALLEXO'),
    sep,
    ...(quoteRef
      ? [`${translate(locale, 'emailHtml.quoteReferenceLabel')}: ${waBold(quoteRef)}`, '']
      : []),
    translate(locale, 'emailHtml.clientGreeting').replace('{name}', name),
    translate(locale, 'emailHtml.clientThanks'),
    translate(locale, 'emailHtml.clientIntro'),
    '',
    waBold(yourOrder.toUpperCase()),
    ...itemBlocks,
    '',
    sep,
    waBold(translate(locale, 'emailHtml.grandTotalLabel').toUpperCase()),
    '',
    waBold(formatEuroAmount(totalAmount, locale)),
    `(${vat})`,
    sep,
    '',
    workTimeText,
    translate(locale, 'emailHtml.planningNote'),
    '',
    translate(locale, 'emailHtml.preliminaryNote'),
    translate(locale, 'emailHtml.finalPriceNote'),
    '',
    waBold('ALLEXO'),
    `📧 ${CONTACT_EMAIL}`,
    '📞 +32 493 86 07 53',
    '📍 Brugge, Belgium',
  ].join('\n')
}

/** @param {Record<string, unknown>} leadData */
export function buildOwnerEmailPlain(leadData) {
  const clientLocale = /** @type {import('../i18n/translations.js').Locale} */ (
    typeof leadData.language === 'string' ? leadData.language : 'uk'
  )
  const lines = linesFromLead(leadData)
  const items = collectOwnerLineItems(lines, 'uk')
  const total = formatEuroExclVat(Number(leadData.total_price) || 0, clientLocale)
  const hours = computeBufferedWorkHours(lines)
  const hoursStr = Number.isFinite(hours) && hours > 0 ? String(hours) : '—'
  const dash = '—'
  const city = String(leadData.city || '').trim() || dash
  const comment = String(leadData.comment || '').trim() || dash

  const orderBlocks = items.flatMap((item) => {
    const price =
      item.lineTotalEur != null && item.lineTotalEur > 0
        ? formatEuroExclVat(item.lineTotalEur, clientLocale)
        : dash
    return [
      item.title,
      ...item.sizeLines,
      `${item.quantity} шт`,
      price,
      '',
    ]
  })

  const quoteRef = quoteReferenceFromLead(leadData)

  return [
    'Нова заявка з сайту ALLEXO',
    ...(quoteRef ? ['', 'Номер заявки:', quoteRef, ''] : ['']),
    `Ім'я: ${leadData.name}`,
    `Телефон: ${leadData.phone}`,
    `Email: ${leadData.email}`,
    `Місто: ${city}`,
    `Коментар: ${comment}`,
    '',
    '---',
    'Замовлення:',
    '',
    ...(orderBlocks.length ? orderBlocks : [dash, '']),
    '---',
    'Підсумок:',
    `Позицій: ${leadData.positions_count ?? (items.length || dash)}`,
    `Вікон: ${leadData.windows_count ?? dash}`,
    `Разом: ${total}`,
    `Орієнтовний час: ${hoursStr} год`,
    `Мова заявки: ${localeDisplayName(clientLocale)}`,
  ].join('\n')
}

/** @param {import('../i18n/translations.js').Locale} locale */
export function clientEmailSubject(locale) {
  return translate(locale, 'emailHtml.clientSubject')
}

export function ownerEmailSubject() {
  return translate('uk', 'emailHtml.ownerSubject')
}
