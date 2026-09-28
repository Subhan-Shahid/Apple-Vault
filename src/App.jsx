import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import AppHeader from './components/layout/AppHeader'
import BottomNav from './components/layout/BottomNav'
import Dashboard from './pages/Dashboard'
import Returns from './pages/Returns'
import CustomerHistory from './pages/CustomerHistory'
import Suppliers from './pages/Suppliers'
import Reports from './pages/Reports'
import POS from './pages/POS'
import Inventory from './pages/Inventory'
import PurchaseHistory from './pages/PurchaseHistory'
import Settings from './pages/Settings'
import CompanyReturn from './pages/CompanyReturn'
import SalesHistory from './pages/SalesHistory'
import useStore from './store/useStore'
import UserManagement from './pages/UserManagement'
import Login from './pages/Login'
import Expenses from './pages/Expenses'
import Activate from './pages/Activate'
import Retailer from './pages/Retailer'
import CompanyReports from './pages/CompanyReports'
import CloudSyncManager from './components/common/CloudSyncManager'

function App() {
  const { ui, currentUser, toggleSidebar } = useStore()
  const isCashier = !!currentUser && String(currentUser.role || '').toLowerCase() === 'cashier'
  const isElectron = !!window.api?.isElectron
  const [license, setLicense] = useState(isElectron ? null : { activated: true })
  const isDark = ui?.darkMode

  // Apply dark mode to document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  useEffect(() => {
    let mounted = true
    async function check() {
      if (!isElectron) return
      try {
        const res = await window.api.license.check()
        if (!mounted) return
        setLicense({ activated: !!res?.activated })
      } catch {
        if (!mounted) return
        setLicense({ activated: false })
      }
    }
    check()
    return () => { mounted = false }
  }, [isElectron])

  if (isElectron && license === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400 text-sm">
        Checking license…
      </div>
    )
  }

  if (isElectron && license && !license.activated) {
    return (
      <div className="app-shell">
        <Routes>
          <Route path="/activate" element={<Activate />} />
          <Route path="*" element={<Navigate to="/activate" replace />} />
        </Routes>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="app-shell">
        <CloudSyncManager />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    )
  }

  return (
    <div className="app-shell overflow-x-hidden">
      <CloudSyncManager />
      <AppHeader />

      {/* Scrollable page content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="w-full max-w-md mx-auto px-3 py-3 min-h-full overflow-x-hidden">
          <Routes>
            {isCashier ? (
              <>
                <Route path="/" element={<Navigate to="/pos" replace />} />
                <Route path="/login" element={<Navigate to="/pos" replace />} />
                <Route path="/pos" element={<POS />} />
                <Route path="*" element={<Navigate to="/pos" replace />} />
              </>
            ) : (
              <>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/add-mobile" element={<Navigate to="/dashboard" replace />} />
                <Route path="/pos" element={<POS />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/sales-history" element={<SalesHistory />} />
                <Route path="/customers" element={<CustomerHistory />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/purchase-history" element={<PurchaseHistory />} />
                <Route path="/returns" element={<Returns />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/company-reports" element={<CompanyReports />} />
                <Route path="/company-return" element={<CompanyReturn />} />
                <Route path="/retailer" element={<Retailer />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/expenses" element={<Expenses />} />
              </>
            )}
          </Routes>
        </div>
      </main>

      {/* Bottom navigation bar (replaces sidebar) */}
      {isCashier ? null : <BottomNav />}
    </div>
  )
}

export default App
