import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ open, onClose, title, children, footer }) {
  const [vvStyle, setVvStyle] = useState(null)

  // Lock body scroll when modal is open (prevents scroll-behind on iOS)
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Keep the overlay inside the visual viewport so the footer stays above
  // the mobile keyboard / browser chrome (and above the bottom nav).
  useEffect(() => {
    if (!open) {
      setVvStyle(null)
      return
    }

    const vv = window.visualViewport
    if (!vv) return

    const sync = () => {
      setVvStyle({
        top: `${vv.offsetTop}px`,
        height: `${vv.height}px`,
        left: '0px',
        right: '0px',
        bottom: 'auto',
      })
    }

    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center animate-fade-in"
      style={vvStyle || undefined}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel — bottom sheet on mobile, centered dialog on sm+ */}
      <div className="relative z-10 w-full sm:max-w-lg md:max-w-2xl bg-white dark:bg-[#141a22] shadow-2xl dark:shadow-black/50 border border-gray-200 dark:border-white/10 flex flex-col min-h-0 animate-slide-up sm:animate-scale-in rounded-t-3xl sm:rounded-2xl max-h-[min(92%,90dvh)] sm:max-h-[min(88%,88dvh)] mx-0 sm:mx-4 overflow-hidden">
        {/* Drag handle (mobile only visual cue) */}
        <div className="sm:hidden absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-gray-300 dark:bg-white/20" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 pt-5 sm:pt-3.5 pb-3.5 border-b border-gray-100 dark:border-white/[0.06] shrink-0">
          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-slate-100 truncate pr-2">{title}</h3>
          <button
            type="button"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-white/5 active:scale-90 transition-all shrink-0"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
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
            className="px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/95 dark:bg-[#0f141c]/95 sm:rounded-b-2xl shrink-0 flex flex-col-reverse sm:flex-row sm:flex-wrap items-stretch sm:items-center sm:justify-end gap-2 [&_button]:w-full sm:[&_button]:w-auto"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
