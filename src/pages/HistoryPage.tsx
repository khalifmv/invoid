import { useEffect, useMemo } from 'react'
import { Link } from 'react-router'
import { Card, CardTitle } from '../components/ui/Card'
import { createCurrencyFormatter } from '../lib/currency'
import { useInvoiceStore } from '../store/invoiceStore'
import { useSettingsStore } from '../store/settingsStore'

export function HistoryPage() {
  const currencyCode = useSettingsStore((state) => state.currency)
  const { historyInvoices, isHistoryLoading, historyErrorMessage, loadInvoices } = useInvoiceStore()

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

  return (
    <section className="mx-auto w-full">
      <Card>
        <CardTitle>History</CardTitle>

        {isHistoryLoading && <p className="text-sm text-zinc-400">Loading invoices...</p>}
        {historyErrorMessage && <p className="text-sm text-red-600">{historyErrorMessage}</p>}

        {!isHistoryLoading && historyInvoices.length === 0 && (
          <p className="py-2 text-sm text-zinc-400">
            No saved invoices yet. Build your first invoice, then export to store it here.
          </p>
        )}

        {historyInvoices.length > 0 && (
          <div className="grid gap-2 border-t border-stone-200 pt-3">
            {historyInvoices.map((invoice) => (
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
