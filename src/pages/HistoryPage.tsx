import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Card, CardTitle } from '../components/ui/Card'
import { DropdownSelect } from '../components/ui/DropdownSelect'
import { Input } from '../components/ui/Input'
import { createCurrencyFormatter } from '../lib/currency'
import { useInvoiceStore } from '../store/invoiceStore'
import { useSettingsStore } from '../store/settingsStore'
import type { PaymentStatus } from '../types'

export function HistoryPage() {
  const currencyCode = useSettingsStore((state) => state.currency)
  const { historyInvoices, isHistoryLoading, historyErrorMessage, loadInvoices } = useInvoiceStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all')
  const [dateSort, setDateSort] = useState<'latest' | 'oldest'>('latest')
  const [amountSort, setAmountSort] = useState<'none' | 'asc' | 'desc'>('none')

  useEffect(() => {
    void loadInvoices()
  }, [loadInvoices])

  const currency = useMemo(
    () => createCurrencyFormatter(currencyCode),
    [currencyCode],
  )

  const dateTime = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [],
  )

  const processedInvoices = useMemo(() => {
    let result = [...historyInvoices]

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      result = result.filter(inv => inv.customerSnapshot?.name?.toLowerCase().includes(q))
    }

    if (statusFilter !== 'all') {
      result = result.filter(inv => inv.status === statusFilter)
    }

    result.sort((a, b) => {
      if (amountSort !== 'none') {
        return amountSort === 'asc' ? a.total - b.total : b.total - a.total
      } else {
        return dateSort === 'latest' ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt)
      }
    })

    return result
  }, [historyInvoices, searchQuery, statusFilter, dateSort, amountSort])

  return (
    <section className="mx-auto w-full">
      <Card>
        <CardTitle>History</CardTitle>

        {isHistoryLoading && <p className="text-sm text-zinc-400">Loading invoices...</p>}
        {historyErrorMessage && <p className="text-sm text-red-600">{historyErrorMessage}</p>}

        {historyInvoices.length > 0 && (
          <div className="my-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Input
              placeholder="Search customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <DropdownSelect
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as 'all' | PaymentStatus)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'paid', label: 'Paid' },
                { value: 'unpaid', label: 'Unpaid' },
                { value: 'overdue', label: 'Overdue' }
              ]}
            />
            <DropdownSelect
              value={dateSort}
              onChange={(v) => setDateSort(v as 'latest' | 'oldest')}
              options={[
                { value: 'latest', label: 'Latest First' },
                { value: 'oldest', label: 'Oldest First' }
              ]}
            />
            <DropdownSelect
              value={amountSort}
              onChange={(v) => setAmountSort(v as 'none' | 'asc' | 'desc')}
              options={[
                { value: 'none', label: 'Amount Default' },
                { value: 'asc', label: 'Amount Asc' },
                { value: 'desc', label: 'Amount Desc' }
              ]}
            />
          </div>
        )}

        {!isHistoryLoading && historyInvoices.length === 0 && (
          <p className="py-2 text-sm text-zinc-400">
            No saved invoices yet. Build your first invoice, then export to store it here.
          </p>
        )}

        {!isHistoryLoading && historyInvoices.length > 0 && processedInvoices.length === 0 && (
          <p className="py-2 text-sm text-zinc-400">
            No invoices match the current filters.
          </p>
        )}

        {processedInvoices.length > 0 && (
          <div className="grid gap-2 border-t border-stone-200 pt-3">
            {processedInvoices.map((invoice) => (
              <article
                className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
                key={invoice.id}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-800">
                    {dateTime.format(new Date(invoice.createdAt))}
                  </p>
                  {invoice.customerSnapshot?.name && (
                    <p className="truncate text-xs text-zinc-600">Customer: {invoice.customerSnapshot.name}</p>
                  )}
                  <p className="truncate text-xs text-zinc-500">{invoice.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-zinc-900">{currency.format(invoice.total)}</p>
                  <Link
                    className="text-xs font-semibold text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
                    to={`/history/${invoice.id}`}
                  >
                    View detail
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </section>
  )
}
