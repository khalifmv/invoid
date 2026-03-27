import type { CurrencyCode } from '../types'

const LOCALE_BY_CURRENCY: Record<CurrencyCode, string> = {
  USD: 'en-US',
  IDR: 'id-ID',
}

export const createCurrencyFormatter = (currency: CurrencyCode): Intl.NumberFormat => {
  const isRupiah = currency === 'IDR'

  return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits: isRupiah ? 0 : 2,
    maximumFractionDigits: isRupiah ? 0 : 2,
  })
}
