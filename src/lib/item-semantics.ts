import type { PricingMode, UnitCode } from '../types'

export const DEFAULT_UNIT_CODE: UnitCode = 'pcs'
export const DEFAULT_PRICING_MODE: PricingMode = 'per_unit'

const UNIT_LABEL_BY_CODE: Record<UnitCode, string> = {
  pcs: 'pcs',
  kg: 'kg',
  g: 'g',
  l: 'l',
  ml: 'ml',
  hour: 'hour',
  day: 'day',
  session: 'session',
  service: 'service',
  custom: 'unit',
}

const DECIMAL_ALLOWED_BY_UNIT: Record<UnitCode, boolean> = {
  pcs: false,
  kg: true,
  g: true,
  l: true,
  ml: true,
  hour: true,
  day: true,
  session: false,
  service: false,
  custom: true,
}

export const UNIT_OPTIONS: Array<{ value: UnitCode; label: string }> = [
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'l', label: 'Liter (l)' },
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'hour', label: 'Hour' },
  { value: 'day', label: 'Day' },
  { value: 'session', label: 'Session' },
  { value: 'service', label: 'Service' },
  { value: 'custom', label: 'Custom unit' },
]

export const PRICING_MODE_OPTIONS: Array<{ value: PricingMode; label: string }> = [
  { value: 'per_unit', label: 'Per Unit' },
  { value: 'flat', label: 'Flat Fee' },
]

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

const stripTrailingZero = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '0'
  }

  const fixed = value.toFixed(4)
  return fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

export const normalizeUnitCode = (value: unknown): UnitCode => {
  switch (value) {
    case 'pcs':
    case 'kg':
    case 'g':
    case 'l':
    case 'ml':
    case 'hour':
    case 'day':
    case 'session':
    case 'service':
    case 'custom':
      return value
    default:
      return DEFAULT_UNIT_CODE
  }
}

export const normalizePricingMode = (value: unknown): PricingMode => {
  return value === 'flat' ? 'flat' : DEFAULT_PRICING_MODE
}

export const isDecimalAllowedForUnit = (unitCode: UnitCode): boolean => {
  return DECIMAL_ALLOWED_BY_UNIT[unitCode]
}

export const sanitizeQuantityForUnit = (quantity: unknown, unitCode: UnitCode): number => {
  const normalized = Math.max(0, toFiniteNumber(quantity, 0))
  if (isDecimalAllowedForUnit(unitCode)) {
    return normalized
  }

  return Math.round(normalized)
}

export const normalizeCustomUnitLabel = (value: unknown): string => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

export const getUnitLabel = (unitCode: UnitCode, customUnitLabel: string): string => {
  if (unitCode === 'custom') {
    return customUnitLabel.trim().length > 0 ? customUnitLabel.trim() : UNIT_LABEL_BY_CODE.custom
  }

  return UNIT_LABEL_BY_CODE[unitCode]
}

export const formatItemAmountLabel = (
  quantity: number,
  unitCode: UnitCode,
  customUnitLabel: string,
  pricingMode: PricingMode,
): string => {
  if (pricingMode === 'flat') {
    const unitLabel = getUnitLabel(unitCode, customUnitLabel)
    return unitLabel.length > 0 ? `Flat fee (${unitLabel})` : 'Flat fee'
  }

  return `${stripTrailingZero(quantity)} ${getUnitLabel(unitCode, customUnitLabel)}`
}

export const formatItemRateLabel = (
  formattedPrice: string,
  unitCode: UnitCode,
  customUnitLabel: string,
  pricingMode: PricingMode,
): string => {
  if (pricingMode === 'flat') {
    return `${formattedPrice} (flat fee)`
  }

  return `${formattedPrice}/${getUnitLabel(unitCode, customUnitLabel)}`
}
