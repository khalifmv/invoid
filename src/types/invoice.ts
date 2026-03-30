import type { EntityId, Timestamp } from './common'
import type { CustomerSnapshot } from './customer'

export type DiscountType = 'percentage' | 'fixed'
export type PaymentMethod = 'cash' | 'bank_transfer' | 'e_wallet' | 'other'
export type UnitCode = 'pcs' | 'kg' | 'g' | 'l' | 'ml' | 'hour' | 'day' | 'session' | 'service' | 'custom'
export type PricingMode = 'per_unit' | 'flat'
export type PaymentStatus = 'paid' | 'unpaid' | 'overdue'

export interface CashPayment {
  method: 'cash'
  amountPaid: number
}

export interface BankTransferPayment {
  method: 'bank_transfer'
  bankName: string
  accountNumber: string
  accountName: string
}

export interface EWalletPayment {
  method: 'e_wallet'
  provider: string
  account: string
}

export interface OtherPayment {
  method: 'other'
  note: string
}

export type Payment = CashPayment | BankTransferPayment | EWalletPayment | OtherPayment

export interface InvoiceItem {
  id: EntityId
  productId: EntityId | null
  name: string
  quantity: number
  unitCode?: UnitCode
  customUnitLabel?: string
  pricingMode?: PricingMode
  unitPrice: number
}

export interface InvoiceDraft {
  items: InvoiceItem[]
  customerId: EntityId | null
  customerSnapshot: CustomerSnapshot | null
  status: PaymentStatus
  payment: Payment
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
  status: PaymentStatus
  payment: Payment
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
