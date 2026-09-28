import { useMemo, useState } from 'react'
import { Calendar, Search, RefreshCw, Printer } from 'lucide-react'
import DateInput from '../components/DateInput'
import useStore from '../store/useStore'
import Modal from '../components/ui/Modal'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import { format } from 'date-fns'
import { buildThermalReceiptHtml } from '../utils/posReceipt'

export default function SalesHistory() {
  const { sales, mobiles, settings, inventory, returns } = useStore()
  const [medicine, setMedicine] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [kind, setKind] = useState('all') // all | repack | secondhand
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptHtml, setReceiptHtml] = useState('')
  const [frameRef, setFrameRef] = useState(null)

  const rows = useMemo(() => {
    // join sales with mobiles
    const joined = sales.map(s => {
      const m = mobiles.find(mm => mm.id === s.mobileId)
      // fabricate "bill" if missing from earlier sales flow
      const billNoVal = s.billNo || `B-${format(new Date(s.date), 'yyyyMMdd')}-${String(s.id).slice(-3)}`
      const imeisStr = Array.isArray(s.items) && s.items.length
        ? s.items.flatMap(it => Array.isArray(it.imeis) ? it.imeis : []).join(', ')
        : ''
      // determine sale type via inventory item types
      let saleKind = 'normal'
      if (Array.isArray(s.items) && s.items.length) {
        for (const it of s.items) {
          const inv = (inventory||[]).find(ii => ii.id === it.id)
          const t = (inv?.type || '').toLowerCase()
          if (t === 'repack' || t === 're-packed' || t === 're_packed') { saleKind = 'repack'; break }
          if (t === 'secondhand' || t === 'second_hand' || t === 'used') { saleKind = saleKind === 'repack' ? 'repack' : 'secondhand' }
        }
      }
      // Determine display mobile names: prefer names from sale items
      let mobileNames = '—'
      if (Array.isArray(s.items) && s.items.length) {
        mobileNames = s.items.map(it => it.name || 'Item').join(', ')
      } else if (m) {
        mobileNames = `${m.company} ${m.model} ${m.color ? '('+m.color+')' : ''}`
      }
      return {
        id: s.id,
        dateTime: `${s.date} 12:00`,
        billNo: billNoVal,
        customer: s.customer?.name || 'Walk-in',
        medicines: mobileNames,
        qtyEach: 1,
        qty: 1,
        amount: Number(s.total ?? s.price ?? 0),
        payment: 'cash',
        imeis: imeisStr,
        kind: saleKind,
      }
    })
    let data = joined
    // Date filtering: if only 'from' is set, show that exact date
    if (from && !to) {
      data = data.filter(r => r.dateTime.slice(0,10) === from)
    } else {
      if (from) data = data.filter(r => r.dateTime.slice(0,10) >= from)
      if (to) data = data.filter(r => r.dateTime.slice(0,10) <= to)
    }
    if (medicine.trim()) {
      const qRaw = medicine.trim()
      const q = qRaw.toLowerCase()
      const norm = (s) => String(s||'').toLowerCase().replace(/[^a-z0-9]/g, '')
      const qn = norm(qRaw)
      data = data.filter(r => {
        const name = String(r.medicines||'').toLowerCase()
        const customer = String(r.customer||'').toLowerCase()
        const bill = String(r.billNo||'').toLowerCase()
        const imeiText = String(r.imeis||'').toLowerCase()
        // Text contains for general search
        const hasText = name.includes(q) || customer.includes(q) || bill.includes(q) || imeiText.includes(q)
        // Normalized contains for scanner inputs (IMEI/bill with spaces/dashes)
        const hasNorm = norm(r.imeis||'').includes(qn) || norm(r.billNo||'').includes(qn)
        return hasText || hasNorm
      })
    }
    if (kind !== 'all') data = data.filter(r => r.kind === kind)
    return data
  }, [sales, mobiles, inventory, medicine, kind, from, to])

  const stats = useMemo(() => {
    const count = rows.length
    const gross = rows.reduce((a,r)=>a + Number(r.amount||0), 0)
    // Subtract refunds within the same date range
    const inRange = (d) => {
      const ds = (d||'').slice(0,10)
      if (from && !to) return ds === from
      if (from && to) return ds >= from && ds <= to
      if (from) return ds >= from
      if (to) return ds <= to
      return true
    }
    const refundTotal = (returns||[])
      .filter(r => inRange((r.returnDate || r.date || '')))
      .reduce((a,r)=> a + Number(r.refundAmount||0), 0)
    const total = Math.max(gross - refundTotal, 0)
    const dateLabel = (from && to && from === to)
      ? from
      : (from || to ? `${from || '—'} to ${to || '—'}` : 'All Time')
    return { count, total, dateLabel }
  }, [rows, from, to, returns])

  const columns = [
    { key: 'dateTime', title: 'Date/Time' },
    { key: 'billNo', title: 'Bill No' },
    { key: 'customer', title: 'Customer' },
    { key: 'medicines', title: 'Mobile(s)' },
    { key: 'imeis', title: 'IMEIs', render: v => v || '—' },
    { key: 'qtyEach', title: 'Qty (each)' },
    { key: 'qty', title: 'Qty' },
    { key: 'amount', title: 'Total Paid', render: v => `PKR ${Number(v).toLocaleString()}` },
    { key: 'payment', title: 'Payment' },
  ]

  const buildReceiptSection = (row) => {
    const sale = (sales||[]).find(s => (row.billNo && s.billNo === row.billNo) || s.id === row.id)
    const company = { name: settings?.companyName || 'MobileShop', phone: settings?.phone || '', address: settings?.address || '', logo: settings?.logoDataUrl || '' }
    const dt = row.dateTime || `${sale?.date || ''}`
    let items = []
    if (sale && Array.isArray(sale.items) && sale.items.length) {
      items = sale.items.map(it => ({ name: it.name || 'Item', qty: Number(it.qty||0), price: Number(it.price||0), imeis: Array.isArray(it.imeis) ? it.imeis : [] }))
    } else {
      const m = (mobiles||[]).find(mm => mm.id === sale?.mobileId) || null
      const name = m ? `${m.company || m.category || ''} ${m.model || m.name || ''}`.trim() || 'Mobile' : (row.medicines || 'Mobile')
      const price = Number(sale?.price || row.amount || 0)
      items = [{ name, qty: 1, price, imeis: [] }]
    }
    const subtotal = items.reduce((a,b)=>a + b.price*b.qty, 0)
    const discount = Number(sale?.discount || 0)
    const tax = Number(sale?.tax || 0)
    const total = Number(sale?.total ?? (subtotal - discount + tax))
    const rowsHtml = items.map(ci => `
        <tr>
          <td class="name">${ci.name}</td>
          <td class="amount">${(ci.price*ci.qty).toLocaleString()}</td>
        </tr>
        <tr class="meta"><td colspan="2">${ci.qty} x ${(ci.price).toLocaleString()}</td></tr>
        ${ci.imeis && ci.imeis.length ? `<tr class=\"meta\"><td colspan=\"2\">IMEI: ${ci.imeis.join(', ')}</td></tr>` : ''}
      `).join('')
    return `
      <div class="wrap receipt">
        <div class="center">
          ${company.logo ? `<div style="margin-bottom:6px"><img src="${company.logo}" style="height:40px;object-fit:contain" /></div>` : ''}
          <div class="bold big">${company.name}</div>
          ${company.address ? `<div class="muted">${company.address}</div>` : ''}
          ${company.phone ? `<div class="muted">${company.phone}</div>` : ''}
        </div>
        <div class="hr"></div>
        <div>
          <div class="bold">${row.customer || sale?.customer?.name || 'Walk-in'}</div>
          <div class="muted">Bill #: ${row.billNo || sale?.billNo || '-'}</div>
          <div class="muted">Date: ${dt}</div>
        </div>
        <div class="hr"></div>
        <table>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="hr"></div>
        <table class="totals">
          <tr><td class="label">Subtotal</td><td class="value">${subtotal.toLocaleString()}</td></tr>
          ${Number(discount||0) ? `<tr><td class="label">Discount</td><td class="value">- ${Number(discount).toLocaleString()}</td></tr>` : ''}
          ${Number(tax||0) ? `<tr><td class="label">Tax</td><td class="value">${Number(tax).toLocaleString()}</td></tr>` : ''}
          <tr><td class="label bold">Total</td><td class="value bold">${Number(total).toLocaleString()}</td></tr>
        </table>
        <div class="hr"></div>
        <div class="footer">Thanks for your purchase!</div>
      </div>
      <div class="pagebreak"></div>
    `
  }

  const printAll = () => {
    const company = { name: settings?.companyName || 'MobileShop', phone: settings?.phone || '', address: settings?.address || '' }
    const totalAmount = rows.reduce((a,r)=>a + Number(r.amount||0), 0)
    const header = `
      <div class="print-header">
        <div class="title">Sales History</div>
        <div class="sub">${company.name}${company.address ? ' · ' + company.address : ''}${company.phone ? ' · ' + company.phone : ''}</div>
        <div class="range">${stats.dateLabel} • ${rows.length} record(s)</div>
      </div>
    `
    const tableHead = `
      <thead>
        <tr>
          <th>Date/Time</th>
          <th>Bill No</th>
          <th>Customer</th>
          <th>Mobile(s)</th>
          <th>IMEIs</th>
          <th>Qty (each)</th>
          <th>Qty</th>
          <th>Total Paid</th>
          <th>Payment</th>
        </tr>
      </thead>
    `
    const tableBody = rows.map(r => `
      <tr>
        <td>${r.dateTime}</td>
        <td>${r.billNo}</td>
        <td>${r.customer}</td>
        <td>${r.medicines}</td>
        <td>${r.imeis || '—'}</td>
        <td style="text-align:right">${r.qtyEach}</td>
        <td style="text-align:right">${r.qty}</td>
        <td style="text-align:right">${Number(r.amount||0).toLocaleString()}</td>
        <td>${r.payment}</td>
      </tr>
    `).join('')
    const footer = `
      <div class="print-footer">
        <div>Total Amount: <strong>${Number(totalAmount).toLocaleString()}</strong></div>
      </div>
    `
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Sales List</title>
      <style>
        @page { size: A4 portrait; margin: 12mm }
        * { box-sizing: border-box }
        body { margin: 0; padding: 0; background: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif; color: #111827; font-size: 12px; }
        .container { width: 100%; }
        .print-header { text-align: center; margin-bottom: 12px; }
        .print-header .title { font-size: 18px; font-weight: 700; }
        .print-header .sub { color: #6b7280; margin-top: 2px; }
        .print-header .range { color: #374151; margin-top: 2px; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; }
        thead th { background: #f3f4f6; font-weight: 700; text-align: left; border: 1px solid #e5e7eb; padding: 6px 8px; }
        tbody td { border: 1px solid #e5e7eb; padding: 6px 8px; vertical-align: top; }
        tbody tr:nth-child(even) td { background: #fafafa; }
        .print-footer { margin-top: 10px; text-align: right; font-weight: 600; }
        @media print { thead { display: table-header-group; } tfoot { display: table-footer-group; } }
      </style>
      </head><body>
        <div class="container">
          ${header}
          <table>
            ${tableHead}
            <tbody>
              ${tableBody}
            </tbody>
          </table>
          ${footer}
        </div>
      </body></html>`
    setReceiptHtml(html)
    setReceiptOpen(true)
  }

  const reprint = (row) => {
    // Find the underlying sale: prioritize billNo
    const sale = (sales||[]).find(s => (row.billNo && s.billNo === row.billNo) || s.id === row.id)
    const company = { name: settings?.companyName || 'MobileShop', phone: settings?.phone || '', address: settings?.address || '', logoDataUrl: settings?.logoDataUrl || '' }
    const dt = row.dateTime || `${sale?.date || ''}`
    // Build items: support new multi-item sales and legacy single sales
    let items = []
    if (sale && Array.isArray(sale.items) && sale.items.length) {
      items = sale.items.map(it => ({ name: it.name || 'Item', qty: Number(it.qty||0), price: Number(it.price||0), imeis: Array.isArray(it.imeis) ? it.imeis : [] }))
    } else {
      // Legacy single mobile sale
      const m = (mobiles||[]).find(mm => mm.id === sale?.mobileId) || null
      const name = m ? `${m.company || m.category || ''} ${m.model || m.name || ''}`.trim() || 'Mobile' : (row.medicines || 'Mobile')
      const price = Number(sale?.price || row.amount || 0)
      items = [{ name, qty: 1, price, imeis: [] }]
    }
    const subtotal = items.reduce((a,b)=>a + b.price*b.qty, 0)
    const discount = Number(sale?.discount || 0)
    const tax = Number(sale?.tax || 0)
    const total = Number(sale?.total ?? (subtotal - discount + tax))
    const html = buildThermalReceiptHtml({
      company,
      customerName: row.customer || sale?.customer?.name || 'Walk-in',
      billNo: row.billNo || sale?.billNo || '-',
      dateTime: dt,
      items,
      subtotal,
      discount,
      tax,
      taxRate: Number(settings?.salesTaxPercent || 0) / 100,
      total,
      printTaxOnReceipt: true,
    })
    setReceiptHtml(html)
    setReceiptOpen(true)
  }

  return (
    <div className="space-y-4">
      <h1 className="font-semibold">Sales History</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <div className="text-xs text-gray-500">Bills</div>
          <div className="text-2xl font-semibold">{stats.count.toLocaleString()}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500">Total Sales (PKR)</div>
          <div className="text-2xl font-semibold text-green-600">{stats.total.toLocaleString()}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500">Range</div>
          <div className="text-sm font-medium">{stats.dateLabel}</div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-2.5">
          <div>
            <input className="input" placeholder="Search phone, bill, customer, IMEI..." value={medicine} onChange={e=>setMedicine(e.target.value)} />
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div>
              <DateInput
                value={from}
                onChange={(d)=>{ setFrom(d); setTo(d) }}
                popperPlacement="bottom-start"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button className={`btn-secondary btn-sm ${kind==='all' ? '!bg-blue-600 !text-white' : ''}`} onClick={()=>setKind('all')}>All</button>
              <button className={`btn-secondary btn-sm ${kind==='repack' ? '!bg-blue-600 !text-white' : ''}`} onClick={()=>setKind('repack')}>Repack</button>
              <button className={`btn-secondary btn-sm ${kind==='secondhand' ? '!bg-blue-600 !text-white' : ''}`} onClick={()=>setKind('secondhand')}>Second Hand</button>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Results">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600">{rows.length.toLocaleString()} result(s)</div>
          <button className="btn-primary btn-sm" onClick={printAll}><Printer size={16}/> Print List</button>
        </div>
        <Table columns={columns} data={rows} renderActions={(row) => (
          <button className="btn-secondary btn-sm" onClick={() => reprint(row)}><Printer size={16}/> Reprint</button>
        )} empty="No sales found" />
        <div className="flex items-center justify-between text-sm text-gray-600 mt-3">
          <span>Page 1 of 1</span>
          <div className="flex items-center gap-2">
            <button className="btn-secondary btn-sm" disabled>Prev</button>
            <button className="btn-secondary btn-sm" disabled>Next</button>
          </div>
        </div>
      </Card>
      {/* In-app Receipt Preview/Print */}
      <Modal
        open={receiptOpen}
        onClose={()=>setReceiptOpen(false)}
        title="Print Preview"
        footer={(
          <>
            <button
              className="btn-primary"
              onClick={()=>{ try { frameRef?.contentWindow?.focus(); frameRef?.contentWindow?.print(); } catch(e){} }}
            >Print</button>
            <button className="btn-secondary" onClick={()=>setReceiptOpen(false)}>OK</button>
          </>
        )}
      >
        <div className="h-[70vh]">
          <iframe
            ref={setFrameRef}
            title="Receipt"
            className="w-full h-full border rounded"
            srcDoc={receiptHtml}
          />
        </div>
      </Modal>
    </div>
  )
}
