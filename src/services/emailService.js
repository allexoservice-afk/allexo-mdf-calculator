import { typeTitle, translate } from '../i18n/translations.js'
import { CONTACT_EMAIL } from '../constants/contact.js'
import { SITE_URL } from '../constants/site.js'
import { deliverLeadEmails, getProposalDeliveryUrl } from './proposalDelivery.js'
import { formatEuroExclVat } from '../utils/priceDisplay.js'

const OWNER_EMAIL = CONTACT_EMAIL
const ALLEXO_PHONE = '+32 493 86 07 53'

function emailJsConfigured() {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
  const clientTpl = import.meta.env.VITE_EMAILJS_TEMPLATE_CLIENT_ID
  const ownerTpl = import.meta.env.VITE_EMAILJS_TEMPLATE_OWNER_ID
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
  return (
    String(serviceId ?? '').trim() &&
    String(clientTpl ?? '').trim() &&
    String(ownerTpl ?? '').trim() &&
    String(publicKey ?? '').trim()
  )
}

/**
 * @param {string} templateId
 * @param {Record<string, string>} templateParams
 */
async function sendEmailJsTemplate(templateId, templateParams) {
  const serviceId = String(import.meta.env.VITE_EMAILJS_SERVICE_ID).trim()
  const publicKey = String(import.meta.env.VITE_EMAILJS_PUBLIC_KEY).trim()

  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: String(templateId).trim(),
      user_id: publicKey,
      template_params: templateParams,
    }),
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(text || `EmailJS HTTP ${res.status}`)
  }
}

/**
 * Короткий опис позицій без цін (лише типи робіт).
 * @param {import('../i18n/translations.js').Locale} locale
 * @param {Record<string, unknown>} leadData
 */
function buildPositionsSummary(locale, leadData) {
  const calc = leadData.calculation_data ?? leadData.calculation_details
  if (!calc || typeof calc !== 'object') return '—'
  const lines = /** @type {unknown} */ (/** @type {Record<string, unknown>} */ (calc).lines)
  if (!Array.isArray(lines)) return '—'
  const parts = []
  for (const raw of lines) {
    const L = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {}
    const tid = typeof L.typeId === 'string' ? L.typeId : ''
    if (!tid) continue
    parts.push(`• ${typeTitle(locale, tid)}`)
  }
  return parts.join('\n') || '—'
}

/**
 * Лист клієнту — без формул, без цін за одиницю, лише орієнтовний підсумок.
 * @param {Record<string, unknown>} leadData
 */
function buildClientEmailBody(leadData) {
  const locale = /** @type {import('../i18n/translations.js').Locale} */ (
    typeof leadData.language === 'string' ? leadData.language : 'uk'
  )
  const name = String(leadData.name || '').trim()
  const price = formatEuroExclVat(Number(leadData.total_price) || 0, locale)
  const calcForCount = leadData.calculation_data ?? leadData.calculation_details
  const linesForCount =
    calcForCount && typeof calcForCount === 'object'
      ? /** @type {unknown} */ (/** @type {Record<string, unknown>} */ (calcForCount).lines)
      : null
  const positions =
    leadData.positions_count != null
      ? String(leadData.positions_count)
      : Array.isArray(linesForCount)
        ? String(linesForCount.length)
        : '—'
  const windows = String(leadData.windows_count ?? '—')
  const summary = buildPositionsSummary(locale, leadData)

  return [
    translate(locale, 'email.clientGreeting').replace('{name}', name),
    '',
    `${translate(locale, 'email.positionsLabel')}: ${positions}`,
    `${translate(locale, 'email.windowsLabel')}: ${windows}`,
    `${translate(locale, 'email.estimatedLabel')}: ${price}`,
    '',
    summary,
    '',
    translate(locale, 'email.disclaimer'),
    '',
    translate(locale, 'email.contactHeader'),
    `${translate(locale, 'contacts.phoneDisplay')}`,
    `${translate(locale, 'contacts.emailDisplay')}`,
    '',
    `${translate(locale, 'email.siteLabel')}: ${SITE_URL}`,
  ].join('\n')
}

/**
 * Лист власнику — повні контакти + сума + JSON розрахунку.
 * @param {Record<string, unknown>} leadData
 */
function buildOwnerEmailBody(leadData) {
  const locale = /** @type {import('../i18n/translations.js').Locale} */ (
    typeof leadData.language === 'string' ? leadData.language : 'uk'
  )
  const price = formatEuroExclVat(Number(leadData.total_price) || 0, locale)
  const calcJson = JSON.stringify(
    leadData.calculation_data ?? leadData.calculation_details ?? {},
    null,
    2,
  )

  return [
    'ALLEXO — new quote request (website)',
    '',
    `Name: ${leadData.name}`,
    `Phone: ${leadData.phone}`,
    `Email: ${leadData.email}`,
    `City: ${leadData.city || '—'}`,
    `Preferred contact: ${leadData.preferred_contact_method || '—'}`,
    `Comment: ${leadData.comment || '—'}`,
    '',
    `Positions: ${leadData.positions_count ?? '—'}`,
    `Windows (units): ${leadData.windows_count ?? '—'}`,
    `Total (excl. VAT): ${price}`,
    `Discount (€): ${leadData.discount ?? 0}`,
    `Language: ${leadData.language || '—'}`,
    '',
    'Calculation data (JSON):',
    calcJson,
  ].join('\n')
}

