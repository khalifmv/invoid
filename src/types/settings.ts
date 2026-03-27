export type CurrencyCode = 'USD' | 'IDR'

export interface AppSettings {
  defaultTaxEnabled: boolean
  defaultTaxRate: number
  businessName: string
  logoDataUrl: string | null
  currency: CurrencyCode
}
