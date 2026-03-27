import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl border border-stone-200 bg-white p-4 shadow-sm md:p-5', className)}
      {...props}
    />
  )
}

type CardTitleProps = HTMLAttributes<HTMLHeadingElement>

export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h2
      className={cn(
        'mb-4 text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase',
        className,
      )}
      {...props}
    />
  )
}
