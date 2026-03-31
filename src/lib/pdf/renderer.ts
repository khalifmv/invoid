import { PDFDocument, StandardFonts } from 'pdf-lib'
import type { CurrencyCode, PaymentMethod, Transaction } from '../../types'
import { computeCashChange, computeTransactionLineTotal } from '../transaction-calculations'
import {
  DEFAULT_PRICING_MODE,
  DEFAULT_UNIT_CODE,
  formatItemAmountLabel,
  formatItemRateLabel,
  normalizeCustomUnitLabel,
  normalizePricingMode,
  normalizeUnitCode,
  sanitizeQuantityForUnit,
} from '../item-semantics'
import { bindTemplateData } from './bindings'
import { parseTemplateColor, renderLogoBlock, renderTemplateBlock } from './blocks'
import type { PdfSummaryBlock, PdfTableBlock, PdfTemplate } from './template'
import { validatePdfTemplate } from './template'

const PAGE_SIZE = {
  A4: {
    width: 595.28,
    height: 841.89,
  },
} as const

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  e_wallet: 'E-Wallet',
  other: 'Other',
}

const toPaymentDetails = (transaction: Transaction): string => {
  switch (transaction.payment.method) {
    case 'cash':
      return ''
    case 'bank_transfer': {
      const details = [
        transaction.payment.bankName,
        transaction.payment.accountNumber,
        transaction.payment.accountName,
      ].filter((entry) => entry.trim().length > 0)
      return details.join(' | ')
    }
    case 'e_wallet': {
      const details = [transaction.payment.provider, transaction.payment.account].filter(
        (entry) => entry.trim().length > 0,
      )
      return details.join(' | ')
    }
    case 'other':
      return transaction.payment.note
    default:
      return ''
  }
}

const createRenderModel = (
  transaction: Transaction,
  businessName: string,
  currencyCode: CurrencyCode,
  logoDataUrl: string | null | undefined,
) => {
  const currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  })

  const items = transaction.items.map((item) => {
    const unitCode = normalizeUnitCode(item.unitCode ?? DEFAULT_UNIT_CODE)
    const customUnitLabel = normalizeCustomUnitLabel(item.customUnitLabel)
    const pricingMode = normalizePricingMode(item.pricingMode ?? DEFAULT_PRICING_MODE)

    return {
      name: item.name,
      qty: formatItemAmountLabel(
        sanitizeQuantityForUnit(item.quantity, unitCode),
        unitCode,
        customUnitLabel,
        pricingMode,
      ),
      price: formatItemRateLabel(currency.format(item.unitPrice), unitCode, customUnitLabel, pricingMode),
      total: currency.format(computeTransactionLineTotal(item)),
    }
  })

  const paymentAmountPaid =
    transaction.payment.method === 'cash' ? currency.format(transaction.payment.amountPaid) : ''
  const paymentChange =
    transaction.payment.method === 'cash'
      ? currency.format(computeCashChange(transaction.payment.amountPaid, transaction.total))
      : ''

  return {
    business: {
      name: businessName.trim().length > 0 ? businessName : 'Invoid',
      logoDataUrl: logoDataUrl ?? '',
    },
    invoice: {
      id: transaction.id,
      date: dateFormatter.format(new Date(transaction.createdAt)),
    },
    customer: {
      name: transaction.customerSnapshot?.name ?? '',
      address: transaction.customerSnapshot?.address ?? '',
      phone: transaction.customerSnapshot?.phone ?? '',
      email: transaction.customerSnapshot?.email ?? '',
    },
    payment: {
      methodLabel: PAYMENT_LABEL[transaction.payment.method],
      amountPaidFormatted: paymentAmountPaid,
      changeFormatted: paymentChange,
      details: toPaymentDetails(transaction),
    },
    summary: {
      subtotalFormatted: currency.format(transaction.subtotal),
      discountFormatted:
        transaction.discountAmount > 0 ? `-${currency.format(transaction.discountAmount)}` : '',
      taxFormatted: transaction.taxEnabled ? currency.format(transaction.taxAmount) : '',
      totalFormatted: currency.format(transaction.total),
    },
    items,
  }
}

