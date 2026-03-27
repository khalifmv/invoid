import { useEffect, useMemo, useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Input } from './Input'

interface NumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: number
  onValueChange: (value: number) => void
  allowDecimal?: boolean
}

const normalizeInteger = (value: string): string => {
  if (value === '') {
    return ''
  }

  const stripped = value.replace(/^0+(?=\d)/, '')
  return stripped === '' ? '0' : stripped
}

const normalizeNumberText = (raw: string, allowDecimal: boolean): string => {
  const normalizedRaw = raw.replaceAll(',', '.')
  const cleaned = normalizedRaw.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, '')

  if (cleaned === '') {
    return ''
  }

  if (!allowDecimal) {
    return normalizeInteger(cleaned)
  }

  const hasDot = cleaned.includes('.')
  const [integerRaw, ...decimalParts] = cleaned.split('.')
  const decimal = decimalParts.join('')
  const integer = normalizeInteger(integerRaw)

  if (!hasDot) {
    return integer
  }

  return `${integer === '' ? '0' : integer}.${decimal}`
}

const clamp = (value: number, min?: number, max?: number): number => {
  if (!Number.isFinite(value)) {
    return 0
  }

  if (typeof min === 'number' && value < min) {
    return min
  }

  if (typeof max === 'number' && value > max) {
    return max
  }

  return value
}

export function NumberInput({
  value,
  onValueChange,
  allowDecimal = true,
  min,
  max,
  inputMode,
  ...props
}: NumberInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(String(value))

  const nextInputMode = useMemo<'decimal' | 'numeric'>(
    () => inputMode ?? (allowDecimal ? 'decimal' : 'numeric'),
    [allowDecimal, inputMode],
  )

  useEffect(() => {
    const next = String(value)
    setDisplayValue((current) => (current === next ? current : next))
  }, [value])

  return (
    <Input
      type="text"
      inputMode={nextInputMode}
      value={displayValue}
      onChange={(event) => {
        const normalized = normalizeNumberText(event.target.value, allowDecimal)
        setDisplayValue(normalized)

        const parsed = Number.parseFloat(normalized)
        const safeValue = clamp(Number.isFinite(parsed) ? parsed : 0, min, max)
        onValueChange(safeValue)
      }}
      onBlur={() => {
        const parsed = Number.parseFloat(displayValue)
        const safeValue = clamp(Number.isFinite(parsed) ? parsed : 0, min, max)
        const canonical = String(safeValue)
        setDisplayValue(canonical)
        onValueChange(safeValue)
      }}
      {...props}
    />
  )
}
