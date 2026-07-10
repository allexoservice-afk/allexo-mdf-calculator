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

/** @param {number} bufferedHours */
export function approxWorkDays(bufferedHours) {
  const hh = ceilWorkHours(bufferedHours)
  if (hh <= 0) return 0
  if (hh <= 9) return 1
  if (hh <= 20) return 2
  return Math.ceil((hh - 9) / 11) + 1
}

/** @param {number} bufferedHours @param {import('../i18n/translations.js').Locale} locale */
export function formatWorkDaysApproxLabel(bufferedHours, locale) {
  const days = approxWorkDays(bufferedHours)
  if (days <= 0) return ''
  if (days === 1) return translate(locale, 'summary.workDays1')
  if (days === 2) return translate(locale, 'summary.workDays2')
  return translate(locale, 'summary.workDaysN').replace('{n}', String(days))
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
