import { CONTACT_EMAIL, CONTACT_PHONE_HREF } from '../constants/contact.js'
import { translate } from '../i18n/translations.js'
import { formatEuroExclVat } from './priceDisplay.js'
import {
  collectClientLineItems,
  collectOwnerLineItems,
  computeBufferedWorkHours,
} from './proposalLineItems.js'

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

function clientHeader() {
  return `<tr><td style="padding:28px 24px 16px;text-align:center;border-bottom:2px solid ${GOLD};">
<p style="margin:0;font-size:28px;font-weight:800;letter-spacing:0.14em;color:${TEAL};">ALLEXO</p>
</td></tr>`
}

function ownerHeader() {
  return clientHeader()
}

/**
 * @param {import('../i18n/translations.js').Locale} locale
 * @param {ReturnType<typeof collectClientLineItems>[number]} item
 */
function clientItemCardHtml(locale, item) {
  const cost =
    item.lineTotalEur != null && item.lineTotalEur > 0
      ? formatEuroExclVat(item.lineTotalEur, locale)
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

/**
 * @param {Record<string, unknown>} leadData
 */
export function buildClientEmailHtml(leadData) {
  const locale = /** @type {import('../i18n/translations.js').Locale} */ (
    typeof leadData.language === 'string' ? leadData.language : 'uk'
  )
  const name = String(leadData.name || '').trim() || translate(locale, 'proposal.clientFallbackName')
  const lines = linesFromLead(leadData)
  const items = collectClientLineItems(lines, locale)
  const total = formatEuroExclVat(Number(leadData.total_price) || 0, locale)
  const hours = computeBufferedWorkHours(lines)
  const hoursStr = Number.isFinite(hours) && hours > 0 ? String(hours) : '—'

  const cards = items.length
    ? items.map((item) => clientItemCardHtml(locale, item)).join('')
    : `<p style="margin:0;color:${MUTED};font-size:15px;">${esc(translate(locale, 'emailHtml.noLineItems'))}</p>`

  const body = `${clientHeader()}
<tr><td style="padding:24px 24px 8px;">
<p style="margin:0 0 12px;font-size:16px;">${esc(translate(locale, 'emailHtml.clientGreeting').replace('{name}', name))}</p>
<p style="margin:0 0 8px;font-size:16px;">${esc(translate(locale, 'emailHtml.clientThanks'))}</p>
<p style="margin:0 0 22px;font-size:16px;">${esc(translate(locale, 'emailHtml.clientIntro'))}</p>
<p style="margin:0 0 14px;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED};">${esc(translate(locale, 'emailHtml.yourOrder'))}</p>
${cards}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border-top:2px solid ${GOLD};">
<tr><td style="padding:18px 0 6px;">
<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};">${esc(translate(locale, 'emailHtml.grandTotalLabel'))}</p>
<p style="margin:0;font-size:28px;font-weight:800;color:${TEAL};">${esc(total)}</p>
</td></tr>
</table>
<p style="margin:18px 0 4px;font-size:15px;"><span style="color:${MUTED};">${esc(translate(locale, 'emailHtml.estHoursLabel'))}</span> <strong>${esc(hoursStr)} ${esc(translate(locale, 'emailHtml.hoursUnit'))}</strong></p>
<p style="margin:0 0 20px;font-size:15px;"><span style="color:${MUTED};">${esc(translate(locale, 'emailHtml.deadlineLabel'))}</span> ${esc(translate(locale, 'emailHtml.deadlineNote'))}</p>
<p style="margin:0 0 6px;font-size:14px;color:${MUTED};">${esc(translate(locale, 'emailHtml.preliminaryNote'))}</p>
<p style="margin:0 0 24px;font-size:14px;color:${MUTED};">${esc(translate(locale, 'emailHtml.finalPriceNote'))}</p>
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

  const orderBlocks = items.length ? items.map((item) => ownerItemBlockHtml(item)).join('') : `<p style="margin:0;color:${MUTED};">${dash}</p>`

  const body = `${ownerHeader()}
<tr><td style="padding:24px;">
<h1 style="margin:0 0 22px;font-size:19px;font-weight:800;color:${TEAL};">Нова заявка з сайту ALLEXO</h1>
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
  const lines = linesFromLead(leadData)
  const items = collectClientLineItems(lines, locale)
  const total = formatEuroExclVat(Number(leadData.total_price) || 0, locale)
  const hours = computeBufferedWorkHours(lines)
  const hoursStr = Number.isFinite(hours) && hours > 0 ? String(hours) : '—'

  const itemBlocks = items.flatMap((item) => {
    const cost =
      item.lineTotalEur != null && item.lineTotalEur > 0
        ? formatEuroExclVat(item.lineTotalEur, locale)
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
    '',
    translate(locale, 'emailHtml.clientGreeting').replace('{name}', name),
    translate(locale, 'emailHtml.clientThanks'),
    translate(locale, 'emailHtml.clientIntro'),
    '',
    translate(locale, 'emailHtml.yourOrder'),
    '',
    ...itemBlocks,
    '---',
    translate(locale, 'emailHtml.grandTotalLabel'),
    total,
    '---',
    `${translate(locale, 'emailHtml.estHoursLabel')} ${hoursStr} ${translate(locale, 'emailHtml.hoursUnit')}`,
    `${translate(locale, 'emailHtml.deadlineLabel')} ${translate(locale, 'emailHtml.deadlineNote')}`,
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

  return [
    'Нова заявка з сайту ALLEXO',
    '',
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
