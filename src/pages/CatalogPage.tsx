import { PenLine, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardTitle } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { ProductEditorDialog, type ProductFormData } from '../components/dialogs/ProductEditorDialog'
import { DropdownSelect, type DropdownOption } from '../components/ui/DropdownSelect'
import { Input } from '../components/ui/Input'
import { NumberInput } from '../components/ui/NumberInput'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { createCurrencyFormatter } from '../lib/currency'
import {
  DEFAULT_PRICING_MODE,
  DEFAULT_UNIT_CODE,
  formatItemAmountLabel,
  normalizeCustomUnitLabel,
  normalizePricingMode,
  normalizeUnitCode,
  PRICING_MODE_OPTIONS,
  UNIT_OPTIONS,
} from '../lib/item-semantics'
import type { PricingMode, Product, UnitCode } from '../types'
import { useCatalogStore } from '../store/catalogStore'
import { useSettingsStore } from '../store/settingsStore'

type CatalogTab = 'products' | 'categories'

interface ProductDraft {
  name: string
  defaultPrice: number
  categoryId: string
  defaultUnitCode: UnitCode
  defaultCustomUnitLabel: string
  defaultPricingMode: PricingMode
}

const toDraft = (product: Product): ProductDraft => ({
  name: product.name,
  defaultPrice: product.defaultPrice,
  categoryId: product.categoryId ?? '',
  defaultUnitCode: normalizeUnitCode(product.defaultUnitCode ?? DEFAULT_UNIT_CODE),
  defaultCustomUnitLabel: normalizeCustomUnitLabel(product.defaultCustomUnitLabel),
  defaultPricingMode: normalizePricingMode(product.defaultPricingMode ?? DEFAULT_PRICING_MODE),
})

