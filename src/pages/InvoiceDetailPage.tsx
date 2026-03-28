import { ArrowLeft, Printer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button } from '../components/ui/Button'
import { Card, CardTitle } from '../components/ui/Card'
import { createCurrencyFormatter } from '../lib/currency'
import type { Invoice } from '../types'
import { useInvoiceStore } from '../store/invoiceStore'
import { useSettingsStore } from '../store/settingsStore'

export function InvoiceDetailPage() {
  const { invoiceId } = useParams()
  const getInvoiceById = useInvoiceStore((state) => state.getInvoiceById)
  const currencyCode = useSettingsStore((state) => state.currency)
  const businessName = useSettingsStore((state) => state.businessName)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    const loadInvoice = async () => {
      if (!invoiceId) {
        setInvoice(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      const foundInvoice = await getInvoiceById(invoiceId)

      if (!isActive) {
        return
      }

      setInvoice(foundInvoice)
      setIsLoading(false)
    }

    void loadInvoice()

    return () => {
      isActive = false
    }
  }, [getInvoiceById, invoiceId])

  const currency = useMemo(() => createCurrencyFormatter(currencyCode), [currencyCode])
  const dateTime = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [],
  )

  if (isLoading) {
    return (
      <section className="mx-auto w-full">
        <Card>
          <CardTitle>Invoice Detail</CardTitle>
          <p className="text-sm text-zinc-400">Loading invoice...</p>
        </Card>
      </section>
    )
  }

  if (!invoice) {
    return (
      <section className="mx-auto w-full">
        <Card>
          <CardTitle>Invoice Detail</CardTitle>
          <p className="text-sm text-red-600">Invoice not found.</p>
          <Link
            className="mt-3 inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100"
            to="/history"
          >
            Back to History
          </Link>
        </Card>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full print:mx-0">
      <div className="mb-3 flex items-center justify-between gap-2 print:hidden">
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100"
          to="/history"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <Button className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print again
        </Button>
      </div>

      <Card className="print:rounded-none print:border-0 print:bg-white print:p-0">
        <CardTitle className="print:mb-2">Invoice Detail</CardTitle>

        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 pb-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.1em] text-zinc-500 uppercase">Invoice ID</p>
            <p className="text-sm font-semibold text-zinc-900">{invoice.id}</p>
          </div>
          <div className="">
            {businessName.trim().length > 0 && (
              <p className="text-sm font-semibold text-zinc-900">{businessName}</p>
            )}
            <p className="text-sm text-zinc-600">{dateTime.format(new Date(invoice.createdAt))}</p>
          </div>
        </div>

        {invoice.customerSnapshot && (
          <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3">
            <p className="mb-1 text-xs font-semibold tracking-[0.08em] text-zinc-500 uppercase">Customer</p>
            <p className="text-sm font-semibold text-zinc-900">{invoice.customerSnapshot.name}</p>
            {invoice.customerSnapshot.phone && (
              <p className="text-sm text-zinc-700">Phone: {invoice.customerSnapshot.phone}</p>
            )}
            {invoice.customerSnapshot.email && (
              <p className="text-sm text-zinc-700">Email: {invoice.customerSnapshot.email}</p>
            )}
            {invoice.customerSnapshot.address && (
              <p className="text-sm text-zinc-700">Address: {invoice.customerSnapshot.address}</p>
            )}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-stone-200">
          <table className="min-w-full border-collapse">
            <thead className="bg-stone-100">
              <tr className="text-xs font-semibold tracking-[0.08em] text-zinc-500 uppercase">
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-right">Qty</th>
                <th className="hidden p-2 text-right sm:table-cell">Unit Price</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-t border-stone-200 bg-white">
                  <td className="p-2 text-sm font-semibold text-zinc-800">{item.name}</td>
                  <td className="p-2 text-right text-sm text-zinc-700">{item.quantity}</td>
                  <td className="hidden p-2 text-right text-sm text-zinc-700 sm:table-cell">
                    {currency.format(item.unitPrice)}
                  </td>
                  <td className="p-2 text-right text-sm font-semibold text-zinc-900">
                    {currency.format(item.quantity * item.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="ml-auto mt-4 w-full max-w-sm border-t border-stone-200 pt-3">
          <div className="flex justify-between py-1 text-sm">
            <dt>Subtotal</dt>
            <dd>{currency.format(invoice.subtotal)}</dd>
          </div>

          {invoice.discountAmount > 0 && (
            <div className="flex justify-between py-1 text-sm">
              <dt>Discount</dt>
              <dd className="text-red-600">-{currency.format(invoice.discountAmount)}</dd>
            </div>
          )}

          {invoice.taxEnabled && (
            <div className="flex justify-between py-1 text-sm">
              <dt>Tax ({invoice.taxRate}%)</dt>
              <dd>{currency.format(invoice.taxAmount)}</dd>
            </div>
          )}

          <div className="mt-1 flex justify-between border-t border-stone-200 pt-2 text-lg font-extrabold">
            <dt>Total</dt>
            <dd>{currency.format(invoice.total)}</dd>
          </div>
        </dl>
      </Card>
    </section>
  )
}
