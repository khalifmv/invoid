import { create } from 'zustand'
import { db } from '../lib/db'
import { nowIso } from '../lib/date'
import { computeInvoiceTotals } from '../lib/invoice-calculations'
import { generateId } from '../lib/ids'
import {
  DEFAULT_PRICING_MODE,
  DEFAULT_UNIT_CODE,
  normalizeCustomUnitLabel,
  normalizePricingMode,
  normalizeUnitCode,
  sanitizeQuantityForUnit,
} from '../lib/item-semantics'
import type {
  BankTransferPayment,
  Customer,
  CustomerSnapshot,
  EWalletPayment,
  DiscountType,
  Invoice,
  InvoiceItem,
  InvoiceTotals,
  Payment,
  PaymentMethod,
  PaymentStatus,
  PricingMode,
  Product,
  UnitCode,
} from '../types'
import { useSettingsStore } from './settingsStore'

interface InvoiceState {
  items: InvoiceItem[]
  customerId: string | null
  customerSnapshot: CustomerSnapshot | null
  payment: Payment
  discountType: DiscountType
  discountValue: number
  taxEnabled: boolean
  taxRate: number
  status: PaymentStatus
  historyInvoices: Invoice[]
  isHistoryLoading: boolean
  historyErrorMessage: string | null
}

interface InvoiceActions {
  addItemFromProduct: (product: Product) => void
  addManualItem: () => void
  addCustomItem: (data: {
    name: string
    price: number
    unitCode: UnitCode
    customUnitLabel: string
    pricingMode: PricingMode
  }) => void
  updateItem: (
    itemId: string,
    patch: Partial<
      Pick<InvoiceItem, 'name' | 'quantity' | 'unitPrice' | 'unitCode' | 'customUnitLabel' | 'pricingMode'>
    >,
  ) => void
  removeItem: (itemId: string) => void
  setPaymentMethod: (method: PaymentMethod) => void
  setCashAmountPaid: (amountPaid: number) => void
  setBankTransferDetails: (patch: Partial<Omit<BankTransferPayment, 'method'>>) => void
  setEWalletDetails: (patch: Partial<Omit<EWalletPayment, 'method'>>) => void
  setOtherPaymentNote: (note: string) => void
  setPaymentStatus: (status: PaymentStatus) => void
  setDiscountType: (discountType: DiscountType) => void
  setDiscountValue: (value: number) => void
  setCustomer: (customerId: string | null) => Promise<void>
  setTaxEnabled: (enabled: boolean) => void
  setTaxRate: (value: number) => void
  saveInvoice: () => Promise<Invoice | null>
  clearInvoice: () => void
  loadInvoices: () => Promise<void>
  getInvoiceById: (invoiceId: string) => Promise<Invoice | null>
}

export type InvoiceStore = InvoiceState & InvoiceActions

type StoredInvoice = Invoice & {
  customerId?: string | null
  customerSnapshot?: CustomerSnapshot | null
  status?: PaymentStatus
  payment?: Payment
}

const normalizeInvoiceItem = (item: InvoiceItem): InvoiceItem => {
  const unitCode = normalizeUnitCode(item.unitCode)
  const customUnitLabel = normalizeCustomUnitLabel(item.customUnitLabel)
  const pricingMode = normalizePricingMode(item.pricingMode)

  return {
    ...item,
    quantity: sanitizeQuantityForUnit(item.quantity, unitCode),
    unitCode,
    customUnitLabel,
    pricingMode,
  }
}

const sanitizeTaxRate = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(Math.max(value, 0), 100)
}

const getTaxDefaults = () => {
  const { defaultTaxEnabled, defaultTaxRate } = useSettingsStore.getState()
  return {
    taxEnabled: defaultTaxEnabled,
    taxRate: sanitizeTaxRate(defaultTaxRate),
  }
}

const toCustomerSnapshot = (customer: Customer): CustomerSnapshot => {
  return {
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
  }
}

const createDefaultPayment = (method: PaymentMethod = 'cash'): Payment => {
  switch (method) {
    case 'cash':
      return {
        method: 'cash',
        amountPaid: 0,
      }
    case 'bank_transfer':
      return {
        method: 'bank_transfer',
        bankName: '',
        accountNumber: '',
        accountName: '',
      }
    case 'e_wallet':
      return {
        method: 'e_wallet',
        provider: '',
        account: '',
      }
    case 'other':
      return {
        method: 'other',
        note: '',
      }
  }
}

