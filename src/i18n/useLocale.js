import { ref } from 'vue'
import { DEFAULT_LOCALE, isSupportedLocale, translate } from './translations.js'

const STORAGE_KEY = 'allexo-mdf-locale'

/** @returns {import('./translations.js').Locale | null} */
function guessLocaleFromNavigator() {
  if (typeof navigator === 'undefined') return null
  const candidates = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean)
  for (const raw of candidates) {
    const base = String(raw).toLowerCase().split('-')[0]
    if (base === 'nl') return 'nl'
    if (base === 'fr') return 'fr'
    if (base === 'en') return 'en'
    if (base === 'uk' || base === 'ua') return 'uk'
  }
  return null
}

function readStoredLocale() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (isSupportedLocale(v)) return v
  } catch {
    /* ignore */
  }
  return guessLocaleFromNavigator() ?? DEFAULT_LOCALE
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
