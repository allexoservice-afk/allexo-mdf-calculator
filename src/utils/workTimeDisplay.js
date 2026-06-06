import { translate } from '../i18n/translations.js'

/** @param {number} h */
export function ceilWorkHours(h) {
  if (!Number.isFinite(h) || h <= 0) return 0
  return Math.ceil(h)
}

/** @param {number} h @param {import('../i18n/translations.js').Locale} locale */
export function formatWorkHoursDisplay(h, locale) {
  const n = ceilWorkHours(h)
  if (n <= 0) return '0'
  return String(n)
}

/** @param {number} bufferedHours @param {import('../i18n/translations.js').Locale} locale */
export function formatWorkDaysApproxLabel(bufferedHours, locale) {
  const hh = ceilWorkHours(bufferedHours)
  if (hh <= 0) return ''
  if (hh <= 8) return translate(locale, 'summary.workDays1to2')
  if (hh <= 16) return translate(locale, 'summary.workDays1to2')
  const minDays = Math.floor(hh / 8)
  return translate(locale, 'summary.workDays2plus').replace('{n}', String(Math.max(minDays, 2)))
}

/**
 * @param {number} bufferedHours
 * @param {import('../i18n/translations.js').Locale} locale
 */
export function formatWorkTimePdfLines(bufferedHours, locale) {
  const hours = ceilWorkHours(bufferedHours)
  if (hours <= 0) return { hoursLine: '', daysLine: '' }
  const hoursLine = `${translate(locale, 'summary.totalTimeLabel')} ~${hours} ${translate(locale, 'summary.hoursUnit')}`
  const daysLine = `${translate(locale, 'summary.workDaysApproxPrefix')} ${formatWorkDaysApproxLabel(bufferedHours, locale)}`
  return { hoursLine, daysLine }
}
