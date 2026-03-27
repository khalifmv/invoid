import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  labelClassName?: string
}

export function Toggle({ className, label, labelClassName, ...props }: ToggleProps) {
  return (
    <label
      className={cn(
        'inline-flex items-center gap-2 text-sm font-medium text-zinc-700',
        labelClassName,
      )}
    >
      <span className={cn('relative inline-flex h-5 w-9 items-center', className)}>
        <input className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0" type="checkbox" {...props} />
        <span className="h-5 w-9 rounded-full bg-zinc-300 transition-colors peer-checked:bg-zinc-900" />
        <span className="pointer-events-none absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  )
}
