/** @typedef {'no_sill' | 'with_sill' | 'no_sill_roller' | 'with_sill_roller' | 'roller_box' | 'windowsill'} CalculatorTypeId */

/** @type {Array<{ id: CalculatorTypeId, hasSill: boolean, hasRoller: boolean, visual: string }>} */
export const CALCULATOR_TYPES = [
  {
    id: 'no_sill',
    hasSill: false,
    hasRoller: false,
    visual: 'no-sill',
  },
  {
    id: 'with_sill',
    hasSill: true,
    hasRoller: false,
    visual: 'with-sill',
  },
  {
    id: 'no_sill_roller',
    hasSill: false,
    hasRoller: true,
    visual: 'roller',
  },
  {
    id: 'with_sill_roller',
    hasSill: true,
    hasRoller: true,
    visual: 'sill-roller',
  },
  {
    id: 'roller_box',
    hasSill: false,
    hasRoller: false,
    visual: 'roller-box-only',
  },
  {
    id: 'windowsill',
    hasSill: false,
    hasRoller: false,
    visual: 'sill-only',
  },
]

/** @param {string | undefined | null} id */
export function isSimplifiedProductLine(id) {
  return id === 'roller_box' || id === 'windowsill'
}

/** @param {CalculatorTypeId} id */
export function getTypeById(id) {
  return CALCULATOR_TYPES.find((t) => t.id === id) ?? null
}
