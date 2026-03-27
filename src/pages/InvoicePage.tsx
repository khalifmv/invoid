import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '../components/ui/Button'
import { Card, CardTitle } from '../components/ui/Card'
import { DropdownSelect, type DropdownOption } from '../components/ui/DropdownSelect'
import { Input } from '../components/ui/Input'
import { NumberInput } from '../components/ui/NumberInput'
import { Toggle } from '../components/ui/Toggle'
import { createCurrencyFormatter } from '../lib/currency'
import type { DiscountType } from '../types'
import { useCatalogStore } from '../store/catalogStore'
import { selectInvoiceTotals, useInvoiceStore } from '../store/invoiceStore'
import { useSettingsStore } from '../store/settingsStore'

export function InvoicePage() {
  const navigate = useNavigate()
  const products = useCatalogStore((state) => state.products)
  const currencyCode = useSettingsStore((state) => state.currency)
  const {
    items,
    discountType,
    discountValue,
    taxEnabled,
    taxRate,
    addItemFromProduct,
    addManualItem,
    updateItem,
    removeItem,
    setDiscountType,
    setDiscountValue,
    setTaxEnabled,
    setTaxRate,
    saveInvoice,
    clearInvoice,
  } = useInvoiceStore()
  const totals = useInvoiceStore(useShallow(selectInvoiceTotals))

  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  )

  const currency = useMemo(
    () => createCurrencyFormatter(currencyCode),
    [currencyCode],
  )
  const productOptions = useMemo<DropdownOption[]>(
    () =>
      products.map((product) => ({
        value: product.id,
        label: `${product.name} (${currency.format(product.defaultPrice)})`,
      })),
    [currency, products],
  )
  const discountOptions = useMemo<DropdownOption[]>(
    () => [
      { value: 'percentage', label: '% Percent' },
      { value: 'fixed', label: 'Fixed amount' },
    ],
    [],
  )

  const canExport = items.length > 0 && totals.total > 0

  const handleAddSelectedProduct = () => {
    if (selectedProduct) {
      addItemFromProduct(selectedProduct)
    }
  }

  const handleExport = async () => {
    if (!canExport || isSaving) {
      return
    }

    setIsSaving(true)

    try {
      const savedInvoice = await saveInvoice()
      if (savedInvoice) {
        clearInvoice()
        navigate('/history')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="mx-auto grid w-full gap-4 lg:grid-cols-[1.8fr_1fr]">
      <div className="grid gap-4">
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
            <div className="grid gap-2">
              <div className="hidden grid-cols-[2.4fr_0.8fr_1fr_1fr_auto] gap-2 px-1 text-[11px] font-semibold tracking-[0.08em] text-zinc-400 uppercase md:grid">
                <span>Description</span>
                <span>Qty</span>
                <span>Unit price</span>
                <span>Line total</span>
                <span />
              </div>

              {items.map((item) => (
                <div
                  className="grid items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-2 md:grid-cols-[2.4fr_0.8fr_1fr_1fr_auto]"
                  key={item.id}
                >
                  <Input
                    value={item.name}
                    onChange={(event) => updateItem(item.id, { name: event.target.value })}
                    aria-label="Item name"
                  />
                  <NumberInput
                    min={0}
                    value={item.quantity}
                    allowDecimal={false}
                    onValueChange={(quantity) => updateItem(item.id, { quantity })}
                    aria-label="Quantity"
                  />
                  <NumberInput
                    min={0}
                    value={item.unitPrice}
                    onValueChange={(unitPrice) => updateItem(item.id, { unitPrice })}
                    aria-label="Unit price"
                  />
                  <span className="text-right text-sm font-semibold text-zinc-700 md:pr-1">
                    {currency.format(item.quantity * item.unitPrice)}
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    aria-label="Remove item"
                  >
                    x
                  </Button>
                </div>
              ))}
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

          <Button className="h-11 w-full" disabled={!canExport || isSaving} onClick={handleExport}>
            {isSaving ? 'Saving...' : 'Export PDF'}
          </Button>
        </Card>
      </aside>
    </section>
  )
}
