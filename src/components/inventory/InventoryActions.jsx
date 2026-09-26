import { PackageOpen, RefreshCw } from 'lucide-react'

export default function InventoryActions({ onAdd, onRepack, onSecondHand, onRefresh }) {
  const btnBase = 'px-2.5 py-1.5 text-xs sm:text-sm whitespace-nowrap active:scale-95 transition-all shadow-xs shrink-0'
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-nowrap sm:flex-wrap w-full">
      <button className={`btn-primary ${btnBase}`} onClick={onAdd}>
        <PackageOpen size={14}/> Add Inventory
      </button>
      <button className={`btn-secondary ${btnBase}`} onClick={onRepack}>Repack Mobile</button>
      <button className={`btn-secondary ${btnBase}`} onClick={onSecondHand}>Second Hand Mobile</button>
      <button className={`btn-secondary ${btnBase}`} onClick={onRefresh}>
        <RefreshCw size={14}/> Refresh
      </button>
    </div>
  )
}
