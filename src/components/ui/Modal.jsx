import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl sm:max-w-3xl md:max-w-4xl lg:max-w-5xl rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-gray-200 dark:border-slate-700 animate-scale-in max-h-[92vh] flex flex-col transition-all duration-200">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-slate-700/80 shrink-0">
          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate pr-2">{title}</h3>
          <button 
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-90 transition-all shrink-0" 
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-3.5 sm:p-5 overflow-y-auto overflow-x-hidden flex-1 -webkit-overflow-scrolling-touch">
          {children}
        </div>
        {footer && (
          <div className="px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-slate-700/80 bg-gray-50/90 dark:bg-slate-900/90 rounded-b-2xl flex flex-col sm:flex-row justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
