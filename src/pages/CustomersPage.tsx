import { PenLine, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardTitle } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import type { Customer } from '../types'
import { useCustomerStore } from '../store/customerStore'

interface CustomerFormState {
  name: string
  phone: string
  email: string
  address: string
}

const EMPTY_FORM: CustomerFormState = {
  name: '',
  phone: '',
  email: '',
  address: '',
}

const toFormState = (customer: Customer): CustomerFormState => ({
  name: customer.name,
  phone: customer.phone ?? '',
  email: customer.email ?? '',
  address: customer.address ?? '',
})

export function CustomersPage() {
  const { customers, isLoading, errorMessage, hydrate, createCustomer, updateCustomer, deleteCustomer } =
    useCustomerStore()
  const [query, setQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null)
  const [form, setForm] = useState<CustomerFormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return customers
    }

    return customers.filter((customer) => {
      const text = [customer.name, customer.phone, customer.email, customer.address]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return text.includes(normalizedQuery)
    })
  }, [customers, query])

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingCustomerId(null)
    setForm(EMPTY_FORM)
  }

  const openCreateDialog = () => {
    setEditingCustomerId(null)
    setForm(EMPTY_FORM)
    setIsDialogOpen(true)
  }

  const openEditDialog = (customer: Customer) => {
    setEditingCustomerId(customer.id)
    setForm(toFormState(customer))
    setIsDialogOpen(true)
  }

  const handleSaveCustomer = async () => {
    if (form.name.trim().length === 0 || isSaving) {
      return
    }

    setIsSaving(true)

    try {
      if (editingCustomerId) {
        await updateCustomer(editingCustomerId, form.name, form.phone, form.email, form.address)
      } else {
        await createCustomer(form.name, form.phone, form.email, form.address)
      }
      closeDialog()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <section className="mx-auto w-full">
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="mb-0">Customers</CardTitle>
            <Button className="gap-2" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              New Customer
            </Button>
          </div>

          <div className="mb-4">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, phone, email, or address"
              aria-label="Search customers"
            />
          </div>

          {isLoading && <p className="text-sm text-zinc-400">Loading customers...</p>}
          {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

          {!isLoading && filteredCustomers.length === 0 && (
            <p className="py-2 text-sm text-zinc-400">
              {customers.length === 0 ? 'No customers yet.' : 'No customers match your search.'}
            </p>
          )}

          {filteredCustomers.length > 0 && (
            <div className="grid gap-2 border-t border-stone-200 pt-3">
              {filteredCustomers.map((customer) => (
                <article
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3"
                  key={customer.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-900">{customer.name}</p>
                    {customer.phone && <p className="text-xs text-zinc-600">Phone: {customer.phone}</p>}
                    {customer.email && <p className="text-xs text-zinc-600">Email: {customer.email}</p>}
                    {customer.address && <p className="text-xs text-zinc-600">Address: {customer.address}</p>}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(customer)}
                      aria-label={`Edit ${customer.name}`}
                    >
                      <PenLine className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => void deleteCustomer(customer.id)}
                      aria-label={`Delete ${customer.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
      </section>

      <Dialog
        open={isDialogOpen}
        onClose={closeDialog}
        title={editingCustomerId ? 'Edit Customer' : 'New Customer'}
        footer={
          <>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveCustomer()} disabled={form.name.trim().length === 0 || isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">Name</label>
          <Input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Customer name"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">Phone</label>
          <Input
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">Email</label>
          <Input
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">Address</label>
          <Input
            value={form.address}
            onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
            placeholder="Optional"
          />
        </div>
      </Dialog>
    </>
  )
}