import { ArrowLeft, Printer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button } from '../components/ui/Button'
import { Card, CardTitle } from '../components/ui/Card'
import { DropdownSelect } from '../components/ui/DropdownSelect'
import { createCurrencyFormatter } from '../lib/currency'
import { computeCashChange, computeTransactionLineTotal } from '../lib/transaction-calculations'
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
import type { PaymentMethod, PaymentStatus, PdfDocType, Transaction } from '../types'
import { useTransactionStore } from '../store/transactionStore'
import { useSettingsStore } from '../store/settingsStore'
import { db } from '../lib/db'

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  e_wallet: 'E-Wallet',
  other: 'Other',
}

export function TransactionDetailPage() {
  const { transactionId } = useParams()
  const getTransactionById = useTransactionStore((state) => state.getTransactionById)
  const currencyCode = useSettingsStore((state) => state.currency)
  const businessName = useSettingsStore((state) => state.businessName)
  const logoDataUrl = useSettingsStore((state) => state.logoDataUrl)
  const lastPdfDocType = useSettingsStore((state) => state.lastPdfDocType)
  const setLastPdfDocType = useSettingsStore((state) => state.setLastPdfDocType)
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPrintingPdf, setIsPrintingPdf] = useState(false)
  const [printErrorMessage, setPrintErrorMessage] = useState<string | null>(null)
  const [printDocType, setPrintDocType] = useState<PdfDocType>(lastPdfDocType)

  useEffect(() => {
    let isActive = true

    const loadTransaction = async () => {
      if (!transactionId) {
        setTransaction(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      const foundTransaction = await getTransactionById(transactionId)

      if (!isActive) {
        return
      }

      setTransaction(foundTransaction)
      setIsLoading(false)
    }

    void loadTransaction()

    return () => {
      isActive = false
    }
  }, [getTransactionById, transactionId])

  const currency = useMemo(() => createCurrencyFormatter(currencyCode), [currencyCode])
  const dateTime = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [],
  )

  useEffect(() => {
    setPrintDocType(lastPdfDocType)
  }, [lastPdfDocType])

  const handlePrintDocTypeChange = (docType: PdfDocType) => {
    setPrintDocType(docType)
    setLastPdfDocType(docType)
  }

  const handlePrintTemplatePdf = async () => {
    if (!transaction || isPrintingPdf) {
      return
    }

    setPrintErrorMessage(null)
    setIsPrintingPdf(true)

    try {
      const { PdfLibRenderer, printPdfBlob, selectPdfTemplate } = await import('../lib/pdf/index.ts')
      const template = await selectPdfTemplate(printDocType)
      const renderer = new PdfLibRenderer()
      const pdfBlob = await renderer.render(template, {
        invoice: transaction,
        businessName,
        currencyCode,
        logoDataUrl,
      })
      const filePrefix = printDocType === 'receipt' ? 'receipt' : 'invoice'
      printPdfBlob(pdfBlob, `${filePrefix}-${transaction.id}.pdf`)
    } catch {
      setPrintErrorMessage('Failed to generate print-ready PDF. Please try again.')
    } finally {
      setIsPrintingPdf(false)
    }
  }

  const handleStatusChange = async (nextValue: string) => {
    if (!transaction) return
    const newStatus = nextValue as PaymentStatus
    try {
      await db.transactions.update(transaction.id, { status: newStatus })
      setTransaction({ ...transaction, status: newStatus })
    } catch (error) {
      console.error('Failed to update status', error)
    }
  }

  if (isLoading) {
    return (
      <section className="mx-auto w-full">
        <Card>
          <CardTitle>Transaction Detail</CardTitle>
          <p className="text-sm text-zinc-400">Loading transaction...</p>
        </Card>
      </section>
    )
  }

  if (!transaction) {
    return (
      <section className="mx-auto w-full">
        <Card>
          <CardTitle>Transaction Detail</CardTitle>
          <p className="text-sm text-red-600">Transaction not found.</p>
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100"
          to="/history"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant={printDocType === 'invoice' ? 'primary' : 'outline'}
              onClick={() => handlePrintDocTypeChange('invoice')}
              aria-label="Select invoice document type"
              aria-pressed={printDocType === 'invoice'}
            >
              Invoice
            </Button>
            <Button
              type="button"
              size="sm"
              variant={printDocType === 'receipt' ? 'primary' : 'outline'}
              onClick={() => handlePrintDocTypeChange('receipt')}
              aria-label="Select receipt document type"
              aria-pressed={printDocType === 'receipt'}
            >
              Receipt
            </Button>
          </div>

          <Button className="gap-2" onClick={() => void handlePrintTemplatePdf()} disabled={isPrintingPdf}>
            <Printer className="h-4 w-4" />
            {isPrintingPdf ? 'Preparing PDF...' : 'Print PDF'}
          </Button>
        </div>
      </div>

      {printErrorMessage && <p className="mb-3 text-sm font-semibold text-red-600">{printErrorMessage}</p>}

      <Card className="print:rounded-none print:border-0 print:bg-white print:p-0">
        <CardTitle className="print:mb-2">Transaction Detail</CardTitle>

        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 pb-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.1em] text-zinc-500 uppercase">Transaction ID</p>
            <p className="text-sm font-semibold text-zinc-900">{transaction.id}</p>
          </div>
          <div className="">
            {businessName.trim().length > 0 && (
              <p className="text-sm font-semibold text-zinc-900">{businessName}</p>
            )}
            <p className="text-sm text-zinc-600">{dateTime.format(new Date(transaction.createdAt))}</p>
          </div>
        </div>

        {transaction.customerSnapshot && (
          <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3">
            <p className="mb-1 text-xs font-semibold tracking-[0.08em] text-zinc-500 uppercase">Customer</p>
            <p className="text-sm font-semibold text-zinc-900">{transaction.customerSnapshot.name}</p>
            {transaction.customerSnapshot.phone && (
              <p className="text-sm text-zinc-700">Phone: {transaction.customerSnapshot.phone}</p>
            )}
            {transaction.customerSnapshot.email && (
              <p className="text-sm text-zinc-700">Email: {transaction.customerSnapshot.email}</p>
            )}
            {transaction.customerSnapshot.address && (
              <p className="text-sm text-zinc-700">Address: {transaction.customerSnapshot.address}</p>
            )}
          </div>
        )}

        <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3">
          <div className="mb-3">
            <label htmlFor="detail-payment-status" className="mb-1 block text-xs font-semibold tracking-[0.08em] text-zinc-500 uppercase">
              Status
            </label>
            <DropdownSelect
              id="detail-payment-status"
              value={transaction.status}
              onChange={handleStatusChange}
              options={[
                { value: 'unpaid', label: 'Unpaid' },
                { value: 'paid', label: 'Paid' },
                { value: 'overdue', label: 'Overdue' }
              ]}
              className="max-w-xs"
            />
          </div>

          <p className="mb-1 text-xs font-semibold tracking-[0.08em] text-zinc-500 uppercase">Payment Method</p>
          <p className="text-sm font-semibold text-zinc-900">
            {PAYMENT_METHOD_LABEL[transaction.payment.method]}
          </p>

          {transaction.payment.method === 'cash' && (
            <>
              <p className="text-sm text-zinc-700">Amount Paid: {currency.format(transaction.payment.amountPaid)}</p>
              <p className="text-sm text-zinc-700">
                Change: {currency.format(computeCashChange(transaction.payment.amountPaid, transaction.total))}
              </p>
            </>
          )}

          {transaction.payment.method === 'bank_transfer' && (
            <>
              {transaction.payment.bankName && (
                <p className="text-sm text-zinc-700">Bank: {transaction.payment.bankName}</p>
              )}
              {transaction.payment.accountNumber && (
                <p className="text-sm text-zinc-700">Account Number: {transaction.payment.accountNumber}</p>
              )}
              {transaction.payment.accountName && (
                <p className="text-sm text-zinc-700">Account Name: {transaction.payment.accountName}</p>
              )}
            </>
          )}

          {transaction.payment.method === 'e_wallet' && (
            <>
              {transaction.payment.provider && (
                <p className="text-sm text-zinc-700">Provider: {transaction.payment.provider}</p>
              )}
              {transaction.payment.account && (
                <p className="text-sm text-zinc-700">Account: {transaction.payment.account}</p>
              )}
            </>
          )}

          {transaction.payment.method === 'other' && transaction.payment.note && (
            <p className="text-sm text-zinc-700">Note: {transaction.payment.note}</p>
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
              {transaction.items.map((item) => {
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
                      {currency.format(computeTransactionLineTotal(item))}
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
            <dd>{currency.format(transaction.subtotal)}</dd>
          </div>

          {transaction.discountAmount > 0 && (
            <div className="flex justify-between py-1 text-sm">
              <dt>Discount</dt>
              <dd className="text-red-600">-{currency.format(transaction.discountAmount)}</dd>
            </div>
          )}

          {transaction.taxEnabled && (
            <div className="flex justify-between py-1 text-sm">
              <dt>Tax ({transaction.taxRate}%)</dt>
              <dd>{currency.format(transaction.taxAmount)}</dd>
            </div>
          )}

          <div className="mt-1 flex justify-between border-t border-stone-200 pt-2 text-lg font-extrabold">
            <dt>Total</dt>
            <dd>{currency.format(transaction.total)}</dd>
          </div>
        </dl>
      </Card>
    </section>
  )
}
