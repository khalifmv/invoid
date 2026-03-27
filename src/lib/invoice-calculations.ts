import type { DiscountType, InvoiceItem, InvoiceTotals } from '../types'

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

const sanitizeNumber = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0
  }

  return value
}

const round2 = (value: number): number => Math.round(value * 100) / 100

export const computeSubtotal = (items: InvoiceItem[]): number => {
  return round2(
    items.reduce((accumulator, item) => {
      const quantity = sanitizeNumber(item.quantity)
      const unitPrice = sanitizeNumber(item.unitPrice)

      return accumulator + quantity * unitPrice
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
