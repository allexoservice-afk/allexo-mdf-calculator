const STORAGE_KEY = 'allexo-mdf-pro-unlocked'

// NOTE: Frontend-only gating. This hides Pro from normal users but cannot provide true security.
const CODE_SHA256_HEX = 'e270b4dbebe035dfd27c06e8432791e6e3b4a59496f15a01f16db896b2daf620'

/** @returns {Promise<string>} */
async function sha256Hex(text) {
  if (typeof crypto === 'undefined' || !crypto.subtle) return ''
  const data = new TextEncoder().encode(String(text))
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function isProUnlocked() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setProUnlocked(v) {
  try {
    localStorage.setItem(STORAGE_KEY, v ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/** @returns {Promise<boolean>} */
export async function verifyProCode(code) {
  const hex = await sha256Hex(String(code ?? '').trim())
  return !!hex && hex === CODE_SHA256_HEX
}

