import type { EntityId, Timestamp } from './common'

export interface Customer {
  id: EntityId
  name: string
  phone?: string
  email?: string
  address?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CustomerDraft {
  name: string
  phone: string
  email: string
  address: string
}

export interface CustomerSnapshot {
  name: string
  phone?: string
  email?: string
  address?: string
}