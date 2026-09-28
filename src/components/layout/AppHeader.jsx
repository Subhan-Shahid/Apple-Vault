import { Sun, Moon } from 'lucide-react'
import useStore from '../../store/useStore'

const syncMeta = {
  connected:    { label: 'Synced',      dot: 'bg-emerald-400' },
  connecting:   { label: 'Syncing…',    dot: 'bg-amber-400'   },
  error:        { label: 'Sync error',  dot: 'bg-rose-400'    },
  disconnected: { label: 'Offline',     dot: 'bg-slate-400'   },
}

export default function AppHeader() {
  const { settings, currentUser, cloudSyncStatus, ui, toggleDarkMode } = useStore()
  const meta = syncMeta[cloudSyncStatus] || syncMeta.disconnected
  const isDark = ui?.darkMode

  return (
    <header
      className="shrink-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 transition-colors"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="w-full max-w-md mx-auto flex items-center justify-between gap-2 px-3 h-14">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={settings?.logoDataUrl || '/apple-touch-icon.png'}
            alt="logo"
            className="h-9 w-9 rounded-xl object-contain bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 p-1"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">
              {settings?.companyName || 'Apple Vault'}
            </p>
            {currentUser && (
              <p className="text-[10px] text-gray-500 dark:text-slate-500 leading-tight truncate">
                {currentUser.username} · <span className="capitalize">{currentUser.role}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-800/70 border border-gray-200 dark:border-slate-700/50">
            <span
              className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${
                cloudSyncStatus === 'connecting' ? 'animate-pulse' : ''
              }`}
            />
            <span className="text-[10px] font-semibold text-gray-500 dark:text-slate-400">{meta.label}</span>
          </div>

          <button
            onClick={toggleDarkMode}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-xs"
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </header>
  )
}
