import { PenLine, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '../components/ui/Button'
import { Card, CardTitle } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { DropdownSelect, type DropdownOption } from '../components/ui/DropdownSelect'
import { Input } from '../components/ui/Input'
import { NumberInput } from '../components/ui/NumberInput'
import { Toggle } from '../components/ui/Toggle'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { createCurrencyFormatter } from '../lib/currency'
import { computeCashChange, isCashPaymentSufficient } from '../lib/invoice-calculations'
import type { DiscountType, PaymentMethod } from '../types'
import { useCatalogStore } from '../store/catalogStore'
import { useCustomerStore } from '../store/customerStore'
import { selectInvoiceTotals, useInvoiceStore } from '../store/invoiceStore'
import { useSettingsStore } from '../store/settingsStore'

interface MobileItemDraft {
  name: string
  quantity: number
  unitPrice: number
}

interface InvoiceRowDraft {
  name: string
  quantity: number
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

export function InvoicePage() {
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const products = useCatalogStore((state) => state.products)
  const customers = useCustomerStore((state) => state.customers)
  const createCustomer = useCustomerStore((state) => state.createCustomer)
  const currencyCode = useSettingsStore((state) => state.currency)
  const businessName = useSettingsStore((state) => state.businessName)
  const {
    items,
    customerId,
    payment,
    discountType,
    discountValue,
    taxEnabled,
    taxRate,
    addItemFromProduct,
    addManualItem,
    updateItem,
    removeItem,
    setBankTransferDetails,
    setCashAmountPaid,
    setCustomer,
    setDiscountType,
    setDiscountValue,
    setEWalletDetails,
    setOtherPaymentNote,
    setPaymentMethod,
    setTaxEnabled,
    setTaxRate,
    saveInvoice,
    clearInvoice,
  } = useInvoiceStore()
  const totals = useInvoiceStore(useShallow(selectInvoiceTotals))

  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null)
  const [editingDesktopItemId, setEditingDesktopItemId] = useState<string | null>(null)
  const [itemDrafts, setItemDrafts] = useState<Record<string, InvoiceRowDraft>>({})
  const [mobileEditingItemId, setMobileEditingItemId] = useState<string | null>(null)
  const [mobileDraft, setMobileDraft] = useState<MobileItemDraft>({
    name: '',
    quantity: 1,
    unitPrice: 0,
  })
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [isSavingCustomer, setIsSavingCustomer] = useState(false)
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(EMPTY_CUSTOMER_FORM)

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  )

  const currency = useMemo(() => createCurrencyFormatter(currencyCode), [currencyCode])
  const productOptions = useMemo<DropdownOption[]>(
    () =>
      products.map((product) => ({
        value: product.id,
        label: `${product.name} (${currency.format(product.defaultPrice)})`,
      })),
    [currency, products],
  )
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
  const discountOptions = useMemo<DropdownOption[]>(
    () => [
      { value: 'percentage', label: '% Percent' },
      { value: 'fixed', label: 'Fixed amount' },
    ],
    [],
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

  const canExport = items.length > 0 && totals.total > 0
  const mobileEditingItem = useMemo(
    () => items.find((item) => item.id === mobileEditingItemId) ?? null,
    [items, mobileEditingItemId],
  )

  const handleAddSelectedProduct = () => {
    if (selectedProduct) {
      addItemFromProduct(selectedProduct)
    }
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
    const nextDrafts = Object.fromEntries(
      items.map((item) => [
        item.id,
        {
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        },
      ]),
    )
    setItemDrafts(nextDrafts)
  }, [items])

  const handleDraftChange = (itemId: string, patch: Partial<InvoiceRowDraft>) => {
    setItemDrafts((previous) => ({
      ...previous,
      [itemId]: {
        ...previous[itemId],
        ...patch,
      },
    }))
  }

  const openDesktopEditor = (itemId: string) => {
    const item = items.find((entry) => entry.id === itemId)
    if (!item) {
      return
    }

    setEditingDesktopItemId(itemId)
    setItemDrafts((previous) => ({
      ...previous,
      [itemId]: {
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      },
    }))
  }

  const cancelDesktopEditor = () => {
    if (!editingDesktopItemId) {
      return
    }

    const item = items.find((entry) => entry.id === editingDesktopItemId)
    if (item) {
      setItemDrafts((previous) => ({
        ...previous,
        [editingDesktopItemId]: {
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        },
      }))
    }
    setEditingDesktopItemId(null)
  }

  const saveDesktopEditor = (itemId: string) => {
    const draft = itemDrafts[itemId]
    if (!draft || draft.name.trim().length === 0) {
      return
    }

    updateItem(itemId, {
      name: draft.name,
      quantity: draft.quantity,
      unitPrice: draft.unitPrice,
    })
    setEditingDesktopItemId(null)
  }

  useEffect(() => {
    if (!isDesktop && editingDesktopItemId) {
      setEditingDesktopItemId(null)
    }
  }, [editingDesktopItemId, isDesktop])

  const openMobileEditor = (itemId: string) => {
    const item = items.find((entry) => entry.id === itemId)
    if (!item) {
      return
    }

    setMobileEditingItemId(item.id)
    setMobileDraft({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })
  }

  const closeMobileEditor = () => {
    setMobileEditingItemId(null)
  }

  const saveMobileEditor = () => {
    if (!mobileEditingItemId) {
      return
    }

    updateItem(mobileEditingItemId, {
      name: mobileDraft.name,
      quantity: mobileDraft.quantity,
      unitPrice: mobileDraft.unitPrice,
    })
    setMobileEditingItemId(null)
  }

  const handleExport = async () => {
    if (!canExport || isSaving) {
      return
    }

    setExportErrorMessage(null)
    setIsSaving(true)

    try {
      const savedInvoice = await saveInvoice()
      if (savedInvoice) {
        try {
          const { PdfLibRenderer, downloadPdfBlob, loadDefaultPdfTemplate } = await import('../lib/pdf')
          const template = await loadDefaultPdfTemplate()
          const pdfRenderer = new PdfLibRenderer()
          const pdfBlob = await pdfRenderer.render(template, {
            invoice: savedInvoice,
            businessName,
            currencyCode,
          })

          downloadPdfBlob(pdfBlob, `invoice-${savedInvoice.id}.pdf`)
          clearInvoice()
          navigate('/history')
        } catch {
          clearInvoice()
          setExportErrorMessage(
            'Invoice was saved, but PDF generation failed. Please check history and try again.',
          )
        }
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <section className="mx-auto grid w-full gap-4 lg:grid-cols-[1.8fr_1fr]">
        <div className="grid gap-4">
          <Card>
            <CardTitle>Customer</CardTitle>

            <div className="flex flex-wrap gap-2">
              <DropdownSelect
                value={customerId ?? ''}
                onChange={handleCustomerChange}
                options={[{ value: '', label: 'Walk-in / no customer' }, ...customerOptions]}
                ariaLabel="Select customer"
                className="min-w-60 flex-1"
              />
              <Button variant="outline" onClick={() => setIsCustomerDialogOpen(true)}>
                + New Customer
              </Button>
            </div>
          </Card>

          <Card>
            <CardTitle>Invoice Items</CardTitle>

            <div className="mb-4 flex flex-wrap gap-2">
              <DropdownSelect
                value={selectedProductId}
                onChange={setSelectedProductId}
                options={[{ value: '', label: '- pick a product -' }, ...productOptions]}
                ariaLabel="Select product"
                className="min-w-60 flex-1"
              />
              <Button onClick={handleAddSelectedProduct} disabled={!selectedProduct}>
                + Add
              </Button>
              <Button variant="outline" onClick={addManualItem}>
                + Manual
              </Button>
            </div>

            {items.length === 0 ? (
              <p className="py-2 text-sm text-zinc-400">No items. Pick a product or add a manual line.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-stone-200">
                <div className="max-h-[460px] overflow-auto">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-stone-100">
                      <tr className="text-xs font-semibold tracking-[0.08em] text-zinc-500 uppercase">
                        <th className="p-2 text-left">Item</th>
                        <th className="hidden p-2 text-left md:table-cell">Qty</th>
                        <th className="hidden p-2 text-left md:table-cell">Unit Price</th>
                        <th className="p-2 text-right">Total</th>
                        <th className="w-24 p-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const draft = itemDrafts[item.id] ?? {
                          name: item.name,
                          quantity: item.quantity,
                          unitPrice: item.unitPrice,
                        }
                        const isEditingDesktop = editingDesktopItemId === item.id
                        const lineTotal = isEditingDesktop
                          ? draft.quantity * draft.unitPrice
                          : item.quantity * item.unitPrice

                        return (
                        <tr key={item.id} className="border-t border-stone-200 bg-white">
                          <td className="p-2 align-top">
                            <div className="md:hidden">
                              <p className="truncate text-sm font-semibold text-zinc-800">{item.name}</p>
                              <p className="mt-1 text-xs text-zinc-500">
                                {item.quantity} x {currency.format(item.unitPrice)}
                              </p>
                            </div>
                            <div className="hidden md:block">
                              {isEditingDesktop ? (
                                <Input
                                  value={draft.name}
                                  onChange={(event) =>
                                    handleDraftChange(item.id, { name: event.target.value })
                                  }
                                  aria-label="Item name"
                                />
                              ) : (
                                <p className="text-sm font-semibold text-zinc-800">{item.name}</p>
                              )}
                            </div>
                          </td>
                          <td className="hidden p-2 md:table-cell">
                            {isEditingDesktop ? (
                              <NumberInput
                                min={0}
                                value={draft.quantity}
                                allowDecimal={false}
                                onValueChange={(quantity) => handleDraftChange(item.id, { quantity })}
                                aria-label="Quantity"
                              />
                            ) : (
                              <p className="text-sm text-zinc-700">{item.quantity}</p>
                            )}
                          </td>
                          <td className="hidden p-2 md:table-cell">
                            {isEditingDesktop ? (
                              <NumberInput
                                min={0}
                                value={draft.unitPrice}
                                onValueChange={(unitPrice) => handleDraftChange(item.id, { unitPrice })}
                                aria-label="Unit price"
                              />
                            ) : (
                              <p className="text-sm text-zinc-700">{currency.format(item.unitPrice)}</p>
                            )}
                          </td>
                          <td className="p-2 text-right align-middle text-sm font-semibold text-zinc-800">
                            {currency.format(lineTotal)}
                          </td>
                          <td className="p-2">
                            <div className="flex justify-end gap-1">
                              {isEditingDesktop && isDesktop ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => saveDesktopEditor(item.id)}
                                    disabled={draft.name.trim().length === 0}
                                    aria-label="Save item"
                                  >
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={cancelDesktopEditor}
                                    aria-label="Cancel editing item"
                                  >
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      isDesktop ? openDesktopEditor(item.id) : openMobileEditor(item.id)
                                    }
                                    aria-label="Edit item"
                                  >
                                    <PenLine className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => removeItem(item.id)}
                                    aria-label="Remove item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </div>

        <aside className="grid gap-4">
          <Card className="lg:sticky lg:top-4">
            <CardTitle>Summary</CardTitle>

            <div className="mb-4">
              <label htmlFor="discount-type" className="mb-1 block text-xs font-semibold text-zinc-600">
                Discount
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <DropdownSelect
                  id="discount-type"
                  value={discountType}
                  onChange={(nextValue) => setDiscountType(nextValue as DiscountType)}
                  options={discountOptions}
                />
                <NumberInput
                  min={0}
                  value={discountValue}
                  onValueChange={setDiscountValue}
                  aria-label="Discount value"
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="tax-toggle" className="text-xs font-semibold text-zinc-600">
                  Tax
                </label>
                <Toggle
                  id="tax-toggle"
                  checked={taxEnabled}
                  onChange={(event) => setTaxEnabled(event.target.checked)}
                />
              </div>
              <NumberInput
                min={0}
                max={100}
                value={taxRate}
                onValueChange={setTaxRate}
                disabled={!taxEnabled}
                aria-label="Tax rate %"
                placeholder="Tax %"
              />
            </div>

            <div className="mb-4 border-t border-stone-200 pt-3">
              <label htmlFor="payment-method" className="mb-1 block text-xs font-semibold text-zinc-600">
                Payment Method
              </label>
              <DropdownSelect
                id="payment-method"
                value={payment.method}
                onChange={(nextValue) => setPaymentMethod(nextValue as PaymentMethod)}
                options={paymentMethodOptions}
              />

              {payment.method === 'cash' && (
                <div className="mt-3 grid gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-600">Amount Paid</label>
                    <NumberInput
                      min={0}
                      value={payment.amountPaid}
                      onValueChange={setCashAmountPaid}
                      aria-label="Amount paid"
                    />
                  </div>

                  <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-600">Change</span>
                      <span className="font-semibold text-zinc-900">{currency.format(cashChange)}</span>
                    </div>
                    {isCashInsufficient && (
                      <p className="mt-1 text-xs font-semibold text-red-600">
                        Amount paid is below total.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {payment.method === 'bank_transfer' && (
                <div className="mt-3 grid gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-600">Bank Name</label>
                    <Input
                      value={payment.bankName}
                      onChange={(event) => setBankTransferDetails({ bankName: event.target.value })}
                      placeholder="Bank name"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-600">Account Number</label>
                    <Input
                      value={payment.accountNumber}
                      onChange={(event) => setBankTransferDetails({ accountNumber: event.target.value })}
                      placeholder="Account number"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-600">Account Name</label>
                    <Input
                      value={payment.accountName}
                      onChange={(event) => setBankTransferDetails({ accountName: event.target.value })}
                      placeholder="Account holder"
                    />
                  </div>
                </div>
              )}

              {payment.method === 'e_wallet' && (
                <div className="mt-3 grid gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-600">Provider</label>
                    <Input
                      value={payment.provider}
                      onChange={(event) => setEWalletDetails({ provider: event.target.value })}
                      placeholder="e.g. GoPay"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-600">Account</label>
                    <Input
                      value={payment.account}
                      onChange={(event) => setEWalletDetails({ account: event.target.value })}
                      placeholder="Phone or account"
                    />
                  </div>
                </div>
              )}

              {payment.method === 'other' && (
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Note</label>
                  <Input
                    value={payment.note}
                    onChange={(event) => setOtherPaymentNote(event.target.value)}
                    placeholder="Payment note"
                  />
                </div>
              )}
            </div>

            <dl className="my-4 border-t border-stone-200 pt-3">
              <div className="flex justify-between py-1 text-sm">
                <dt>Subtotal</dt>
                <dd>{currency.format(totals.subtotal)}</dd>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between py-1 text-sm">
                  <dt>Discount</dt>
                  <dd className="text-red-600">-{currency.format(totals.discountAmount)}</dd>
                </div>
              )}
              {taxEnabled && (
                <div className="flex justify-between py-1 text-sm">
                  <dt>Tax ({taxRate}%)</dt>
                  <dd>{currency.format(totals.taxAmount)}</dd>
                </div>
              )}
              <div className="mt-1 flex justify-between border-t border-stone-200 pt-2 text-lg font-extrabold">
                <dt>Total</dt>
                <dd>{currency.format(totals.total)}</dd>
              </div>
            </dl>

            {exportErrorMessage && <p className="mb-3 text-xs font-semibold text-red-600">{exportErrorMessage}</p>}

            <Button className="h-11 w-full" disabled={!canExport || isSaving} onClick={handleExport}>
              {isSaving ? 'Exporting...' : 'Export PDF'}
            </Button>
          </Card>
        </aside>
      </section>

      <Dialog
        open={Boolean(mobileEditingItem)}
        onClose={closeMobileEditor}
        title="Edit Invoice Item"
        footer={
          <>
            <Button variant="outline" onClick={closeMobileEditor}>
              Cancel
            </Button>
            <Button onClick={saveMobileEditor} disabled={mobileDraft.name.trim().length === 0}>
              Save
            </Button>
          </>
        }
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">Description</label>
          <Input
            value={mobileDraft.name}
            onChange={(event) => setMobileDraft((prev) => ({ ...prev, name: event.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">Quantity</label>
          <NumberInput
            min={0}
            allowDecimal={false}
            value={mobileDraft.quantity}
            onValueChange={(quantity) => setMobileDraft((prev) => ({ ...prev, quantity }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">Unit price</label>
          <NumberInput
            min={0}
            value={mobileDraft.unitPrice}
            onValueChange={(unitPrice) => setMobileDraft((prev) => ({ ...prev, unitPrice }))}
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
