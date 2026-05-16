/**
 * Доставка пропозиції через Cloudflare Pages Function + Resend.
 * У Cloudflare Pages (Settings → Environment variables):
 * RESEND_API_KEY, RESEND_FROM_EMAIL, OWNER_EMAIL (опційно)
 *
 * У `.env` (опційно): VITE_PROPOSAL_DELIVERY_URL=https://allexo.be/api/proposal-delivery
 * Якщо не задано — на проді використовується /api/proposal-delivery поточного домену.
 */

/**
 * @returns {string}
 */
export function getProposalDeliveryUrl() {
  const explicit = String(import.meta.env.VITE_PROPOSAL_DELIVERY_URL || '').trim()
  if (explicit) return explicit
  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL('/api/proposal-delivery', window.location.origin).href
  }
  return ''
}

/**
 * @typedef {Object} ProposalDeliveryPayload
 * @property {'email'|'phone'} delivery_target
 * @property {string} [to_email]
 * @property {string} [to_phone]
 * @property {string} subject
 * @property {string} proposal_plain
 */

/**
 * @typedef {Object} LeadDeliveryPayload
 * @property {'lead'} mode
 * @property {string} to_email
 * @property {string} subject
 * @property {string} client_plain
 * @property {string} owner_email
 * @property {string} owner_subject
 * @property {string} owner_plain
 * @property {string} [reply_to]
 */

/**
 * @param {ProposalDeliveryPayload} payload
 */
export async function deliverClientProposal(payload) {
  const url = getProposalDeliveryUrl()
  if (!url) {
    console.info('[deliverClientProposal] Немає URL доставки.')
    return { ok: true, skipped: true }
  }

  const res = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  let body = /** @type {unknown} */ (null)
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }

  if (!res.ok) {
    const msg =
      typeof body === 'object' && body !== null && 'error' in body && typeof /** @type {any} */ (body).error === 'string'
        ? /** @type {any} */ (body).error
        : text || `HTTP ${res.status}`
    throw new Error(msg)
  }

  return { ok: true, body }
}

/**
 * Лист клієнту + копія власнику через Resend (сервер).
 * @param {LeadDeliveryPayload} payload
 * @returns {Promise<{ ok: boolean, skipped?: boolean, clientSent?: boolean, ownerSent?: boolean }>}
 */
export async function deliverLeadEmails(payload) {
  const url = getProposalDeliveryUrl()
  if (!url) {
    return { ok: false, skipped: true }
  }

  const res = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  let body = /** @type {Record<string, unknown>} */ ({})
  try {
    body = text ? /** @type {Record<string, unknown>} */ (JSON.parse(text)) : {}
  } catch {
    body = { error: text }
  }

  if (!res.ok) {
    const msg = typeof body.error === 'string' ? body.error : text || `HTTP ${res.status}`
    throw new Error(msg)
  }

  const clientSent = Boolean(body.clientSent)
  const ownerSent = Boolean(body.ownerSent)
  if (!clientSent && !ownerSent) {
    const hint =
      typeof body.error === 'string'
        ? body.error
        : text && text.trim().startsWith('<')
          ? 'API повернув HTML замість JSON — перевірте, чи задеплоєно functions/api на Cloudflare'
          : 'Resend не надіслав листи (clientSent/ownerSent = false)'
    throw new Error(hint)
  }

  return { ok: true, clientSent, ownerSent }
}
