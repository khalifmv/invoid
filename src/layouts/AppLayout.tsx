import { useEffect } from 'react'
import { Outlet } from 'react-router'
import invoidLogo from '../assets/invoid.svg?raw'
import { AppNav } from '../components/nav/AppNav'
import { useCatalogStore } from '../store/catalogStore'
import { useCustomerStore } from '../store/customerStore'
import { useSettingsStore } from '../store/settingsStore'

export function AppLayout() {
  const hydrateCatalog = useCatalogStore((state) => state.hydrate)
  const hydrateCustomers = useCustomerStore((state) => state.hydrate)
  const businessName = useSettingsStore((state) => state.businessName)

  useEffect(() => {
    void Promise.all([hydrateCatalog(), hydrateCustomers()])
  }, [hydrateCatalog, hydrateCustomers])

  return (
    <div className="min-h-screen bg-stone-100 text-zinc-900 md:flex print:bg-white">
      <div className="print:hidden">
        <AppNav />
      </div>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 flex w-full items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 md:justify-start md:px-6 print:hidden">
          <span
            className="inline-flex h-4 w-auto text-black [&_svg]:h-full [&_svg]:w-auto"
            aria-label="INVOID"
            role="img"
            dangerouslySetInnerHTML={{ __html: invoidLogo }}
          />
          <span className="text-sm text-zinc-500">
            {businessName.trim().length > 0 ? businessName : 'Offline invoice generator'}
          </span>
        </header>

        <main className="flex-1 px-3 py-4 pb-20 md:px-6 md:py-5 md:pb-6 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