export function CatalogPage() {
  const isDesktop = useIsDesktop()
  const currencyCode = useSettingsStore((state) => state.currency)
  const {
    categories,
    products,
    isLoading,
    errorMessage,
    createCategory,
    createProduct,
    updateProduct,
    deleteProduct,
  } = useCatalogStore()

  const [activeTab, setActiveTab] = useState<CatalogTab>('products')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false)
  const [productDrafts, setProductDrafts] = useState<Record<string, ProductDraft>>({})
  const [editingDesktopProductId, setEditingDesktopProductId] = useState<string | null>(null)
  const [mobileEditingProductId, setMobileEditingProductId] = useState<string | null>(null)
  const [mobileDraft, setMobileDraft] = useState<ProductDraft>({
    name: '',
    defaultPrice: 0,
    categoryId: '',
    defaultUnitCode: DEFAULT_UNIT_CODE,
    defaultCustomUnitLabel: '',
    defaultPricingMode: DEFAULT_PRICING_MODE,
  })
  const [savingProductId, setSavingProductId] = useState<string | null>(null)

  const categoryNamesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  )
  const categoryOptions = useMemo<DropdownOption[]>(
    () => [
      { value: '', label: 'No category' },
      ...categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    ],
    [categories],
  )
  const unitOptions = useMemo<DropdownOption[]>(() => UNIT_OPTIONS, [])
  const pricingModeOptions = useMemo<DropdownOption[]>(() => PRICING_MODE_OPTIONS, [])

  const currency = useMemo(() => createCurrencyFormatter(currencyCode), [currencyCode])
  const mobileEditingProduct = useMemo(
    () => products.find((product) => product.id === mobileEditingProductId) ?? null,
    [products, mobileEditingProductId],
  )

  useEffect(() => {
    const nextDrafts = Object.fromEntries(products.map((product) => [product.id, toDraft(product)]))
    setProductDrafts(nextDrafts)
  }, [products])

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await createCategory(newCategoryName)
    setNewCategoryName('')
  }

  const handleSaveProductEditor = async (data: ProductFormData) => {
    await createProduct(
      data.name,
      data.price,
      data.categoryId || null,
      data.unitCode,
      data.customUnitLabel,
      data.pricingMode,
    )
    setIsNewProductDialogOpen(false)
  }

  const handleDraftChange = (productId: string, patch: Partial<ProductDraft>) => {
    setProductDrafts((previous) => ({
      ...previous,
      [productId]: {
        ...previous[productId],
        ...patch,
      },
    }))
  }

  const openDesktopEditor = (productId: string) => {
    const product = products.find((entry) => entry.id === productId)
    if (!product) {
      return
    }

    setEditingDesktopProductId(productId)
    setProductDrafts((previous) => ({
      ...previous,
      [productId]: toDraft(product),
    }))
  }

  const cancelDesktopEditor = () => {
    if (!editingDesktopProductId) {
      return
    }

    const product = products.find((entry) => entry.id === editingDesktopProductId)
    if (product) {
      setProductDrafts((previous) => ({
        ...previous,
        [editingDesktopProductId]: toDraft(product),
      }))
    }
    setEditingDesktopProductId(null)
  }

  const handleSaveProduct = async (productId: string) => {
    const draft = productDrafts[productId]
    if (!draft || draft.name.trim().length === 0) {
      return
    }

    setSavingProductId(productId)

    try {
      await updateProduct(
        productId,
        draft.name,
        draft.defaultPrice,
        draft.categoryId || null,
        draft.defaultUnitCode,
        draft.defaultCustomUnitLabel,
        draft.defaultPricingMode,
      )
      setEditingDesktopProductId(null)
    } finally {
      setSavingProductId(null)
    }
  }

  const openMobileEditor = (productId: string) => {
    const product = products.find((entry) => entry.id === productId)
    if (!product) {
      return
    }

    setMobileEditingProductId(productId)
    setMobileDraft(toDraft(product))
  }

  const closeMobileEditor = () => {
    setMobileEditingProductId(null)
  }

  const saveMobileEditor = async () => {
    if (!mobileEditingProductId || mobileDraft.name.trim().length === 0) {
      return
    }

    setSavingProductId(mobileEditingProductId)

    try {
      await updateProduct(
        mobileEditingProductId,
        mobileDraft.name,
        mobileDraft.defaultPrice,
        mobileDraft.categoryId || null,
        mobileDraft.defaultUnitCode,
        mobileDraft.defaultCustomUnitLabel,
        mobileDraft.defaultPricingMode,
      )
      setMobileEditingProductId(null)
    } finally {
      setSavingProductId(null)
    }
  }

  useEffect(() => {
    if (!isDesktop && editingDesktopProductId) {
      setEditingDesktopProductId(null)
    }
  }, [editingDesktopProductId, isDesktop])

  return (
    <>
      <section className="mx-auto w-full">
        <Card>
          <CardTitle>Catalog</CardTitle>

          <div className="mb-4 flex gap-2">
            <Button
              variant={activeTab === 'products' ? 'primary' : 'outline'}
              onClick={() => setActiveTab('products')}
            >
              Products
            </Button>
            <Button
              variant={activeTab === 'categories' ? 'primary' : 'outline'}
              onClick={() => setActiveTab('categories')}
            >
              Categories
            </Button>
          </div>

          {activeTab === 'products' && (
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-600">Manage your product catalog.</p>
                <Button onClick={() => setIsNewProductDialogOpen(true)}>+ New Product</Button>
              </div>

              {isLoading && <p className="text-sm text-zinc-400">Loading...</p>}
              {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

              {products.length === 0 ? (
                <p className="py-2 text-sm text-zinc-400">No products yet.</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-stone-200">
                  <div className="max-h-[460px] overflow-auto">
                    <table className="min-w-full border-collapse">
                      <thead className="bg-stone-100">
                        <tr className="text-xs font-semibold tracking-[0.08em] text-zinc-500 uppercase">
                          <th className="p-2 text-left">Product</th>
                          <th className="hidden p-2 text-left md:table-cell">Category</th>
                          <th className="p-2 text-right">Price</th>
                          <th className="w-40 p-2 text-right">Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {products.map((product) => {
                          const draft = productDrafts[product.id] ?? toDraft(product)
                          const isEditingDesktop = editingDesktopProductId === product.id
                          const categoryLabel = product.categoryId
                            ? (categoryNamesById.get(product.categoryId) ?? 'Uncategorized')
                            : 'Uncategorized'
                          const billingLabel = formatItemAmountLabel(
                            1,
                            normalizeUnitCode(product.defaultUnitCode ?? DEFAULT_UNIT_CODE),
                            normalizeCustomUnitLabel(product.defaultCustomUnitLabel),
                            normalizePricingMode(product.defaultPricingMode ?? DEFAULT_PRICING_MODE),
                          )

                          return (
                            <tr key={product.id} className="border-t border-stone-200 bg-white">
                              <td className="p-2 align-top">
                                <div className="md:hidden">
                                  <p className="truncate text-sm font-semibold text-zinc-800">{product.name}</p>
                                  <p className="mt-1 text-xs text-zinc-500">{categoryLabel}</p>
                                  <p className="mt-1 text-xs text-zinc-500">{billingLabel}</p>
                                </div>
                                <div className="hidden md:block">
                                  {isEditingDesktop ? (
                                    <Input
                                      value={draft.name}
                                      onChange={(event) =>
                                        handleDraftChange(product.id, { name: event.target.value })
                                      }
                                    />
                                  ) : (
                                    <>
                                      <p className="text-sm font-semibold text-zinc-800">{product.name}</p>
                                      <p className="mt-1 text-xs text-zinc-500">{billingLabel}</p>
                                    </>
                                  )}
                                </div>
                              </td>

                              <td className="hidden p-2 align-middle md:table-cell">
                                {isEditingDesktop ? (
                                  <div className="grid gap-2">
                                    <DropdownSelect
                                      value={draft.categoryId}
                                      onChange={(categoryId) => handleDraftChange(product.id, { categoryId })}
                                      options={categoryOptions}
                                    />
                                    <DropdownSelect
                                      value={draft.defaultUnitCode}
                                      onChange={(nextValue) => {
                                        const nextUnitCode = normalizeUnitCode(nextValue)
                                        handleDraftChange(product.id, {
                                          defaultUnitCode: nextUnitCode,
                                          defaultCustomUnitLabel:
                                            nextUnitCode === 'custom' ? draft.defaultCustomUnitLabel : '',
                                        })
                                      }}
                                      options={unitOptions}
                                    />
                                    {draft.defaultUnitCode === 'custom' && (
                                      <Input
                                        value={draft.defaultCustomUnitLabel}
                                        onChange={(event) =>
                                          handleDraftChange(product.id, {
                                            defaultCustomUnitLabel: event.target.value,
                                          })
                                        }
                                        placeholder="Custom unit"
                                      />
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm text-zinc-600">{categoryLabel}</p>
                                )}
                              </td>

                              <td className="p-2 text-right align-middle text-sm font-semibold text-zinc-800">
                                {isEditingDesktop ? (
                                  <div className="hidden md:block">
                                    <div className="grid gap-2">
                                      <NumberInput
                                        min={0}
                                        value={draft.defaultPrice}
                                        onValueChange={(defaultPrice) =>
                                          handleDraftChange(product.id, { defaultPrice })
                                        }
                                      />
                                      <DropdownSelect
                                        value={draft.defaultPricingMode}
                                        onChange={(nextValue) =>
                                          handleDraftChange(product.id, {
                                            defaultPricingMode: normalizePricingMode(nextValue),
                                          })
                                        }
                                        options={pricingModeOptions}
                                      />
                                    </div>
                                  </div>
                                ) : null}
                                <p className={isEditingDesktop ? 'md:hidden' : ''}>
                                  {currency.format(
                                    isEditingDesktop ? draft.defaultPrice : product.defaultPrice,
                                  )}
                                </p>
                              </td>

                              <td className="p-2">
                                <div className="flex justify-end gap-1">
                                  {isEditingDesktop && isDesktop ? (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => void handleSaveProduct(product.id)}
                                        disabled={savingProductId === product.id || draft.name.trim().length === 0}
                                        aria-label={`Save ${product.name}`}
                                      >
                                        <Save className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={cancelDesktopEditor}
                                        aria-label={`Cancel editing ${product.name}`}
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
                                          isDesktop ? openDesktopEditor(product.id) : openMobileEditor(product.id)
                                        }
                                        aria-label={`Edit ${product.name}`}
                                      >
                                        <PenLine className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => void deleteProduct(product.id)}
                                        aria-label={`Delete ${product.name}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="grid gap-4">
              <form onSubmit={handleCreateCategory}>
                <label htmlFor="cat-name" className="mb-1 block text-xs font-semibold text-zinc-600">
                  New category
                </label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="cat-name"
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    placeholder="e.g. Services"
                    className="min-w-60 flex-1"
                  />
                  <Button type="submit">Save</Button>
                </div>
              </form>

              {isLoading && <p className="text-sm text-zinc-400">Loading...</p>}
              {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

              {categories.length === 0 ? (
                <p className="py-2 text-sm text-zinc-400">No categories yet.</p>
              ) : (
                <div className="grid gap-2 border-t border-stone-200 pt-3">
                  {categories.map((category) => (
                    <div
                      className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-zinc-800"
                      key={category.id}
                    >
                      {category.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </section>

      <Dialog
        open={Boolean(mobileEditingProduct)}
        onClose={closeMobileEditor}
        title="Edit Product"
        footer={
          <>
            <Button variant="outline" onClick={closeMobileEditor}>
              Cancel
            </Button>
            <Button
              onClick={() => void saveMobileEditor()}
              disabled={mobileDraft.name.trim().length === 0 || savingProductId === mobileEditingProductId}
            >
              Save
            </Button>
          </>
        }
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">Product name</label>
          <Input
            value={mobileDraft.name}
            onChange={(event) => setMobileDraft((prev) => ({ ...prev, name: event.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">Category</label>
          <DropdownSelect
            value={mobileDraft.categoryId}
            onChange={(categoryId) => setMobileDraft((prev) => ({ ...prev, categoryId }))}
            options={categoryOptions}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">Price</label>
          <NumberInput
            min={0}
            value={mobileDraft.defaultPrice}
            onValueChange={(defaultPrice) => setMobileDraft((prev) => ({ ...prev, defaultPrice }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">Unit</label>
          <DropdownSelect
            value={mobileDraft.defaultUnitCode}
            onChange={(nextValue) =>
              setMobileDraft((prev) => {
                const nextUnitCode = normalizeUnitCode(nextValue)
                return {
                  ...prev,
                  defaultUnitCode: nextUnitCode,
                  defaultCustomUnitLabel: nextUnitCode === 'custom' ? prev.defaultCustomUnitLabel : '',
                }
              })
            }
            options={unitOptions}
          />
        </div>

        {mobileDraft.defaultUnitCode === 'custom' && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Custom unit label</label>
            <Input
              value={mobileDraft.defaultCustomUnitLabel}
              onChange={(event) =>
                setMobileDraft((prev) => ({ ...prev, defaultCustomUnitLabel: event.target.value }))
              }
              placeholder="e.g. tray"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">Pricing mode</label>
          <DropdownSelect
            value={mobileDraft.defaultPricingMode}
            onChange={(nextValue) =>
              setMobileDraft((prev) => ({
                ...prev,
                defaultPricingMode: normalizePricingMode(nextValue),
              }))
            }
            options={pricingModeOptions}
          />
        </div>
      </Dialog>

      <ProductEditorDialog
        open={isNewProductDialogOpen}
        onClose={() => setIsNewProductDialogOpen(false)}
        onSave={handleSaveProductEditor}
        categoryOptions={categoryOptions}
        showCategory={true}
      />
    </>
  )
}
