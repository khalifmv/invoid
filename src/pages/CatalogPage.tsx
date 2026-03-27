import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardTitle } from '../components/ui/Card'
import { DropdownSelect, type DropdownOption } from '../components/ui/DropdownSelect'
import { Input } from '../components/ui/Input'
import { NumberInput } from '../components/ui/NumberInput'
import { createCurrencyFormatter } from '../lib/currency'
import { useCatalogStore } from '../store/catalogStore'
import { useSettingsStore } from '../store/settingsStore'

type CatalogTab = 'products' | 'categories'

export function CatalogPage() {
  const currencyCode = useSettingsStore((state) => state.currency)
  const {
    categories,
    products,
    isLoading,
    errorMessage,
    createCategory,
    createProduct,
    deleteProduct,
  } = useCatalogStore()

  const [activeTab, setActiveTab] = useState<CatalogTab>('products')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newProductName, setNewProductName] = useState('')
  const [newProductPrice, setNewProductPrice] = useState(0)
  const [newProductCategoryId, setNewProductCategoryId] = useState('')

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

  const currency = useMemo(
    () => createCurrencyFormatter(currencyCode),
    [currencyCode],
  )

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await createCategory(newCategoryName)
    setNewCategoryName('')
  }

  const handleCreateProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await createProduct(newProductName, newProductPrice, newProductCategoryId || null)
    setNewProductName('')
    setNewProductPrice(0)
    setNewProductCategoryId('')
  }

  return (
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
            <form onSubmit={handleCreateProduct}>
              <label htmlFor="prod-name" className="mb-1 block text-xs font-semibold text-zinc-600">
                New product
              </label>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[1.8fr_1fr_1fr_auto]">
                <Input
                  id="prod-name"
                  value={newProductName}
                  onChange={(event) => setNewProductName(event.target.value)}
                  placeholder="Product name"
                />
                <NumberInput
                  min={0}
                  value={newProductPrice}
                  onValueChange={setNewProductPrice}
                  placeholder="Price"
                />
                <DropdownSelect
                  value={newProductCategoryId}
                  onChange={setNewProductCategoryId}
                  options={categoryOptions}
                />
                <Button type="submit">Save</Button>
              </div>
            </form>

            {isLoading && <p className="text-sm text-zinc-400">Loading...</p>}
            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

            {products.length === 0 ? (
              <p className="py-2 text-sm text-zinc-400">No products yet.</p>
            ) : (
              <div className="grid gap-2 border-t border-stone-200 pt-3">
                {products.map((product) => (
                  <div
                    className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
                    key={product.id}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-800">{product.name}</span>
                    <span className="hidden text-xs text-zinc-500 sm:block">
                      {product.categoryId
                        ? categoryNamesById.get(product.categoryId) ?? 'Uncategorized'
                        : 'Uncategorized'}
                    </span>
                    <span className="text-sm text-zinc-700">{currency.format(product.defaultPrice)}</span>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => void deleteProduct(product.id)}
                      aria-label={`Delete ${product.name}`}
                    >
                      x
                    </Button>
                  </div>
                ))}
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
  )
}
