import { useMemo, useState } from 'react'
import { RefreshCw, Upload, Download, Filter as FilterIcon, Printer, Plus, PackageOpen, CalendarDays, Wrench, MoreHorizontal, ChevronDown } from 'lucide-react'
import DateInput from '../components/DateInput'
import useStore from '../store/useStore'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'
import InventoryActions from '../components/inventory/InventoryActions'
import IMEIInputList from '../components/IMEIInputList'

  const tabs = [
  { key: 'all', label: 'All' },
  { key: 'low', label: 'Low Stock' },
  { key: 'oos', label: 'Out of Stock' },
]

export default function Inventory() {
  const { inventory, suppliers, updateInventoryStock, deleteInventoryItem, addInventoryItem, colors = [], addColor } = useStore()
  const [q, setQ] = useState('')
  const [active, setActive] = useState('all')
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingInvoice, setEditingInvoice] = useState('')
  const [formType, setFormType] = useState('normal') // normal | repack | secondhand
  const [typeFilter, setTypeFilter] = useState('all') // all | repack | secondhand
  const [showAdvanced, setShowAdvanced] = useState(false)
  // Pretty popup state
  const [msg, setMsg] = useState({ open:false, title:'', text:'', action:null })
  const showMsg = (title, text, action=null) => setMsg({ open:true, title, text, action })
  // Add Color modal state
  const [addColorOpen, setAddColorOpen] = useState(false)
  const [newColor, setNewColor] = useState('')
  const [printOpen, setPrintOpen] = useState(false)
  const [printHtml, setPrintHtml] = useState('')
  const [frameRef, setFrameRef] = useState(null)
  const [form, setForm] = useState({
    model: '',
    company: '',
    color: '',
    imeis: [''],
    barcode: '',
    purchasePrice: '',
    purchaseDate: '',
    vendor: '',
    vendorPhone: '',
    vendorCnic: '',
    packs: 1,
    unitsPerPack: 1,
    stock: 1,
    minStock: 1,
    notes: '',
  })

  const stats = useMemo(() => {
    const totalValue = inventory.reduce((a, b) => (b.purchasePrice || 0) * (b.totalItems || 0), 0)
    const low = inventory.filter(i => i.totalItems <= i.minStock).length
    const oos = inventory.filter(i => (i.totalItems || 0) === 0).length
    return { totalValue, low, oos }
  }, [inventory])

  const filtered = useMemo(() => {
    let rows = inventory
    if (active === 'low') rows = rows.filter(i => i.totalItems <= i.minStock)
    if (active === 'oos') rows = rows.filter(i => (i.totalItems || 0) === 0)
    // type filter
    if (typeFilter === 'repack') rows = rows.filter(i => i.type === 'repack')
    if (typeFilter === 'secondhand') rows = rows.filter(i => i.type === 'secondhand')

    const query = q.trim().toLowerCase()
    if (query) rows = rows.filter(r => [r.invoice, r.name, r.category, r.supplier].join(' ').toLowerCase().includes(query))
    return rows
  }, [inventory, active, q, typeFilter])

  const totalQty = useMemo(() => Number((form.packs||1)) * Number((form.unitsPerPack||1)), [form.packs, form.unitsPerPack])
  const imeiValidity = useMemo(() => {
    const list = (form.imeis || []).slice(0, totalQty).map(s=>String(s||'').trim())
    const anyEmpty = list.some(s=>!s)
    const hasDuplicate = new Set(list.filter(Boolean)).size !== list.filter(Boolean).length
    return { anyEmpty, hasDuplicate }
  }, [form.imeis, totalQty])

  const columns = [
    { key: 'invoice', title: 'Invoice #' },
    { key: 'name', title: 'Mobile', render: (v) => <span className="font-medium">{v}</span> },
    { key: 'category', title: 'Brand' },
    { key: 'packs', title: 'Packs' },
    { key: 'unitsPerPack', title: 'Phones/Pack' },
    { key: 'purchasePrice', title: 'Purchase Price', render: v => Number(v).toLocaleString() },
    { key: 'totalItems', title: 'Total Stock' },
    { key: 'minStock', title: 'Min Stock' },
    { key: 'supplier', title: 'Supplier' },
    { key: 'type', title: 'Type', render: (v) => (
      <span className={`px-2 py-0.5 rounded-full text-xs border ${v==='secondhand' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : v==='repack' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>{v || 'normal'}</span>
    ) },
    { key: 'status', title: 'Status', render: v => <span className="px-2 py-0.5 rounded-full text-xs border bg-green-50 border-green-200 text-green-700">{v}</span> },
  ]

  const onPrint = () => {
    const rows = filtered
    const thead = `
      <thead>
        <tr>
          <th>Invoice #</th>
          <th>Mobile</th>
          <th>Brand</th>
          <th>Packs</th>
          <th>Phones/Pack</th>
          <th>Purchase Price</th>
          <th>Total Stock</th>
          <th>Min Stock</th>
          <th>Supplier</th>
          <th>Type</th>
          <th>Status</th>
        </tr>
      </thead>
    `
    const tbody = rows.map(r => `
      <tr>
        <td>${r.invoice || ''}</td>
        <td>${r.name || ''}</td>
        <td>${r.category || ''}</td>
        <td style="text-align:right">${Number(r.packs||0)}</td>
        <td style="text-align:right">${Number(r.unitsPerPack||0)}</td>
        <td style="text-align:right">${Number(r.purchasePrice||0).toLocaleString()}</td>
        <td style="text-align:right">${Number(r.totalItems||0)}</td>
        <td style="text-align:right">${Number(r.minStock||0)}</td>
        <td>${r.supplier || r.receivedFrom || ''}</td>
        <td>${r.type || 'normal'}</td>
        <td>${r.status || ''}</td>
      </tr>
    `).join('')
    const html = `<!doctype html><html><head><meta charset=\"utf-8\"><title>Inventory</title>
      <style>
        @page { size: A4 landscape; margin: 10mm }
        * { box-sizing: border-box }
        body { margin: 0; padding: 0; background: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif; color: #111827; font-size: 11px; }
        .wrap { padding: 10mm }
        h2 { margin: 0 0 8px; font-size: 18px; }
        .range { color: #374151; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        thead th { background: #f3f4f6; font-weight: 700; text-align: left; border: 1px solid #e5e7eb; padding: 6px 8px; }
        tbody td { border: 1px solid #e5e7eb; padding: 6px 8px; vertical-align: top; word-break: break-word; }
        tbody tr:nth-child(even) td { background: #fafafa; }
        @media print { thead { display: table-header-group; } }
      </style>
      </head><body>
        <div class=\"wrap\">
          <h2>Inventory</h2>
          <div class=\"range\">View: ${active} • Type: ${typeFilter} • ${rows.length} record(s)</div>
          <table>
            ${thead}
            <tbody>
              ${tbody}
            </tbody>
          </table>
        </div>
      </body></html>`
    setPrintHtml(html)
    setPrintOpen(true)
  }

  const onEdit = (row) => {
    // Prefill form with row data and open modal
    const packs = Number(row.packs || 1)
    const unitsPerPack = Number(row.unitsPerPack || 1)
    const total = packs * unitsPerPack
    setForm({
      model: row.name || '',
      company: row.category || '',
      color: row.color || '',
      imeis: (row.imeis && row.imeis.length) ? row.imeis.slice(0, total) : Array.from({length: total}, (_,i)=>''),
      barcode: row.barcode || '',
      purchasePrice: String(row.purchasePrice || ''),
      purchaseDate: row.purchaseDate || '',
      vendor: row.supplier || row.receivedFrom || '',
      vendorPhone: row.sellerPhone || '',
      vendorCnic: row.sellerCnic || '',
      packs: packs || 1,
      unitsPerPack: unitsPerPack || 1,
      stock: total || 1,
      minStock: Number(row.minStock || 1),
      notes: row.notes || '',
    })
    setEditingId(row.id)
    setEditingInvoice(row.invoice || '')
    setFormType(row.type || 'normal')
    setOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="font-semibold">Inventory</h1>
        <InventoryActions
          onAdd={() => {
            setEditingId(null); setEditingInvoice('');
            setForm({ model:'', company:'', color:'', imeis:[''], barcode:'', purchasePrice:'', purchaseDate:'', vendor:'', vendorPhone:'', vendorCnic:'', packs:1, unitsPerPack:1, stock:1, minStock:1, notes:'' });
            setFormType('normal'); setOpen(true)
          }}
          onRepack={() => {
            setEditingId(null); setEditingInvoice('');
            setForm({ model:'', company:'', color:'', imeis:[''], barcode:'', purchasePrice:'', purchaseDate:'', vendor:'', vendorPhone:'', vendorCnic:'', packs:1, unitsPerPack:1, stock:1, minStock:1, notes:'' });
            setFormType('repack'); setOpen(true)
          }}
          onSecondHand={() => {
            setEditingId(null); setEditingInvoice('');
            setForm({ model:'', company:'', color:'', imeis:[''], barcode:'', purchasePrice:'', purchaseDate:'', vendor:'', vendorPhone:'', vendorCnic:'', packs:1, unitsPerPack:1, stock:1, minStock:1, notes:'' });
            setFormType('secondhand'); setOpen(true)
          }}
          onRefresh={() => { setQ(''); setActive('all') }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Main column: stats, search & tabs, table */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="col-span-2 sm:col-span-1">
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Stock Value</div>
              <div className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">PKR {stats.totalValue.toLocaleString()}</div>
            </Card>
            <Card>
              <div className="text-xs text-gray-500 dark:text-gray-400">Low Stock Mobiles</div>
              <div className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400">{stats.low}</div>
            </Card>
            <Card>
              <div className="text-xs text-gray-500 dark:text-gray-400">Out of Stock</div>
              <div className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">{stats.oos}</div>
            </Card>
          </div>

          <Card>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <div className="flex items-center gap-2 text-sm overflow-x-auto whitespace-nowrap no-scrollbar flex-nowrap w-full sm:w-auto">
                  {tabs.map(t => (
                    <button
                      key={t.key}
                      onClick={()=>{ setActive(t.key); if (t.key==='all') setTypeFilter('all') }}
                      className={`px-2 sm:px-3 py-1.5 rounded-md border text-xs sm:text-sm shrink-0 ${active===t.key ? 'bg-brand text-white border-brand' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                    >{t.label}</button>
                  ))}
                  <button 
                    className="btn-secondary shrink-0" 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    <MoreHorizontal size={14} /> More
                  </button>
                  
                  {showAdvanced && (
                    <div className="flex items-center gap-2 ml-2 border-l-2 border-gray-100 pl-2">
                      <button
                        onClick={()=>{ setTypeFilter('repack'); setActive('all') }}
                        className={`px-2 sm:px-3 py-1.5 rounded-md border text-xs sm:text-sm shrink-0 ${typeFilter==='repack' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                      >Repack</button>
                      <button
                        onClick={()=>{ setTypeFilter('secondhand'); setActive('all') }}
                        className={`px-2 sm:px-3 py-1.5 rounded-md border text-xs sm:text-sm shrink-0 ${typeFilter==='secondhand' ? 'bg-yellow-600 text-white border-yellow-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                      >Second-Hand</button>
                    </div>
                  )}
                </div>
              </div>
              <input className="input" placeholder="Search mobiles..." value={q} onChange={e=>setQ(e.target.value)} />
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">{filtered.length} items</div>
                <div className="flex items-center gap-2">
                  <button className="btn-primary text-sm" onClick={onPrint}><Printer size={14}/> Print</button>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <Table
              columns={columns}
              data={filtered}
              renderActions={(row) => (
                <div className="flex items-center gap-1 sm:gap-2">
                  <button className="btn-secondary text-xs sm:text-sm" onClick={() => onEdit(row)}>Edit</button>
                  <button className="btn-primary bg-red-600 hover:bg-red-700 text-xs sm:text-sm" onClick={() => { setToDelete(row); setConfirmOpen(true) }}>Delete</button>
                </div>
              )}
              empty="No inventory items"
            />
          </Card>
        </div>
      </div>
      {/* Add/Edit Inventory Modal */}
      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditingId(null); setEditingInvoice('') }}
        title={(editingId ? 'Edit' : (formType==='repack' ? 'Add Repack Mobile' : formType==='secondhand' ? 'Add Second Hand Mobile' : 'Add Mobile to Inventory'))}
        footer={(
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className={`btn-primary ${imeiValidity.hasDuplicate ? 'opacity-60 cursor-not-allowed' : ''}`} disabled={imeiValidity.hasDuplicate} onClick={() => {
              if (!form.model || !form.company) {
                showMsg('Missing Fields','Model and Company are required.');
                return
              }
              // validate IMEIs: require list
              let imeis = (form.imeis || []).map(s=>String(s||'').trim())
              if (!imeis.length || imeis.every(s=>s==='')) {
                showMsg('IMEIs Required','Please enter IMEI numbers.');
                return
              }
              // ensure count equals stock
              if (imeis.length !== totalQty) {
                showMsg('IMEI Count Mismatch',`Please provide ${totalQty} IMEI numbers (currently ${imeis.length}).`);
                return
              }
              if (new Set(imeis.filter(Boolean)).size !== imeis.length) {
                showMsg('Duplicate IMEI','IMEI numbers must be unique.');
                return
              }
              const changes = {
                name: form.model,
                category: form.company,
                packs: Number(form.packs||1),
                unitsPerPack: Number(form.unitsPerPack||1),
                purchasePrice: Number(form.purchasePrice || 0),
                totalItems: totalQty,
                minStock: Number(form.minStock || 1),
                supplier: form.vendor || 'Vendor',
                color: form.color,
                imeis,
                barcode: form.barcode,
                purchaseDate: form.purchaseDate,
                notes: form.notes,
                type: formType,
                ...(formType==='secondhand' ? { sellerPhone: form.vendorPhone, sellerCnic: form.vendorCnic, receivedFrom: form.vendor } : {}),
              }
              if (editingId) {
                updateInventoryStock(editingId, changes)
              } else {
                addInventoryItem({ invoice: `MS-${Date.now()}`, ...changes })
              }
              setOpen(false)
              setForm({ model:'', company:'', color:'', imeis:[''], barcode:'', purchasePrice:'', purchaseDate:'', vendor:'', vendorPhone:'', vendorCnic:'', packs:1, unitsPerPack:1, stock:1, minStock:1, notes:'' })
            }}>{editingId ? 'Update' : 'Save'}</button>
          </>
        )}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Mobile Name *</label>
            <input className="input" value={form.model} onChange={e=>setForm(f=>({...f, model:e.target.value}))} placeholder="e.g., iPhone 14" />
          </div>
          <div>
            <label className="label">Company/Brand *</label>
            <input className="input" value={form.company} onChange={e=>setForm(f=>({...f, company:e.target.value}))} placeholder="Apple" />
          </div>
          <div>
            <label className="label">Color</label>
            <select
              className="input"
              value={form.color}
              onChange={e=>setForm(f=>({...f, color: e.target.value}))}
            >
              <option value="">Select color</option>
              {(colors||[]).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Purchase Price *</label>
            <input type="number" className="input" value={form.purchasePrice} onChange={e=>setForm(f=>({...f, purchasePrice:e.target.value}))} placeholder="0" />
          </div>
          <div>
            <label className="label">Quantity *</label>
            <input type="number" className="input" value={form.stock} onChange={e=>setForm(f=>({...f, stock:e.target.value}))} placeholder="1" />
          </div>
          <div>
            <label className="label">Supplier (optional)</label>
            <input className="input" value={form.vendor} onChange={e=>setForm(f=>({...f, vendor:e.target.value}))} placeholder="Supplier name" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">IMEI Numbers (optional, comma-separated)</label>
            <input 
              className="input" 
              value={form.imeis?.join(', ') || ''} 
              onChange={e=>setForm(f=>({...f, imeis: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))} 
              placeholder="IMEI1, IMEI2, IMEI3..." 
            />
            <div className="text-xs text-gray-500 mt-1">Enter IMEIs separated by commas</div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete Item"
        footer={(
          <>
            <button className="btn-secondary" onClick={() => setConfirmOpen(false)}>Cancel</button>
            <button
              className="btn-primary bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (toDelete) deleteInventoryItem(toDelete.id)
                setConfirmOpen(false)
                setToDelete(null)
              }}
            >Delete</button>
          </>
        )}
      >
        <div className="text-sm text-gray-700">
          Are you sure you want to delete this item? This action cannot be undone.
        </div>
      </Modal>
      <Modal
        open={printOpen}
        onClose={()=>setPrintOpen(false)}
        title="Print Preview"
        footer={(
          <>
            <button className="btn-primary" onClick={()=>{ try { frameRef?.contentWindow?.focus(); frameRef?.contentWindow?.print(); } catch(e){} }}>Print</button>
            <button className="btn-secondary" onClick={()=>setPrintOpen(false)}>OK</button>
          </>
        )}
      >
        <div className="h-[70vh]">
          <iframe
            ref={setFrameRef}
            title="Print"
            className="w-full h-full border rounded"
            srcDoc={printHtml}
          />
        </div>
      </Modal>
    </div>
  )
}

function daysTo(dateStr){
  const d = new Date(dateStr)
  const diff = (d - new Date()) / (1000*60*60*24)
  return Math.ceil(diff)
}
