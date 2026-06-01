import { supabase } from '../lib/supabase.js'

/**
 * @param {number} year
 * @param {number} seq
 */
export function formatYearlyQuoteReference(year, seq) {
  return `ALX-${year}-${String(seq).padStart(3, '0')}`
}

/** Унікальний резервний номер без читання таблиці leads (ALX-20260601-142305). */
export function fallbackQuoteReference() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `ALX-${y}${m}${d}-${hh}${mm}${ss}`
}

/**
 * Наступний номер через Supabase RPC `next_quote_reference` (див. supabase/quote-reference.sql).
 * @returns {Promise<string>}
 */
async function nextQuoteReferenceFromRpc() {
  const { data, error } = await supabase.rpc('next_quote_reference')
  if (error) throw error
  const ref = String(data ?? '').trim()
  if (!ref || !/^ALX-\d{4}-\d{3}$/.test(ref)) {
    throw new Error('Invalid quote reference from RPC')
  }
  return ref
}

/**
 * Призначити номер заявки перед збереженням і email.
 * @returns {Promise<string>}
 */
export async function allocateQuoteReference() {
  try {
    return await nextQuoteReferenceFromRpc()
  } catch (e) {
    console.warn('[allocateQuoteReference] RPC unavailable, using fallback:', e)
    return fallbackQuoteReference()
  }
}

/**
 * @param {Record<string, unknown>} leadData
 */
export function quoteReferenceFromLead(leadData) {
  const direct = String(leadData.quote_reference ?? '').trim()
  if (direct) return direct
  const calc = leadData.calculation_data ?? leadData.calculation_details
  if (calc && typeof calc === 'object') {
    const meta = /** @type {Record<string, unknown>} */ (/** @type {Record<string, unknown>} */ (calc).meta)
    if (meta && typeof meta === 'object') {
      const fromMeta = String(/** @type {Record<string, unknown>} */ (meta).quote_reference ?? '').trim()
      if (fromMeta) return fromMeta
    }
  }
  return ''
}
