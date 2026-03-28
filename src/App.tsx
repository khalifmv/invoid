import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppLayout } from './layouts/AppLayout'
import { CatalogPage } from './pages/CatalogPage'
import { HistoryPage } from './pages/HistoryPage'
import { InvoiceDetailPage } from './pages/InvoiceDetailPage'
import { InvoicePage } from './pages/InvoicePage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />} path="/">
          <Route index element={<InvoicePage />} />
          <Route element={<CatalogPage />} path="catalog" />
          <Route element={<HistoryPage />} path="history" />
          <Route element={<InvoiceDetailPage />} path="history/:invoiceId" />
          <Route element={<SettingsPage />} path="settings" />
        </Route>
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </BrowserRouter>
  )
}

export default App
