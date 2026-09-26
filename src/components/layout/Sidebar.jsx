import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  RotateCcw, 
  Users, 
  BarChart3, 
  Receipt, 
  ShoppingBag, 
  Truck, 
  Wallet, 
  Store, 
  MoreHorizontal, 
  ChevronDown, 
  Package,
  ChevronLeft, 
  ChevronRight,
  X 
} from 'lucide-react'
import useStore from '../../store/useStore'
import { useState } from 'react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pos', label: 'Point of Sale', icon: ShoppingCart },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/sales-history', label: 'Sales History', icon: ShoppingBag },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
]

const moreItems = [
  { to: '/returns', label: 'Returns', icon: RotateCcw },
  { to: '/company-return', label: 'Company Return', icon: Truck },
  { to: '/retailer', label: 'Retailer Sales', icon: Store },
  { to: '/purchase-history', label: 'Purchase History', icon: Truck },
  { to: '/expenses', label: 'Expenses', icon: Wallet },
  { to: '/suppliers', label: 'Suppliers', icon: Users },
  { to: '/settings', label: 'Settings', icon: Receipt },
  { to: '/users', label: 'Users', icon: Users },
]

export default function Sidebar() {
  const { settings, ui, toggleSidebar } = useStore()
  const open = !!ui?.sidebarOpen
  const [showMore, setShowMore] = useState(false)

  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      toggleSidebar()
    }
  }

  return (
    <aside 
      className={`
        fixed inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-slate-800 border-r border-gray-100 dark:border-slate-700
        transition-all duration-300 ease-in-out
        ${open ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full'}
        md:translate-x-0 md:static md:shadow-none
        ${open ? 'md:w-56 lg:w-64' : 'md:w-16'}
      `}
    > 
      {/* Header */}
      <div className={`h-16 flex items-center ${open ? 'px-4 sm:px-6' : 'px-2'} border-b border-gray-100 dark:border-slate-700 gap-2 shrink-0`}>
        {settings?.logoDataUrl && (
          <img src={settings.logoDataUrl} alt="logo" className="h-7 w-7 object-contain rounded shrink-0" />
        )}
        {(open || window.innerWidth < 768) && (
          <span className="text-lg font-bold text-brand tracking-tight truncate dark:text-white">
            {settings?.companyName || 'MobileShop'}
          </span>
        )}
        
        {/* Mobile close button */}
        <button 
          className="ml-auto md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          onClick={toggleSidebar}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

        {/* Desktop collapse toggle */}
        <button 
          className="ml-auto hidden md:flex btn-secondary btn-sm dark:bg-slate-700 dark:text-gray-200 dark:border-slate-600" 
          onClick={toggleSidebar} 
          title={open ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          {open ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `group flex items-center ${open ? 'gap-3 px-3' : 'md:justify-center md:px-2 px-3 gap-3'} py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'bg-brand text-white shadow-md shadow-brand/20 font-semibold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`
            }
          >
            <Icon size={19} className="shrink-0" title={label} />
            <span className={`${open ? 'inline' : 'md:hidden inline'} truncate`}>{label}</span>
          </NavLink>
        ))}
        
        <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
          <button 
            onClick={() => setShowMore(!showMore)}
            className={`w-full flex items-center ${open ? 'gap-3 px-3' : 'md:justify-center md:px-2 px-3 gap-3'} py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors`}
          >
            <MoreHorizontal size={19} className="shrink-0" />
            <span className={`${open ? 'inline' : 'md:hidden inline'} truncate`}>More Options</span>
            <ChevronDown size={16} className={`ml-auto transition-transform duration-200 ${showMore ? 'rotate-180' : ''} ${open ? 'inline' : 'md:hidden inline'}`} />
          </button>
          
          {showMore && (
            <div className="space-y-1 pl-3 border-l-2 border-brand/20 ml-3 my-1">
              {moreItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 ${
                      isActive
                        ? 'bg-brand text-white shadow-sm font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`
                  }
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className={`p-3 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-slate-700 shrink-0 ${open ? 'px-4' : 'text-center'}`}>
        v0.1.0 • Connected
      </div>
    </aside>
  )
}
