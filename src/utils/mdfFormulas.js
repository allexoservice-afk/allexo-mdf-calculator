/**
 * Довжина профілю відкосів у метрах (для подальших розрахунків цін).
 * (ширина + 2 × висота) / 1000, розміри в мм.
 * @param {number} widthMm
 * @param {number} heightMm
 */
export function windowProfileLengthMeters(widthMm, heightMm) {
  return (widthMm + 2 * heightMm) / 1000
}
