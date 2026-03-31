import Dexie, { type Table } from 'dexie'
import type { Category, Customer, Product, ProductMedia, Transaction, TransactionItem } from '../types'
import {
  DEFAULT_PRICING_MODE,
  DEFAULT_UNIT_CODE,
  normalizeCustomUnitLabel,
  normalizePricingMode,
  normalizeUnitCode,
  sanitizeQuantityForUnit,
} from './item-semantics'

export class InvoidDatabase extends Dexie {
  categories!: Table<Category, string>
  products!: Table<Product, string>
  productMedia!: Table<ProductMedia, string>
  transactions!: Table<Transaction, string>
  customers!: Table<Customer, string>

  constructor() {
    super('invoid-db')

    this.version(1).stores({
      categories: 'id, name, createdAt, updatedAt',
      products: 'id, name, categoryId, defaultPrice, createdAt, updatedAt',
      invoices: 'id, createdAt, updatedAt',
    })

    this.version(2).stores({
      customers: 'id, name, createdAt, updatedAt',
    })

    this.version(3)
      .stores({
        categories: 'id, name, createdAt, updatedAt',
        products: 'id, name, categoryId, defaultPrice, createdAt, updatedAt',
        invoices: 'id, createdAt, updatedAt',
        customers: 'id, name, createdAt, updatedAt',
      })

    this.version(4)
      .stores({
        categories: 'id, name, createdAt, updatedAt',
        products: 'id, name, categoryId, defaultPrice, createdAt, updatedAt',
        invoices: 'id, createdAt, updatedAt, status',
        customers: 'id, name, createdAt, updatedAt',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table('products')
          .toCollection()
          .modify((product: Product) => {
            product.defaultUnitCode = normalizeUnitCode(product.defaultUnitCode ?? DEFAULT_UNIT_CODE)
            product.defaultCustomUnitLabel = normalizeCustomUnitLabel(product.defaultCustomUnitLabel)
            product.defaultPricingMode = normalizePricingMode(product.defaultPricingMode ?? DEFAULT_PRICING_MODE)
          })

        await transaction
          .table('invoices')
          .toCollection()
          .modify((storedTransaction: Transaction) => {
            storedTransaction.items = storedTransaction.items.map((item: TransactionItem) => {
              const unitCode = normalizeUnitCode(item.unitCode ?? DEFAULT_UNIT_CODE)

              return {
                ...item,
                quantity: sanitizeQuantityForUnit(item.quantity, unitCode),
                unitCode,
                customUnitLabel: normalizeCustomUnitLabel(item.customUnitLabel),
                pricingMode: normalizePricingMode(item.pricingMode ?? DEFAULT_PRICING_MODE),
              }
            })

            if (!storedTransaction.status) {
              storedTransaction.status = 'paid'
            }
          })
      })

    this.version(5)
      .stores({
        categories: 'id, name, createdAt, updatedAt',
        products: 'id, name, categoryId, defaultPrice, createdAt, updatedAt',
        productMedia: 'id, productId, sortOrder, isCover, createdAt, updatedAt',
        invoices: 'id, createdAt, updatedAt, status',
        customers: 'id, name, createdAt, updatedAt',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table('products')
          .toCollection()
          .modify((product: Product) => {
            product.description = product.description?.trim() ?? ''
          })
      })

    this.version(6)
      .stores({
        categories: 'id, name, createdAt, updatedAt',
        products: 'id, name, categoryId, defaultPrice, createdAt, updatedAt',
        productMedia: 'id, productId, sortOrder, isCover, createdAt, updatedAt',
        transactions: 'id, createdAt, updatedAt, status',
        customers: 'id, name, createdAt, updatedAt',
        invoices: null,
      })
      .upgrade(async (transaction) => {
        const legacyTransactions = (await transaction.table('invoices').toArray()) as Transaction[]
        if (legacyTransactions.length > 0) {
          await transaction.table('transactions').bulkPut(legacyTransactions)
        }
      })

    this.version(7)
      .stores({
        categories: 'id, name, createdAt, updatedAt',
        products: 'id, name, categoryId, defaultPrice, createdAt, updatedAt',
        productMedia: 'id, productId, sortOrder, isCover, createdAt, updatedAt',
        transactions: 'id, createdAt, updatedAt, status',
        customers: 'id, name, createdAt, updatedAt',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table('products')
          .toCollection()
          .modify((product: Product) => {
            if (product.isAvailable === undefined) product.isAvailable = true
            if (product.hasUnlimitedStock === undefined) product.hasUnlimitedStock = true
            if (product.stock === undefined) product.stock = 0
          })
      })
  }
}

export const db = new InvoidDatabase()