const sanitizePayment = (payment: Payment): Payment => {
  switch (payment.method) {
    case 'cash': {
      const normalizedAmountPaid = Number.isFinite(payment.amountPaid) ? Math.max(payment.amountPaid, 0) : 0
      return {
        method: 'cash',
        amountPaid: normalizedAmountPaid,
      }
    }
    case 'bank_transfer':
      return {
        method: 'bank_transfer',
        bankName: payment.bankName.trim(),
        accountNumber: payment.accountNumber.trim(),
        accountName: payment.accountName.trim(),
      }
    case 'e_wallet':
      return {
        method: 'e_wallet',
        provider: payment.provider.trim(),
        account: payment.account.trim(),
      }
    case 'other':
      return {
        method: 'other',
        note: payment.note.trim(),
      }
  }
}

const normalizeStoredInvoice = (invoice: StoredInvoice): Invoice => {
  return {
    ...invoice,
    items: invoice.items.map((item) => normalizeInvoiceItem(item)),
    customerId: invoice.customerId ?? null,
    customerSnapshot: invoice.customerSnapshot ?? null,
    status: invoice.status ?? 'paid',
    payment: invoice.payment ? sanitizePayment(invoice.payment) : createDefaultPayment(),
  }
}

const createInitialInvoiceState = (): Pick<
  InvoiceState,
  | 'items'
  | 'customerId'
  | 'customerSnapshot'
  | 'payment'
  | 'discountType'
  | 'discountValue'
  | 'taxEnabled'
  | 'taxRate'
  | 'status'
> => {
  const defaults = getTaxDefaults()

  return {
    items: [],
    customerId: null,
    customerSnapshot: null,
    payment: createDefaultPayment(),
    status: 'unpaid',
    discountType: 'percentage',
    discountValue: 0,
    taxEnabled: defaults.taxEnabled,
    taxRate: defaults.taxRate,
  }
}

