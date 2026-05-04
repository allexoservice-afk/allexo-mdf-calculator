/**
 * Парсинг поля «відстань, км» (порожньо → null).
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parseTravelKmInput(raw) {
  const s = String(raw ?? '')
    .trim()
    .replace(',', '.')
  if (!s) return null
  const n = Number(s)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

/**
 * Вартість виїзду від Brugge (один бік, км), без ПДВ.
 * Плавне зростання без «стрибка» між 50 і 51 км: кусково-лінійна крива між опорними точками
 * (30 км → 0 €), (50 → 35 €), (75 → 55 €), (100 → 85 €), далі округлення до цілих євро.
 * До 30 км — 0 €; понад 100 км — окремий прорахунок (over100).
 *
 * @param {number} km відстань від Brugge в один бік
 * @returns {{ euros: number, over100: boolean }} euros — тариф виїзду; over100 — не додавати до суми в калькуляторі
 */
export function travelFareFromBrugge(km) {
  if (!Number.isFinite(km) || km <= 0) return { euros: 0, over100: false }
  if (km > 100) return { euros: 0, over100: true }
  if (km <= 30) return { euros: 0, over100: false }

  let raw
  if (km <= 50) {
    raw = ((km - 30) / 20) * 35
  } else if (km <= 75) {
    raw = 35 + ((km - 50) / 25) * 20
  } else {
    raw = 55 + ((km - 75) / 25) * 30
  }
  return { euros: Math.round(raw), over100: false }
}
