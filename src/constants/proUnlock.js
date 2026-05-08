const STORAGE_KEY = 'allexo-mdf-pro-unlocked'

// NOTE: Frontend-only gating. This hides Pro from normal users but cannot provide true security.
const CODE_SHA256_HEX = 'b0c9e7a9e1f907bf5467b7510ad9bace032388f6fd76f7dbddf4d64bdf758dc5'

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

