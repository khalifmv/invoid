import { PenLine, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ProductEditorDialog,
  type ProductEditorInitialData,
  type ProductFormData,
} from '../components/dialogs/ProductEditorDialog'
import { Button } from '../components/ui/Button'
import { Card, CardTitle } from '../components/ui/Card'
import type { DropdownOption } from '../components/ui/DropdownSelect'
import { Input } from '../components/ui/Input'
import { Toggle } from '../components/ui/Toggle'
import { createCurrencyFormatter } from '../lib/currency'
import {
  DEFAULT_PRICING_MODE,
  DEFAULT_UNIT_CODE,
  formatItemAmountLabel,
  normalizeCustomUnitLabel,
  normalizePricingMode,
  normalizeUnitCode,
} from '../lib/item-semantics'
import type { Product, ProductMediaDraft } from '../types'
import { useCatalogStore } from '../store/catalogStore'
import { useSettingsStore } from '../store/settingsStore'

type CatalogTab = 'products' | 'categories'

const toEditInitialData = (product: Product, mediaDrafts: ProductMediaDraft[]): ProductEditorInitialData => ({
  name: product.name,
  description: product.description ?? '',
  categoryId: product.categoryId ?? '',
  price: product.defaultPrice,
  unitCode: normalizeUnitCode(product.defaultUnitCode ?? DEFAULT_UNIT_CODE),
  customUnitLabel: normalizeCustomUnitLabel(product.defaultCustomUnitLabel),
  pricingMode: normalizePricingMode(product.defaultPricingMode ?? DEFAULT_PRICING_MODE),
  mediaDrafts,
  isAvailable: product.isAvailable,
  hasUnlimitedStock: product.hasUnlimitedStock,
  stock: product.stock,
})

export function CatalogPage() {
  const currencyCode = useSettingsStore((state) => state.currency)
  const {
    categories,
    products,
    productMedia,
    isLoading,
    errorMessage,
    createCategory,
    createProduct,
    updateProduct,
    updateProductAvailability,
    deleteProduct,
  } = useCatalogStore()

  const [activeTab, setActiveTab] = useState<CatalogTab>('products')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)

  const currency = useMemo(() => createCurrencyFormatter(currencyCode), [currencyCode])
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

  const coverMediaByProductId = useMemo(() => {
    const mediaByProductId = new Map<string, string>()

    for (const media of productMedia) {
      if (mediaByProductId.has(media.productId)) {
        continue
      }

      if (media.isCover) {
        mediaByProductId.set(media.productId, media.thumbnailDataUrl)
      }
    }

    for (const media of productMedia) {
      if (!mediaByProductId.has(media.productId)) {
        mediaByProductId.set(media.productId, media.thumbnailDataUrl)
      }
    }

    return mediaByProductId
  }, [productMedia])

  const mediaDraftsByProductId = useMemo(() => {
    const mediaMap = new Map<string, ProductMediaDraft[]>()

    for (const media of productMedia) {
      const current = mediaMap.get(media.productId) ?? []
      current.push({
        fileName: media.fileName,
        mimeType: media.mimeType,
        sizeBytes: media.sizeBytes,
        originalBlob: media.originalBlob,
        thumbnailDataUrl: media.thumbnailDataUrl,
        sortOrder: media.sortOrder,
        isCover: media.isCover,
      })
      mediaMap.set(media.productId, current)
    }

    return mediaMap
  }, [productMedia])

  const editingProduct = useMemo(
    () => products.find((product) => product.id === editingProductId) ?? null,
    [editingProductId, products],
  )

  const editingInitialData = useMemo(() => {
    if (!editingProduct) {
      return undefined
    }

    return toEditInitialData(editingProduct, mediaDraftsByProductId.get(editingProduct.id) ?? [])
  }, [editingProduct, mediaDraftsByProductId])

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await createCategory(newCategoryName)
    setNewCategoryName('')
  }

  const handleSaveNewProduct = async (data: ProductFormData) => {
    await createProduct(
      data.name,
      data.price,
      data.categoryId || null,
      data.unitCode,
      data.customUnitLabel,
      data.pricingMode,
      data.description,
      data.mediaDrafts,
      data.isAvailable,
      data.hasUnlimitedStock,
      data.stock,
    )
    setIsNewProductDialogOpen(false)
  }

  const handleSaveEditedProduct = async (data: ProductFormData) => {
    if (!editingProductId) {
      return
    }

    await updateProduct(
      editingProductId,
      data.name,
      data.price,
      data.categoryId || null,
      data.unitCode,
      data.customUnitLabel,
      data.pricingMode,
      data.description,
      data.mediaDrafts ?? [],
      data.isAvailable,
      data.hasUnlimitedStock,
      data.stock,
    )

    setEditingProductId(null)
  }

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
                          <th className="p-2 text-left">Description</th>
                          <th className="hidden p-2 text-left md:table-cell">Category</th>
                          <th className="p-2 text-right">Stock</th>
                          <th className="p-2 text-right">Available</th>
                          <th className="p-2 text-right">Price</th>
                          <th className="w-40 p-2 text-right">Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {products.map((product) => {
                          const coverThumbnail = coverMediaByProductId.get(product.id)
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
                                <div className="flex items-start gap-3">
                                  {coverThumbnail ? (
                                    <img
                                      src={coverThumbnail}
                                      alt={product.name}
                                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                                    />
                                  ) : (
                                    <div className="h-12 w-12 shrink-0 rounded-md border border-dashed border-stone-300 bg-stone-100" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-zinc-800">{product.name}</p>

                                    <p className="mt-1 text-xs text-zinc-500">{billingLabel}</p>

                                  </div>
                                </div>
                              </td>

                              <td className="hidden p-2 align-middle md:table-cell">
                                {product.description && (
                                  <p className="mt-1 truncate text-xs text-zinc-500">{product.description}</p>
                                )}
                              </td>
                              <td className="hidden p-2 align-middle md:table-cell">
                                <p className="text-sm text-zinc-600">{categoryLabel}</p>
                              </td>

                              <td className="p-2 text-right align-middle text-sm text-zinc-600">
                                {product.hasUnlimitedStock ? '∞' : product.stock}
                              </td>

                              <td className="p-2 text-right align-middle">
                                <div className="flex justify-end">
                                  <Toggle
                                    id={`toggle-avail-${product.id}`}
                                    checked={product.isAvailable}
                                    onChange={(e) => void updateProductAvailability(product.id, e.target.checked)}
                                  />
                                </div>
                              </td>

                              <td className="p-2 text-right align-middle text-sm font-semibold text-zinc-800">
                                {currency.format(product.defaultPrice)}
                              </td>

                              <td className="p-2">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingProductId(product.id)}
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

      <ProductEditorDialog
        open={isNewProductDialogOpen}
        onClose={() => setIsNewProductDialogOpen(false)}
        onSave={handleSaveNewProduct}
        categoryOptions={categoryOptions}
        showCategory={true}
        showDescription={true}
        showMedia={true}
        idPrefix="add-product"
      />

      <ProductEditorDialog
        open={Boolean(editingProduct)}
        onClose={() => setEditingProductId(null)}
        onSave={handleSaveEditedProduct}
        initialData={editingInitialData}
        title="Edit Product"
        saveLabel="Save Changes"
        categoryOptions={categoryOptions}
        showCategory={true}
        showDescription={true}
        showMedia={true}
        idPrefix="edit-product"
      />
    </>
  )
}
