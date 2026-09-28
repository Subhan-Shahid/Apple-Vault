export default function Card({ title, action, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{title}</div>
          {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
