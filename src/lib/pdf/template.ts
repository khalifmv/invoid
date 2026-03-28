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
  | PdfHeaderBlock
  | PdfTableBlock
  | PdfSummaryBlock
  | PdfCustomerBlock
  | PdfPaymentBlock

export interface PdfTemplate {
  id: string
  name: string
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

export const loadDefaultPdfTemplate = async (): Promise<PdfTemplate> => {
  const response = await fetch(DEFAULT_TEMPLATE_URL)
  if (!response.ok) {
    throw new Error('Failed to load default PDF template.')
  }

  const template = (await response.json()) as PdfTemplate
  const validationErrors = validatePdfTemplate(template)

  if (validationErrors.length > 0) {
    throw new Error(`Default template is invalid: ${validationErrors.join(' ')}`)
  }

  return template
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