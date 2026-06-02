import { ref, watch } from 'vue'
import { PRO_MANUAL_DISCOUNT_OPTIONS } from '../pricing/orderDiscount.js'

const STORAGE_KEY = 'allexo-pro-manual-discount-pct'

/** @type {import('vue').Ref<number | null>} */
const manualDiscountPct = ref(readStored())

function readStored() {
  if (typeof sessionStorage === 'undefined') return null
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return PRO_MANUAL_DISCOUNT_OPTIONS.includes(n) ? n : null
}

/** @param {number | null} pct */
function setManualDiscount(pct) {
  if (pct != null && !PRO_MANUAL_DISCOUNT_OPTIONS.includes(pct)) return
  manualDiscountPct.value = pct
}

watch(manualDiscountPct, (pct) => {
  if (typeof sessionStorage === 'undefined') return
  if (pct == null) sessionStorage.removeItem(STORAGE_KEY)
  else sessionStorage.setItem(STORAGE_KEY, String(pct))
})

/** @param {number} pct */
function toggleManualDiscount(pct) {
  manualDiscountPct.value = manualDiscountPct.value === pct ? null : pct
}

export function useProManualDiscount() {
  return {
    manualDiscountPct,
    setManualDiscount,
    toggleManualDiscount,
    PRO_MANUAL_DISCOUNT_OPTIONS,
  }
}
