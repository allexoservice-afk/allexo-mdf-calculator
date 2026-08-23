import { ref } from 'vue'
import { DEFAULT_LOCALE, isSupportedLocale, translate } from './translations.js'

/** User-chosen UI language; if missing, default is Dutch (not browser locale). */
const STORAGE_KEY = 'allexo-mdf-locale'

function readLocaleFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search)
    const v = params.get('lang') || params.get('locale')
    if (isSupportedLocale(v)) return v
  } catch {
    /* ignore */
  }
  return null
}

function readStoredLocale() {
  const fromUrl = readLocaleFromUrl()
  if (fromUrl) {
    try {
      localStorage.setItem(STORAGE_KEY, fromUrl)
    } catch {
      /* ignore */
    }
    return fromUrl
  }
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (isSupportedLocale(v)) return v
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE
}

const locale = ref(/** @type {import('./translations.js').Locale} */ (readStoredLocale()))

export function useLocale() {
  /** @param {import('./translations.js').Locale} code */
  function setLocale(code) {
    if (!isSupportedLocale(code)) return
    locale.value = code
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {
      /* ignore */
    }
  }

  /** @param {string} path */
  function t(path) {
    return translate(locale.value, path)
  }

  return { locale, setLocale, t }
}
