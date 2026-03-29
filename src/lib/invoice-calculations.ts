import type { DiscountType, InvoiceItem, InvoiceTotals } from '../types'
import { normalizePricingMode } from './item-semantics'

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

const sanitizeNumber = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0
  }

  return value
}

const round2 = (value: number): number => Math.round(value * 100) / 100

export const computeInvoiceLineTotal = (item: InvoiceItem): number => {
  const normalizedPricingMode = normalizePricingMode(item.pricingMode)
  const unitPrice = Math.max(0, sanitizeNumber(item.unitPrice))

  if (normalizedPricingMode === 'flat') {
    return round2(unitPrice)
  }

  const quantity = Math.max(0, sanitizeNumber(item.quantity))
  return round2(quantity * unitPrice)
}

export const computeSubtotal = (items: InvoiceItem[]): number => {
  return round2(
    items.reduce((accumulator, item) => {
      return accumulator + computeInvoiceLineTotal(item)
    }, 0),
  )
}

export const computeDiscountAmount = (
  subtotal: number,
  discountType: DiscountType,
  discountValue: number,
): number => {
  const normalizedSubtotal = sanitizeNumber(subtotal)
  const normalizedDiscount = sanitizeNumber(discountValue)

  if (discountType === 'percentage') {
    const percentage = clamp(normalizedDiscount, 0, 100)
    return round2((normalizedSubtotal * percentage) / 100)
  }

  return round2(clamp(normalizedDiscount, 0, normalizedSubtotal))
}

export const computeInvoiceTotals = (
  items: InvoiceItem[],
  discountType: DiscountType,
  discountValue: number,
  taxEnabled: boolean,
  taxRate: number,
): InvoiceTotals => {
  const subtotal = computeSubtotal(items)
  const discountAmount = computeDiscountAmount(subtotal, discountType, discountValue)
  const taxableAmount = round2(Math.max(0, subtotal - discountAmount))

  const normalizedTaxRate = clamp(sanitizeNumber(taxRate), 0, 100)
  const taxAmount = taxEnabled ? round2((taxableAmount * normalizedTaxRate) / 100) : 0
  const total = round2(taxableAmount + taxAmount)

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    total,
  }
}

export const computeCashChange = (amountPaid: number, total: number): number => {
  const normalizedAmountPaid = sanitizeNumber(amountPaid)
  const normalizedTotal = sanitizeNumber(total)
  return round2(Math.max(0, normalizedAmountPaid - normalizedTotal))
}

export const isCashPaymentSufficient = (amountPaid: number, total: number): boolean => {
  const normalizedAmountPaid = sanitizeNumber(amountPaid)
  const normalizedTotal = sanitizeNumber(total)
  return normalizedAmountPaid >= normalizedTotal
}
