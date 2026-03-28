import type { EntityId, Timestamp } from './common'
import type { CustomerSnapshot } from './customer'

export type DiscountType = 'percentage' | 'fixed'

export interface InvoiceItem {
  id: EntityId
  productId: EntityId | null
  name: string
  quantity: number
  unitPrice: number
}

export interface InvoiceDraft {
  items: InvoiceItem[]
  customerId: EntityId | null
  customerSnapshot: CustomerSnapshot | null
  discountType: DiscountType
  discountValue: number
  taxEnabled: boolean
  taxRate: number
  notes: string
}

export interface Invoice {
  id: EntityId
  createdAt: Timestamp
  updatedAt: Timestamp
  items: InvoiceItem[]
  customerId: EntityId | null
  customerSnapshot: CustomerSnapshot | null
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
  discountType: DiscountType
  discountValue: number
  taxEnabled: boolean
  taxRate: number
  notes: string
}

export interface InvoiceTotals {
  subtotal: number
  discountAmount: number
  taxableAmount: number
  taxAmount: number
  total: number
}
