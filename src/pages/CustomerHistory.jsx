import { useMemo, useState } from 'react'
import useStore from '../store/useStore'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'

export default function CustomerHistory() {
  const { customers, inventory, sales, removeCustomer } = useStore()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [printOpen, setPrintOpen] = useState(false)
  const [printHtml, setPrintHtml] = useState('')
  const [frameRef, setFrameRef] = useState(null)

  const filtered = useMemo(() => {
    const arr = customers.filter(c =>
      [c.name, c.phone].join(' ').toLowerCase().includes(q.toLowerCase())
    )
    // augment with last purchase amount
    return arr.map(c => {
      const history = c.history || []
      let lastTotal = 0
      let lastDate = ''
      history.forEach(h => {
        const sale = (sales||[]).find(s => s.billNo === h.billNo)
        const date = sale?.date || h.date || ''
        const total = sale?.total ?? ((h.items||[]).reduce((a,b)=>a + Number(b.price||0)*Number(b.qty||0),0))
        if (!lastDate || (date && date > lastDate)) {
          lastDate = date
          lastTotal = Number(total||0)
        }
      })
      return { ...c, lastAmount: lastTotal }
    })
  }, [customers, sales, q])

  const columns = [
    { key: 'name', title: 'Name' },
    { key: 'phone', title: 'Phone' },
    { key: 'lastAmount', title: 'Price', render: v => v ? `PKR ${Number(v).toLocaleString()}` : '—' },
    { key: 'history', title: 'Records', render: (v) => (v||[]).length },
  ]

  const onPrint = () => {
    const rows = filtered
    const thead = `
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Last Purchase (PKR)</th>
          <th>Records</th>
        </tr>
      </thead>
    `
    const tbody = rows.map(r => `
      <tr>
        <td>${r.name || ''}</td>
        <td>${r.phone || '—'}</td>
        <td style="text-align:right">${r.lastAmount ? Number(r.lastAmount).toLocaleString() : '—'}</td>
        <td style="text-align:right">${(r.history||[]).length}</td>
      </tr>
    `).join('')
    const html = `<!doctype html><html><head><meta charset=\"utf-8\"><title>Customers</title>
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
      </style>
      </head><body>
        <div class=\"wrap\">
          <h2>Customers</h2>
          <div class=\"range\">Search: ${q || '—'} • ${rows.length} record(s)</div>
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Customer History</h1>

      <Card title="Customers" action={(
        <div className="flex items-center gap-2">
          <input className="input" placeholder="Search by name or phone" value={q} onChange={e=>setQ(e.target.value)} />
          <button className="btn-secondary" onClick={onPrint}>Print List</button>
        </div>
      )}>
        <Table columns={columns} data={filtered} renderActions={(row) => (
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={()=>{ setSelected(row); setOpen(true) }}>View</button>
            <button className="btn-primary bg-red-600 hover:bg-red-700" onClick={()=>{ setToDelete(row); setConfirmOpen(true) }}>Delete</button>
          </div>
        )} empty="No customers" />
      </Card>

      {/* Details Modal */}
      <Modal
        open={open}
        onClose={()=>{ setOpen(false); setSelected(null) }}
        title={selected ? `Customer: ${selected.name || ''} (${selected.phone || ''})` : 'Customer Details'}
        footer={(
          <button className="btn-secondary" onClick={()=>{ setOpen(false); setSelected(null) }}>Close</button>
        )}
      >
        {!selected ? (
          <div className="text-sm text-gray-500">No customer selected.</div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">Total Records: {(selected.history||[]).length}</div>
            <div className="space-y-2">
              {(selected.history||[]).map((h, idx) => {
                // Purchases recorded by processCheckout
                const sale = (sales||[]).find(s => s.billNo === h.billNo) || null
                const visitedAt = sale ? `${sale.date}` : (h.date || '-')
                return (
                  <div key={idx} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <div><span className="text-gray-500">Visited:</span> {visitedAt}</div>
                      <div><span className="text-gray-500">Bill #:</span> {h.billNo || '-'}</div>
                    </div>
                    <div className="mt-2">
                      <div className="text-sm font-medium mb-1">Purchased Items</div>
                      <ul className="text-sm space-y-1">
                        {(sale?.items || h.items || []).map((it, iidx) => {
                          const inv = (inventory||[]).find(v => v.id === it.id)
                          const brand = inv?.category || it.brand || '-'
                          const model = inv?.name || it.name || '-'
                          const imeis = Array.isArray(it.imeis) && it.imeis.length ? it.imeis.join(', ') : '—'
                          return (
                            <li key={iidx} className="flex items-center justify-between border-b pb-1">
                              <div>
                                <div>{brand} • {model} • Qty: {it.qty}</div>
                                <div className="text-xs text-gray-500">IMEI: {imeis}</div>
                              </div>
                              <div className="font-medium">PKR {(Number(it.price||0) * Number(it.qty||0)).toLocaleString()}</div>
                            </li>
                          )
                        })}
                        {((sale?.items || h.items || []).length === 0) && (
                          <li className="text-gray-500">No items recorded</li>
                        )}
                      </ul>
                    </div>
                    <div className="mt-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Discount:</span><span>PKR {(sale?.discount || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Tax:</span><span>PKR {(sale?.tax || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Total Paid:</span><span>PKR {(sale?.total || h.total || 0).toLocaleString()}</span></div>
                    </div>
                  </div>
                )
              })}
              {(selected.history||[]).length === 0 && <div className="text-gray-500">No records</div>}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={confirmOpen}
        onClose={()=> setConfirmOpen(false)}
        title="Delete Customer"
        footer={(
          <>
            <button className="btn-secondary" onClick={()=> setConfirmOpen(false)}>Cancel</button>
            <button className="btn-primary bg-red-600 hover:bg-red-700" onClick={() => {
              if (toDelete) removeCustomer(toDelete.id)
              setConfirmOpen(false)
              setToDelete(null)
            }}>Delete</button>
          </>
        )}
      >
        <div className="space-y-2">
          <p className="text-sm text-gray-700">You're about to delete the following customer. This action cannot be undone.</p>
          {toDelete && (
            <div className="p-3 border rounded-lg bg-gray-50 text-sm">
              <div><span className="text-gray-500">Name:</span> <span className="font-medium">{toDelete.name}</span></div>
              <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{toDelete.phone || '—'}</span></div>
              <div><span className="text-gray-500">Records:</span> <span className="font-medium">{(toDelete.history||[]).length}</span></div>
            </div>
          )}
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
