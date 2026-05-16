import { supabase } from '../lib/supabase.js'

/**
 * @typedef {'whatsapp' | 'email' | 'phone'} PreferredContactMethod
 *
 * @typedef {Object} LeadInsert
 * @property {string} name
 * @property {string} phone
 * @property {string} email
 * @property {string | null} [city]
 * @property {PreferredContactMethod} contact_method
 * @property {string | null} [comment]
 * @property {number} total_price
 * @property {number} [discount]
 * @property {number} [windows_count]
 * @property {Record<string, unknown>} calculation_details
 * @property {string} created_at
 */

/** Колонки, які точно були в початковій таблиці `leads`. */
const CORE_LEAD_COLUMNS = new Set([
  'name',
  'phone',
  'email',
  'contact_method',
  'total_price',
  'discount',
  'windows_count',
  'calculation_details',
  'created_at',
])

/**
 * @param {Record<string, unknown>} data
 * @returns {Record<string, unknown>}
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

  return { ...fromPayload, meta }
}

/**
 * @param {Record<string, unknown>} data
 * @returns {Record<string, unknown>}
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

  // Додаткові колонки (якщо є в Supabase) — при помилці insert їх прибере fallback
  if (d.city != null && String(d.city).trim()) row.city = String(d.city).trim()
  if (d.comment != null && String(d.comment).trim()) row.comment = String(d.comment).trim()
  row.preferred_contact_method = preferred
  const positions = d.positions_count != null ? Math.round(Number(d.positions_count) || 0) : NaN
  if (Number.isFinite(positions) && positions >= 0) row.positions_count = positions

  return row
}

function isSupabaseEnvReady() {
  const u = import.meta.env.VITE_SUPABASE_URL
  const k = import.meta.env.VITE_SUPABASE_ANON_KEY
  return typeof u === 'string' && u.length > 0 && typeof k === 'string' && k.length > 0
}

/**
 * @param {string} message
 * @returns {string | null}
 */
function unknownColumnFromError(message) {
  const m = String(message || '').match(/Could not find the '([^']+)' column/)
  return m ? m[1] : null
}

/**
 * @param {Record<string, unknown>} row
 */
async function insertLeadRow(row) {
  let current = { ...row }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { error } = await supabase.from('leads').insert(current)

    if (!error) return { ok: true }

    const missing = unknownColumnFromError(error.message)
    if (missing && missing in current) {
      const next = { ...current }
      delete next[missing]
      current = next
      continue
    }

    // Якщо зламалось на некоректному полі — спробувати лише базовий набір колонок
    if (attempt === 0) {
      /** @type {Record<string, unknown>} */
      const minimal = {}
      for (const key of CORE_LEAD_COLUMNS) {
        if (row[key] !== undefined) minimal[key] = row[key]
      }
      if (JSON.stringify(minimal) !== JSON.stringify(current)) {
        current = minimal
        continue
      }
    }

    console.error('[saveLead] Supabase error:', error.message, error)
    return {
      ok: false,
      error: error.message || 'Supabase insert failed',
      code: error.code,
    }
  }

  return { ok: false, error: 'Supabase insert failed after retries', code: 'insert_retries_exhausted' }
}

/**
 * Додаткові колонки в Supabase (SQL Editor), якщо потрібні окремо від JSON:
 *
 * alter table public.leads add column if not exists city text;
 * alter table public.leads add column if not exists preferred_contact_method text;
 * alter table public.leads add column if not exists comment text;
 * alter table public.leads add column if not exists positions_count integer;
 * alter table public.leads add column if not exists calculation_data jsonb;
 *
 * @param {Record<string, unknown>} data
 * @returns {Promise<{ ok: true } | { ok: false, error: string, code?: string }>}
 */
export async function saveLead(data) {
  if (!isSupabaseEnvReady()) {
    const msg = 'Supabase: не задано VITE_SUPABASE_URL або VITE_SUPABASE_ANON_KEY'
    console.warn(`[saveLead] ${msg}`)
    return { ok: false, error: msg, code: 'env_missing' }
  }

  const row = toLeadInsertRow(data)

  try {
    return await insertLeadRow(row)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[saveLead]', e)
    return { ok: false, error: message, code: 'exception' }
  }
}
