import { Clock, FileText, Package, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { cn } from '../../lib/cn'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Invoice', icon: FileText },
  { to: '/catalog', label: 'Catalog', icon: Package },
  { to: '/history', label: 'History', icon: Clock },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex h-16 border-t border-stone-200 bg-white md:static md:h-auto md:w-52 md:flex-col md:gap-1 md:border-t-0 md:border-r md:px-3 md:py-4"
      aria-label="Primary"
    >
      <span className="hidden px-2 pb-3 text-xs font-bold tracking-[0.16em] text-zinc-500 md:block">
        MENU
      </span>

      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-1 transition-colors md:h-10 md:flex-none md:flex-row md:justify-start md:gap-2 md:rounded-lg md:px-3',
                isActive
                  ? 'bg-zinc-900 text-zinc-100 md:bg-zinc-900'
                  : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900',
              )
            }
            end={item.to === '/'}
            key={item.to}
            to={item.to}
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            <span className={`text-[11px] font-semibold md:text-sm`}>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