/**
 * @param {Record<string, unknown>} leadData
 */
function buildSharedParams(leadData) {
  const locale = /** @type {import('../i18n/translations.js').Locale} */ (
    typeof leadData.language === 'string' ? leadData.language : 'uk'
  )
  const clientBody = buildClientEmailBody(leadData)
  const ownerBody = buildOwnerEmailBody(leadData)
  const price = formatEuroExclVat(Number(leadData.total_price) || 0, locale)

  return {
    client_name: String(leadData.name || '').trim(),
    client_email: String(leadData.email || '').trim(),
    client_phone: String(leadData.phone || '').trim(),
    city: String(leadData.city || '').trim() || '—',
    preferred_contact_method: String(leadData.preferred_contact_method || ''),
    comment: String(leadData.comment || '').trim() || '—',
    estimated_price: price,
    positions_count: String(leadData.positions_count ?? ''),
    windows_count: String(leadData.windows_count ?? ''),
    short_description: buildPositionsSummary(locale, leadData),
    disclaimer: translate(locale, 'email.disclaimer'),
    allexo_phone: ALLEXO_PHONE,
    allexo_email: CONTACT_EMAIL,
    site_url: SITE_URL,
    client_email_body: clientBody,
    owner_email_body: ownerBody,
    calculation_json: JSON.stringify(
      leadData.calculation_data ?? leadData.calculation_details ?? {},
      null,
      2,
    ),
    reply_to: String(leadData.email || '').trim(),
  }
}

/**
 * Лист клієнту + лист на info@allexo.be.
 *
 * @param {Record<string, unknown>} leadData
 * @returns {Promise<{ ok: true, clientSent: boolean, ownerSent: boolean } | { ok: false, code: string, error?: string }>}
 */
function useEmailJsFallback() {
  return String(import.meta.env.VITE_USE_EMAILJS ?? '').trim() === 'true' && emailJsConfigured()
}

/**
 * Варіант A: Resend через Cloudflare Function `/api/proposal-delivery`.
 * EmailJS — лише якщо явно VITE_USE_EMAILJS=true і Resend не надіслав лист.
 */
export async function sendLeadEmails(leadData) {
  const shared = buildSharedParams(leadData)
  const locale = /** @type {import('../i18n/translations.js').Locale} */ (
    typeof leadData.language === 'string' ? leadData.language : 'uk'
  )
  const clientSubject = translate(locale, 'proposal.emailSubject')
  const ownerSubject = `ALLEXO — заявка з сайту (${shared.client_name || 'client'})`

  let clientSent = false
  let ownerSent = false
  let code = ''

  const deliveryUrl = getProposalDeliveryUrl()
  if (deliveryUrl) {
    try {
      const server = await deliverLeadEmails({
        mode: 'lead',
        to_email: shared.client_email,
        subject: clientSubject,
        client_plain: shared.client_email_body,
        owner_email: OWNER_EMAIL,
        owner_subject: ownerSubject,
        owner_plain: shared.owner_email_body,
        reply_to: shared.reply_to,
      })
      if (server.clientSent) clientSent = true
      if (server.ownerSent) ownerSent = true
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[sendLeadEmails] Resend', msg)
      code = 'email_send_failed'
      /** @type {any} */ (leadData)._lastMailError = msg
    }
  } else {
    code = 'email_not_configured'
  }

  if ((!clientSent || !ownerSent) && useEmailJsFallback()) {
    const clientTpl = import.meta.env.VITE_EMAILJS_TEMPLATE_CLIENT_ID
    const ownerTpl = import.meta.env.VITE_EMAILJS_TEMPLATE_OWNER_ID

    if (!clientSent) {
      try {
        await sendEmailJsTemplate(String(clientTpl), {
          ...shared,
          to_email: shared.client_email,
          message: shared.client_email_body,
          quote_email_body: shared.client_email_body,
        })
        clientSent = true
      } catch (e) {
        console.error('[sendLeadEmails] EmailJS client', e)
      }
    }

    if (!ownerSent) {
      try {
        await sendEmailJsTemplate(String(ownerTpl), {
          ...shared,
          to_email: OWNER_EMAIL,
          message: shared.owner_email_body,
          quote_email_body: shared.owner_email_body,
        })
        ownerSent = true
      } catch (e) {
        console.error('[sendLeadEmails] EmailJS owner', e)
      }
    }
  }

  if (!clientSent && !ownerSent) {
    const detail =
      typeof leadData._lastMailError === 'string' ? leadData._lastMailError : 'Client and owner emails were not sent'
    return {
      ok: false,
      code: code || 'email_send_failed',
      error: detail,
      clientSent,
      ownerSent,
    }
  }

  return { ok: true, clientSent, ownerSent, code: clientSent ? '' : 'client_email_failed' }
}

/** @deprecated */
export async function sendQuoteEmail(leadData) {
  const r = await sendLeadEmails(leadData)
  if (!r.ok) return r
  return { ok: true }
}
