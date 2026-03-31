import type { PdfDocType } from '../../types'

export type PdfPageSize = 'A4'
export type PdfFontFamily = 'Helvetica' | 'TimesRoman' | 'Courier'

export interface PdfPosition {
  x: number
  y: number
}

export interface PdfTemplateBaseBlock {
  type: string
  id?: string
  position: PdfPosition
}

export interface PdfHeaderBlock extends PdfTemplateBaseBlock {
  type: 'header'
  content: {
    title?: string
    businessName?: string
    invoiceId?: string
    date?: string
  }
}

export interface PdfLogoBlock extends PdfTemplateBaseBlock {
  type: 'logo'
  width?: number
  height?: number
  content: {
    dataUrl?: string
  }
}

export interface PdfTableColumn {
  key: string
  label: string
  width: number
  align?: 'left' | 'right'
}

export interface PdfTableBlock extends PdfTemplateBaseBlock {
  type: 'table'
  columns: PdfTableColumn[]
  rowHeight?: number
  data: unknown
}

export interface PdfSummaryBlock extends PdfTemplateBaseBlock {
  type: 'summary'
  content: {
    subtotal?: string
    discount?: string
    tax?: string
    total?: string
  }
}

export interface PdfCustomerBlock extends PdfTemplateBaseBlock {
  type: 'customer'
  width?: number
  height?: number
  padding?: number
  content: {
    title?: string
    name?: string
    address?: string
    phone?: string
    email?: string
  }
}

export interface PdfPaymentBlock extends PdfTemplateBaseBlock {
  type: 'payment'
  width?: number
  height?: number
  padding?: number
  content: {
    title?: string
    method?: string
    amountPaid?: string
    change?: string
    details?: string
  }
}

export type PdfTemplateBlock =
  | PdfLogoBlock
  | PdfHeaderBlock
  | PdfTableBlock
  | PdfSummaryBlock
  | PdfCustomerBlock
  | PdfPaymentBlock

export interface PdfTemplate {
  id: string
  name: string
  docType?: PdfDocType
  page: {
    size: PdfPageSize
    margin: number
  }
  styles: {
    font: PdfFontFamily
    fontSize: number
    color: string
  }
  blocks: PdfTemplateBlock[]
}

const DEFAULT_TEMPLATE_URL = new URL('./templates/default.json', import.meta.url)
const RECEIPT_TEMPLATE_URL = new URL('./templates/receipt.json', import.meta.url)

const TEMPLATE_URLS: Record<PdfDocType, URL> = {
  invoice: DEFAULT_TEMPLATE_URL,
  receipt: RECEIPT_TEMPLATE_URL,
}

const loadTemplateFromUrl = async (templateUrl: URL, label: string): Promise<PdfTemplate> => {
  const response = await fetch(templateUrl)
  if (!response.ok) {
    throw new Error(`Failed to load ${label}.`)
  }

  const template = (await response.json()) as PdfTemplate
  const validationErrors = validatePdfTemplate(template)

  if (validationErrors.length > 0) {
    throw new Error(`${label} is invalid: ${validationErrors.join(' ')}`)
  }

  return template
}

export const selectPdfTemplate = async (docType: PdfDocType = 'invoice'): Promise<PdfTemplate> => {
  const template = await loadTemplateFromUrl(TEMPLATE_URLS[docType], `${docType} PDF template`)

  if (template.docType && template.docType !== docType) {
    throw new Error(`Template type mismatch: expected ${docType}, got ${template.docType}.`)
  }

  return template
}

export const loadDefaultPdfTemplate = async (): Promise<PdfTemplate> => {
  return selectPdfTemplate('invoice')
}

export const validatePdfTemplate = (template: PdfTemplate): string[] => {
  const errors: string[] = []

  if (template.page.size !== 'A4') {
    errors.push('Only A4 page size is supported in this version.')
  }

  if (!Number.isFinite(template.page.margin) || template.page.margin < 0) {
    errors.push('Template margin must be a non-negative number.')
  }

  if (!Number.isFinite(template.styles.fontSize) || template.styles.fontSize <= 0) {
    errors.push('Template font size must be greater than zero.')
  }

  if (
    typeof template.docType !== 'undefined' &&
    template.docType !== 'invoice' &&
    template.docType !== 'receipt'
  ) {
    errors.push('Template docType must be either "invoice" or "receipt".')
  }

  const blockTypes = new Set(template.blocks.map((block) => block.type))
  if (!blockTypes.has('header')) {
    errors.push('Template must contain a header block.')
  }
  if (!blockTypes.has('table')) {
    errors.push('Template must contain a table block.')
  }
  if (!blockTypes.has('summary')) {
    errors.push('Template must contain a summary block.')
  }

  return errors
}