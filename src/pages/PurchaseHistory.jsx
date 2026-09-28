import { useMemo, useState } from 'react'
import { Calendar, Printer, RefreshCw, Check } from 'lucide-react'
import DateInput from '../components/DateInput'
import useStore from '../store/useStore'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'

export default function PurchaseHistory() {
  const { purchaseHistory, companyReturns = [] } = useStore()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('all') // all | repack | secondhand
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRow, setDetailRow] = useState(null)
  const [printOpen, setPrintOpen] = useState(false)
  const [printHtml, setPrintHtml] = useState('')
  const [frameRef, setFrameRef] = useState(null)

  const rows = useMemo(() => {
    // Build set of IMEIs returned to company
    const returnedSet = new Set((companyReturns||[]).map(r => String(r.imei||'').trim()).filter(Boolean))
    // Adjust rows by subtracting returned IMEIs (or removing fully returned rows)
    let data = (purchaseHistory||[]).map(r => {
      const imeis = Array.isArray(r.imeis) ? r.imeis : []
      const returnedCount = imeis.reduce((acc, im) => acc + (returnedSet.has(String(im)) ? 1 : 0), 0)
      if (!returnedCount) return r
      const totalItems = Number(r.totalItems || imeis.length || 1)
      const remaining = Math.max(totalItems - returnedCount, 0)
      if (remaining === 0) return null
      // Partial deduction: keep row but reduce counts and IMEIs
      return {
        ...r,
        totalItems: remaining,
        imeis: imeis.filter(im => !returnedSet.has(String(im)))
      }
    }).filter(Boolean)
    if (from) data = data.filter(r => r.date >= from)
    if (to) data = data.filter(r => r.date <= to)
    const qRaw = q.trim()
    if (qRaw) data = data.filter(r => {
      const ql = qRaw.toLowerCase()
      const norm = (s) => String(s||'').toLowerCase().replace(/[^a-z0-9]/g, '')
      const qn = norm(qRaw)
      const text = [r.medicine, r.supplier, r.invoice].join(' ').toLowerCase()
      const imeiText = Array.isArray(r.imeis) ? r.imeis.join(' ').toLowerCase() : ''
      const hasText = text.includes(ql) || imeiText.includes(ql)
      const hasNorm = norm(Array.isArray(r.imeis) ? r.imeis.join(' ') : '').includes(qn)
        || norm(r.invoice||'').includes(qn)
        || norm(r.barcode||'').includes(qn)
      return hasText || hasNorm
    })
    if (typeFilter !== 'all') data = data.filter(r => r.type === typeFilter)
    return data
  }, [purchaseHistory, from, to, q, typeFilter])

  const stats = useMemo(() => {
    const count = rows.length
    const total = rows.reduce((a,r)=> a + computedTotal(r), 0)
    const range = (from || to) ? `${from || '—'} to ${to || '—'}` : 'All Time'
    return { count, total, range }
  }, [rows, from, to])

  const columns = [
    { key: 'date', title: 'Date', render: v => formatDate(v) },
    { key: 'medicine', title: 'Mobile' },
    { key: 'supplier', title: 'Supplier' },
    { key: 'type', title: 'Type', render: (v) => (
      <span className={`px-2 py-0.5 rounded-full text-xs border ${v==='secondhand' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : v==='repack' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>{v || 'normal'}</span>
    ) },
    { key: 'unitsPerPack', title: 'Units/Pack' },
    { key: 'totalItems', title: 'Total Items' },
    { key: 'buyPack', title: 'Buy/Pack', render: v => num(v) },
    { key: 'buyUnit', title: 'Buy/Unit', render: v => num(v) },
    { key: 'totalAmount', title: 'Total Amount', render: (_v, row) => num(computedTotal(row)) },
    { key: 'invoice', title: 'Invoice #' },
    { key: 'imeis', title: 'IMEIs', render: v => (Array.isArray(v) && v.length ? v.join(', ') : '—') },
  ]

  const onPrint = () => {
    const rowsToPrint = rows
    const totalAmount = rowsToPrint.reduce((a,r)=> a + Number(computedTotal(r)||0), 0)
    const thead = `
      <thead>
        <tr>
          <th>Date</th>
          <th>Mobile</th>
          <th>Supplier</th>
          <th>Type</th>
          <th>Units/Pack</th>
          <th>Total Items</th>
          <th>Buy/Pack</th>
          <th>Buy/Unit</th>
          <th>Total Amount</th>
          <th>Invoice #</th>
          <th>IMEIs</th>
        </tr>
      </thead>
    `
    const tbody = rowsToPrint.map(r => `
      <tr>
        <td>${formatDate(r.date)}</td>
        <td>${r.medicine || ''}</td>
        <td>${r.supplier || ''}</td>
        <td>${r.type || 'normal'}</td>
        <td style="text-align:right">${Number(r.unitsPerPack||0)}</td>
        <td style="text-align:right">${Number(r.totalItems||0)}</td>
        <td style="text-align:right">${num(r.buyPack)}</td>
        <td style="text-align:right">${num(r.buyUnit)}</td>
        <td style="text-align:right">${num(computedTotal(r))}</td>
        <td>${r.invoice || ''}</td>
        <td style="word-break: break-word;">${Array.isArray(r.imeis) && r.imeis.length ? r.imeis.join(', ') : '—'}</td>
      </tr>
    `).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Purchase History</title>
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
        @media print { thead { display: table-header-group; } }
        .footer { margin-top: 10px; text-align: right; font-weight: 600; }
      </style>
      </head><body>
        <div class="wrap">
          <h2>Purchase History</h2>
          <div class="range">${from || '—'} to ${to || '—'} • ${rowsToPrint.length} record(s)</div>
          <table>
            ${thead}
            <tbody>
              ${tbody}
            </tbody>
          </table>
          <div class="footer">Total Amount: <strong>${totalAmount.toLocaleString()}</strong></div>
        </div>
      </body></html>`
    setPrintHtml(html)
    setPrintOpen(true)
  }

  return (
    <div className="space-y-4">
      <h1 className="font-semibold">Purchase History</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <div className="text-xs text-gray-500">Bills</div>
          <div className="text-2xl font-semibold">{stats.count.toLocaleString()}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500">Total Purchases (PKR)</div>
          <div className="text-2xl font-semibold text-blue-600">{stats.total.toLocaleString()}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500">Range</div>
          <div className="text-sm font-medium">{stats.range}</div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="label">From</label>
                <DateInput value={from} onChange={setFrom} popperPlacement="bottom-start" />
              </div>
              <div>
                <label className="label">To</label>
                <DateInput value={to} onChange={setTo} popperPlacement="bottom-start" />
              </div>
            </div>
            <div>
              <label className="label">Search</label>
              <input className="input" placeholder="mobile, supplier, invoice" value={q} onChange={e=>setQ(e.target.value)} />
            </div>
            {/* Type Filters (Top) */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button className={`btn-secondary btn-sm ${typeFilter==='secondhand' ? 'ring-2 ring-yellow-400' : ''}`} onClick={()=>setTypeFilter('secondhand')}>Second-Hand</button>
              <button className={`btn-secondary btn-sm ${typeFilter==='repack' ? 'ring-2 ring-blue-400' : ''}`} onClick={()=>setTypeFilter('repack')}>Repack</button>
              <button className={`btn-secondary btn-sm ${typeFilter==='all' ? 'ring-2 ring-brand/40' : ''}`} onClick={()=>setTypeFilter('all')}>All</button>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button className="btn-secondary btn-sm" onClick={onPrint}><Printer size={16}/> Print List</button>
              <button className="btn-secondary btn-sm" onClick={()=>{ setFrom(''); setTo(''); setQ('') }}><RefreshCw size={16}/> Refresh</button>
              <select className="input w-20 h-[34px] text-sm">
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Results">
        <Table
          columns={columns}
          data={rows}
          empty="No purchases"
          renderActions={(r) => (
            <button className="btn-secondary btn-sm" onClick={()=>{ setDetailRow(r); setDetailOpen(true) }}>View</button>
          )}
        />
      </Card>

      <Modal
        open={detailOpen}
        onClose={()=>{ setDetailOpen(false); setDetailRow(null) }}
        title={detailRow ? detailRow.medicine : 'Details'}
        footer={(<button className="btn-primary" onClick={()=>{ setDetailOpen(false); setDetailRow(null) }}>Close</button>)}
      >
        {detailRow && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-500">Type</div>
              <div className="font-medium capitalize">{detailRow.type || 'normal'}</div>
            </div>
            <div>
              <div className="text-gray-500">Purchase Date</div>
              <div className="font-medium">{formatDate(detailRow.date)}</div>
            </div>
            <div>
              <div className="text-gray-500">Purchase Amount</div>
              <div className="font-medium">PKR {computedTotal(detailRow).toLocaleString()}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-gray-500">IMEIs</div>
              <div className="font-medium break-words">{Array.isArray(detailRow.imeis) && detailRow.imeis.length ? detailRow.imeis.join(', ') : '—'}</div>
            </div>
            {detailRow.type === 'secondhand' ? (
              <>
                <div>
                  <div className="text-gray-500">Received From</div>
                  <div className="font-medium">{detailRow.receivedFrom || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Phone</div>
                  <div className="font-medium">{detailRow.sellerPhone || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500">CNIC</div>
                  <div className="font-medium">{detailRow.sellerCnic || '-'}</div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="text-gray-500">Supplier</div>
                  <div className="font-medium">{detailRow.supplier || '-'}</div>
                </div>
                <div className="sm:col-span-2 text-xs text-gray-600">Repack note: Item was taken from customer, sent to company for repacking, and returned as repacked.</div>
              </>
            )}
          </div>
        )}
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

// Compute total stock value for a row: buyUnit * totalItems, with fallback to existing totalAmount
function computedTotal(row){
  const unit = Number(row?.buyUnit ?? 0)
  const items = Number(row?.totalItems ?? 0)
  const product = unit * items
  if (product > 0) return product
  return Number(row?.totalAmount ?? 0)
}

function num(n){ return Number(n).toLocaleString() }
function formatDate(d){
  if (!d) return '-'
  // expect yyyy-mm-dd
  const [y,m,day] = d.split('-')
  if (!y || !m || !day) return d
  return `${day}/${m}/${y}`
}
