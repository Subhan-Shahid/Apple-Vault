import { useMemo, useState } from 'react'
import { Calendar, Printer } from 'lucide-react'
import DateInput from '../components/DateInput'
import useStore from '../store/useStore'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'
 

export default function Reports() {
  const { sales, inventory, returns } = useStore()
  const [companyFilter, setCompanyFilter] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [printOpen, setPrintOpen] = useState(false)
  const [printHtml, setPrintHtml] = useState('')
  const [frameRef, setFrameRef] = useState(null)

  // Company-wise summary
  const companySummary = useMemo(() => {
    const invIndex = Object.fromEntries((inventory||[]).map(i => [i.id, i]))
    // Sold qty and PAID sales value per inventory item (apportion sale.total across items)
    const soldByItem = {}
    const salesValueByItem = {}
    ;(sales||[])
      .filter(s => (!from || (s.date||'') >= from) && (!to || (s.date||'') <= to))
      .forEach(s => {
        const items = Array.isArray(s.items) ? s.items : []
        const subtotal = items.reduce((a,b)=> a + Number(b.price||0) * Number(b.qty||0), 0)
        const paidTotal = Number(s.total ?? subtotal) || 0
        items.forEach(it => {
          const id = it.id
          const qty = Number(it.qty||0)
          const line = Number(it.price||0) * qty
          const apportioned = subtotal > 0 ? (paidTotal * (line / subtotal)) : 0
          soldByItem[id] = (soldByItem[id]||0) + qty
          salesValueByItem[id] = (salesValueByItem[id]||0) + apportioned
        })
      })
    // Refunds per item within date range
    const refundByItem = {}
    ;(returns||[])
      .filter(r => (!from || (r.returnDate||r.date||'') >= from) && (!to || (r.returnDate||r.date||'') <= to))
      .forEach(r => {
        const id = r.inventoryId
        const amt = Number(r.refundAmount||0)
        refundByItem[id] = (refundByItem[id]||0) + amt
      })

    const byCompany = {}
    ;(inventory||[]).forEach(inv => {
      const company = inv.category || 'Other'
      const currentStock = Number(inv.totalItems || 0)
      const soldQty = Number(soldByItem[inv.id] || 0)
      const purchasedQty = currentStock + soldQty
      const purchaseUnit = Number((inv.purchasePrice ?? inv.unitSale ?? inv.unitCost ?? 0)) // prefer purchasePrice, then unitSale
      const purchaseValue = purchaseUnit * purchasedQty
      const grossSalesValue = Number(salesValueByItem[inv.id] || 0)
      const refunds = Number(refundByItem[inv.id] || 0)
      const salesValue = grossSalesValue - refunds
      const supplier = inv.supplier || inv.receivedFrom || '—'

      if (!byCompany[company]) {
        byCompany[company] = {
          company,
          purchasedQty: 0,
          soldQty: 0,
          remaining: 0,
          purchaseValue: 0,
          salesValue: 0,
          suppliers: new Set(),
        }
      }
      byCompany[company].purchasedQty += purchasedQty
      byCompany[company].soldQty += soldQty
      byCompany[company].remaining += currentStock
      byCompany[company].purchaseValue += purchaseValue
      byCompany[company].salesValue += salesValue
      if (supplier) byCompany[company].suppliers.add(supplier)
    })

    const rows = Object.values(byCompany).map(r => ({
      ...r,
      profit: r.salesValue - r.purchaseValue,
      supplier: Array.from(r.suppliers || []).join(', ')
    }))
    return rows.sort((a,b)=>a.company.localeCompare(b.company))
  }, [inventory, sales, from, to])

  const companyCols = [
    { key: 'company', title: 'Company' },
    { key: 'supplier', title: 'Supplier(s)' },
    { key: 'purchasedQty', title: 'Total Purchased' },
    { key: 'soldQty', title: 'Total Sold' },
    { key: 'remaining', title: 'Remaining Stock' },
    { key: 'purchaseValue', title: 'Total Purchase Value', render: v => `PKR ${Number(v).toLocaleString()}` },
    { key: 'salesValue', title: 'Total Sale Value', render: v => `PKR ${Number(v).toLocaleString()}` },
    { key: 'profit', title: 'Profit/Loss', render: v => `PKR ${Number(v).toLocaleString()}` },
  ]

  const companies = useMemo(() => ['all', ...Array.from(new Set(companySummary.map(r => r.company)))], [companySummary])
  const filteredSummary = useMemo(() => companyFilter==='all' ? companySummary : companySummary.filter(r => r.company === companyFilter), [companySummary, companyFilter])

  const onPrint = () => {
    const rows = filteredSummary
    const cols = companyCols
    const thead = `<tr>${cols.map(c=>`<th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb">${c.title}</th>`).join('')}</tr>`
    const tbody = rows.map(r=>`<tr>${cols.map(c=>{
      const v = r[c.key]
      const rendered = typeof c.render==='function' ? c.render(v) : (v ?? '')
      return `<td style="padding:6px 8px;border-bottom:1px solid #f0f2f5">${rendered}</td>`
    }).join('')}</tr>`).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Company Summary</title>
      <style>
        @page { size: A4 portrait; margin: 12mm }
        body{font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif; padding:0; margin:0; color:#111827; font-size:12px}
        .wrap{padding:12mm}
        h2{margin:0 0 8px; font-size:18px}
        .range{color:#374151; margin-bottom:8px}
        table{width:100%;border-collapse:collapse}
        thead th{background:#f3f4f6;font-weight:700;text-align:left;border:1px solid #e5e7eb;padding:6px 8px}
        tbody td{border:1px solid #e5e7eb;padding:6px 8px;vertical-align:top}
        tbody tr:nth-child(even) td{background:#fafafa}
        @media print { thead { display: table-header-group; } }
      </style>
      </head><body>
        <div class="wrap">
          <h2>Company-wise Summary${companyFilter!=='all' ? ` — ${companyFilter}` : ''}</h2>
          <div class="range">${from || '—'} to ${to || '—'} • ${rows.length} record(s)</div>
          <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
        </div>
      </body></html>`
    setPrintHtml(html)
    setPrintOpen(true)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Reports</h1>
      {/* Only show Company-wise Summary */}

      <Card title="Company-wise Summary" action={(
        <div className="flex items-center gap-2">
          <div>
            <DateInput value={from} onChange={setFrom} popperPlacement="bottom-start" />
          </div>
          <div>
            <DateInput value={to} onChange={setTo} popperPlacement="bottom-start" />
          </div>
          <select className="input" value={companyFilter} onChange={e=>setCompanyFilter(e.target.value)}>
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn-primary" onClick={onPrint}><Printer size={16}/> Print List</button>
        </div>
      )}>
        <Table columns={companyCols} data={filteredSummary} empty="No company data" />
        <div className="text-xs text-gray-500 mt-2">Note: Purchase value uses item purchasePrice if available, otherwise falls back to 0 (or unitCost if present).</div>
      </Card>
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
