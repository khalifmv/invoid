import type { EntityId, Timestamp } from './common'

export interface ProductMedia {
  id: EntityId
  productId: EntityId
  fileName: string
  mimeType: string
  sizeBytes: number
  sortOrder: number
  isCover: boolean
  originalBlob: Blob
  thumbnailDataUrl: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ProductMediaDraft {
  fileName: string
  mimeType: string
  sizeBytes: number
  originalBlob: Blob
  thumbnailDataUrl: string
  sortOrder: number
  isCover: boolean
}
