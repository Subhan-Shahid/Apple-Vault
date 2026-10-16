import { NavLink } from 'react-router-dom'
import {
  RotateCcw, Truck, Store, Wallet, Users, Receipt, BarChart3, X, Settings, ShieldCheck, Building2
} from 'lucide-react'
import useStore from '../../store/useStore'
import { useEffect } from 'react'

const drawerItems = [
  { to: '/reports',         label: 'Reports',          icon: BarChart3,     color: 'text-purple-400' },
  { to: '/company-reports', label: 'Company Reports',  icon: Building2,     color: 'text-cyan-400'   },
  { to: '/customers',       label: 'Customers',        icon: Users,         color: 'text-sky-400'    },
  { to: '/returns',         label: 'Customer Returns',  icon: RotateCcw,     color: 'text-amber-400'  },
  { to: '/company-return',  label: 'Company Return',   icon: Truck,         color: 'text-rose-400'   },
  { to: '/retailer',        label: 'Retailer Sales',   icon: Store,         color: 'text-emerald-400'},
  { to: '/purchase-history',label: 'Purchase History', icon: Truck,         color: 'text-indigo-400' },
  { to: '/expenses',        label: 'Expenses',         icon: Wallet,        color: 'text-orange-400' },
  { to: '/suppliers',       label: 'Suppliers',        icon: Users,         color: 'text-teal-400'   },
  { to: '/users',           label: 'User Management',  icon: ShieldCheck,   color: 'text-pink-400'   },
  { to: '/settings',        label: 'Settings',         icon: Settings,      color: 'text-slate-400'  },
]

export default function AppDrawer({ open, onClose }) {
  const { settings, currentUser, logout } = useStore()

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer panel — slides up from bottom */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-[70] flex flex-col mx-auto max-w-md w-full
          bg-white dark:bg-[#141a22] border-t border-slate-200 dark:border-white/10 rounded-t-3xl shadow-2xl dark:shadow-black/50
          transition-transform duration-300 ease-out max-h-[85vh]
          ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <img src={settings?.logoDataUrl || '/apple-touch-icon.png'} alt="logo" className="h-8 w-8 object-contain rounded-xl" />
            <div>
              <p className="text-gray-900 dark:text-slate-100 font-semibold text-sm leading-tight">
                {settings?.companyName || 'MobileShop'}
              </p>
              <p className="text-gray-500 dark:text-slate-500 text-xs">
                {currentUser?.username} · <span className="capitalize">{currentUser?.role}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-white/5 active:scale-95 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav grid */}
        <div className="overflow-y-auto flex-1 px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            {drawerItems.map(({ to, label, icon: Icon, color }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-medium
                   transition-all duration-200 active:scale-95 border
                   ${isActive
                     ? 'bg-blue-500/15 border-blue-400/30 text-blue-700 dark:text-blue-300'
                     : 'bg-gray-50 dark:bg-[#0f141c] border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:border-gray-300 dark:hover:border-white/10'
                   }`
                }
              >
                <Icon size={18} className={`shrink-0 ${color}`} />
                <span className="truncate text-xs leading-tight">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* Footer logout */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-white/[0.06] shrink-0">
          <button
            onClick={() => { 
              logout()
              onClose()
              window.location.pathname = '/login'
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl
              bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400
              hover:bg-red-100 dark:hover:bg-red-500/15 active:scale-95 transition-all text-sm font-semibold"
          >
            Sign Out
          </button>
        </div>
      </div>
    </>
  )
}
