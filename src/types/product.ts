import type { EntityId, Timestamp } from './common'
import type { PricingMode, UnitCode } from './transaction'

export interface Product {
  id: EntityId
  name: string
  description?: string
  categoryId: EntityId | null
  defaultPrice: number
  defaultUnitCode?: UnitCode
  defaultCustomUnitLabel?: string
  defaultPricingMode?: PricingMode
  isAvailable: boolean
  hasUnlimitedStock: boolean
  stock: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ProductDraft {
  name: string
  description?: string
  categoryId: EntityId | null
  defaultPrice: number
  defaultUnitCode?: UnitCode
  defaultCustomUnitLabel?: string
  defaultPricingMode?: PricingMode
  isAvailable?: boolean
  hasUnlimitedStock?: boolean
  stock?: number
}