export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
  ...createInitialInvoiceState(),
  historyInvoices: [],
  isHistoryLoading: false,
  historyErrorMessage: null,

  addItemFromProduct: (product) =>
    set((state) => ({
      items: [
        ...state.items,
        {
          id: generateId(),
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitCode: normalizeUnitCode(product.defaultUnitCode ?? DEFAULT_UNIT_CODE),
          customUnitLabel: normalizeCustomUnitLabel(product.defaultCustomUnitLabel),
          pricingMode: normalizePricingMode(product.defaultPricingMode ?? DEFAULT_PRICING_MODE),
          unitPrice: product.defaultPrice,
        },
      ],
    })),

  addManualItem: () =>
    set((state) => ({
      items: [
        ...state.items,
        {
          id: generateId(),
          productId: null,
          name: 'Custom item',
          quantity: 1,
          unitCode: DEFAULT_UNIT_CODE,
          customUnitLabel: '',
          pricingMode: DEFAULT_PRICING_MODE,
          unitPrice: 0,
        },
      ],
    })),

  addCustomItem: (data) =>
    set((state) => ({
      items: [
        ...state.items,
        {
          id: generateId(),
          productId: null,
          name: data.name,
          quantity: 1,
          unitCode: data.unitCode,
          customUnitLabel: data.customUnitLabel,
          pricingMode: data.pricingMode,
          unitPrice: data.price,
        },
      ],
    })),

  updateItem: (itemId, patch) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== itemId) {
          return item
        }

        const mergedItem: InvoiceItem = {
          ...item,
          ...patch,
        }

        return normalizeInvoiceItem(mergedItem)
      }),
    }))
  },

  removeItem: (itemId) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== itemId),
    })),

  setPaymentMethod: (method) =>
    set({
      payment: createDefaultPayment(method),
    }),

  setCashAmountPaid: (amountPaid) =>
    set((state) => {
      if (state.payment.method !== 'cash') {
        return state
      }

      return {
        payment: {
          ...state.payment,
          amountPaid: Number.isFinite(amountPaid) ? Math.max(amountPaid, 0) : 0,
        },
      }
    }),

  setBankTransferDetails: (patch) =>
    set((state) => {
      if (state.payment.method !== 'bank_transfer') {
        return state
      }

      return {
        payment: {
          ...state.payment,
          ...patch,
        },
      }
    }),

  setEWalletDetails: (patch) =>
    set((state) => {
      if (state.payment.method !== 'e_wallet') {
        return state
      }

      return {
        payment: {
          ...state.payment,
          ...patch,
        },
      }
    }),

  setOtherPaymentNote: (note) =>
    set((state) => {
      if (state.payment.method !== 'other') {
        return state
      }

      return {
        payment: {
          ...state.payment,
          note,
        },
      }
    }),

  setPaymentStatus: (status) => set({ status }),

  setDiscountType: (discountType) => set({ discountType }),
  setDiscountValue: (value) => set({ discountValue: Number.isFinite(value) ? value : 0 }),
  setCustomer: async (customerId) => {
    if (!customerId) {
      set({ customerId: null, customerSnapshot: null })
      return
    }

    const customer = await db.customers.get(customerId)
    if (!customer) {
      set({ customerId: null, customerSnapshot: null })
      return
    }

    set({
      customerId,
      customerSnapshot: toCustomerSnapshot(customer),
    })
  },
  setTaxEnabled: (enabled) => set({ taxEnabled: enabled }),
  setTaxRate: (value) => set({ taxRate: Number.isFinite(value) ? value : 0 }),

  saveInvoice: async () => {
    const state = get()
    if (state.items.length === 0) {
      return null
    }

    const totals = computeInvoiceTotals(
      state.items,
      state.discountType,
      state.discountValue,
      state.taxEnabled,
      state.taxRate,
    )

    if (totals.total <= 0) {
      return null
    }

    const timestamp = nowIso()
    const latestCustomer = state.customerId ? await db.customers.get(state.customerId) : undefined
    const resolvedCustomerSnapshot = latestCustomer
      ? toCustomerSnapshot(latestCustomer)
      : state.customerSnapshot

    const invoice: Invoice = {
      id: generateId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      items: state.items.map((item) => normalizeInvoiceItem(item)),
      customerId: state.customerId,
      customerSnapshot: resolvedCustomerSnapshot,
      status: state.status,
      payment: sanitizePayment(state.payment),
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      total: totals.total,
      discountType: state.discountType,
      discountValue: state.discountValue,
      taxEnabled: state.taxEnabled,
      taxRate: state.taxRate,
      notes: '',
    }

    await db.invoices.add(invoice)
    set((current) => ({
      historyInvoices: [invoice, ...current.historyInvoices],
    }))

    return invoice
  },

  clearInvoice: () => {
    const defaults = getTaxDefaults()
    set({
      items: [],
      customerId: null,
      customerSnapshot: null,
      status: 'unpaid',
      payment: createDefaultPayment(),
      discountType: 'percentage',
      discountValue: 0,
      taxEnabled: defaults.taxEnabled,
      taxRate: defaults.taxRate,
    })
  },

  loadInvoices: async () => {
    set({ isHistoryLoading: true, historyErrorMessage: null })

    try {
      const invoices = (await db.invoices.toArray()).map((invoice) =>
        normalizeStoredInvoice(invoice as StoredInvoice),
      )
      invoices.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      set({
        historyInvoices: invoices,
        isHistoryLoading: false,
      })
    } catch {
      set({
        isHistoryLoading: false,
        historyErrorMessage: 'Failed to load invoice history from IndexedDB.',
      })
    }
  },

  getInvoiceById: async (invoiceId) => {
    const inMemory = get().historyInvoices.find((invoice) => invoice.id === invoiceId)
    if (inMemory) {
      return inMemory
    }

    try {
      const invoice = await db.invoices.get(invoiceId)
      return invoice ? normalizeStoredInvoice(invoice as StoredInvoice) : null
    } catch {
      return null
    }
  },
}))

export const selectInvoiceTotals = (state: InvoiceStore): InvoiceTotals => {
  return computeInvoiceTotals(
    state.items,
    state.discountType,
    state.discountValue,
    state.taxEnabled,
    state.taxRate,
  )
}
