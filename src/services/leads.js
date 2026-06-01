import { supabase } from '../lib/supabase.js'

const CORE_LEAD_COLUMNS = new Set([
  'name',
  'phone',
  'email',
  'contact_method',
  'total_price',
  'discount',
  'windows_count',
  'calculation_details',
  'quote_reference',
  'created_at',
])

const ULTRA_MINIMAL_COLUMNS = new Set([
  'name',
  'phone',
  'email',
  'contact_method',
  'total_price',
  'created_at',
])

/**
 * @param {{ message?: string, code?: string } | null} error
 */
function isRlsError(error) {
  if (!error) return false
  const code = String(error.code ?? '')
  if (code === '42501' || code === 'PGRST301') return true
  const msg = String(error.message ?? '').toLowerCase()
  return msg.includes('row-level security') || msg.includes('violates row-level security')
}

/**
 * @param {Record<string, unknown>} data
 */
function buildCalculationDetails(data) {
  const d = data
  const fromPayload =
    typeof d.calculation_data === 'object' && d.calculation_data !== null
      ? /** @type {Record<string, unknown>} */ ({ ...d.calculation_data })
      : typeof d.calculation_details === 'object' && d.calculation_details !== null
        ? /** @type {Record<string, unknown>} */ ({ ...d.calculation_details })
        : {}

  const meta =
    typeof fromPayload.meta === 'object' && fromPayload.meta !== null
      ? /** @type {Record<string, unknown>} */ ({ ...fromPayload.meta })
      : {}

  const preferred = String(d.preferred_contact_method || d.contact_method || 'email')
  if (d.language != null) meta.language = d.language
  if (d.page_url != null) meta.page_url = d.page_url
  if (d.user_agent != null) meta.user_agent = d.user_agent
  if (d.id != null) meta.client_request_id = d.id
  if (d.city != null && String(d.city).trim()) meta.city = String(d.city).trim()
  if (d.comment != null && String(d.comment).trim()) meta.comment = String(d.comment).trim()
  meta.preferred_contact_method = preferred
  if (d.positions_count != null) {
    meta.positions_count = Math.max(0, Math.round(Number(d.positions_count) || 0))
  }
  if (d.quote_reference != null && String(d.quote_reference).trim()) {
    meta.quote_reference = String(d.quote_reference).trim()
  }

  return { ...fromPayload, meta }
}

/**
 * @param {Record<string, unknown>} data
 */
function toLeadInsertRow(data) {
  const d = data
  const preferred = String(d.preferred_contact_method || d.contact_method || 'email')
  const calculation_details = buildCalculationDetails(d)

  /** @type {Record<string, unknown>} */
  const row = {
    name: String(d.name ?? '').trim(),
    phone: String(d.phone ?? '').trim() || null,
    email: String(d.email ?? '').trim(),
    contact_method: preferred,
    total_price: Number(d.total_price) || 0,
    discount: Number(d.discount) || 0,
    windows_count: Math.max(0, Math.round(Number(d.windows_count) || 0)),
    calculation_details,
    created_at: typeof d.created_at === 'string' ? d.created_at : new Date().toISOString(),
  }

  const quoteRef = String(d.quote_reference ?? '').trim()
  if (quoteRef) row.quote_reference = quoteRef

  // city, comment, positions_count — лише в calculation_details.meta (без окремих колонок у БД)

  return row
}

function isSupabaseEnvReady() {
  const u = import.meta.env.VITE_SUPABASE_URL
  const k = import.meta.env.VITE_SUPABASE_ANON_KEY
  return typeof u === 'string' && u.length > 0 && typeof k === 'string' && k.length > 0
}

function unknownColumnFromError(message) {
  const m = String(message || '').match(/Could not find the '([^']+)' column/)
  return m ? m[1] : null
}

/**
 * @param {Record<string, unknown>} row
 * @param {Set<string>} keys
 */
function pickColumns(row, keys) {
  /** @type {Record<string, unknown>} */
  const out = {}
  for (const key of keys) {
    if (row[key] !== undefined) out[key] = row[key]
  }
  return out
}

/**
 * @param {Record<string, unknown>} row
 */
async function insertLeadRow(row) {
  const attempts = [
    pickColumns(row, ULTRA_MINIMAL_COLUMNS),
    pickColumns(row, CORE_LEAD_COLUMNS),
    { ...row },
  ]

  let lastError = /** @type {{ message: string, code?: string } | null} */ (null)

  for (const payload of attempts) {
    let current = { ...payload }
    for (let i = 0; i < 12; i += 1) {
      const { error } = await supabase.from('leads').insert(current)
      if (!error) return { ok: true }

      lastError = error
      const missing = unknownColumnFromError(error.message)
      if (missing && missing in current) {
        const next = { ...current }
        delete next[missing]
        current = next
        continue
      }
      break
    }
  }

  console.error('[saveLead] Supabase error:', lastError?.message, lastError)

  if (isRlsError(lastError)) {
    return {
      ok: false,
      error: 'Supabase RLS: заборонено вставку. Виконайте supabase/setup-leads.sql у SQL Editor.',
      code: 'rls_denied',
    }
  }

  return {
    ok: false,
    error: lastError?.message || 'Supabase insert failed',
    code: lastError?.code,
  }
}

/**
 * @param {Record<string, unknown>} data
 */
export async function saveLead(data) {
  if (!isSupabaseEnvReady()) {
    return {
      ok: false,
      error:
        'Supabase не налаштовано (додайте VITE_SUPABASE_URL і VITE_SUPABASE_ANON_KEY у .env або Cloudflare Build).',
      code: 'env_missing',
    }
  }

  try {
    return await insertLeadRow(toLeadInsertRow(data))
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[saveLead]', e)
    return { ok: false, error: message, code: 'exception' }
  }
}

/** @param {{ ok: boolean, code?: string, error?: string }} saved */
export function isLeadSaveRlsError(saved) {
  if (!saved || saved.ok) return false
  if (saved.code === 'rls_denied' || saved.code === '42501') return true
  return /row-level security/i.test(String(saved.error || ''))
}
