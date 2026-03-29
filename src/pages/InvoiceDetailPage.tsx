import { ArrowLeft, Printer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button } from '../components/ui/Button'
import { Card, CardTitle } from '../components/ui/Card'
import { createCurrencyFormatter } from '../lib/currency'
import { computeCashChange, computeInvoiceLineTotal } from '../lib/invoice-calculations'
import {
  DEFAULT_PRICING_MODE,
  DEFAULT_UNIT_CODE,
  formatItemAmountLabel,
  formatItemRateLabel,
  normalizeCustomUnitLabel,
  normalizePricingMode,
  normalizeUnitCode,
  sanitizeQuantityForUnit,
} from '../lib/item-semantics'
import type { Invoice, PaymentMethod } from '../types'
import { useInvoiceStore } from '../store/invoiceStore'
import { useSettingsStore } from '../store/settingsStore'

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  e_wallet: 'E-Wallet',
  other: 'Other',
}

export function InvoiceDetailPage() {
  const { invoiceId } = useParams()
  const getInvoiceById = useInvoiceStore((state) => state.getInvoiceById)
  const currencyCode = useSettingsStore((state) => state.currency)
  const businessName = useSettingsStore((state) => state.businessName)
  const logoDataUrl = useSettingsStore((state) => state.logoDataUrl)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPrintingPdf, setIsPrintingPdf] = useState(false)
  const [printErrorMessage, setPrintErrorMessage] = useState<string | null>(null)

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

  const handlePrintTemplatePdf = async () => {
    if (!invoice || isPrintingPdf) {
      return
    }

    setPrintErrorMessage(null)
    setIsPrintingPdf(true)

    try {
      const { PdfLibRenderer, loadDefaultPdfTemplate, printPdfBlob } = await import('../lib/pdf')
      const template = await loadDefaultPdfTemplate()
      const renderer = new PdfLibRenderer()
      const pdfBlob = await renderer.render(template, {
        invoice,
        businessName,
        currencyCode,
        logoDataUrl,
      })
      printPdfBlob(pdfBlob, `invoice-${invoice.id}.pdf`)
    } catch {
      setPrintErrorMessage('Failed to generate print-ready PDF. Please try again.')
    } finally {
      setIsPrintingPdf(false)
    }
  }

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

        <Button className="gap-2" onClick={() => void handlePrintTemplatePdf()} disabled={isPrintingPdf}>
          <Printer className="h-4 w-4" />
          {isPrintingPdf ? 'Preparing PDF...' : 'Print PDF'}
        </Button>
      </div>

      {printErrorMessage && <p className="mb-3 text-sm font-semibold text-red-600">{printErrorMessage}</p>}

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

        <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3">
          <p className="mb-1 text-xs font-semibold tracking-[0.08em] text-zinc-500 uppercase">Payment</p>
          <p className="text-sm font-semibold text-zinc-900">
            Method: {PAYMENT_METHOD_LABEL[invoice.payment.method]}
          </p>

          {invoice.payment.method === 'cash' && (
            <>
              <p className="text-sm text-zinc-700">Amount Paid: {currency.format(invoice.payment.amountPaid)}</p>
              <p className="text-sm text-zinc-700">
                Change: {currency.format(computeCashChange(invoice.payment.amountPaid, invoice.total))}
              </p>
            </>
          )}

          {invoice.payment.method === 'bank_transfer' && (
            <>
              {invoice.payment.bankName && (
                <p className="text-sm text-zinc-700">Bank: {invoice.payment.bankName}</p>
              )}
              {invoice.payment.accountNumber && (
                <p className="text-sm text-zinc-700">Account Number: {invoice.payment.accountNumber}</p>
              )}
              {invoice.payment.accountName && (
                <p className="text-sm text-zinc-700">Account Name: {invoice.payment.accountName}</p>
              )}
            </>
          )}

          {invoice.payment.method === 'e_wallet' && (
            <>
              {invoice.payment.provider && (
                <p className="text-sm text-zinc-700">Provider: {invoice.payment.provider}</p>
              )}
              {invoice.payment.account && (
                <p className="text-sm text-zinc-700">Account: {invoice.payment.account}</p>
              )}
            </>
          )}

          {invoice.payment.method === 'other' && invoice.payment.note && (
            <p className="text-sm text-zinc-700">Note: {invoice.payment.note}</p>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-stone-200">
          <table className="min-w-full border-collapse">
            <thead className="bg-stone-100">
              <tr className="text-xs font-semibold tracking-[0.08em] text-zinc-500 uppercase">
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-right">Amount</th>
                <th className="hidden p-2 text-right sm:table-cell">Rate / Fee</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => {
                const unitCode = normalizeUnitCode(item.unitCode ?? DEFAULT_UNIT_CODE)
                const customUnitLabel = normalizeCustomUnitLabel(item.customUnitLabel)
                const pricingMode = normalizePricingMode(item.pricingMode ?? DEFAULT_PRICING_MODE)

                return (
                  <tr key={item.id} className="border-t border-stone-200 bg-white">
                    <td className="p-2 text-sm font-semibold text-zinc-800">{item.name}</td>
                    <td className="p-2 text-right text-sm text-zinc-700">
                      {formatItemAmountLabel(
                        sanitizeQuantityForUnit(item.quantity, unitCode),
                        unitCode,
                        customUnitLabel,
                        pricingMode,
                      )}
                    </td>
                    <td className="hidden p-2 text-right text-sm text-zinc-700 sm:table-cell">
                      {formatItemRateLabel(currency.format(item.unitPrice), unitCode, customUnitLabel, pricingMode)}
                    </td>
                    <td className="p-2 text-right text-sm font-semibold text-zinc-900">
                      {currency.format(computeInvoiceLineTotal(item))}
                    </td>
                  </tr>
                )
              })}
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
