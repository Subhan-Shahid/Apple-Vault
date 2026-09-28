import { Smartphone, RefreshCw } from 'lucide-react'

export default function InventoryActions({ onAdd, onRefresh }) {
  const btnBase = 'px-2.5 py-1.5 text-xs sm:text-sm whitespace-nowrap active:scale-95 transition-all shadow-xs shrink-0'
  return (
    <div className="flex items-center gap-2 flex-wrap w-full">
      <button className={`btn-primary ${btnBase}`} onClick={onAdd}>
        <Smartphone size={14}/> Add Phone
      </button>
      <button className={`btn-secondary ${btnBase}`} onClick={onRefresh}>
        <RefreshCw size={14}/> Refresh
      </button>
    </div>
  )
}
