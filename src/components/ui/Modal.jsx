import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, footer }) {
  // Lock body scroll when modal is open (prevents scroll-behind on iOS)
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel — bottom sheet on mobile, centered dialog on sm+ */}
      <div className="relative z-10 w-full sm:max-w-lg md:max-w-2xl bg-white dark:bg-slate-800 shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col min-h-0 animate-slide-up sm:animate-scale-in rounded-t-3xl sm:rounded-2xl max-h-[90dvh] sm:max-h-[88dvh] mx-0 sm:mx-4 overflow-hidden">
        {/* Drag handle (mobile only visual cue) */}
        <div className="sm:hidden absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-gray-300 dark:bg-slate-600" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 pt-5 sm:pt-3.5 pb-3.5 border-b border-gray-100 dark:border-slate-700/80 shrink-0">
          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate pr-2">{title}</h3>
          <button
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-90 transition-all shrink-0"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body — min-h-0, overflow-x-hidden, and touch-action: pan-y ensure buttery smooth scrolling without horizontal sway */}
        <div
          className="p-4 sm:p-5 overflow-y-auto overflow-x-hidden flex-1 min-h-0 overscroll-contain"
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
          }}
        >
          {children}
        </div>

        {footer && (
          <div
            className="px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-slate-700/80 bg-gray-50/95 dark:bg-slate-900/95 rounded-b-2xl shrink-0"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
