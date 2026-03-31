export type CurrencyCode = 'USD' | 'IDR'
export type PdfDocType = 'invoice' | 'receipt'

export interface AppSettings {
  defaultTaxEnabled: boolean
  defaultTaxRate: number
  businessName: string
  logoDataUrl: string | null
  currency: CurrencyCode
  lastPdfDocType: PdfDocType
}
