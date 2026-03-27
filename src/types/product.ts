import type { EntityId, Timestamp } from './common'

export interface Product {
  id: EntityId
  name: string
  categoryId: EntityId | null
  defaultPrice: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ProductDraft {
  name: string
  categoryId: EntityId | null
  defaultPrice: number
}