const getFontName = (font: PdfTemplate['styles']['font']) => {
  switch (font) {
    case 'Helvetica':
      return StandardFonts.Helvetica
    case 'TimesRoman':
      return StandardFonts.TimesRoman
    case 'Courier':
      return StandardFonts.Courier
  }
}

const toNumberValue = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

const getTableRows = (tableBlock: PdfTableBlock): unknown[] => {
  return Array.isArray(tableBlock.data) ? tableBlock.data : []
}

interface PaginatedTableRenderResult {
  page: ReturnType<PDFDocument['addPage']>
  suggestedSummaryY: number
}

const renderPaginatedTableBlock = (
  pdfDocument: PDFDocument,
  currentPage: ReturnType<PDFDocument['addPage']>,
  tableBlock: PdfTableBlock,
  pageSize: { width: number; height: number },
  template: PdfTemplate,
  summaryBlock: PdfSummaryBlock | undefined,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  color: ReturnType<typeof parseTemplateColor>,
): PaginatedTableRenderResult => {
  const rows = getTableRows(tableBlock)
  const rowHeight = Math.max(22, toNumberValue(tableBlock.rowHeight, 22))
  const margin = template.page.margin
  const firstPageTableY = toNumberValue(tableBlock.position.y, pageSize.height - margin - 40)
  const nextPageTableY = pageSize.height - margin - 40
  const summaryAnchorY = summaryBlock ? toNumberValue(summaryBlock.position.y, margin + 120) : margin + 120
  const bottomLimitWithSummary = Math.max(margin + 30, summaryAnchorY + 80)
  const bottomLimitWithoutSummary = margin + 30

  const rowsCapacity = (startY: number, reserveSummary: boolean): number => {
    const bottomLimit = reserveSummary ? bottomLimitWithSummary : bottomLimitWithoutSummary
    return Math.max(1, Math.floor((startY - bottomLimit) / rowHeight))
  }

  const drawRows = (
    targetPage: ReturnType<PDFDocument['addPage']>,
    startY: number,
    startIndex: number,
    rowsToRender: number,
  ) => {
    const endIndex = Math.min(rows.length, startIndex + rowsToRender)
    const renderedRowsCount = endIndex - startIndex

    const blockSlice: PdfTableBlock = {
      ...tableBlock,
      position: {
        ...tableBlock.position,
        y: startY,
      },
      data: rows.slice(startIndex, endIndex),
    }

    renderTemplateBlock(blockSlice, {
      page: targetPage,
      font,
      color,
      fontSize: template.styles.fontSize,
    })

    // tableBottom = headerBottom - rows * rowHeight = (startY - rowHeight) - count * rowHeight
    const tableBottom = startY - rowHeight * (1 + renderedRowsCount)
    return {
      endIndex,
      suggestedSummaryY: Math.max(margin + 60, tableBottom - 20),
    }
  }

  if (rows.length === 0) {
    renderTemplateBlock(tableBlock, {
      page: currentPage,
      font,
      color,
      fontSize: template.styles.fontSize,
    })
    return {
      page: currentPage,
      suggestedSummaryY: Math.max(margin + 60, firstPageTableY - 36),
    }
  }

  let index = 0
  let page = currentPage
  let isFirstPage = true
  let suggestedSummaryY = summaryAnchorY

  while (index < rows.length) {
    const startY = isFirstPage ? firstPageTableY : nextPageTableY
    const remainingRows = rows.length - index
    const capacityWithSummary = rowsCapacity(startY, true)
    const capacityWithoutSummary = rowsCapacity(startY, false)
    const useSummaryOnThisPage = remainingRows <= capacityWithSummary

    const drawResult = drawRows(
      page,
      startY,
      index,
      useSummaryOnThisPage ? remainingRows : capacityWithoutSummary,
    )
    index = drawResult.endIndex
    suggestedSummaryY = drawResult.suggestedSummaryY

    if (index < rows.length) {
      page = pdfDocument.addPage([pageSize.width, pageSize.height])
      isFirstPage = false
    }
  }

  return {
    page,
    suggestedSummaryY,
  }
}

