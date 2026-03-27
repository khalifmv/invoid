import { create } from 'zustand'
import { db } from '../lib/db'
import { nowIso } from '../lib/date'
import { generateId } from '../lib/ids'
import type { Category, Product } from '../types'

interface CatalogState {
  categories: Category[]
  products: Product[]
  isLoading: boolean
  errorMessage: string | null
}

interface CatalogActions {
  hydrate: () => Promise<void>
  createCategory: (name: string) => Promise<void>
  createProduct: (name: string, defaultPrice: number, categoryId: string | null) => Promise<void>
  updateProduct: (
    productId: string,
    name: string,
    defaultPrice: number,
    categoryId: string | null,
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

  createProduct: async (name, defaultPrice, categoryId) => {
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
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    await db.products.add(product)
    await get().hydrate()
  },

  updateProduct: async (productId, name, defaultPrice, categoryId) => {
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
