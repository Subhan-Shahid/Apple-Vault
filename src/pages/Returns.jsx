import { useMemo, useState } from 'react'
import useStore from '../store/useStore'
import DateInput from '../components/DateInput'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'

export default function Returns() {
  const { sales, inventory, returns, returnMobile } = useStore()
  const [query, setQuery] = useState('')
  const [reason, setReason] = useState('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [filterDate, setFilterDate] = useState('')
  const [printOpen, setPrintOpen] = useState(false)
  const [printHtml, setPrintHtml] = useState('')
  const [frameRef, setFrameRef] = useState(null)
  // Custom message popup (replaces browser alert)
  const [msg, setMsg] = useState({ open:false, title:'', text:'' })
  const [form, setForm] = useState({
    customerName: '',
    purchaseDate: '',
    returnDate: new Date().toISOString().slice(0,10),
    refundAmount: '',
    product: '',
    reason: '',
  })

  // Flatten sold line items from sales history
  const soldItems = useMemo(() => {
    const invIdx = Object.fromEntries((inventory||[]).map(i => [i.id, i]))
    const items = []
    ;(sales||[]).forEach(s => {
      if (!Array.isArray(s.items)) return
      s.items.forEach((it, idx) => {
        const inv = invIdx[it.id]
        // For each IMEI sold, create a separate return entry
        const soldImeis = Array.isArray(it?.imeis) ? it.imeis : []
        if (soldImeis.length > 0) {
          soldImeis.forEach((imei, imeiIdx) => {
            items.push({
              id: `${s.billNo || 'sale'}-${it.id}-${idx}-${imeiIdx}`,
              inventoryId: it.id,
              name: it.name || inv?.name || 'Mobile',
              model: inv?.model || inv?.name || it.name || '',
              price: Number(it.price||0),
              qty: 1,
              billNo: s.billNo,
              saleDate: s.date,
              customerName: s.customer?.name || 'Walk-in',
              imei: imei,
              imeis: [imei],
              barcode: String(inv?.barcode||'')
            })
          })
        } else {
          // Fallback for items without IMEIs
          items.push({
            id: `${s.billNo || 'sale'}-${it.id}-${idx}`,
            inventoryId: it.id,
            name: it.name || inv?.name || 'Mobile',
            model: inv?.model || inv?.name || it.name || '',
            price: Number(it.price||0),
            qty: Number(it.qty||0),
            billNo: s.billNo,
            saleDate: s.date,
            customerName: s.customer?.name || 'Walk-in',
            imeis: [],
            barcode: String(inv?.barcode||'')
          })
        }
      })
    })
    return items
  }, [sales, inventory])

  const filtered = useMemo(() => {
    const norm = (s) => String(s||'').trim().toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9]/g,'')
    const qRaw = String(query||'').trim()
    if (!qRaw) return []
    const q = qRaw.toLowerCase()
    const isNumericish = /^\d[\d\s-]*$/.test(qRaw)
    return soldItems.filter(it => {
      const name = String(it.name||'').toLowerCase()
      const model = String(it.model||'').toLowerCase()
      const customer = String(it.customerName||'').toLowerCase()
      const billText = String(it.billNo||'').toLowerCase()
      if (!isNumericish) {
        // Text search: allow contains for partial scans/inputs
        return name.includes(q) || model.includes(q) || customer.includes(q) || billText.includes(q)
      }
      const qn = norm(qRaw)
      const hasImei = (it.imeis||[]).some(im => norm(im).includes(qn))
      const hasBarcode = norm(it.barcode||'').includes(qn)
      const hasBill = norm(it.billNo||'').includes(qn)
      return hasImei || hasBarcode || hasBill
    })
  }, [soldItems, query])

  const cols = [
    { key: 'name', title: 'Mobile' },
    { key: 'customerName', title: 'Customer' },
    { key: 'billNo', title: 'Bill No' },
    { key: 'saleDate', title: 'Sale Date' },
    { key: 'price', title: 'Sold Price', render: (v) => `PKR ${Number(v).toLocaleString()}` },
  ]

  const startReturn = (row) => {
    setSelected(row)
    setForm({
      customerName: row.customerName || 'Walk-in',
      purchaseDate: row.saleDate || '',
      returnDate: new Date().toISOString().slice(0,10),
      refundAmount: row.price || '',
      product: row.name,
      reason: reason || '',
    })
    setOpen(true)
  }

  const submitReturn = () => {
    if (!selected) return
    if (!form.reason.trim()) { setMsg({ open:true, title:'Missing Reason', text:'Please enter a reason for return.' }); return }
    const payload = {
      inventoryId: selected.inventoryId,
      reason: form.reason.trim(),
      customerName: form.customerName.trim(),
      purchaseDate: form.purchaseDate,
      returnDate: form.returnDate,
      refundAmount: Number(form.refundAmount||0),
      product: form.product,
      billNo: selected.billNo,
      imei: selected.imei || (Array.isArray(selected?.imeis) && selected.imeis.length ? String(selected.imeis[0]) : undefined),
    }
    returnMobile(payload)
    setOpen(false)
    setSelected(null)
    setReason('')
  }

  // Build returns table by enriching with names/bill if available from sales
  const returnedRows = useMemo(() => {
    const idx = {}
    ;(sales||[]).forEach(s => {
      (s.items||[]).forEach(it => { idx[it.id] = { name: it.name, billNo: s.billNo } })
    })
    let list = (returns||[]).map(r => ({
      id: r.id,
      name: r.product || idx[r.inventoryId]?.name || 'Mobile',
      billNo: r.billNo || idx[r.inventoryId]?.billNo || '—',
      returnDate: r.returnDate || r.date,
      purchaseDate: r.purchaseDate || '',
      customerName: r.customerName || 'Walk-in',
      refundAmount: Number(r.refundAmount || 0),
      reason: r.reason || '',
    }))
    if (filterDate) list = list.filter(x => (x.returnDate||'').slice(0,10) === filterDate)
    return list
  }, [returns, sales])

  const returnCols = [
    { key: 'returnDate', title: 'Return Date' },
    { key: 'purchaseDate', title: 'Purchase Date' },
    { key: 'customerName', title: 'Customer' },
    { key: 'name', title: 'Product' },
    { key: 'billNo', title: 'Bill No' },
    { key: 'refundAmount', title: 'Refund Amount', render: v => `PKR ${Number(v).toLocaleString()}` },
    { key: 'reason', title: 'Reason' },
  ]

  const onPrintReturns = () => {
    const rows = returnedRows
    const thead = `
      <thead>
        <tr>
          <th>Return Date</th>
          <th>Purchase Date</th>
          <th>Customer</th>
          <th>Product</th>
          <th>Bill No</th>
          <th>Refund Amount</th>
          <th>Reason</th>
        </tr>
      </thead>
    `
    const totalRefund = rows.reduce((a,r)=>a + Number(r.refundAmount||0), 0)
    const tbody = rows.map(r => `
      <tr>
        <td>${r.returnDate || ''}</td>
        <td>${r.purchaseDate || ''}</td>
        <td>${r.customerName || ''}</td>
        <td>${r.name || ''}</td>
        <td>${r.billNo || ''}</td>
        <td style="text-align:right">${Number(r.refundAmount||0).toLocaleString()}</td>
        <td>${r.reason || ''}</td>
      </tr>
    `).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Returned Mobiles</title>
      <style>
        @page { size: A4 portrait; margin: 12mm }
        * { box-sizing: border-box }
        body { margin: 0; padding: 0; background: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif; color: #111827; font-size: 12px; }
        .wrap { padding: 12mm }
        h2 { margin: 0 0 8px; font-size: 18px; }
        .range { color: #374151; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; }
        thead th { background: #f3f4f6; font-weight: 700; text-align: left; border: 1px solid #e5e7eb; padding: 6px 8px; }
        tbody td { border: 1px solid #e5e7eb; padding: 6px 8px; vertical-align: top; }
        tbody tr:nth-child(even) td { background: #fafafa; }
        .footer { margin-top: 10px; text-align: right; font-weight: 600; }
        @media print { thead { display: table-header-group; } }
      </style>
      </head><body>
        <div class="wrap">
          <h2>Returned Mobiles</h2>
          <div class="range">Filter Date: ${filterDate || '—'} • ${rows.length} record(s)</div>
          <table>
            ${thead}
            <tbody>
              ${tbody}
            </tbody>
          </table>
          <div class="footer">Total Refunded: <strong>${totalRefund.toLocaleString()}</strong></div>
        </div>
      </body></html>`
    setPrintHtml(html)
    setPrintOpen(true)
  }

  return (
    <>
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Returns</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <div className="text-xs text-gray-500">Matches</div>
          <div className="text-2xl font-semibold">{filtered.length.toLocaleString()}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500">Total Refunded (PKR)</div>
          <div className="text-2xl font-semibold text-red-600">{(returns||[]).reduce((a,b)=>a + Number(b.refundAmount||0),0).toLocaleString()}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500">Range</div>
          <div className="text-sm font-medium">{query ? `Search: ${query}` : '—'}</div>
        </Card>
      </div>
      <Card title="Search Sold Items">
        <div className="mb-3">
          <input className="input" placeholder="Search by name, model, or IMEI..." value={query} onChange={e=>setQuery(e.target.value)} />
        </div>
        <Table columns={cols} data={filtered} renderActions={(row) => (
          <button className="btn-secondary" onClick={() => startReturn(row)}>Mark Returned</button>
        )} empty="No matching sold items" />
      </Card>

      <Card title={`Returned Mobiles (${returnedRows.length})`} action={(
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Filter Date</span>
          <DateInput value={filterDate} onChange={setFilterDate} popperPlacement="bottom-start" />
          {filterDate && (
            <button className="btn-secondary btn-sm" onClick={()=>setFilterDate('')}>Clear</button>
          )}
          <button className="btn-secondary btn-sm" onClick={onPrintReturns}>Print List</button>
        </div>
      )}>
        <Table columns={returnCols} data={returnedRows} empty="No returns yet" />
      </Card>

      <Modal
        open={open}
        onClose={()=>{ setOpen(false); setSelected(null) }}
        title="Return Details"
        footer={(
          <>
            <button className="btn-secondary" onClick={()=>{ setOpen(false); setSelected(null) }}>Cancel</button>
            <button className="btn-primary" onClick={submitReturn}>Save Return</button>
          </>
        )}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Customer Name</label>
            <input className="input" value={form.customerName} onChange={e=>setForm(f=>({...f, customerName: e.target.value}))} />
          </div>
          <div>
            <label className="label">Reason for Return</label>
            <input className="input" value={form.reason} onChange={e=>setForm(f=>({...f, reason: e.target.value}))} />
          </div>
          <div>
            <label className="label">Purchase Date</label>
            <DateInput value={form.purchaseDate} onChange={(v)=>setForm(f=>({...f, purchaseDate:v}))} popperPlacement="bottom-start" />
          </div>
          <div>
            <label className="label">Return Date</label>
            <DateInput value={form.returnDate} onChange={(v)=>setForm(f=>({...f, returnDate:v}))} popperPlacement="bottom-start" />
          </div>
          <div>
            <label className="label">Refund Amount</label>
            <input type="number" className="input" value={form.refundAmount} onChange={e=>setForm(f=>({...f, refundAmount: e.target.value}))} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Product Details</label>
            <input className="input" value={form.product} onChange={e=>setForm(f=>({...f, product: e.target.value}))} />
          </div>
          {selected && (
            <div className="sm:col-span-2 text-xs text-gray-500">Bill: {selected.billNo || '—'}</div>
          )}
        </div>
      </Modal>
      {/* Custom small popup for validation/messages */}
      <Modal
        open={msg.open}
        onClose={()=> setMsg({ open:false, title:'', text:'' })}
        title={msg.title || 'Notice'}
        footer={(
          <>
            <button className="btn-primary" onClick={()=> setMsg({ open:false, title:'', text:'' })}>OK</button>
          </>
        )}
      >
        <div className="text-sm text-gray-700">{msg.text || '—'}</div>
      </Modal>
    </div>
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
    </>
  )
}