export interface PdfRenderData {
  invoice: Transaction
  businessName: string
  currencyCode: CurrencyCode
  logoDataUrl?: string | null
}

export interface PdfRenderer {
  render(template: PdfTemplate, data: PdfRenderData): Promise<Blob>
}

export class PdfLibRenderer implements PdfRenderer {
  async render(template: PdfTemplate, data: PdfRenderData): Promise<Blob> {
    const validationErrors = validatePdfTemplate(template)
    if (validationErrors.length > 0) {
      throw new Error(`Template validation failed: ${validationErrors.join(' ')}`)
    }

    const pdfDocument = await PDFDocument.create()
    pdfDocument.setTitle(`invoice-${data.invoice.id}`)
    pdfDocument.setProducer('Invoid')
    const pageSize = PAGE_SIZE[template.page.size]
    let currentPage = pdfDocument.addPage([pageSize.width, pageSize.height])
    const font = await pdfDocument.embedFont(getFontName(template.styles.font))
    const color = parseTemplateColor(template.styles.color)

    const renderModel = createRenderModel(
      data.invoice,
      data.businessName,
      data.currencyCode,
      data.logoDataUrl,
    )
    const boundTemplate = bindTemplateData(template, renderModel)
    const summaryBlocks = boundTemplate.blocks.filter(
      (block): block is PdfSummaryBlock => block.type === 'summary',
    )
    const firstSummaryBlock = summaryBlocks[0]
    let summaryYOverride: number | null = null

    for (const block of boundTemplate.blocks) {
      if (block.type === 'summary') {
        continue
      }

      if (block.type === 'logo') {
        await renderLogoBlock(block, {
          page: currentPage,
          pdfDocument,
          font,
          color,
          fontSize: template.styles.fontSize,
        })
        continue
      }

      if (block.type === 'table') {
        const tableResult = renderPaginatedTableBlock(
          pdfDocument,
          currentPage,
          block,
          pageSize,
          template,
          firstSummaryBlock,
          font,
          color,
        )
        currentPage = tableResult.page
        summaryYOverride = tableResult.suggestedSummaryY
        continue
      }

      renderTemplateBlock(block, {
        page: currentPage,
        font,
        color,
        fontSize: template.styles.fontSize,
      })
    }

    for (const summaryBlock of summaryBlocks) {
      const nextSummaryBlock: PdfSummaryBlock = summaryYOverride
        ? {
            ...summaryBlock,
            position: {
              ...summaryBlock.position,
              y: Math.max(toNumberValue(summaryBlock.position.y, 220), summaryYOverride),
            },
          }
        : summaryBlock

      renderTemplateBlock(nextSummaryBlock, {
        page: currentPage,
        font,
        color,
        fontSize: template.styles.fontSize,
      })
    }

    const bytes = await pdfDocument.save()
    const byteArray = Uint8Array.from(bytes)
    return new Blob([byteArray.buffer], { type: 'application/pdf' })
  }
}

export const downloadPdfBlob = (blob: Blob, filename: string): void => {
  const objectUrl = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()

  URL.revokeObjectURL(objectUrl)
}

export const printPdfBlob = (blob: Blob, filename = 'invoice.pdf'): void => {
  const printableFile = new File([blob], filename, { type: 'application/pdf' })
  const objectUrl = URL.createObjectURL(printableFile)
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.src = objectUrl

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } finally {
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl)
        iframe.remove()
      }, 1500)
    }
  }

  document.body.append(iframe)
}