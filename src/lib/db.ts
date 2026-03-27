import Dexie, { type Table } from 'dexie'
import type { Category, Invoice, Product } from '../types'

export class InvoidDatabase extends Dexie {
  categories!: Table<Category, string>
  products!: Table<Product, string>
  invoices!: Table<Invoice, string>

  constructor() {
    super('invoid-db')

    this.version(1).stores({
      categories: 'id, name, createdAt, updatedAt',
      products: 'id, name, categoryId, defaultPrice, createdAt, updatedAt',
      invoices: 'id, createdAt, updatedAt',
    })
  }
}

export const db = new InvoidDatabase()
