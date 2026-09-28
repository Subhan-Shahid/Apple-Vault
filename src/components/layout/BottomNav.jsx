import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ShoppingBag,
  MoreHorizontal,
} from 'lucide-react'
import { useState } from 'react'
import AppDrawer from './AppDrawer'

const primaryNav = [
  { to: '/dashboard',    label: 'Home',      icon: LayoutDashboard },
  { to: '/pos',          label: 'POS',       icon: ShoppingCart    },
  { to: '/inventory',    label: 'Inventory', icon: Package         },
  { to: '/sales-history',label: 'Sales',     icon: ShoppingBag     },
]

export default function BottomNav() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  const moreRoutes = [
    '/returns', '/company-return', '/retailer', '/purchase-history',
    '/expenses', '/suppliers', '/settings', '/users', '/reports', '/customers',
  ]
  const moreActive = moreRoutes.some(r => location.pathname.startsWith(r))

  return (
    <>
      {/* Spacer — height of nav + safe area */}
      <div style={{ height: 'calc(64px + env(safe-area-inset-bottom, 0px))', flexShrink: 0 }} />

      {/* Bottom Nav Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 overflow-hidden
          bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700/50 transition-colors"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="w-full max-w-md mx-auto flex items-stretch overflow-hidden">
          {primaryNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1
               text-[10px] font-semibold tracking-wide relative select-none
               active:opacity-70 transition-opacity
               ${isActive ? 'text-blue-400' : 'text-gray-400 dark:text-slate-500'}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-blue-400" />
                )}
                <span className={`p-1.5 rounded-xl ${isActive ? 'bg-blue-500/15' : ''}`}>
                  <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                </span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* More */}
        <button
          onClick={() => setDrawerOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1
            text-[10px] font-semibold tracking-wide relative select-none
            active:opacity-70 transition-opacity
            ${moreActive ? 'text-blue-400' : 'text-gray-400 dark:text-slate-500'}`}
        >
          {moreActive && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-blue-400" />
          )}
          <span className={`p-1.5 rounded-xl ${moreActive ? 'bg-blue-500/15' : ''}`}>
            <MoreHorizontal size={22} strokeWidth={moreActive ? 2.2 : 1.8} />
          </span>
          <span>More</span>
        </button>
        </div>
      </nav>

      <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
