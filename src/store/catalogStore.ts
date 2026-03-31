import { create } from 'zustand'
import { db } from '../lib/db'
import { nowIso } from '../lib/date'
import { generateId } from '../lib/ids'
import { DEFAULT_PRICING_MODE, DEFAULT_UNIT_CODE, normalizePricingMode, normalizeUnitCode } from '../lib/item-semantics'
import { MAX_PRODUCT_IMAGES } from '../lib/product-media'
import type { Category, PricingMode, Product, ProductMedia, ProductMediaDraft, UnitCode } from '../types'

interface CatalogState {
  categories: Category[]
  products: Product[]
  productMedia: ProductMedia[]
  isLoading: boolean
  errorMessage: string | null
}

interface CatalogActions {
  hydrate: () => Promise<void>
  createCategory: (name: string) => Promise<void>
  createProduct: (
    name: string,
    defaultPrice: number,
    categoryId: string | null,
    defaultUnitCode?: UnitCode,
    defaultCustomUnitLabel?: string,
    defaultPricingMode?: PricingMode,
    description?: string,
    mediaDrafts?: ProductMediaDraft[],
    isAvailable?: boolean,
    hasUnlimitedStock?: boolean,
    stock?: number,
  ) => Promise<void>
  updateProduct: (
    productId: string,
    name: string,
    defaultPrice: number,
    categoryId: string | null,
    defaultUnitCode?: UnitCode,
    defaultCustomUnitLabel?: string,
    defaultPricingMode?: PricingMode,
    description?: string,
    mediaDrafts?: ProductMediaDraft[],
    isAvailable?: boolean,
    hasUnlimitedStock?: boolean,
    stock?: number,
  ) => Promise<void>
  updateProductAvailability: (productId: string, isAvailable: boolean) => Promise<void>
  deleteProduct: (productId: string) => Promise<void>
}

export type CatalogStore = CatalogState & CatalogActions

const sortByName = <T extends { name: string }>(items: T[]): T[] => {
  return [...items].sort((left, right) => left.name.localeCompare(right.name))
}

const sortProductMedia = (items: ProductMedia[]): ProductMedia[] => {
  return [...items].sort((left, right) => {
    if (left.productId !== right.productId) {
      return left.productId.localeCompare(right.productId)
    }

    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder
    }

    return left.createdAt.localeCompare(right.createdAt)
  })
}

const normalizeMediaDrafts = (drafts: ProductMediaDraft[]): ProductMediaDraft[] => {
  const normalizedDrafts = drafts.slice(0, MAX_PRODUCT_IMAGES)
  const coverIndex = Math.max(
    0,
    normalizedDrafts.findIndex((draft) => draft.isCover),
  )

  return normalizedDrafts.map((draft, index) => ({
    ...draft,
    sortOrder: index,
    isCover: index === coverIndex,
  }))
}

