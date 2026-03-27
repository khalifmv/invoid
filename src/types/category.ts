import type { EntityId, Timestamp } from './common'

export interface Category {
  id: EntityId
  name: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CategoryDraft {
  name: string
}
