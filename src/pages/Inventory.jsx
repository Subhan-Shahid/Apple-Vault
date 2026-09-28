import { useMemo, useState } from 'react'
import {
  Printer,
  Smartphone,
  Plus,
  Copy,
  Check,
  Search,
  X,
  Edit2,
  Trash2,
  ShoppingCart,
  Info,
  Phone,
  ShieldCheck,
  Radio,
  Lock,
  ExternalLink,
  MessageCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import Modal from '../components/ui/Modal'

const CONDITIONS = [
  { label: 'Excellent', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { label: 'Good',      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { label: 'Fair',      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { label: 'Poor',      color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
]

const PTA_OPTIONS = [
  {
    value: 'PTA Approved',
    label: 'PTA Approved',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    desc: 'Official PTA tax paid, all SIMs active',
    icon: ShieldCheck,
  },
  {
    value: 'FU',
    label: 'FU (Factory Unlock)',
    badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
    desc: 'Carrier unlocked worldwide',
    icon: Radio,
  },
  {
    value: 'JV',
    label: 'JV (Carrier Lock)',
    badge: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
    desc: 'Carrier locked / Gevey chip only',
    icon: Lock,
  },
]

const POPULAR_STORAGES = ['64GB', '128GB', '256GB', '512GB', '1TB']
const POPULAR_BRANDS = ['Apple', 'Samsung', 'Google', 'Xiaomi', 'OnePlus']

export default function Inventory() {
  const navigate = useNavigate()
  const { inventory, updateInventoryStock, deleteInventoryItem, addInventoryItem, addToCart } = useStore()

  // Search & Filters
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'instock' | 'sold'
  const [brandFilter, setBrandFilter] = useState('all')
  const [ptaFilter, setPtaFilter] = useState('all') // 'all' | 'PTA Approved' | 'FU' | 'JV'
  const [copiedImei, setCopiedImei] = useState(null)

  // Modals
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingInvoice, setEditingInvoice] = useState('')
  const [detailPhone, setDetailPhone] = useState(null)

  // Pretty alert popup
  const [msg, setMsg] = useState({ open: false, title: '', text: '', action: null })
  const showMsg = (title, text, action = null) => setMsg({ open: true, title, text, action })

  const [printOpen, setPrintOpen] = useState(false)
  const [printHtml, setPrintHtml] = useState('')
  const [frameRef, setFrameRef] = useState(null)

  const emptyForm = () => ({
    model: '',
    company: '',
    color: '',
    imei: '',
    storage: '128GB',
    ram: '',
    condition: 'Good',
    ptaStatus: 'PTA Approved',
    purchasePrice: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    vendor: '',
    vendorPhone: '',
    notes: '',
  })
  const [form, setForm] = useState(emptyForm())

  // Key stats
  const stats = useMemo(() => {
    const totalValue = inventory.reduce((a, b) => a + (Number(b.purchasePrice || 0) * Number(b.totalItems || 0)), 0)
    const inStock = inventory.filter((i) => Number(i.totalItems || 0) > 0).length
    const sold = inventory.filter((i) => Number(i.totalItems || 0) === 0).length
    return { totalValue, inStock, sold, total: inventory.length }
  }, [inventory])

  // Unique brands for filter chips
  const availableBrands = useMemo(() => {
    const brands = new Set(inventory.map((i) => i.category || 'Other').filter(Boolean))
    return Array.from(brands)
  }, [inventory])

  // Filtered phone list
  const filtered = useMemo(() => {
    let rows = inventory

    // Status filter
    if (statusFilter === 'instock') rows = rows.filter((r) => Number(r.totalItems || 0) > 0)
    if (statusFilter === 'sold') rows = rows.filter((r) => Number(r.totalItems || 0) === 0)

    // Brand filter
    if (brandFilter !== 'all') {
      rows = rows.filter((r) => (r.category || '').toLowerCase() === brandFilter.toLowerCase())
    }

    // PTA filter
    if (ptaFilter !== 'all') {
      rows = rows.filter((r) => (r.ptaStatus || 'PTA Approved').toLowerCase() === ptaFilter.toLowerCase())
    }

    // Search query
    const query = q.trim().toLowerCase()
    if (query) {
      rows = rows.filter((r) =>
        [r.invoice, r.name, r.category, r.supplier, r.imei, r.ptaStatus, ...(r.imeis || [])]
          .join(' ')
          .toLowerCase()
          .includes(query)
      )
    }

    // Newest items first
    return [...rows].reverse()
  }, [inventory, q, statusFilter, brandFilter, ptaFilter])

  const copyToClipboard = (imei) => {
    if (!imei) return
    navigator.clipboard?.writeText(imei)
    setCopiedImei(imei)
    setTimeout(() => setCopiedImei(null), 1800)
  }

  const onEdit = (row) => {
    setForm({
      model: row.name || '',
      company: row.category || '',
      color: row.color || '',
      imei: row.imei || (Array.isArray(row.imeis) ? row.imeis[0] : '') || '',
      storage: row.storage || '128GB',
      ram: row.ram || '',
      condition: row.condition || 'Good',
      ptaStatus: row.ptaStatus || 'PTA Approved',
      purchasePrice: String(row.purchasePrice || ''),
      purchaseDate: row.purchaseDate || new Date().toISOString().slice(0, 10),
      vendor: row.supplier || row.receivedFrom || '',
      vendorPhone: row.sellerPhone || '',
      notes: row.notes || '',
    })
    setEditingId(row.id)
    setEditingInvoice(row.invoice || '')
    setOpen(true)
  }

  const onSell = (row) => {
    addToCart(row.id)
    navigate('/pos')
  }

  const onPrint = () => {
    const rows = filtered
    const thead = `
      <thead>
        <tr>
          <th>Invoice #</th>
          <th>Model</th>
          <th>Brand</th>
          <th>Storage</th>
          <th>Color</th>
          <th>IMEI</th>
          <th>PTA</th>
          <th>Condition</th>
          <th>Buy Price</th>
          <th>Source</th>
          <th>Status</th>
        </tr>
      </thead>
    `
    const tbody = rows
      .map(
        (r) => `
      <tr>
        <td>${r.invoice || ''}</td>
        <td>${r.name || ''}</td>
        <td>${r.category || ''}</td>
        <td>${r.storage || ''}</td>
        <td>${r.color || ''}</td>
        <td style="font-family:monospace">${r.imei || (Array.isArray(r.imeis) ? r.imeis[0] : '') || ''}</td>
        <td>${r.ptaStatus || 'PTA Approved'}</td>
        <td>${r.condition || 'Good'}</td>
        <td style="text-align:right">${Number(r.purchasePrice || 0).toLocaleString()}</td>
        <td>${r.supplier || r.receivedFrom || ''}</td>
        <td style="text-align:center">${Number(r.totalItems || 0) > 0 ? 'In Stock' : 'Sold'}</td>
      </tr>
    `
      )
      .join('')

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Phone Vault Inventory</title>
      <style>
        @page { size: A4 landscape; margin: 10mm }
        * { box-sizing: border-box }
        body { margin: 0; padding: 0; background: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; font-size: 11px; }
        .wrap { padding: 10mm }
        h2 { margin: 0 0 8px; font-size: 18px; }
        .sub { color: #374151; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        thead th { background: #f3f4f6; font-weight: 700; text-align: left; border: 1px solid #e5e7eb; padding: 6px 8px; }
        tbody td { border: 1px solid #e5e7eb; padding: 6px 8px; vertical-align: top; word-break: break-word; }
        tbody tr:nth-child(even) td { background: #fafafa; }
        @media print { thead { display: table-header-group; } }
      </style>
      </head><body>
        <div class="wrap">
          <h2>Phone Inventory Report</h2>
          <div class="sub">${rows.length} second-hand phone(s) listed</div>
          <table>${thead}<tbody>${tbody}</tbody></table>
        </div>
      </body></html>`
    setPrintHtml(html)
    setPrintOpen(true)
  }

  const getConditionStyle = (cond) => {
    const c = CONDITIONS.find((x) => x.label === cond)
    return c ? c.color : 'bg-gray-500/10 text-gray-600 border-gray-500/20'
  }

  const getPtaStyle = (pta) => {
    const p = PTA_OPTIONS.find((x) => x.value === pta)
    return p ? p.badge : 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20'
  }

  return (
    <div className="space-y-3 pb-20">
      {/* ── Header Row ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-1.5">
            <Smartphone className="text-blue-500" size={22} />
            Phone Vault
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {stats.inStock} in stock • {stats.sold} sold
          </p>
        </div>

        <button
          onClick={() => {
            setEditingId(null)
            setEditingInvoice('')
            setForm(emptyForm())
            setOpen(true)
          }}
          className="btn-primary !px-3.5 !py-2 !min-h-[40px] text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} />
          Add Phone
        </button>
      </div>

      {/* ── Mobile Stat Cards (2x2 Grid) ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/80 shadow-xs">
          <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Available Stock
          </div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {stats.inStock} <span className="text-xs font-normal text-gray-500">units</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/80 shadow-xs">
          <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide truncate">
            Stock Value
          </div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5 truncate">
            PKR {(stats.totalValue).toLocaleString()}
          </div>
        </div>
      </div>

      {/* ── Mobile Search Input ────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
        <input
          type="text"
          className="input !pl-10 !pr-10 !h-11 !min-h-[44px] !text-sm !rounded-xl"
          placeholder="Search model, IMEI, PTA, seller..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button
            onClick={() => setQ('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Status & PTA Filter Pills ──────────────────────────────────── */}
      <div className="space-y-1.5">
        {/* Status & PTA chips */}
        <div className="flex flex-wrap items-center gap-1.5 py-0.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter('instock')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'instock'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700'
            }`}
          >
            In Stock ({stats.inStock})
          </button>
          <button
            onClick={() => setStatusFilter('sold')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'sold'
                ? 'bg-gray-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700'
            }`}
          >
            Sold ({stats.sold})
          </button>

          {/* PTA Status Filters */}
          <button
            onClick={() => setPtaFilter(ptaFilter === 'PTA Approved' ? 'all' : 'PTA Approved')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              ptaFilter === 'PTA Approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
            }`}
          >
            PTA Approved
          </button>
          <button
            onClick={() => setPtaFilter(ptaFilter === 'FU' ? 'all' : 'FU')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              ptaFilter === 'FU'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-500/30'
            }`}
          >
            FU (Factory Unlock)
          </button>
          <button
            onClick={() => setPtaFilter(ptaFilter === 'JV' ? 'all' : 'JV')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              ptaFilter === 'JV'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 border border-purple-500/30'
            }`}
          >
            JV
          </button>

          {availableBrands.map((b) => (
            <button
              key={b}
              onClick={() => setBrandFilter(brandFilter === b ? 'all' : b)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                brandFilter === b
                  ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/40'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700'
              }`}
            >
              {b}
            </button>
          ))}

          <button
            onClick={onPrint}
            className="ml-auto px-2.5 py-1.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700 whitespace-nowrap flex items-center gap-1 shrink-0"
          >
            <Printer size={13} /> Print
          </button>
        </div>
      </div>

      {/* ── Second-Hand Phone Cards List ──────────────────────────────── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-14 text-center bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/80 px-4">
            <Smartphone className="mx-auto text-gray-300 dark:text-slate-600 mb-2" size={36} />
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">No phones match</div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {q || ptaFilter !== 'all' || brandFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Tap "+ Add Phone" to record a phone.'}
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isAvailable = Number(item.totalItems || 0) > 0
            const imei = item.imei || (Array.isArray(item.imeis) ? item.imeis[0] : '') || ''
            const isCopied = copiedImei === imei
            const ptaStatus = item.ptaStatus || 'PTA Approved'

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/80 shadow-xs overflow-hidden transition-all"
              >
                {/* Card Top: Title, Badges, Clickable for Details */}
                <div
                  className="p-3.5 space-y-2 cursor-pointer active:bg-gray-50/50 dark:active:bg-slate-700/20 transition-colors"
                  onClick={() => setDetailPhone(item)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-base font-bold text-gray-900 dark:text-white truncate">
                        {item.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{item.category}</span>
                        {item.storage && <span>• {item.storage}</span>}
                        {item.color && <span>• {item.color}</span>}
                      </div>
                    </div>

                    {/* Status & PTA Badges */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1">
                        {/* PTA Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPtaStyle(
                            ptaStatus
                          )}`}
                        >
                          {ptaStatus}
                        </span>
                        {/* Condition Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getConditionStyle(
                            item.condition || 'Good'
                          )}`}
                        >
                          {item.condition || 'Good'}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-semibold flex items-center gap-1 ${
                          isAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {isAvailable ? 'In Stock' : 'Sold'}
                      </span>
                    </div>
                  </div>

                  {/* IMEI Bar with 1-Tap Copy */}
                  <div
                    className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl px-2.5 py-1.5 border border-slate-100 dark:border-slate-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        IMEI
                      </span>
                      <span className="font-mono text-xs font-medium text-gray-800 dark:text-slate-200 truncate">
                        {imei || 'Not recorded'}
                      </span>
                    </div>

                    {imei && (
                      <button
                        onClick={() => copyToClipboard(imei)}
                        className="p-1 -mr-1 rounded-md text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 active:scale-90 transition-all shrink-0 flex items-center gap-1 text-[10px]"
                        title="Copy IMEI"
                      >
                        {isCopied ? (
                          <>
                            <Check size={13} className="text-emerald-500" />
                            <span className="text-emerald-500 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Price & Seller */}
                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <div className="text-[10px] font-semibold text-gray-400 uppercase">Buy Price</div>
                      <div className="text-base font-bold text-gray-900 dark:text-white">
                        PKR {Number(item.purchasePrice || 0).toLocaleString()}
                      </div>
                    </div>

                    {(item.supplier || item.receivedFrom) && (
                      <div className="text-right max-w-[55%]">
                        <div className="text-[10px] font-semibold text-gray-400 uppercase truncate">Source</div>
                        <div className="text-xs text-gray-700 dark:text-gray-300 font-medium truncate">
                          {item.supplier || item.receivedFrom}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons (Bottom Bar) */}
                <div className="flex items-center border-t border-gray-100 dark:border-slate-700/80 divide-x divide-gray-100 dark:divide-slate-700/80 bg-gray-50/50 dark:bg-slate-900/40">
                  <button
                    onClick={() => setDetailPhone(item)}
                    className="flex-1 py-2.5 px-2 flex items-center justify-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-slate-800 transition-colors"
                  >
                    <Info size={13} className="text-blue-500" />
                    Details
                  </button>

                  <button
                    onClick={() => onEdit(item)}
                    className="flex-1 py-2.5 px-2 flex items-center justify-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-slate-800 transition-colors"
                  >
                    <Edit2 size={13} />
                    Edit
                  </button>

                  {isAvailable && (
                    <button
                      onClick={() => onSell(item)}
                      className="flex-1 py-2.5 px-2 flex items-center justify-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 active:bg-blue-50 dark:active:bg-slate-800 transition-colors"
                    >
                      <ShoppingCart size={13} />
                      Sell
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setToDelete(item)
                      setConfirmOpen(true)
                    }}
                    className="p-2.5 px-3 flex items-center justify-center text-xs font-semibold text-rose-500 active:bg-rose-50 dark:active:bg-slate-800 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── More Detail Modal ─────────────────────────────────────────── */}
      <Modal
        open={!!detailPhone}
        onClose={() => setDetailPhone(null)}
        title="Phone Details"
        footer={
          <div className="w-full flex flex-col gap-2">
            {detailPhone && Number(detailPhone.totalItems || 0) > 0 && (
              <button
                className="btn-primary w-full !py-3 text-sm font-bold flex items-center justify-center gap-2"
                onClick={() => {
                  onSell(detailPhone)
                  setDetailPhone(null)
                }}
              >
                <ShoppingCart size={16} />
                Sell in POS (PKR {Number(detailPhone.purchasePrice || 0).toLocaleString()})
              </button>
            )}
            <div className="flex gap-2">
              <button
                className="btn-secondary flex-1 !py-2.5 text-xs font-semibold"
                onClick={() => {
                  const phone = detailPhone
                  setDetailPhone(null)
                  onEdit(phone)
                }}
              >
                <Edit2 size={13} /> Edit Phone
              </button>
              <button
                className="btn-secondary flex-1 !py-2.5 text-xs text-gray-500"
                onClick={() => setDetailPhone(null)}
              >
                Close
              </button>
            </div>
          </div>
        }
      >
        {detailPhone && (
          <div className="space-y-4">
            {/* Top overview card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {detailPhone.name}
                  </h2>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {detailPhone.category} • {detailPhone.storage} • {detailPhone.color || 'Standard Color'}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getPtaStyle(
                      detailPhone.ptaStatus || 'PTA Approved'
                    )}`}
                  >
                    {detailPhone.ptaStatus || 'PTA Approved'}
                  </span>
                  <span
                    className={`text-xs font-semibold flex items-center gap-1 ${
                      Number(detailPhone.totalItems || 0) > 0 ? 'text-emerald-600' : 'text-gray-400'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        Number(detailPhone.totalItems || 0) > 0 ? 'bg-emerald-500' : 'bg-gray-400'
                      }`}
                    />
                    {Number(detailPhone.totalItems || 0) > 0 ? 'In Stock' : 'Sold Out'}
                  </span>
                </div>
              </div>

              {/* PTA description banner */}
              <div className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2">
                <ShieldCheck size={16} className="text-blue-500 shrink-0" />
                <span>
                  {PTA_OPTIONS.find((p) => p.value === (detailPhone.ptaStatus || 'PTA Approved'))?.desc ||
                    'Standard verification'}
                </span>
              </div>
            </div>

            {/* IMEI section */}
            <div>
              <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                IMEI Number
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
                <span className="font-mono text-sm font-bold tracking-wider text-gray-900 dark:text-white">
                  {detailPhone.imei || (Array.isArray(detailPhone.imeis) ? detailPhone.imeis[0] : 'Not recorded')}
                </span>
                {detailPhone.imei && (
                  <button
                    onClick={() => copyToClipboard(detailPhone.imei)}
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 active:scale-95"
                  >
                    {copiedImei === detailPhone.imei ? (
                      <>
                        <Check size={13} className="text-emerald-500" />
                        <span className="text-emerald-500">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Specs 2x2 grid */}
            <div>
              <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
                Device Details
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                  <span className="text-gray-400 block mb-0.5">Condition</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md font-semibold border ${getConditionStyle(
                      detailPhone.condition || 'Good'
                    )}`}
                  >
                    {detailPhone.condition || 'Good'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                  <span className="text-gray-400 block mb-0.5">Storage & RAM</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {detailPhone.storage || '—'} {detailPhone.ram ? `(${detailPhone.ram})` : ''}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                  <span className="text-gray-400 block mb-0.5">Purchase Price</span>
                  <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    PKR {Number(detailPhone.purchasePrice || 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                  <span className="text-gray-400 block mb-0.5">Purchase Date</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {detailPhone.purchaseDate || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Source / Seller Details */}
            <div>
              <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
                Seller / Source Information
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Seller Name:</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                    {detailPhone.supplier || detailPhone.receivedFrom || 'Direct walk-in'}
                  </span>
                </div>

                {detailPhone.sellerPhone && (
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-slate-700/60">
                    <span className="text-xs text-gray-500">Phone Number:</span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${detailPhone.sellerPhone}`}
                        className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 active:scale-95"
                      >
                        <Phone size={12} /> Call
                      </a>
                      <a
                        href={`https://wa.me/${detailPhone.sellerPhone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 rounded-lg bg-green-500/10 text-green-600 border border-green-500/30 text-xs font-bold flex items-center gap-1 active:scale-95"
                      >
                        <MessageCircle size={12} /> WhatsApp
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes / Damage details */}
            {detailPhone.notes && (
              <div>
                <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                  Notes & Inspection
                </div>
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs text-gray-700 dark:text-gray-300">
                  {detailPhone.notes}
                </div>
              </div>
            )}

            {/* Invoice Tag */}
            <div className="text-[11px] text-gray-400 text-center">
              Invoice Reference: <span className="font-mono">{detailPhone.invoice || 'MS-Direct'}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Add / Edit Phone Modal (Bottom Sheet on Mobile) ────────────── */}
      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          setEditingId(null)
          setEditingInvoice('')
        }}
        title={editingId ? 'Edit Phone Details' : 'Add Second-Hand Phone'}
        footer={
          <div className="w-full flex flex-col gap-2">
            <button
              className="btn-primary w-full !py-3 text-sm font-bold shadow-md active:scale-95"
              onClick={() => {
                if (!form.model.trim() || !form.company.trim()) {
                  showMsg('Missing Fields', 'Please enter both the Phone Model and Brand.')
                  return
                }
                const imei = String(form.imei || '').trim()
                if (!imei) {
                  showMsg('IMEI Required', 'Each second-hand phone must have a unique IMEI number.')
                  return
                }
                // Duplicate check
                const duplicate = inventory.find((inv) => {
                  if (editingId && inv.id === editingId) return false
                  return inv.imei === imei || (Array.isArray(inv.imeis) && inv.imeis.includes(imei))
                })
                if (duplicate) {
                  showMsg('Duplicate IMEI', `IMEI ${imei} is already registered under "${duplicate.name}".`)
                  return
                }

                const changes = {
                  name: form.model.trim(),
                  category: form.company.trim(),
                  color: form.color.trim(),
                  imei,
                  imeis: [imei],
                  storage: form.storage.trim(),
                  ram: form.ram.trim(),
                  condition: form.condition || 'Good',
                  ptaStatus: form.ptaStatus || 'PTA Approved',
                  purchasePrice: Number(form.purchasePrice || 0),
                  purchaseDate: form.purchaseDate,
                  totalItems: 1,
                  minStock: 1,
                  packs: 1,
                  unitsPerPack: 1,
                  supplier: form.vendor.trim(),
                  sellerPhone: form.vendorPhone.trim(),
                  notes: form.notes.trim(),
                  type: 'secondhand',
                }

                if (editingId) {
                  updateInventoryStock(editingId, changes)
                } else {
                  addInventoryItem({ invoice: `MS-${Date.now()}`, ...changes })
                }
                setOpen(false)
                setForm(emptyForm())
              }}
            >
              {editingId ? 'Update Phone' : 'Save to Vault'}
            </button>
            <button
              className="btn-secondary w-full !py-2.5 text-xs text-gray-500"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        }
      >
        <div className="space-y-3.5 w-full max-w-full overflow-x-hidden">
          {/* PTA Status Selector */}
          <div>
            <label className="label flex items-center justify-between">
              <span>PTA Status *</span>
              <span className="text-[10px] text-gray-400 font-normal">Carrier & Tax status</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {PTA_OPTIONS.map((p) => {
                const isSelected = form.ptaStatus === p.value
                const Icon = p.icon
                return (
                  <button
                    type="button"
                    key={p.value}
                    onClick={() => setForm((f) => ({ ...f, ptaStatus: p.value }))}
                    className={`py-2 px-1 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 min-w-0 w-full overflow-hidden ${
                      isSelected
                        ? `${p.badge} ring-2 ring-blue-500/30 font-bold shadow-xs`
                        : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="text-xs font-bold truncate max-w-full">{p.value}</span>
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 truncate max-w-full leading-none">
                      {p.value === 'PTA Approved' ? 'Approved' : p.value === 'FU' ? 'Unlocked' : 'Locked'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Brand Quick Selector */}
          <div>
            <label className="label">Brand *</label>
            <div className="flex flex-wrap items-center gap-1 pb-1">
              {POPULAR_BRANDS.map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => setForm((f) => ({ ...f, company: b }))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border shrink-0 transition-colors ${
                    form.company === b
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
            <input
              className="input mt-1 max-w-full min-w-0"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              placeholder="e.g. Apple, Samsung, Google"
            />
          </div>

          {/* Model Name */}
          <div>
            <label className="label">Model Name *</label>
            <input
              className="input max-w-full min-w-0"
              value={form.model}
              onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
              placeholder="e.g. iPhone 14 Pro, S23 Ultra"
            />
          </div>

          {/* IMEI Input */}
          <div>
            <label className="label flex items-center justify-between">
              <span>IMEI Number *</span>
              <span className="text-[10px] text-gray-400 font-normal">15-digit unique ID</span>
            </label>
            <input
              className="input font-mono tracking-wider font-semibold max-w-full min-w-0"
              value={form.imei}
              onChange={(e) => setForm((f) => ({ ...f, imei: e.target.value }))}
              placeholder="358492019482019"
              inputMode="numeric"
              maxLength={20}
            />
          </div>

          {/* Storage Quick Selector */}
          <div>
            <label className="label">Storage</label>
            <div className="grid grid-cols-5 gap-1 mb-1">
              {POPULAR_STORAGES.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setForm((f) => ({ ...f, storage: s }))}
                  className={`py-1.5 px-0.5 rounded-lg text-[11px] font-bold border transition-all text-center min-w-0 w-full truncate ${
                    form.storage === s
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Condition Selector */}
          <div>
            <label className="label">Condition *</label>
            <div className="grid grid-cols-2 gap-1.5">
              {CONDITIONS.map((c) => (
                <button
                  type="button"
                  key={c.label}
                  onClick={() => setForm((f) => ({ ...f, condition: c.label }))}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border text-center transition-all flex items-center justify-center gap-1.5 min-w-0 w-full ${
                    form.condition === c.label
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                      : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${c.color.split(' ')[1]}`} />
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color & Buy Price */}
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0">
              <label className="label truncate">Color</label>
              <input
                className="input max-w-full min-w-0"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                placeholder="e.g. Black"
              />
            </div>
            <div className="min-w-0">
              <label className="label truncate">Buy Price (PKR) *</label>
              <input
                type="number"
                className="input font-semibold max-w-full min-w-0"
                value={form.purchasePrice}
                onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                placeholder="0"
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Source / Seller Details */}
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0">
              <label className="label truncate">Seller Name</label>
              <input
                className="input max-w-full min-w-0"
                value={form.vendor}
                onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                placeholder="Seller/Shop"
              />
            </div>
            <div className="min-w-0">
              <label className="label truncate">Seller Phone</label>
              <input
                className="input max-w-full min-w-0"
                value={form.vendorPhone}
                onChange={(e) => setForm((f) => ({ ...f, vendorPhone: e.target.value }))}
                placeholder="03xx-xxxxxxx"
                inputMode="tel"
              />
            </div>
          </div>

          {/* Purchase Date & Notes */}
          <div>
            <label className="label">Purchase Date</label>
            <input
              type="date"
              className="input max-w-full min-w-0"
              value={form.purchaseDate}
              onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Notes / Damage details</label>
            <textarea
              rows={2}
              className="input max-w-full min-w-0 !h-auto !py-2.5 resize-none text-xs"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Minor scratches, battery health 88%, with original box..."
            />
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirmation Modal ─────────────────────────────────── */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete Phone"
        footer={
          <div className="w-full flex flex-col gap-2">
            <button
              className="btn-primary w-full bg-rose-600 hover:bg-rose-700 !py-3 text-sm font-bold"
              onClick={() => {
                if (toDelete) deleteInventoryItem(toDelete.id)
                setConfirmOpen(false)
                setToDelete(null)
              }}
            >
              Confirm Delete
            </button>
            <button className="btn-secondary w-full" onClick={() => setConfirmOpen(false)}>
              Cancel
            </button>
          </div>
        }
      >
        <div className="text-sm text-gray-700 dark:text-gray-300 py-1">
          Are you sure you want to delete <span className="font-semibold">{toDelete?.name}</span> (IMEI:{' '}
          {toDelete?.imei || '—'})? This action cannot be undone.
        </div>
      </Modal>

      {/* ── Print Preview Modal ───────────────────────────────────────── */}
      <Modal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        title="Print Inventory"
        footer={
          <div className="w-full flex gap-2">
            <button
              className="btn-primary flex-1"
              onClick={() => {
                try {
                  frameRef?.contentWindow?.focus()
                  frameRef?.contentWindow?.print()
                } catch (e) {}
              }}
            >
              Print
            </button>
            <button className="btn-secondary flex-1" onClick={() => setPrintOpen(false)}>
              Close
            </button>
          </div>
        }
      >
        <div className="h-[60vh]">
          <iframe
            ref={setFrameRef}
            title="Print"
            className="w-full h-full border rounded-xl"
            srcDoc={printHtml}
          />
        </div>
      </Modal>

      {/* ── Alert / Error Popup Modal ─────────────────────────────────── */}
      <Modal
        open={msg.open}
        onClose={() => setMsg((m) => ({ ...m, open: false }))}
        title={msg.title}
        footer={
          <button
            className="btn-primary w-full !py-3"
            onClick={() => {
              setMsg((m) => ({ ...m, open: false }))
              msg.action?.()
            }}
          >
            OK
          </button>
        }
      >
        <div className="text-sm text-gray-700 dark:text-gray-300 py-1">{msg.text}</div>
      </Modal>
    </div>
  )
}
