import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
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
  const isCashier = !!currentUser && String(currentUser.role||'').toLowerCase() === 'cashier'
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

  // On small mobile screens, ensure sidebar starts closed
  useEffect(() => {
    if (window.innerWidth < 768) {
      useStore.getState().setSidebarOpen(false)
    }
  }, [])

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

  if (isElectron && (license === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600 dark:text-gray-400">Checking license…</div>
    )
  }

  if (isElectron && license && !license.activated) {
    return (
      <div className="min-h-screen flex bg-gray-50 dark:bg-slate-900">
        <div className="flex-1 flex flex-col min-w-0">
          <main className="p-0 m-0 w-full min-w-0">
            <Routes>
              <Route path="/activate" element={<Activate />} />
              <Route path="*" element={<Navigate to="/activate" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    )
  }
  if (!currentUser) {
    return (
      <div className="min-h-screen flex bg-gray-50 dark:bg-slate-900">
        <CloudSyncManager />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="p-0 m-0 w-full min-w-0">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    )
  }
  return (
    <div className={`min-h-screen flex bg-gray-50 dark:bg-slate-900 overflow-x-hidden transition-colors duration-300`}>
      <CloudSyncManager />
      <Sidebar />
      {ui?.sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden animate-fade-in"
          onClick={() => toggleSidebar()}
        />
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className={`p-3 sm:p-5 md:p-6 lg:p-8 mx-auto w-full ${ui?.sidebarOpen ? 'max-w-[1200px]' : 'max-w-none'} min-w-0 transition-all duration-300`}>
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
                {/* More Options Routes */}
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
        </main>
      </div>
    </div>
  )
}

export default App

