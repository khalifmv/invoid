import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings, CurrencyCode, PdfDocType } from '../types'

const DEFAULT_SETTINGS: AppSettings = {
  defaultTaxEnabled: true,
  defaultTaxRate: 11,
  businessName: '',
  logoDataUrl: null,
  currency: 'IDR',
  lastPdfDocType: 'invoice',
}

interface SettingsActions {
  setBusinessName: (name: string) => void
  setLogoDataUrl: (logoDataUrl: string | null) => void
  setDefaultTaxEnabled: (enabled: boolean) => void
  setDefaultTaxRate: (rate: number) => void
  setCurrency: (currency: CurrencyCode) => void
  setLastPdfDocType: (docType: PdfDocType) => void
  resetSettings: () => void
}

export type SettingsStore = AppSettings & SettingsActions

const sanitizeTaxRate = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(Math.max(value, 0), 100)
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setBusinessName: (businessName) => set({ businessName: businessName.trimStart() }),
      setLogoDataUrl: (logoDataUrl) => set({ logoDataUrl }),
      setDefaultTaxEnabled: (defaultTaxEnabled) => set({ defaultTaxEnabled }),
      setDefaultTaxRate: (defaultTaxRate) => set({ defaultTaxRate: sanitizeTaxRate(defaultTaxRate) }),
      setCurrency: (currency) => set({ currency }),
      setLastPdfDocType: (lastPdfDocType) => set({ lastPdfDocType }),
      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'invoid-settings',
      version: 1,
    },
  ),
)
