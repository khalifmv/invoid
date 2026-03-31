import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppLayout } from './layouts/AppLayout'
import { CatalogPage } from './pages/CatalogPage'
import { CustomersPage } from './pages/CustomersPage'
import { DashboardPage } from './pages/DashboardPage'
import { HistoryPage } from './pages/HistoryPage'
import { TransactionDetailPage } from './pages/TransactionDetailPage'
import { TransactionPage } from './pages/TransactionPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<AppLayout />} path="/">
          <Route index element={<DashboardPage />} />
          <Route element={<TransactionPage />} path="transaction" />
          <Route element={<CatalogPage />} path="catalog" />
          <Route element={<CustomersPage />} path="customers" />
          <Route element={<HistoryPage />} path="history" />
          <Route element={<TransactionDetailPage />} path="history/:transactionId" />
          <Route element={<SettingsPage />} path="settings" />
        </Route>
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </BrowserRouter>
  )
}

export default App
