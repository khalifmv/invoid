import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLUListElement | null>(null)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  )

  const updatePanelPosition = () => {
    const trigger = triggerRef.current
    if (!trigger) {
      return
    }

    const rect = trigger.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const gutter = 8
    const maxPanelWidth = Math.max(220, rect.width)

    const spaceBelow = viewportHeight - rect.bottom - gutter
    const spaceAbove = rect.top - gutter
    const shouldOpenUp = spaceBelow < 180 && spaceAbove > spaceBelow
    const availableHeight = shouldOpenUp ? spaceAbove : spaceBelow
    const maxHeight = Math.max(120, Math.min(240, availableHeight - 4))

    const left = Math.max(gutter, Math.min(rect.left, viewportWidth - maxPanelWidth - gutter))

    const style: React.CSSProperties = {
      position: 'fixed',
      left,
      width: rect.width,
      maxHeight,
    }

    if (shouldOpenUp) {
      style.bottom = viewportHeight - rect.top + 4
    } else {
      style.top = rect.bottom + 4
    }

    setPanelStyle(style)
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    updatePanelPosition()

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current || !panelRef.current) {
        return
      }

      const target = event.target as Node
      const isInsideTrigger = rootRef.current.contains(target)
      const isInsidePanel = panelRef.current.contains(target)

      if (!isInsideTrigger && !isInsidePanel) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    const handleViewportChange = () => {
      updatePanelPosition()
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
    }
  }, [isOpen])

  const dropdownPanel =
    isOpen && !disabled
      ? createPortal(
        <ul
          ref={panelRef}
          role="listbox"
          aria-labelledby={id}
          style={panelStyle}
          className="z-[1000] overflow-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-xl"
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
        </ul>,
        document.body,
      )
      : null

  return (
    <div className={cn('relative', className)} ref={rootRef}>
      <button
        ref={triggerRef}
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
      {dropdownPanel}
    </div>
  )
}
