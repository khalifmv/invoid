import { Search, Plus, Trash2, Minus, PenLine } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { ProductEditorDialog, type ProductFormData } from '../components/dialogs/ProductEditorDialog'
import { DropdownSelect, type DropdownOption } from '../components/ui/DropdownSelect'
import { Input } from '../components/ui/Input'
import { NumberInput } from '../components/ui/NumberInput'
import { createCurrencyFormatter } from '../lib/currency'
import { computeCashChange, computeTransactionLineTotal, isCashPaymentSufficient } from '../lib/transaction-calculations'
import {
  DEFAULT_PRICING_MODE,
  DEFAULT_UNIT_CODE,
  isDecimalAllowedForUnit,
  normalizeCustomUnitLabel,
  normalizePricingMode,
  normalizeUnitCode,
  PRICING_MODE_OPTIONS,
  sanitizeQuantityForUnit,
  UNIT_OPTIONS,
} from '../lib/item-semantics'
import type { PaymentMethod, PdfDocType, Product, PricingMode, UnitCode } from '../types'
import { useCatalogStore } from '../store/catalogStore'
import { useCustomerStore } from '../store/customerStore'
import { selectTransactionTotals, useTransactionStore } from '../store/transactionStore'
import { useSettingsStore } from '../store/settingsStore'

interface MobileItemDraft {
  name: string
  quantity: number
  unitCode: UnitCode
  customUnitLabel: string
  pricingMode: PricingMode
  unitPrice: number
}

interface CustomerFormState {
  name: string
  phone: string
  email: string
  address: string
}

const EMPTY_CUSTOMER_FORM: CustomerFormState = {
  name: '',
  phone: '',
  email: '',
  address: '',
}

