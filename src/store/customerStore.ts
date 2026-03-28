import { create } from 'zustand'
import { db } from '../lib/db'
import { nowIso } from '../lib/date'
import { generateId } from '../lib/ids'
import type { Customer } from '../types'

interface CustomerState {
  customers: Customer[]
  isLoading: boolean
  errorMessage: string | null
}

interface CustomerActions {
  hydrate: () => Promise<void>
  createCustomer: (name: string, phone: string, email: string, address: string) => Promise<Customer | null>
  updateCustomer: (
    customerId: string,
    name: string,
    phone: string,
    email: string,
    address: string,
  ) => Promise<void>
  deleteCustomer: (customerId: string) => Promise<void>
}

export type CustomerStore = CustomerState & CustomerActions

const normalizeOptionalText = (value: string): string | undefined => {
  const normalizedValue = value.trim()
  return normalizedValue.length > 0 ? normalizedValue : undefined
}

const sortByName = (customers: Customer[]): Customer[] => {
  return [...customers].sort((left, right) => left.name.localeCompare(right.name))
}

export const useCustomerStore = create<CustomerStore>((set, get) => ({
  customers: [],
  isLoading: false,
  errorMessage: null,

  hydrate: async () => {
    set({ isLoading: true, errorMessage: null })

    try {
      const customers = await db.customers.toArray()
      set({
        customers: sortByName(customers),
        isLoading: false,
      })
    } catch {
      set({
        isLoading: false,
        errorMessage: 'Failed to load local customers from IndexedDB.',
      })
    }
  },

  createCustomer: async (name, phone, email, address) => {
    const normalizedName = name.trim()
    if (normalizedName.length === 0) {
      return null
    }

    const timestamp = nowIso()
    const customer: Customer = {
      id: generateId(),
      name: normalizedName,
      phone: normalizeOptionalText(phone),
      email: normalizeOptionalText(email),
      address: normalizeOptionalText(address),
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    await db.customers.add(customer)
    await get().hydrate()
    return customer
  },

  updateCustomer: async (customerId, name, phone, email, address) => {
    const normalizedName = name.trim()
    if (normalizedName.length === 0) {
      return
    }

    const existing = await db.customers.get(customerId)
    if (!existing) {
      return
    }

    const updatedCustomer: Customer = {
      ...existing,
      name: normalizedName,
      phone: normalizeOptionalText(phone),
      email: normalizeOptionalText(email),
      address: normalizeOptionalText(address),
      updatedAt: nowIso(),
    }

    await db.customers.put(updatedCustomer)
    await get().hydrate()
  },

  deleteCustomer: async (customerId) => {
    await db.customers.delete(customerId)
    await get().hydrate()
  },
}))