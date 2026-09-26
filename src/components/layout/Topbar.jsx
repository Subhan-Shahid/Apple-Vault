import { LogOut, Menu, Moon, Sun, Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import useStore from '../../store/useStore'

export default function Topbar() {
  const { user, currentUser, settings, logout, ui, toggleSidebar, toggleDarkMode, cloudSyncStatus, lastSyncTime } = useStore()
  const displayName = currentUser?.username || user?.name || 'User'
  const displayRole = currentUser?.role || user?.role || ''
  const isDark = ui?.darkMode
  
  return (
    <header className="h-16 flex items-center justify-between bg-white/95 dark:bg-slate-800/95 backdrop-blur-md px-3 sm:px-5 md:px-6 sticky top-0 z-20 shadow-sm border-b border-gray-100 dark:border-slate-700 transition-colors duration-300">
      {/* Left: Hamburger + Logo */}
      <div className="flex items-center gap-2 min-w-0">
        <button 
          className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all shrink-0" 
          onClick={toggleSidebar}
          aria-label="Toggle navigation"
        >
          <Menu size={20} />
        </button>
        {settings?.logoDataUrl && (
          <img src={settings.logoDataUrl} alt="logo" className="h-7 w-7 object-contain rounded shrink-0" />
        )}
        <div className="font-bold text-brand tracking-tight truncate max-w-[100px] xs:max-w-[140px] sm:max-w-none text-sm sm:text-base">
          {settings?.companyName || 'MobileShop'}
        </div>
      </div>

      {/* Center: Cloud Sync Badge */}
      <div className="flex items-center px-1">
        <Link 
          to="/settings" 
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer active:scale-95 text-decoration-none shadow-xs"
          style={{
            borderColor: cloudSyncStatus === 'connected' ? '#86efac' : cloudSyncStatus === 'connecting' ? '#fde047' : '#e2e8f0',
            backgroundColor: cloudSyncStatus === 'connected' ? '#f0fdf4' : cloudSyncStatus === 'connecting' ? '#fefce8' : 'rgba(241, 245, 249, 0.6)'
          }}
          title={
            cloudSyncStatus === 'connected' 
              ? `Connected to Firebase Cloud DB. Last synced: ${lastSyncTime || 'Just now'}`
              : cloudSyncStatus === 'connecting'
              ? 'Connecting to Firebase...'
              : 'Running in Local Storage. Click to setup Free Cloud Sync!'
          }
        >
          {cloudSyncStatus === 'connected' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <Cloud size={13} className="text-emerald-600 shrink-0" />
              <span className="hidden sm:inline text-emerald-700 font-semibold text-xs">Cloud Synced</span>
            </>
          ) : cloudSyncStatus === 'connecting' ? (
            <>
              <RefreshCw size={12} className="text-amber-600 animate-spin shrink-0" />
              <span className="hidden sm:inline text-amber-700 font-semibold text-xs">Connecting...</span>
            </>
          ) : (
            <>
              <CloudOff size={13} className="text-slate-400 shrink-0" />
              <span className="hidden sm:inline text-slate-600 dark:text-slate-300 text-xs">Local Only</span>
            </>
          )}
        </Link>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <button 
          className="p-2 sm:px-2.5 sm:py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 active:scale-95 transition-all shadow-xs" 
          onClick={toggleDarkMode}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <div className="hidden lg:flex flex-col text-right">
          <span className="text-sm font-semibold leading-4 dark:text-gray-200">{displayName}</span>
          <span className="text-xs text-gray-500 leading-4 dark:text-gray-400">{displayRole}</span>
        </div>

        <button 
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 active:scale-95 transition-all text-xs sm:text-sm font-medium shadow-xs" 
          onClick={() => { logout(); window.location.assign('#/login') }}
          title="Sign out"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}