export function TransactionPage() {
  const navigate = useNavigate()
  const products = useCatalogStore((state) => state.products)
  const categories = useCatalogStore((state) => state.categories)
  const productMedia = useCatalogStore((state) => state.productMedia)
  const customers = useCustomerStore((state) => state.customers)
  const createCustomer = useCustomerStore((state) => state.createCustomer)
  const currencyCode = useSettingsStore((state) => state.currency)
  const businessName = useSettingsStore((state) => state.businessName)
  const logoDataUrl = useSettingsStore((state) => state.logoDataUrl)
  const lastPdfDocType = useSettingsStore((state) => state.lastPdfDocType)

  const {
    items,
    customerId,
    payment,
    addItemFromProduct,
    addCustomItem,
    updateItem,
    removeItem,
    setCashAmountPaid,
    setCustomer,
    setPaymentMethod,
    saveTransaction,
    clearTransaction,
  } = useTransactionStore()

  const totals = useTransactionStore(useShallow(selectTransactionTotals))

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null)

  const [advancedEditingItemId, setAdvancedEditingItemId] = useState<string | null>(null)
  const [advancedDraft, setAdvancedDraft] = useState<MobileItemDraft>({
    name: '',
    quantity: 1,
    unitCode: DEFAULT_UNIT_CODE,
    customUnitLabel: '',
    pricingMode: DEFAULT_PRICING_MODE,
    unitPrice: 0,
  })

  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [isSavingCustomer, setIsSavingCustomer] = useState(false)
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(EMPTY_CUSTOMER_FORM)
  const [isManualAddDialogOpen, setIsManualAddDialogOpen] = useState(false)
  const [exportDocType, setExportDocType] = useState<PdfDocType>(lastPdfDocType)

  const currency = useMemo(() => createCurrencyFormatter(currencyCode), [currencyCode])

  const coverMediaByProductId = useMemo(() => {
    const map = new Map<string, string>()
    for (const media of productMedia) {
      if (!map.has(media.productId) || media.isCover) {
        map.set(media.productId, media.thumbnailDataUrl)
      }
    }
    return map
  }, [productMedia])

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => p.isAvailable && (p.hasUnlimitedStock || p.stock > 0))
    if (selectedCategory) {
      list = list.filter((p) => p.categoryId === selectedCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q))
    }
    return list
  }, [products, selectedCategory, searchQuery])

  const customerOptions = useMemo<DropdownOption[]>(
    () =>
      customers.map((customer) => {
        const detail = customer.phone ?? customer.email ?? customer.address
        return {
          value: customer.id,
          label: detail ? `${customer.name} • ${detail}` : customer.name,
        }
      }),
    [customers],
  )

  const paymentMethodOptions = useMemo<DropdownOption[]>(
    () => [
      { value: 'cash', label: 'Cash' },
      { value: 'bank_transfer', label: 'Bank Transfer' },
      { value: 'e_wallet', label: 'E-Wallet' },
      { value: 'other', label: 'Other' },
    ],
    [],
  )

  const unitOptions = useMemo<DropdownOption[]>(() => UNIT_OPTIONS, [])
  const pricingModeOptions = useMemo<DropdownOption[]>(() => PRICING_MODE_OPTIONS, [])

  const canExport = items.length > 0 && totals.total > 0

  const handleProductClick = (product: Product) => {
    const existing = items.find((i) => i.productId === product.id)
    if (existing) {
      updateItem(existing.id, { quantity: existing.quantity + 1 })
    } else {
      addItemFromProduct(product)
    }
  }

  const handleSaveManualItem = (data: ProductFormData) => {
    addCustomItem(data)
    setIsManualAddDialogOpen(false)
  }

  const cashAmountPaid = payment.method === 'cash' ? payment.amountPaid : 0
  const cashChange = useMemo(() => computeCashChange(cashAmountPaid, totals.total), [cashAmountPaid, totals.total])
  const isCashInsufficient = useMemo(
    () => payment.method === 'cash' && !isCashPaymentSufficient(cashAmountPaid, totals.total),
    [cashAmountPaid, payment.method, totals.total],
  )

  const handleCustomerChange = (nextCustomerId: string) => {
    void setCustomer(nextCustomerId.length > 0 ? nextCustomerId : null)
  }

  const closeCustomerDialog = () => {
    setIsCustomerDialogOpen(false)
    setCustomerForm(EMPTY_CUSTOMER_FORM)
  }

  const saveNewCustomer = async () => {
    if (customerForm.name.trim().length === 0 || isSavingCustomer) {
      return
    }

    setIsSavingCustomer(true)

    try {
      const createdCustomer = await createCustomer(
        customerForm.name,
        customerForm.phone,
        customerForm.email,
        customerForm.address,
      )

      if (createdCustomer) {
        await setCustomer(createdCustomer.id)
        closeCustomerDialog()
      }
    } finally {
      setIsSavingCustomer(false)
    }
  }

  useEffect(() => {
    setExportDocType(lastPdfDocType)
  }, [lastPdfDocType])

  const openAdvancedEditor = (itemId: string) => {
    const item = items.find((entry) => entry.id === itemId)
    if (!item) return

    setAdvancedEditingItemId(item.id)
    setAdvancedDraft({
      name: item.name,
      quantity: sanitizeQuantityForUnit(item.quantity, item.unitCode ?? DEFAULT_UNIT_CODE),
      unitCode: normalizeUnitCode(item.unitCode ?? DEFAULT_UNIT_CODE),
      customUnitLabel: normalizeCustomUnitLabel(item.customUnitLabel),
      pricingMode: normalizePricingMode(item.pricingMode ?? DEFAULT_PRICING_MODE),
      unitPrice: item.unitPrice,
    })
  }

  const closeAdvancedEditor = () => {
    setAdvancedEditingItemId(null)
  }

  const saveAdvancedEditor = () => {
    if (!advancedEditingItemId) return

    updateItem(advancedEditingItemId, {
      name: advancedDraft.name,
      quantity: advancedDraft.quantity,
      unitCode: advancedDraft.unitCode,
      customUnitLabel: advancedDraft.customUnitLabel,
      pricingMode: advancedDraft.pricingMode,
      unitPrice: advancedDraft.unitPrice,
    })
    setAdvancedEditingItemId(null)
  }

  const handleExport = async () => {
    if (!canExport || isSaving) return

    setExportErrorMessage(null)
    setIsSaving(true)

    try {
      const savedTransaction = await saveTransaction()
      if (savedTransaction) {
        try {
          const { PdfLibRenderer, downloadPdfBlob, selectPdfTemplate } = await import('../lib/pdf')
          const template = await selectPdfTemplate(exportDocType)
          const pdfRenderer = new PdfLibRenderer()
          const pdfBlob = await pdfRenderer.render(template, {
            invoice: savedTransaction,
            businessName,
            currencyCode,
            logoDataUrl,
          })

          const filePrefix = exportDocType === 'receipt' ? 'receipt' : 'invoice'
          downloadPdfBlob(pdfBlob, `${filePrefix}-${savedTransaction.id}.pdf`)
          clearTransaction()
          navigate('/history')
        } catch {
          clearTransaction()
          setExportErrorMessage(
            'Transaction was saved, but PDF generation failed. Please check history and try again.',
          )
        }
      }
    } finally {
      setIsSaving(false)
    }
  }

  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <>
      {/* Container override to stretch edge to edge inside Layout */}
      <section className="-mx-4 -mt-4 flex h-[calc(100vh-theme(spacing.20))] flex-col sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 lg:h-[calc(100vh-theme(spacing.20))] lg:flex-row shadow-sm overflow-hidden">

        {/* Left Column (Products) */}
        <div className="flex flex-1 flex-col bg-stone-50 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 lg:p-6 lg:pb-4 border-b border-stone-200/50 bg-white/50 backdrop-blur-md">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Sales Transaction</h1>
              <p className="text-sm font-medium text-zinc-500">{currentDate}</p>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 pl-9 border-stone-200 bg-white shadow-sm"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="no-scrollbar flex gap-3 overflow-x-auto p-4 lg:px-6">
            <button
              onClick={() => setSelectedCategory('')}
              className={`whitespace-nowrap rounded-xl border px-5 py-2.5 font-semibold transition-colors shadow-sm ${selectedCategory === ''
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-stone-200 bg-white text-zinc-700 hover:bg-stone-50'
                }`}
            >
              All Product
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap rounded-xl border px-5 py-2.5 font-semibold transition-colors shadow-sm ${selectedCategory === cat.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-stone-200 bg-white text-zinc-700 hover:bg-stone-50'
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-4 pt-0 lg:px-6 lg:pb-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              <button
                onClick={() => setIsManualAddDialogOpen(true)}
                className="flex h-56 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-100/50 p-4 transition-colors hover:border-blue-500 hover:bg-blue-50/50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                  <Plus className="h-6 w-6 text-zinc-600" />
                </div>
                <span className="text-sm font-semibold text-zinc-700">Add New Product</span>
              </button>

              {filteredProducts.map((product) => {
                const cover = coverMediaByProductId.get(product.id)
                const inCart = items.some((i) => i.productId === product.id)
                return (
                  <div
                    onClick={() => handleProductClick(product)}
                    key={product.id}
                    className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border-2 transition-all ${inCart
                      ? 'border-blue-500 bg-blue-50/30 shadow-md ring-2 ring-blue-500/20'
                      : 'border-stone-100 bg-white hover:border-blue-200 hover:shadow-md'
                      }`}
                  >
                    <div className="relative aspect-square w-full bg-stone-100 shrink-0">
                      {cover ? (
                        <img src={cover} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-stone-400">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-3">
                      <h3 className="line-clamp-2 text-sm font-semibold text-zinc-800 leading-tight">
                        {product.name}
                      </h3>
                      <p className="mt-2 text-sm font-bold text-blue-600">
                        {currency.format(product.defaultPrice)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column (Cart / Order Detail) */}
        <aside className="border-t border-stone-200 bg-white lg:w-[420px] lg:border-l lg:border-t-0 flex flex-col overflow-hidden shrink-0 shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10">
          <div className="flex items-center justify-between border-b border-stone-100 p-4 shrink-0 bg-white">
            <h2 className="text-lg font-extrabold text-zinc-900 tracking-tight">Detail Order</h2>
          </div>

          <div className="p-4 border-b border-stone-100 shrink-0 bg-stone-50/50">
            <label className="mb-1.5 block text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Customer
            </label>
            <div className="flex gap-2">
              <DropdownSelect
                value={customerId ?? ''}
                onChange={handleCustomerChange}
                options={[{ value: '', label: 'Walk-in / Select Customer' }, ...customerOptions]}
                ariaLabel="Select customer"
                className="flex-1 bg-white"
              />
              <Button variant="outline" onClick={() => setIsCustomerDialogOpen(true)} className="px-3 bg-white">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-stone-50/30">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-800">Your order</h3>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsManualAddDialogOpen(true)}>+ Manual</Button>
            </div>

            {items.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-200 bg-white">
                <p className="text-sm font-medium text-zinc-400">Cart is empty.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {items.map((item) => {
                  const cover = item.productId ? coverMediaByProductId.get(item.productId) : undefined
                  const lineTotal = computeTransactionLineTotal(item)

                  return (
                    <div
                      key={item.id}
                      className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      {cover ? (
                        <img src={cover} alt={item.name} className="h-16 w-16 shrink-0 rounded-lg object-cover border border-stone-100" />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-stone-100 border border-stone-200">
                          <span className="text-[10px] font-medium text-stone-400">No Img</span>
                        </div>
                      )}

                      <div className="flex flex-1 flex-col justify-between overflow-hidden">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-bold text-zinc-900 leading-tight">
                              {item.name}
                            </h4>
                            <div className="mt-0.5 flex items-center gap-2">
                              <p className="text-xs font-semibold text-zinc-500">
                                {currency.format(item.unitPrice)}
                              </p>
                              {item.pricingMode !== 'flat' && (
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide bg-stone-100 px-1.5 py-0.5 rounded">
                                  {item.unitCode}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => openAdvancedEditor(item.id)}
                              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                            >
                              <PenLine className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-1">
                            <button
                              onClick={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                              className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-zinc-600 shadow-sm border border-stone-200 hover:bg-stone-100 disabled:opacity-50"
                              disabled={item.quantity <= 1 || item.pricingMode === 'flat'}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-5 text-center text-xs font-extrabold text-zinc-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}
                              className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-zinc-600 shadow-sm border border-stone-200 hover:bg-stone-100 disabled:opacity-50"
                              disabled={item.pricingMode === 'flat'}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="text-sm font-bold text-zinc-900">
                            {currency.format(lineTotal)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="border-t border-stone-200 bg-white p-4 shrink-0 shadow-[0_-4px_24px_rgba(0,0,0,0.02)] z-20">
            <dl className="mb-4 grid gap-2 text-sm text-zinc-600">
              <div className="flex justify-between">
                <dt>Subtotal ({items.length})</dt>
                <dd className="font-semibold text-zinc-900">{currency.format(totals.subtotal)}</dd>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between">
                  <dt>Discount</dt>
                  <dd className="font-semibold text-red-600">-{currency.format(totals.discountAmount)}</dd>
                </div>
              )}
              {totals.taxAmount > 0 && (
                <div className="flex justify-between">
                  <dt>Service Tax</dt>
                  <dd className="font-semibold text-zinc-900">{currency.format(totals.taxAmount)}</dd>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-dashed border-stone-200 pt-3 text-base">
                <dt className="font-extrabold text-zinc-900">Total payment</dt>
                <dd className="font-extrabold text-blue-600 text-lg leading-none">{currency.format(totals.total)}</dd>
              </div>
            </dl>

            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-bold text-zinc-700">Payment method <span className="text-red-500">*</span></label>
              <DropdownSelect
                value={payment.method}
                onChange={(nextValue) => setPaymentMethod(nextValue as PaymentMethod)}
                options={paymentMethodOptions}
              />

              {payment.method === 'cash' && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <NumberInput
                    min={0}
                    value={payment.amountPaid}
                    onValueChange={setCashAmountPaid}
                    placeholder="Amount Given"
                  />
                  <div className="flex items-center justify-between rounded-xl bg-stone-100 px-3 py-2">
                    <span className="text-xs font-semibold text-zinc-500">Change</span>
                    <span className={`text-sm font-bold ${isCashInsufficient ? 'text-red-600' : 'text-zinc-900'}`}>{currency.format(cashChange)}</span>
                  </div>
                </div>
              )}
            </div>

            <Button
              className="h-12 w-full shadow-lg shadow-blue-500/20 text-base"
              disabled={!canExport || isSaving || (payment.method === 'cash' && isCashInsufficient)}
              onClick={handleExport}
            >
              {isSaving ? 'Processing...' : 'Make Order'}
            </Button>

            {exportErrorMessage && (
              <p className="mt-2 text-center text-xs font-semibold text-red-600">{exportErrorMessage}</p>
            )}
          </div>
        </aside>
      </section>

      <ProductEditorDialog
        open={isManualAddDialogOpen}
        onClose={() => setIsManualAddDialogOpen(false)}
        onSave={handleSaveManualItem}
        title="Add Manual Item"
        saveLabel="Add to Cart"
        showCategory={false}
      />

      <Dialog
        open={Boolean(advancedEditingItemId)}
        onClose={closeAdvancedEditor}
        title="Advanced Item Edit"
        footer={
          <>
            <Button variant="outline" onClick={closeAdvancedEditor}>
              Cancel
            </Button>
            <Button onClick={saveAdvancedEditor} disabled={advancedDraft.name.trim().length === 0}>
              Save Changes
            </Button>
          </>
        }
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">Description</label>
          <Input
            value={advancedDraft.name}
            onChange={(event) => setAdvancedDraft((prev) => ({ ...prev, name: event.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">Amount</label>
          <NumberInput
            min={0}
            allowDecimal={isDecimalAllowedForUnit(advancedDraft.unitCode)}
            value={advancedDraft.quantity}
            onValueChange={(quantity) => setAdvancedDraft((prev) => ({ ...prev, quantity }))}
            disabled={advancedDraft.pricingMode === 'flat'}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">Unit</label>
          <DropdownSelect
            value={advancedDraft.unitCode}
            onChange={(nextValue) =>
              setAdvancedDraft((prev) => {
                const nextUnitCode = normalizeUnitCode(nextValue)
                return {
                  ...prev,
                  unitCode: nextUnitCode,
                  quantity: sanitizeQuantityForUnit(prev.quantity, nextUnitCode),
                  customUnitLabel: nextUnitCode === 'custom' ? prev.customUnitLabel : '',
                }
              })
            }
            options={unitOptions}
          />
        </div>

        {advancedDraft.unitCode === 'custom' && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Custom unit label</label>
            <Input
              value={advancedDraft.customUnitLabel}
              onChange={(event) =>
                setAdvancedDraft((prev) => ({ ...prev, customUnitLabel: event.target.value }))
              }
              placeholder="e.g. bundle"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">Pricing mode</label>
          <DropdownSelect
            value={advancedDraft.pricingMode}
            onChange={(nextValue) =>
              setAdvancedDraft((prev) => {
                const nextPricingMode = normalizePricingMode(nextValue)
                return {
                  ...prev,
                  pricingMode: nextPricingMode,
                  quantity: nextPricingMode === 'flat' ? 1 : prev.quantity,
                }
              })
            }
            options={pricingModeOptions}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">
            {advancedDraft.pricingMode === 'flat' ? 'Flat fee' : 'Unit price'}
          </label>
          <NumberInput
            min={0}
            value={advancedDraft.unitPrice}
            onValueChange={(unitPrice) => setAdvancedDraft((prev) => ({ ...prev, unitPrice }))}
          />
        </div>
      </Dialog>

      <Dialog
        open={isCustomerDialogOpen}
        onClose={closeCustomerDialog}
        title="New Customer"
        footer={
          <>
            <Button variant="outline" onClick={closeCustomerDialog}>
              Cancel
            </Button>
            <Button
              onClick={() => void saveNewCustomer()}
              disabled={customerForm.name.trim().length === 0 || isSavingCustomer}
            >
              {isSavingCustomer ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">Name</label>
          <Input
            value={customerForm.name}
            onChange={(event) => setCustomerForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Customer name"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">Phone</label>
          <Input
            value={customerForm.phone}
            onChange={(event) => setCustomerForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">Email</label>
          <Input
            value={customerForm.email}
            onChange={(event) => setCustomerForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">Address</label>
          <Input
            value={customerForm.address}
            onChange={(event) => setCustomerForm((prev) => ({ ...prev, address: event.target.value }))}
            placeholder="Optional"
          />
        </div>
      </Dialog>
    </>
  )
}
