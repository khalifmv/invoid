import { create } from 'zustand'
import { db } from '../lib/db'
import { nowIso } from '../lib/date'
import { generateId } from '../lib/ids'
import { DEFAULT_PRICING_MODE, DEFAULT_UNIT_CODE, normalizePricingMode, normalizeUnitCode } from '../lib/item-semantics'
import type { Category, PricingMode, Product, UnitCode } from '../types'

interface CatalogState {
  categories: Category[]
  products: Product[]
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
  ) => Promise<void>
  updateProduct: (
    productId: string,
    name: string,
    defaultPrice: number,
    categoryId: string | null,
    defaultUnitCode?: UnitCode,
    defaultCustomUnitLabel?: string,
    defaultPricingMode?: PricingMode,
  ) => Promise<void>
  deleteProduct: (productId: string) => Promise<void>
}

export type CatalogStore = CatalogState & CatalogActions

const sortByName = <T extends { name: string }>(items: T[]): T[] => {
  return [...items].sort((left, right) => left.name.localeCompare(right.name))
}

export const useCatalogStore = create<CatalogStore>((set, get) => ({
  categories: [],
  products: [],
  isLoading: false,
  errorMessage: null,

  hydrate: async () => {
    set({ isLoading: true, errorMessage: null })

    try {
      const [categories, products] = await Promise.all([
        db.categories.toArray(),
        db.products.toArray(),
      ])

      set({
        categories: sortByName(categories),
        products: sortByName(products),
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
  ) => {
    const normalizedName = name.trim()
    if (normalizedName.length === 0) {
      return
    }

    const normalizedPrice = Number.isFinite(defaultPrice) ? Math.max(defaultPrice, 0) : 0
    const timestamp = nowIso()

    const product: Product = {
      id: generateId(),
      name: normalizedName,
      categoryId,
      defaultPrice: normalizedPrice,
      defaultUnitCode: normalizeUnitCode(defaultUnitCode),
      defaultCustomUnitLabel: defaultCustomUnitLabel.trim(),
      defaultPricingMode: normalizePricingMode(defaultPricingMode),
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    await db.products.add(product)
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

    const updatedProduct: Product = {
      ...existing,
      name: normalizedName,
      defaultPrice: normalizedPrice,
      categoryId,
      defaultUnitCode: normalizeUnitCode(defaultUnitCode ?? existing.defaultUnitCode ?? DEFAULT_UNIT_CODE),
      defaultCustomUnitLabel: (defaultCustomUnitLabel ?? existing.defaultCustomUnitLabel ?? '').trim(),
      defaultPricingMode: normalizePricingMode(
        defaultPricingMode ?? existing.defaultPricingMode ?? DEFAULT_PRICING_MODE,
      ),
      updatedAt: nowIso(),
    }

    await db.products.put(updatedProduct)
    await get().hydrate()
  },

  deleteProduct: async (productId) => {
    await db.products.delete(productId)
    await get().hydrate()
  },
}))
