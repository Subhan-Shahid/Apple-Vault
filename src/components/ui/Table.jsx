/**
 * Responsive Table / Card List
 *
 * - On small screens (< 640px): renders each row as a stacked card with
 *   label → value pairs. Actions appear as full-width buttons at the bottom.
 * - On sm+ screens: renders a normal scrollable HTML table.
 */
export default function Table({ columns, data, renderActions, empty = 'No data' }) {
  if (data.length === 0) {
    return (
      <div className="py-14 text-center text-sm text-gray-400 dark:text-gray-500">
        {empty}
      </div>
    )
  }

  return (
    <>
      {/* ── Mobile card list (hidden on sm+) ─────────────────────────── */}
      <div className="sm:hidden space-y-2">
        {data.map((row, idx) => (
          <div
            key={row.id || idx}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/80 shadow-xs overflow-hidden"
          >
            {/* Card body: key-value rows */}
            <div className="p-3 space-y-1.5">
              {columns.map(col => {
                const value = col.render ? col.render(row[col.key], row) : row[col.key]
                if (value === null || value === undefined || value === '') return null
                return (
                  <div key={col.key} className="flex items-center justify-between gap-2 min-h-[24px]">
                    <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide shrink-0">
                      {col.title}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-100 text-right break-words min-w-0 font-medium">
                      {value}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Action buttons */}
            {renderActions && (
              <div className="flex border-t border-gray-100 dark:border-slate-700/60 bg-gray-50/50 dark:bg-slate-900/30 px-2.5 py-2 justify-end gap-1.5">
                {renderActions(row)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Desktop table (hidden on < sm) ───────────────────────────── */}
      <div className="hidden sm:block rounded-xl border border-gray-200 dark:border-slate-700/80 overflow-x-auto shadow-xs bg-white dark:bg-slate-800">
        <table className="min-w-full text-xs sm:text-sm divide-y divide-gray-100 dark:divide-slate-700/60">
          <thead className="bg-slate-50/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider sticky top-0 z-0">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 text-left font-semibold whitespace-nowrap"
                >
                  {col.title}
                </th>
              ))}
              {renderActions && <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-semibold whitespace-nowrap">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700/40 bg-white dark:bg-slate-800">
            {data.map((row, idx) => (
              <tr
                key={row.id || idx}
                className="hover:bg-brand/5 dark:hover:bg-slate-700/50 transition-colors duration-150"
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap"
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {renderActions && (
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right whitespace-nowrap">
                    {renderActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
