import { useMemo, useState } from 'react'
import useStore from '../store/useStore'
import DateInput from '../components/DateInput'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'

export default function Expenses() {
  const { expenses, addExpense, removeExpense } = useStore()
  const todayStr = new Date().toISOString().slice(0,10)
  const [form, setForm] = useState({ date: todayStr, category: 'General', description: '', amount: '' })
  // Filter state
  const [range, setRange] = useState('today') // today | yesterday | weekly | monthly | date
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [printOpen, setPrintOpen] = useState(false)
  const [printHtml, setPrintHtml] = useState('')
  const [frameRef, setFrameRef] = useState(null)
  // Custom validation popup
  const [errorOpen, setErrorOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Helper date computations
  const [yesterdayStr, weekStartStr, monthStartStr] = useMemo(() => {
    const d = new Date()
    const y = new Date(d)
    y.setDate(d.getDate() - 1)
    const w = new Date(d)
    w.setDate(d.getDate() - 6) // last 7 days including today
    const m = new Date(d.getFullYear(), d.getMonth(), 1)
    const toStr = (dt) => dt.toISOString().slice(0,10)
    return [toStr(y), toStr(w), toStr(m)]
  }, [])

  const rangeLabel = useMemo(() => {
    switch(range){
      case 'today': return 'Today'
      case 'yesterday': return 'Yesterday'
      case 'weekly': return 'Last 7 Days'
      case 'monthly': return 'This Month'
      case 'date': return selectedDate || '—'
      default: return '—'
    }
  }, [range, selectedDate])

  const list = useMemo(() => {
    const data = expenses || []
    if (range === 'today') return data.filter(e => e.date === todayStr)
    if (range === 'yesterday') return data.filter(e => e.date === yesterdayStr)
    if (range === 'weekly') return data.filter(e => e.date >= weekStartStr && e.date <= todayStr)
    if (range === 'monthly') return data.filter(e => e.date >= monthStartStr && e.date <= todayStr)
    if (range === 'date') return data.filter(e => selectedDate && e.date === selectedDate)
    return data
  }, [expenses, range, selectedDate, todayStr, yesterdayStr, weekStartStr, monthStartStr])

  const totals = useMemo(() => {
    const totalFiltered = (list||[]).reduce((a,b)=> a + Number(b.amount||0), 0)
    const totalToday = (expenses||[]).filter(e=> e.date === todayStr).reduce((a,b)=> a + Number(b.amount||0), 0)
    return { totalFiltered, totalToday }
  }, [list, expenses, todayStr])

  const onPrint = () => {
    const rows = list
    const total = rows.reduce((a,b)=> a + Number(b.amount||0), 0)
    const thead = `
      <thead>
        <tr>
          <th>Date</th>
          <th>Category</th>
          <th>Description</th>
          <th>Amount (PKR)</th>
        </tr>
      </thead>
    `
    const tbody = rows.map(r => `
      <tr>
        <td>${r.date}</td>
        <td>${r.category || ''}</td>
        <td>${r.description || ''}</td>
        <td style="text-align:right">${Number(r.amount||0).toLocaleString()}</td>
      </tr>
    `).join('')
    const html = `<!doctype html><html><head><meta charset=\"utf-8\"><title>Expenses</title>
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
      </style>
      </head><body>
        <div class=\"wrap\">
          <h2>Expenses</h2>
          <div class=\"range\">Range: ${rangeLabel} • ${rows.length} record(s)</div>
          <table>
            ${thead}
            <tbody>
              ${tbody}
            </tbody>
          </table>
          <div class=\"footer\">Filtered Total: <strong>${total.toLocaleString()}</strong> • Today's Expense: <strong>${totals.totalToday.toLocaleString()}</strong></div>
        </div>
      </body></html>`
    setPrintHtml(html)
    setPrintOpen(true)
  }

  const onSubmit = (e) => {
    e.preventDefault()
    const amt = Number(form.amount)
    if (!amt || amt <= 0) {
      setErrorMsg('Enter a valid amount')
      setErrorOpen(true)
      return
    }
    addExpense({ ...form, amount: amt })
    setForm({ date: form.date, category: 'General', description: '', amount: '' })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Expenses</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <div className="text-xs text-gray-500">Today's Expense</div>
          <div className="text-2xl font-semibold text-blue-600">{totals.totalToday.toLocaleString()}</div>
        </Card>
      {/* Validation Popup */}
      <Modal
        open={errorOpen}
        onClose={()=>setErrorOpen(false)}
        title="Invalid Amount"
        footer={(
          <button className="btn-primary" onClick={()=>setErrorOpen(false)}>OK</button>
        )}
      >
        <div className="text-sm text-gray-700">{errorMsg || 'Please enter a valid amount greater than 0.'}</div>
      </Modal>
        <Card>
          <div className="text-xs text-gray-500">Filtered Expense (PKR)</div>
          <div className="text-2xl font-semibold">{totals.totalFiltered.toLocaleString()}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500">Range</div>
          <div className="text-sm font-medium">{rangeLabel}</div>
        </Card>
      </div>

      <Card title="Add Expense">
        <form className="grid grid-cols-1 md:grid-cols-5 gap-3" onSubmit={onSubmit}>
          <div>
            <label className="label">Date</label>
            <DateInput value={form.date} onChange={(v)=>setForm(f=>({...f, date:v}))} popperPlacement="bottom-start" />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" placeholder="e.g. Rent, Utilities" value={form.category} onChange={e=>setForm(f=>({...f, category: e.target.value}))} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <input className="input" placeholder="Description" value={form.description} onChange={e=>setForm(f=>({...f, description: e.target.value}))} />
          </div>
          <div>
            <label className="label">Amount (PKR)</label>
            <input type="number" className="input" placeholder="0" value={form.amount} onChange={e=>setForm(f=>({...f, amount: e.target.value}))} />
          </div>
          <div className="md:col-span-5">
            <button className="btn-primary" type="submit">Add Expense</button>
          </div>
        </form>
      </Card>

      <Card title="Expense List" action={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">Filters</span>
          <button className={`btn-secondary btn-sm ${range==='today' ? 'ring-2 ring-brand/40' : ''}`} onClick={()=> setRange('today')}>Today</button>
          <button className={`btn-secondary btn-sm ${range==='yesterday' ? 'ring-2 ring-brand/40' : ''}`} onClick={()=> setRange('yesterday')}>Yesterday</button>
          <button className={`btn-secondary btn-sm ${range==='weekly' ? 'ring-2 ring-brand/40' : ''}`} onClick={()=> setRange('weekly')}>Weekly</button>
          <button className={`btn-secondary btn-sm ${range==='monthly' ? 'ring-2 ring-brand/40' : ''}`} onClick={()=> setRange('monthly')}>Monthly</button>
          <div className="flex items-center gap-2">
            <DateInput
              value={selectedDate}
              onChange={(v)=>{ setSelectedDate(v); setRange('date') }}
              popperPlacement="bottom-start"
            />
            {range==='date' && selectedDate && (
              <button className="btn-secondary btn-sm" onClick={()=>{ setSelectedDate(todayStr); setRange('today') }}>Clear</button>
            )}
          </div>
          <button className="btn-secondary btn-sm" onClick={onPrint}>Print List</button>
        </div>
      }>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="p-2 border-b">Date</th>
                <th className="p-2 border-b">Category</th>
                <th className="p-2 border-b">Description</th>
                <th className="p-2 border-b">Amount (PKR)</th>
                <th className="p-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td className="p-3 text-gray-500" colSpan={5}>No expenses</td></tr>
              )}
              {list.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="p-2 border-b">{e.date}</td>
                  <td className="p-2 border-b">{e.category}</td>
                  <td className="p-2 border-b">{e.description}</td>
                  <td className="p-2 border-b">{Number(e.amount||0).toLocaleString()}</td>
                  <td className="p-2 border-b">
                    <button
                      className="btn-primary btn-sm bg-red-600 hover:bg-red-700"
                      onClick={()=>{ setToDelete(e); setConfirmOpen(true) }}
                    >Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {/* Delete Confirmation */}
      <Modal
        open={confirmOpen}
        onClose={()=>{ setConfirmOpen(false); setToDelete(null) }}
        title="Delete Expense"
        footer={(
          <>
            <button className="btn-secondary" onClick={()=>{ setConfirmOpen(false); setToDelete(null) }}>Cancel</button>
            <button
              className="btn-primary bg-red-600 hover:bg-red-700"
              onClick={()=>{ if (toDelete) removeExpense(toDelete.id); setConfirmOpen(false); setToDelete(null) }}
            >Delete</button>
          </>
        )}
      >
        <div className="space-y-2 text-sm">
          <div>Are you sure you want to delete this expense?</div>
          {toDelete && (
            <div className="p-3 border rounded bg-red-50 text-red-800">
              <div><span className="text-gray-600">Date:</span> {toDelete.date}</div>
              <div><span className="text-gray-600">Category:</span> {toDelete.category}</div>
              <div><span className="text-gray-600">Description:</span> {toDelete.description || '—'}</div>
              <div><span className="text-gray-600">Amount:</span> PKR {Number(toDelete.amount||0).toLocaleString()}</div>
            </div>
          )}
          <div className="text-xs text-gray-500">This action cannot be undone.</div>
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
