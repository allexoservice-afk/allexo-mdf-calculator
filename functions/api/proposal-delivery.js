/**
 * Cloudflare Pages Function — POST /api/proposal-delivery
 *
 * Secrets (Settings → Environment variables):
 * - RESEND_API_KEY — https://resend.com (лист клієнту та власнику)
 * - RESEND_FROM_EMAIL — підтверджений відправник (напр. onboarding@resend.dev для тесту)
 * - OWNER_EMAIL — куди слати копію заявки (за замовч. info@allexo.be)
 * - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER — опційно для SMS на номер телефону
 * - ALLOWED_ORIGINS — через кому, напр. https://allexo.be,https://www.allexo.be (якщо порожньо — перевірка Origin вимкнена)
 */

/** @param {string} input */
function normalizeToE164(input) {
  const s0 = String(input || '')
    .trim()
    .replace(/\s+/g, '')
  if (!s0) return ''
  if (s0.startsWith('+')) {
    const d = s0.slice(1).replace(/\D/g, '')
    return d ? `+${d}` : ''
  }
  const d = s0.replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('00')) return `+${d.slice(2)}`
  if (d.startsWith('32')) return `+${d}`
  if (d.startsWith('0') && d.length >= 9) return `+32${d.replace(/^0+/, '')}`
  return `+${d}`
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {{ to: string, subject: string, text: string, replyTo?: string }} mail
 */
async function sendResendEmail(env, mail) {
  const key = env.RESEND_API_KEY
  if (!key) {
    throw new Error('RESEND_API_KEY not configured')
  }
  const from = String(env.RESEND_FROM_EMAIL || 'ALLEXO <info@allexo.be>').trim()
  /** @type {Record<string, unknown>} */
  const payload = {
    from,
    to: [mail.to],
    subject: mail.subject,
    text: mail.text,
  }
  if (mail.replyTo) payload.reply_to = mail.replyTo

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const rrText = await resendRes.text()
  if (!resendRes.ok) {
    let detail = rrText
    try {
      const j = JSON.parse(rrText)
      if (j && typeof j.message === 'string') detail = j.message
    } catch {
      /* keep raw */
    }
    throw new Error(detail || String(resendRes.status))
  }
}

/** @param {string} origin */
function corsHeaders(origin) {
  const o = origin && origin !== 'null' ? origin : '*'
  return {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

/** Діагностика: GET /api/proposal-delivery → чи є RESEND_API_KEY (без значення). */
export async function onRequestGet(ctx) {
  const { env } = ctx
  const origin = ctx.request.headers.get('Origin') || '*'
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' }
  return new Response(
    JSON.stringify({
      ok: true,
      resend_configured: Boolean(env.RESEND_API_KEY),
      from: String(env.RESEND_FROM_EMAIL || 'ALLEXO <info@allexo.be>'),
      owner: String(env.OWNER_EMAIL || 'info@allexo.be'),
    }),
    { status: 200, headers },
  )
}

/** @param {{ request: Request }} ctx */
export async function onRequestOptions(ctx) {
  const origin = ctx.request.headers.get('Origin') || '*'
  return new Response(null, { status: 204, headers: corsHeaders(origin) })
}

/**
 * @param {{
 *   request: Request
 *   env: Record<string, string | undefined>
 * }} ctx
 */
export async function onRequestPost(ctx) {
  const { request, env } = ctx
  const origin = request.headers.get('Origin') || '*'
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' }

  const allowed = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (allowed.length && origin && origin !== 'null') {
    const ok = allowed.some((a) => {
      if (!a) return false
      return origin === a || origin.startsWith(`${a}/`)
    })
    if (!ok) {
      return new Response(
        JSON.stringify({ ok: false, error: `Origin not allowed: ${origin}` }),
        { status: 403, headers },
      )
    }
  }

  let body
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers })
  }

  const target = body.delivery_target
  const proposalPlain = String(body.proposal_plain || '')
  const subject = String(body.subject || 'ALLEXO proposal')

  if (body.mode === 'lead') {
    const clientTo = String(body.to_email || '').trim()
    const clientPlain = String(body.client_plain || body.proposal_plain || '').trim()
    const clientSubject = String(body.subject || 'ALLEXO proposal')
    const ownerTo = String(body.owner_email || env.OWNER_EMAIL || 'info@allexo.be').trim()
    const ownerPlain = String(body.owner_plain || '').trim()
    const ownerSubject = String(body.owner_subject || 'ALLEXO — new quote request')

    if (!env.RESEND_API_KEY) {
      return new Response(JSON.stringify({ ok: false, error: 'RESEND_API_KEY not configured' }), {
        status: 503,
        headers,
      })
    }

    let clientSent = false
    let ownerSent = false
    const errors = []

    if (clientTo && clientPlain) {
      try {
        await sendResendEmail(env, {
          to: clientTo,
          subject: clientSubject,
          text: clientPlain,
          replyTo: String(body.reply_to || '').trim() || undefined,
        })
        clientSent = true
      } catch (e) {
        errors.push(`client: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    if (ownerTo && ownerPlain) {
      try {
        await sendResendEmail(env, {
          to: ownerTo,
          subject: ownerSubject,
          text: ownerPlain,
          replyTo: clientTo || undefined,
        })
        ownerSent = true
      } catch (e) {
        errors.push(`owner: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    if (!clientSent && !ownerSent) {
      return new Response(
        JSON.stringify({ ok: false, error: errors.join('; ') || 'No emails sent' }),
        { status: 502, headers },
      )
    }

    return new Response(JSON.stringify({ ok: true, mode: 'lead', clientSent, ownerSent }), {
      status: 200,
      headers,
    })
  }

  if (target === 'email') {
    const to = String(body.to_email || '').trim()
    if (!to) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing to_email' }), { status: 400, headers })
    }
    if (!env.RESEND_API_KEY) {
      return new Response(JSON.stringify({ ok: false, error: 'RESEND_API_KEY not configured' }), { status: 503, headers })
    }
    try {
      await sendResendEmail(env, { to, subject, text: proposalPlain })
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
        status: 502,
        headers,
      })
    }
    return new Response(JSON.stringify({ ok: true, channel: 'email' }), { status: 200, headers })
  }

  if (target === 'phone') {
    const toPhone = String(body.to_phone || '').trim()
    if (!toPhone) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing to_phone' }), { status: 400, headers })
    }
    const sid = env.TWILIO_ACCOUNT_SID
    const token = env.TWILIO_AUTH_TOKEN
    const fromNum = env.TWILIO_FROM_NUMBER
    if (!sid || !token || !fromNum) {
      return new Response(JSON.stringify({ ok: false, error: 'Twilio not configured' }), { status: 503, headers })
    }
    const e164 = normalizeToE164(toPhone)
    if (!e164 || e164.length < 10) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid phone' }), { status: 400, headers })
    }
    const smsBody = proposalPlain.length > 1550 ? `${proposalPlain.slice(0, 1547)}…` : proposalPlain
    const auth = btoa(`${sid}:${token}`)
    const form = new URLSearchParams()
    form.set('To', e164)
    form.set('From', fromNum)
    form.set('Body', smsBody)
    const tw = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    })
    const twText = await tw.text()
    if (!tw.ok) {
      return new Response(JSON.stringify({ ok: false, error: twText || String(tw.status) }), { status: 502, headers })
    }
    return new Response(JSON.stringify({ ok: true, channel: 'sms' }), { status: 200, headers })
  }

  return new Response(JSON.stringify({ ok: false, error: 'Unknown delivery_target' }), { status: 400, headers })
}