export const useCatalogStore = create<CatalogStore>((set, get) => ({
  categories: [],
  products: [],
  productMedia: [],
  isLoading: false,
  errorMessage: null,

  hydrate: async () => {
    set({ isLoading: true, errorMessage: null })

    try {
      const [categories, products, productMedia] = await Promise.all([
        db.categories.toArray(),
        db.products.toArray(),
        db.productMedia.toArray(),
      ])

      set({
        categories: sortByName(categories),
        products: sortByName(products),
        productMedia: sortProductMedia(productMedia),
        isLoading: false,
      })
    } catch {
      set({
        errorMessage: 'Failed to load local catalog from IndexedDB.',
        isLoading: false,
      })
    }
  },

  createCategory: async (name) => {
    const normalizedName = name.trim()
    if (normalizedName.length === 0) {
      return
    }

    const timestamp = nowIso()
    const category: Category = {
      id: generateId(),
      name: normalizedName,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    await db.categories.add(category)
    await get().hydrate()
  },

  createProduct: async (
    name,
    defaultPrice,
    categoryId,
    defaultUnitCode = DEFAULT_UNIT_CODE,
    defaultCustomUnitLabel = '',
    defaultPricingMode = DEFAULT_PRICING_MODE,
    description = '',
    mediaDrafts = [],
    isAvailable = true,
    hasUnlimitedStock = true,
    stock = 0,
  ) => {
    const normalizedName = name.trim()
    if (normalizedName.length === 0) {
      return
    }

    const normalizedPrice = Number.isFinite(defaultPrice) ? Math.max(defaultPrice, 0) : 0
    const timestamp = nowIso()
    const productId = generateId()
    const normalizedMediaDrafts = normalizeMediaDrafts(mediaDrafts)

    const product: Product = {
      id: productId,
      name: normalizedName,
      description: description.trim(),
      categoryId,
      defaultPrice: normalizedPrice,
      defaultUnitCode: normalizeUnitCode(defaultUnitCode),
      defaultCustomUnitLabel: defaultCustomUnitLabel.trim(),
      defaultPricingMode: normalizePricingMode(defaultPricingMode),
      isAvailable,
      hasUnlimitedStock,
      stock: Math.max(0, stock),
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    await db.transaction('rw', db.products, db.productMedia, async () => {
      await db.products.add(product)

      if (normalizedMediaDrafts.length > 0) {
        const mediaRecords: ProductMedia[] = normalizedMediaDrafts.map((draft, index) => ({
          id: generateId(),
          productId,
          fileName: draft.fileName,
          mimeType: draft.mimeType,
          sizeBytes: draft.sizeBytes,
          sortOrder: index,
          isCover: draft.isCover,
          originalBlob: draft.originalBlob,
          thumbnailDataUrl: draft.thumbnailDataUrl,
          createdAt: timestamp,
          updatedAt: timestamp,
        }))

        await db.productMedia.bulkAdd(mediaRecords)
      }
    })

    await get().hydrate()
  },

  updateProduct: async (
    productId,
    name,
    defaultPrice,
    categoryId,
    defaultUnitCode,
    defaultCustomUnitLabel,
    defaultPricingMode,
    description,
    mediaDrafts,
    isAvailable,
    hasUnlimitedStock,
    stock,
  ) => {
    const normalizedName = name.trim()
    if (normalizedName.length === 0) {
      return
    }

    const existing = await db.products.get(productId)
    if (!existing) {
      return
    }

    const normalizedPrice = Number.isFinite(defaultPrice) ? Math.max(defaultPrice, 0) : 0
    const timestamp = nowIso()
    const normalizedMediaDrafts = mediaDrafts ? normalizeMediaDrafts(mediaDrafts) : null

    const updatedProduct: Product = {
      ...existing,
      name: normalizedName,
      description: (description ?? existing.description ?? '').trim(),
      defaultPrice: normalizedPrice,
      categoryId,
      defaultUnitCode: normalizeUnitCode(defaultUnitCode ?? existing.defaultUnitCode ?? DEFAULT_UNIT_CODE),
      defaultCustomUnitLabel: (defaultCustomUnitLabel ?? existing.defaultCustomUnitLabel ?? '').trim(),
      defaultPricingMode: normalizePricingMode(
        defaultPricingMode ?? existing.defaultPricingMode ?? DEFAULT_PRICING_MODE,
      ),
      isAvailable: isAvailable ?? existing.isAvailable ?? true,
      hasUnlimitedStock: hasUnlimitedStock ?? existing.hasUnlimitedStock ?? true,
      stock: stock !== undefined ? Math.max(0, stock) : (existing.stock ?? 0),
      updatedAt: timestamp,
    }

    if (!normalizedMediaDrafts) {
      await db.products.put(updatedProduct)
      await get().hydrate()
      return
    }

    await db.transaction('rw', db.products, db.productMedia, async () => {
      await db.products.put(updatedProduct)

      const existingMediaIds = await db.productMedia.where('productId').equals(productId).primaryKeys()
      if (existingMediaIds.length > 0) {
        await db.productMedia.bulkDelete(existingMediaIds as string[])
      }

      if (normalizedMediaDrafts.length > 0) {
        const mediaRecords: ProductMedia[] = normalizedMediaDrafts.map((draft, index) => ({
          id: generateId(),
          productId,
          fileName: draft.fileName,
          mimeType: draft.mimeType,
          sizeBytes: draft.sizeBytes,
          sortOrder: index,
          isCover: draft.isCover,
          originalBlob: draft.originalBlob,
          thumbnailDataUrl: draft.thumbnailDataUrl,
          createdAt: timestamp,
          updatedAt: timestamp,
        }))

        await db.productMedia.bulkAdd(mediaRecords)
      }
    })

    await get().hydrate()
  },

  updateProductAvailability: async (productId, isAvailable) => {
    const existing = await db.products.get(productId)
    if (!existing) return

    await db.products.update(productId, {
      isAvailable,
      updatedAt: nowIso()
    })

    await get().hydrate()
  },

  deleteProduct: async (productId) => {
    await db.transaction('rw', db.products, db.productMedia, async () => {
      await db.products.delete(productId)

      const mediaIds = await db.productMedia.where('productId').equals(productId).primaryKeys()
      if (mediaIds.length > 0) {
        await db.productMedia.bulkDelete(mediaIds as string[])
      }
    })

    await get().hydrate()
  },
}))
