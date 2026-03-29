import type { EntityId, Timestamp } from './common'
import type { PricingMode, UnitCode } from './invoice'

export interface Product {
  id: EntityId
  name: string
  categoryId: EntityId | null
  defaultPrice: number
  defaultUnitCode?: UnitCode
  defaultCustomUnitLabel?: string
  defaultPricingMode?: PricingMode
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ProductDraft {
  name: string
  categoryId: EntityId | null
  defaultPrice: number
  defaultUnitCode?: UnitCode
  defaultCustomUnitLabel?: string
  defaultPricingMode?: PricingMode
}
