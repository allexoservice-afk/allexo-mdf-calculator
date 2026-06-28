import { CALCULATOR_TYPES } from './calculatorTypes.js'

/** @typedef {'mdf' | 'pvc'} MaterialId */

/** @type {readonly MaterialId[]} */
export const MATERIAL_SWITCH_ORDER = Object.freeze(['mdf', 'pvc'])

/** @type {readonly import('./calculatorTypes.js').CalculatorTypeId[]} */
export const PVC_CALCULATOR_TYPE_IDS = Object.freeze(['no_sill', 'with_sill', 'windowsill'])

/** @param {unknown} raw @returns {MaterialId} */
export function normalizeMaterialId(raw) {
  return raw === 'pvc' ? 'pvc' : 'mdf'
}

/** @param {MaterialId | unknown} materialId */
export function typesForMaterial(materialId) {
  if (normalizeMaterialId(materialId) === 'pvc') {
    return CALCULATOR_TYPES.filter((t) => PVC_CALCULATOR_TYPE_IDS.includes(t.id))
  }
  return CALCULATOR_TYPES
}
