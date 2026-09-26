export default function Table({ columns, data, renderActions, empty = 'No data' }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 overflow-x-auto shadow-xs bg-white dark:bg-slate-800">
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
          {data.length === 0 && (
            <tr>
              <td 
                colSpan={(columns?.length || 0) + (renderActions ? 1 : 0)} 
                className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500"
              >
                {empty}
              </td>
            </tr>
          )}
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
  )
}
