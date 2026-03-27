import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { AppNav } from '../components/nav/AppNav'
import { useCatalogStore } from '../store/catalogStore'
import { useSettingsStore } from '../store/settingsStore'

export function AppLayout() {
  const hydrate = useCatalogStore((state) => state.hydrate)
  const businessName = useSettingsStore((state) => state.businessName)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  return (
    <div className="min-h-screen bg-stone-100 text-zinc-900 md:flex">
      <AppNav />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex items-baseline gap-3 border-b border-stone-200 bg-white px-4 py-3 md:px-6">
          <span className="text-base font-extrabold tracking-[0.12em]">INVOID</span>
          <span className="text-sm text-zinc-500">
            {businessName.trim().length > 0 ? businessName : 'Offline invoice generator'}
          </span>
        </header>

        <main className="flex-1 px-3 py-4 pb-20 md:px-6 md:py-5 md:pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
