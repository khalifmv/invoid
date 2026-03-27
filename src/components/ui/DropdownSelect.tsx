import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../lib/cn'

export interface DropdownOption {
  value: string
  label: string
}

interface DropdownSelectProps {
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder?: string
  id?: string
  ariaLabel?: string
  className?: string
  disabled?: boolean
}

export function DropdownSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  id,
  ariaLabel,
  className,
  disabled = false,
}: DropdownSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current) {
        return
      }

      const target = event.target as Node
      if (!rootRef.current.contains(target)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div className={cn('relative', className)} ref={rootRef}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-zinc-300 bg-zinc-50 px-3 text-left text-base text-zinc-900  transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-100 md:text-sm"
      >
        <span className={cn('truncate', selectedOption ? 'text-zinc-900' : 'text-zinc-400')}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-zinc-500 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && !disabled && (
        <ul
          role="listbox"
          aria-labelledby={id}
          className="absolute z-40 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-xl"
        >
          {options.map((option) => {
            const isSelected = option.value === value

            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm',
                    isSelected
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-zinc-800 hover:bg-zinc-100',
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check className="h-4 w-4" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
