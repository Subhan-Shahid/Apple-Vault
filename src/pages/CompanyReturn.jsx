import { useMemo, useState } from 'react'
import useStore from '../store/useStore'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'
import DateInput from '../components/DateInput'

export default function CompanyReturn() {
  const { inventory, processCompanyReturn, companyReturns = [] } = useStore()
  const [printOpen, setPrintOpen] = useState(false)
  const [printHtml, setPrintHtml] = useState('')
  const [frameRef, setFrameRef] = useState(null)

  const companies = useMemo(() => {
    const set = new Set((inventory||[]).map(i => i.category || i.company || 'Other'))
    return ['Select Company', ...Array.from(set).filter(Boolean)]
  }, [inventory])

  const today = new Date().toISOString().slice(0,10)
  const [company, setCompany] = useState('Select Company')
  const [qty, setQty] = useState(1)
  const [imeisInput, setImeisInput] = useState([''])
  const imeiRefs = useMemo(() => Array.from({length: Math.max(qty, 1)}, () => ({ current: null })), [qty])
  const [date, setDate] = useState(today)
  const [confirm, setConfirm] = useState(false)
  const [result, setResult] = useState(null)
  // Filters for persistent returned-list
  const [retDate, setRetDate] = useState('') // yyyy-mm-dd or '' (all)
  const returnedDates = useMemo(() => {
    const set = new Set((companyReturns||[]).map(r => String(r.date||'').slice(0,10)).filter(Boolean))
    return Array.from(set).sort((a,b)=> b.localeCompare(a))
  }, [companyReturns])
  const filteredReturnedRows = useMemo(() => {
    let rows = Array.isArray(companyReturns) ? [...companyReturns] : []
    if (company && company !== 'Select Company') rows = rows.filter(r => (r.company||'') === company)
    if (retDate) rows = rows.filter(r => String(r.date||'').slice(0,10) === retDate)
    // newest first
    rows.sort((a,b)=> String(b.date||'').localeCompare(String(a.date||'')))
    return rows
  }, [companyReturns, company, retDate])
  const returnedTotal = useMemo(() => (filteredReturnedRows||[]).reduce((a,r)=> a + Number(r.price||0), 0), [filteredReturnedRows])

  const { imeis, matches, missing } = useMemo(() => {
    const list = Array.from(new Set((imeisInput||[]).map(s => String(s||'').trim()).filter(Boolean)))
    const companyInv = (inventory||[]).filter(i => (i.category||i.company||'') === company)
    const allImeis = new Set(companyInv.flatMap(i => Array.isArray(i.imeis) ? i.imeis : []))
    const matches = list.filter(im => allImeis.has(im))
    const missing = list.filter(im => !allImeis.has(im))
    return { imeis: list, matches, missing }
  }, [imeisInput, inventory, company])

  const previewRows = useMemo(() => {
    // show first 20 IMEIs with basic details
    const rows = []
    ;(inventory || []).forEach(inv => {
      const list = Array.isArray(inv.imeis) ? inv.imeis : []
      list.forEach(im => {
        if (matches.includes(im)) {
          rows.push({ id: rows.length + 1, imei: im, model: inv.name || 'Mobile', invoice: inv.invoice || '', price: inv.purchasePrice || 0 })
        }
      })
    })
    return rows.slice(0, 20)
  }, [matches, inventory])

  // Print for Returned to Company list
  const onPrintReturned = () => {
    const rows = filteredReturnedRows
    const thead = `
      <thead>
        <tr>
          <th>Return Date</th>
          <th>Company</th>
          <th>Model</th>
          <th>Invoice #</th>
          <th>IMEI</th>
          <th>Purchase Price (PKR)</th>
        </tr>
      </thead>
    `
    const total = rows.reduce((a,r)=> a + Number(r.price||0), 0)
    const tbody = rows.map(r => `
      <tr>
        <td>${r.date || ''}</td>
        <td>${r.company || ''}</td>
        <td>${r.model || ''}</td>
        <td>${r.invoice || ''}</td>
        <td style="word-break: break-word">${r.imei || ''}</td>
        <td style="text-align:right">${Number(r.price||0).toLocaleString()}</td>
      </tr>
    `).join('')
    const html = `<!doctype html><html><head><meta charset=\"utf-8\"><title>Returned to Company</title>
      <style>
        @page { size: A4 portrait; margin: 12mm }
        * { box-sizing: border-box }
        body { margin:0; padding:0; background:#fff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif; color:#111827; font-size:12px }
        .wrap { padding:12mm }
        h2 { margin:0 0 8px; font-size:18px }
        table { width:100%; border-collapse: collapse }
        thead th { background:#f3f4f6; font-weight:700; text-align:left; border:1px solid #e5e7eb; padding:6px 8px }
        tbody td { border:1px solid #e5e7eb; padding:6px 8px; vertical-align: top }
        tbody tr:nth-child(even) td { background:#fafafa }
        @media print { thead { display: table-header-group } }
      </style>
    </head><body>
      <div class=\"wrap\">
        <h2>Returned to Company</h2>
        <div class=\"range\">Company: ${company || '—'} • ${rows.length} record(s)</div>
        <table>${thead}<tbody>${tbody}</tbody></table>
        <div style=\"margin-top:8px; text-align:right; font-weight:600\">Total Amount: ${total.toLocaleString()}</div>
      </div>
    </body></html>`
    setPrintHtml(html)
    setPrintOpen(true)
  }

  const onSubmit = () => {
    setConfirm(false)
    if (!company || company === 'Select Company') return
    if (!matches.length) return
    // Build detail rows BEFORE deduction so we can show model/invoice
    const details = []
    ;(inventory || []).forEach(inv => {
      const list = Array.isArray(inv.imeis) ? inv.imeis : []
      list.forEach(im => {
        if (matches.includes(im)) {
          details.push({
            id: `${company}-${im}-${date}`,
            company,
            date,
            imei: im,
            model: inv.name || 'Mobile',
            invoice: inv.invoice || '',
            price: Number(inv.purchasePrice || 0),
          })
        }
      })
    })
    const res = processCompanyReturn({ company, imeis: matches, date })
    setResult(res || { removed: matches.length, company })
    setImeisInput([''])
    setQty(1)
  }

  const stats = useMemo(() => ({
    totalScan: imeis.length,
    valid: matches.length,
    missing: missing.length,
  }), [imeis.length, matches.length, missing.length])

  const cols = [
    { key: 'id', title: '#' },
    { key: 'imei', title: 'IMEI' },
    { key: 'model', title: 'Model' },
    { key: 'invoice', title: 'Invoice #' },
    { key: 'price', title: 'Unit Price', render: v => Number(v).toLocaleString() },
  ]

  const onPrint = () => {
    const rows = previewRows
    const thead = `
      <thead>
        <tr>
          <th style="width:60px">#</th>
          <th>IMEI</th>
        </tr>
      </thead>
    `
    const tbody = rows.map(r => `
      <tr>
        <td>${r.id}</td>
        <td style="word-break: break-word;">${r.imei}</td>
      </tr>
    `).join('')
    const html = `<!doctype html><html><head><meta charset=\"utf-8\"><title>Company Return Preview</title>
      <style>
        @page { size: A4 portrait; margin: 12mm }
        body{font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif; margin:0; padding:0; color:#111827; font-size:12px}
        .wrap{padding:12mm}
        h2{margin:0 0 6px; font-size:18px}
        .meta{color:#374151; margin-bottom:8px}
        table{width:100%; border-collapse:collapse}
        thead th{background:#f3f4f6; font-weight:700; text-align:left; border:1px solid #e5e7eb; padding:6px 8px}
        tbody td{border:1px solid #e5e7eb; padding:6px 8px; vertical-align:top}
        tbody tr:nth-child(even) td{background:#fafafa}
      </style>
      </head><body>
        <div class=\"wrap\">
          <h2>Company Return Preview</h2>
          <div class=\"meta\">Company: ${company} • Date: ${date} • Valid IMEIs: ${matches.length} • Missing: ${missing.length}</div>
          <table>${thead}<tbody>${tbody}</tbody></table>
        </div>
      </body></html>`
    setPrintHtml(html)
    setPrintOpen(true)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Company Return</h1>

      <Card title="Return Details">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Company</label>
            <select className="input" value={company} onChange={e=>setCompany(e.target.value)}>
              {companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
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
          <div className="md:col-span-2">
            <label className="label">How many mobiles to return?</label>
            <div className="flex items-center gap-2">
              <input type="number" className="input w-28" value={qty} min={1} onChange={e=>{
                const n = Math.max(1, Number(e.target.value||1));
                setQty(n);
                setImeisInput(arr=>{
                  const next = [...arr]
                  if (next.length < n) {
                    while (next.length < n) next.push('')
                  } else if (next.length > n) {
                    next.length = n
                  }
                  return next
                })
              }} />
              <div className="text-sm text-gray-600">Enter IMEIs below (scanner friendly)</div>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <label className="label">Scan/Enter IMEIs (auto-advance)</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Array.from({length: qty}).map((_, i) => (
              <input
                key={i}
                ref={el => { if (imeiRefs[i]) imeiRefs[i].current = el }}
                className="input"
                placeholder={`IMEI ${i+1}`}
                value={imeisInput[i] || ''}
                onChange={e=>{
                  const val = e.target.value.trim()
                  setImeisInput(arr=>{
                    const next = [...arr]; next[i] = val; return next
                  })
                  // auto-advance when length >= 15
                  if (val.replace(/\D/g,'').length >= 15 && i < qty-1) {
                    setTimeout(()=>imeiRefs[i+1]?.current?.focus(), 0)
                  }
                }}
                onKeyDown={e=>{
                  if (e.key === 'Enter' && i < qty-1) {
                    e.preventDefault(); imeiRefs[i+1]?.current?.focus()
                  }
                }}
              />
            ))}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <div className="text-xs text-gray-500">Scanned</div>
            <div className="text-xl font-semibold">{stats.totalScan}</div>
          </Card>
          <Card>
            <div className="text-xs text-gray-500">Valid in Inventory</div>
            <div className="text-xl font-semibold text-green-600">{stats.valid}</div>
          </Card>
          <Card>
            <div className="text-xs text-gray-500">Not Found</div>
            <div className="text-xl font-semibold text-red-600">{stats.missing}</div>
          </Card>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            className="btn-primary"
            disabled={company==='Select Company' || matches.length===0}
            onClick={()=>setConfirm(true)}
          >Process Return to Company</button>
          {missing.length>0 && (
            <div className="text-xs text-gray-500">{missing.length} IMEI not in selected company's inventory will be ignored.</div>
          )}
        </div>
      </Card>

      {/* Returned to Company list (full width row) */}
      <Card title={`Returned to Company (${filteredReturnedRows.length})`} action={(
        <button className="btn-secondary btn-sm" onClick={onPrintReturned}>Print List</button>
      )}>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-sm text-gray-600">Filter by date:</span>
          <DateInput value={retDate} onChange={setRetDate} popperPlacement="bottom-start" />
          {retDate && <button className="btn-secondary btn-sm" onClick={()=>setRetDate('')}>Clear</button>}
          <div className="flex flex-wrap items-center gap-1.5">
            {returnedDates.slice(0,7).map(d => (
              <button key={d} className={`btn-secondary btn-sm ${retDate===d ? 'ring-2 ring-brand/40' : ''}`} onClick={()=>setRetDate(d)}>{d}</button>
            ))}
          </div>
        </div>
        <Table
          columns={[
            { key: 'date', title: 'Return Date' },
            { key: 'company', title: 'Company' },
            { key: 'model', title: 'Model' },
            { key: 'invoice', title: 'Invoice #' },
            { key: 'imei', title: 'IMEI' },
            { key: 'price', title: 'Purchase Price (PKR)', render: (v)=> Number(v||0).toLocaleString() },
          ]}
          data={filteredReturnedRows}
          empty="No returns yet"
        />
        <div className="mt-2 text-right font-semibold">Total Amount: PKR {returnedTotal.toLocaleString()}</div>
      </Card>

      

      <Modal
        open={confirm}
        onClose={()=>setConfirm(false)}
        title="Confirm Company Return"
        footer={(
          <>
            <button className="btn-secondary" onClick={()=>setConfirm(false)}>Cancel</button>
            <button className="btn-primary" onClick={onSubmit}>Confirm</button>
          </>
        )}
      >
        <div className="space-y-2 text-sm text-gray-700">
          <div>Company: <span className="font-medium">{company}</span></div>
          <div>Date: <span className="font-medium">{date}</span></div>
          <div>Items to return: <span className="font-medium">{matches.length}</span></div>
        </div>
      </Modal>

      <Modal
        open={!!result}
        onClose={()=>setResult(null)}
        title="Return Completed"
        footer={(
          <>
            <button className="btn-primary" onClick={()=>setResult(null)}>OK</button>
          </>
        )}
      >
        <div className="text-sm text-gray-700">Returned {result?.removed || matches.length} mobiles to <span className="font-medium">{company}</span>.</div>
      </Modal>
    </div>
  )
}
