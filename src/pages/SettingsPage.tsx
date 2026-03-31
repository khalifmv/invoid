import type { ChangeEvent } from 'react'
import { useMemo } from 'react'
import { useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardTitle } from '../components/ui/Card'
import { DropdownSelect, type DropdownOption } from '../components/ui/DropdownSelect'
import { Input } from '../components/ui/Input'
import { NumberInput } from '../components/ui/NumberInput'
import { Toggle } from '../components/ui/Toggle'
import type { CurrencyCode } from '../types'
import { useTransactionStore } from '../store/transactionStore'
import { useSettingsStore } from '../store/settingsStore'

export function SettingsPage() {
  const {
    businessName,
    defaultTaxEnabled,
    defaultTaxRate,
    logoDataUrl,
    currency,
    setBusinessName,
    setDefaultTaxEnabled,
    setDefaultTaxRate,
    setLogoDataUrl,
    setCurrency,
    resetSettings,
  } = useSettingsStore()

  const clearTransaction = useTransactionStore((state) => state.clearTransaction)
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const currencyOptions = useMemo<DropdownOption[]>(
    () => [
      { value: 'IDR', label: 'IDR (Rupiah)' },
      { value: 'USD', label: 'USD (US Dollar)' },
    ],
    [],
  )

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoDataUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const handleReset = () => {
    resetSettings()
    clearTransaction()
  }

  return (
    <section className="mx-auto w-full max-w-4xl">
      <Card>
        <CardTitle>Settings</CardTitle>

        <p className="mb-4 text-sm text-zinc-500">Settings are saved locally in this browser.</p>

        <div className="grid gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Business logo</label>

            <div className="rounded-xl border border-stone-300 bg-white p-3">
              <div className="relative h-56 overflow-hidden rounded-md border-1 border-zinc-400 bg-zinc-200">
                {logoDataUrl ? (
                  <img
                    alt="Business logo preview"
                    className="relative z-10 h-full w-full object-contain p-3"
                    src={logoDataUrl}
                  />
                ) : (
                  <span className="relative z-10 flex h-full w-full items-center justify-center text-lg font-semibold tracking-[0.12em] text-zinc-500">
                    LOGO
                  </span>
                )}
              </div>

              <input
                ref={logoInputRef}
                className="hidden"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
              />

              <div className="mt-3 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {logoDataUrl ? 'Change logo' : 'Upload new'}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => setLogoDataUrl(null)}
                  disabled={!logoDataUrl}
                  aria-label="Delete logo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="business-name" className="mb-1 block text-xs font-semibold text-zinc-600">
              Business name
            </label>
            <Input
              id="business-name"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="Your business name"
            />
          </div>

          <div>
            <label htmlFor="default-tax-rate" className="mb-1 block text-xs font-semibold text-zinc-600">
              Default tax rate (%)
            </label>
            <NumberInput
              id="default-tax-rate"
              min={0}
              max={100}
              value={defaultTaxRate}
              onValueChange={setDefaultTaxRate}
            />
          </div>

          <div>
            <label htmlFor="currency" className="mb-1 block text-xs font-semibold text-zinc-600">
              Currency
            </label>
            <DropdownSelect
              id="currency"
              value={currency}
              onChange={(nextValue) => setCurrency(nextValue as CurrencyCode)}
              options={currencyOptions}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
            <span className="text-sm font-medium text-zinc-700">Enable tax by default</span>
            <Toggle checked={defaultTaxEnabled} onChange={(event) => setDefaultTaxEnabled(event.target.checked)} />
          </div>
        </div>

        <Button className="mt-4" type="button" variant="outline" onClick={handleReset}>
          Reset defaults
        </Button>
      </Card>
    </section>
  )
}
