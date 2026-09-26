import { useMemo, useState } from 'react'
import { Plus, Printer, Eye } from 'lucide-react'
import useStore from '../store/useStore'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'
import DateInput from '../components/DateInput'

export default function Retailer() {
  const { inventory, retailerSales = [], addRetailerSale, markRetailerPaid, returnRetailerSale } = useStore()
  const [open, setOpen] = useState(false)
  const [confirmPay, setConfirmPay] = useState(null)
  const [confirmReturn, setConfirmReturn] = useState(null)
  const [printOpen, setPrintOpen] = useState(false)
  const [printHtml, setPrintHtml] = useState('')
  const [frameRef, setFrameRef] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all') // all | pending | paid | returned
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailSale, setDetailSale] = useState(null)
  const [form, setForm] = useState({
    retailerName: '',
    shopName: '',
    phone: '',
    items: [{ inventoryId: '', qty: 1, price: 0 }],
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  })
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSales = useMemo(() => {
    let list = retailerSales || []
    if (filterStatus !== 'all') {
      list = list.filter(s => s.status === filterStatus)
    }
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [retailerSales, filterStatus])

  const stats = useMemo(() => {
    const pending = (retailerSales || []).filter(s => s.status === 'pending')
    const paid = (retailerSales || []).filter(s => s.status === 'paid')
    const returned = (retailerSales || []).filter(s => s.status === 'returned')
    const pendingAmount = pending.reduce((a, s) => a + Number(s.total || 0), 0)
    const paidAmount = paid.reduce((a, s) => a + Number(s.total || 0), 0)
    return {
      totalSales: retailerSales.length,
      pending: pending.length,
      paid: paid.length,
      returned: returned.length,
      pendingAmount,
      paidAmount,
    }
  }, [retailerSales])

  const addItem = () => {
    setForm(f => ({ ...f, items: [...f.items, { inventoryId: '', qty: 1, price: 0 }] }))
  }

  const removeItem = (idx) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  const updateItem = (idx, field, value) => {
    setForm(f => {
      const next = [...f.items]
      next[idx] = { ...next[idx], [field]: value }
      // Auto-fill price when inventory item is selected
      if (field === 'inventoryId' && value) {
        const inv = inventory.find(i => i.id === value)
        if (inv) {
          next[idx].price = Number(inv.purchasePrice || 0)
        }
      }
      return { ...f, items: next }
    })
  }

  // Search by IMEI or barcode
  const handleSearch = (query, itemIdx) => {
    if (!query || !query.trim()) return
    
    const q = query.trim().toLowerCase()
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const qn = norm(q)
    
    // Find inventory item by IMEI or barcode (same logic as POS)
    const found = inventory.find(inv => {
      // Check barcode - exact and normalized
      const barcode = String(inv.barcode || '').toLowerCase()
      if (barcode === q || norm(barcode) === qn) return true
      
      // Check IMEIs - exact and normalized
      const imeis = Array.isArray(inv.imeis) ? inv.imeis : []
      return imeis.some(im => {
        const imStr = String(im || '').toLowerCase()
        return imStr === q || norm(imStr) === qn
      })
    })
    
    if (found) {
      updateItem(itemIdx, 'inventoryId', found.id)
    } else {
      alert('Mobile not found with this IMEI/Barcode')
    }
  }

  const handleSubmit = () => {
    if (!form.retailerName.trim()) {
      alert('Please enter retailer name')
      return
    }
    if (!form.phone.trim()) {
      alert('Please enter phone number')
      return
    }
    if (form.items.length === 0 || !form.items[0].inventoryId) {
      alert('Please add at least one item')
      return
    }

    // Validate stock availability
    for (const item of form.items) {
      const inv = inventory.find(i => i.id === item.inventoryId)
      if (!inv) {
        alert('Invalid item selected')
        return
      }
      const qty = Number(item.qty || 0)
      const stock = Number(inv.totalItems || 0)
      if (qty > stock) {
        alert(`Not enough stock for ${inv.name}. Available: ${stock}, Requested: ${qty}`)
        return
      }
      if (qty <= 0) {
        alert('Quantity must be greater than 0')
        return
      }
    }

    const total = form.items.reduce((a, it) => {
      return a + (Number(it.price || 0) * Number(it.qty || 0))
    }, 0)

    addRetailerSale({
      retailerName: form.retailerName.trim(),
      shopName: form.shopName.trim(),
      phone: form.phone.trim(),
      items: form.items,
      total,
      date: form.date,
      notes: form.notes.trim(),
      status: 'pending',
    })

    setForm({
      retailerName: '',
      shopName: '',
      phone: '',
      items: [{ inventoryId: '', qty: 1, price: 0 }],
      date: new Date().toISOString().slice(0, 10),
      notes: '',
    })
    setOpen(false)
  }

  const handleMarkPaid = (sale) => {
    markRetailerPaid(sale.id)
    setConfirmPay(null)
  }

  const handleReturn = (sale) => {
    returnRetailerSale(sale.id)
    setConfirmReturn(null)
  }

  const columns = [
    { key: 'date', title: 'Date' },
    { key: 'retailerName', title: 'Retailer Name' },
    { key: 'shopName', title: 'Shop Name' },
    { key: 'phone', title: 'Phone' },
    { key: 'total', title: 'Total Amount', render: v => `PKR ${Number(v).toLocaleString()}` },
    { key: 'status', title: 'Status', render: (v) => {
      const colors = {
        pending: 'bg-yellow-50 border-yellow-200 text-yellow-700',
        paid: 'bg-green-50 border-green-200 text-green-700',
        returned: 'bg-red-50 border-red-200 text-red-700',
      }
      return (
        <span className={`px-2 py-0.5 rounded-full text-xs border ${colors[v] || ''}`}>
          {v || 'pending'}
        </span>
      )
    }},
  ]

  const onPrint = () => {
    const rows = filteredSales
    const thead = `
      <thead>
        <tr>
          <th>Date</th>
          <th>Retailer Name</th>
          <th>Shop Name</th>
          <th>Phone</th>
          <th>Total Amount</th>
          <th>Status</th>
        </tr>
      </thead>
    `
    const tbody = rows.map(r => `
      <tr>
        <td>${r.date || ''}</td>
        <td>${r.retailerName || ''}</td>
        <td>${r.shopName || ''}</td>
        <td>${r.phone || ''}</td>
        <td style="text-align:right">${Number(r.total || 0).toLocaleString()}</td>
        <td>${r.status || 'pending'}</td>
      </tr>
    `).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Retailer Sales</title>
      <style>
        @page { size: A4 portrait; margin: 12mm }
        * { box-sizing: border-box }
        body { margin: 0; padding: 0; background: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif; color: #111827; font-size: 12px; }
        .wrap { padding: 12mm }
        h2 { margin: 0 0 8px; font-size: 18px; }
        table { width: 100%; border-collapse: collapse; }
        thead th { background: #f3f4f6; font-weight: 700; text-align: left; border: 1px solid #e5e7eb; padding: 6px 8px; }
        tbody td { border: 1px solid #e5e7eb; padding: 6px 8px; vertical-align: top; }
        tbody tr:nth-child(even) td { background: #fafafa; }
        @media print { thead { display: table-header-group; } }
      </style>
      </head><body>
        <div class="wrap">
          <h2>Retailer Sales</h2>
          <div class="range">Filter: ${filterStatus} • ${rows.length} record(s)</div>
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Retailer / Wholesale Sales</h1>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} /> Add New Sale
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Total Sales</div>
              <div className="text-2xl font-semibold">{stats.totalSales}</div>
            </div>
            <button className="btn-secondary btn-sm" onClick={() => {
              setFilterStatus('all')
              // Scroll to table
              setTimeout(() => {
                const table = document.querySelector('[data-retailer-table]')
                if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }, 100)
            }}>
              <Eye size={16} />
            </button>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Pending Payment</div>
              <div className="text-2xl font-semibold text-yellow-600">{stats.pending}</div>
              <div className="text-xs text-gray-500 mt-1">PKR {stats.pendingAmount.toLocaleString()}</div>
            </div>
            <button className="btn-secondary btn-sm" onClick={() => {
              setFilterStatus('pending')
              setTimeout(() => {
                const table = document.querySelector('[data-retailer-table]')
                if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }, 100)
            }}>
              <Eye size={16} />
            </button>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Paid</div>
              <div className="text-2xl font-semibold text-green-600">{stats.paid}</div>
              <div className="text-xs text-gray-500 mt-1">PKR {stats.paidAmount.toLocaleString()}</div>
            </div>
            <button className="btn-secondary btn-sm" onClick={() => {
              setFilterStatus('paid')
              setTimeout(() => {
                const table = document.querySelector('[data-retailer-table]')
                if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }, 100)
            }}>
              <Eye size={16} />
            </button>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Returned</div>
              <div className="text-2xl font-semibold text-red-600">{stats.returned}</div>
            </div>
            <button className="btn-secondary btn-sm" onClick={() => {
              setFilterStatus('returned')
              setTimeout(() => {
                const table = document.querySelector('[data-retailer-table]')
                if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }, 100)
            }}>
              <Eye size={16} />
            </button>
          </div>
        </Card>
      </div>

      <Card title="Retailer Sales" action={(
        <div className="flex items-center gap-2">
          <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="returned">Returned</option>
          </select>
          <button className="btn-secondary btn-sm" onClick={onPrint}>
            <Printer size={16} /> Print
          </button>
        </div>
      )}>
        <div data-retailer-table>
          <Table
          columns={columns}
          data={filteredSales}
          renderActions={(row) => (
            <div className="flex items-center gap-2">
              <button className="btn-secondary btn-sm" onClick={() => {
                setDetailSale(row)
                setDetailOpen(true)
              }}>
                <Eye size={16} /> View
              </button>
              {row.status === 'pending' && (
                <>
                  <button className="btn-primary btn-sm bg-green-600 hover:bg-green-700" onClick={() => setConfirmPay(row)}>
                    Mark Paid
                  </button>
                  <button className="btn-secondary btn-sm" onClick={() => setConfirmReturn(row)}>
                    Return
                  </button>
                </>
              )}
              {row.status === 'paid' && (
                <span className="text-xs text-green-600">Payment Received</span>
              )}
              {row.status === 'returned' && (
                <span className="text-xs text-red-600">Items Returned</span>
              )}
            </div>
          )}
          empty="No retailer sales yet"
        />
        </div>
      </Card>

      {/* Add Sale Modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Retailer Sale"
        footer={(
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit}>Save Sale</button>
          </>
        )}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Retailer Name *</label>
            <input
              className="input"
              value={form.retailerName}
              onChange={e => setForm(f => ({ ...f, retailerName: e.target.value }))}
              placeholder="Enter retailer name"
            />
          </div>
          <div>
            <label className="label">Shop Name</label>
            <input
              className="input"
              value={form.shopName}
              onChange={e => setForm(f => ({ ...f, shopName: e.target.value }))}
              placeholder="Enter shop name"
            />
          </div>
          <div>
            <label className="label">Phone Number *</label>
            <input
              className="input"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="03xx-xxxxxxx"
            />
          </div>
          <div>
            <label className="label">Date</label>
            <DateInput value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="label">Items</label>
            <button className="btn-secondary btn-sm" onClick={addItem}>
              <Plus size={14} /> Add Item
            </button>
          </div>
          {form.items.map((item, idx) => {
            const selectedInv = inventory.find(i => i.id === item.inventoryId)
            return (
              <div key={idx} className="mb-3">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-12 mb-1">
                    <input
                      className="input"
                      placeholder="Scan IMEI or Barcode..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleSearch(e.target.value, idx)
                          e.target.value = ''
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          handleSearch(e.target.value, idx)
                          e.target.value = ''
                        }
                      }}
                    />
                  </div>
                  <div className="col-span-6">
                    <select
                      className="input"
                      value={item.inventoryId}
                      onChange={e => updateItem(idx, 'inventoryId', e.target.value)}
                    >
                      <option value="">Select Mobile</option>
                      {(inventory || []).map(inv => (
                        <option key={inv.id} value={inv.id}>
                          {inv.name} (Stock: {inv.totalItems})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      className="input"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={e => updateItem(idx, 'qty', e.target.value)}
                      min="1"
                      max={selectedInv ? selectedInv.totalItems : 999}
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      className="input"
                      placeholder="Price"
                      value={item.price}
                      onChange={e => updateItem(idx, 'price', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 flex items-center">
                    {form.items.length > 1 && (
                      <button className="btn-secondary btn-sm" onClick={() => removeItem(idx)}>×</button>
                    )}
                  </div>
                </div>
                {selectedInv && (
                  <div className="text-xs text-gray-600 mt-1 ml-1">
                    Selected: {selectedInv.name} • {selectedInv.category} • Stock: {selectedInv.totalItems} • Price: {Number(selectedInv.purchasePrice || 0).toLocaleString()}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-3">
          <label className="label">Notes (optional)</label>
          <textarea
            className="input"
            rows="2"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Add any notes..."
          />
        </div>

        <div className="mt-3 text-right">
          <div className="text-sm text-gray-600">Total Amount:</div>
          <div className="text-xl font-semibold">
            PKR {form.items.reduce((a, it) => a + (Number(it.price || 0) * Number(it.qty || 0)), 0).toLocaleString()}
          </div>
        </div>
      </Modal>

      {/* Confirm Payment Modal */}
      <Modal
        open={!!confirmPay}
        onClose={() => setConfirmPay(null)}
        title="Confirm Payment Received"
        footer={(
          <>
            <button className="btn-secondary" onClick={() => setConfirmPay(null)}>Cancel</button>
            <button className="btn-primary bg-green-600 hover:bg-green-700" onClick={() => handleMarkPaid(confirmPay)}>
              Confirm Payment
            </button>
          </>
        )}
      >
        {confirmPay && (
          <div className="space-y-2 text-sm">
            <p>Mark this sale as paid?</p>
            <div className="p-3 border rounded-lg bg-gray-50">
              <div><span className="text-gray-500">Retailer:</span> <span className="font-medium">{confirmPay.retailerName}</span></div>
              <div><span className="text-gray-500">Amount:</span> <span className="font-medium">PKR {Number(confirmPay.total).toLocaleString()}</span></div>
              <div><span className="text-gray-500">Date:</span> <span className="font-medium">{confirmPay.date}</span></div>
            </div>
            <p className="text-xs text-gray-600">This will add the sale amount to your total sales.</p>
          </div>
        )}
      </Modal>

      {/* Confirm Return Modal */}
      <Modal
        open={!!confirmReturn}
        onClose={() => setConfirmReturn(null)}
        title="Confirm Return"
        footer={(
          <>
            <button className="btn-secondary" onClick={() => setConfirmReturn(null)}>Cancel</button>
            <button className="btn-primary bg-red-600 hover:bg-red-700" onClick={() => handleReturn(confirmReturn)}>
              Confirm Return
            </button>
          </>
        )}
      >
        {confirmReturn && (
          <div className="space-y-2 text-sm">
            <p>Return items from this sale?</p>
            <div className="p-3 border rounded-lg bg-gray-50">
              <div><span className="text-gray-500">Retailer:</span> <span className="font-medium">{confirmReturn.retailerName}</span></div>
              <div><span className="text-gray-500">Amount:</span> <span className="font-medium">PKR {Number(confirmReturn.total).toLocaleString()}</span></div>
            </div>
            <p className="text-xs text-gray-600">Items will be returned to inventory and payment will not be recorded.</p>
          </div>
        )}
      </Modal>

      {/* Print Modal */}
      <Modal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        title="Print Preview"
        footer={(
          <>
            <button className="btn-primary" onClick={() => { try { frameRef?.contentWindow?.focus(); frameRef?.contentWindow?.print(); } catch (e) { } }}>
              Print
            </button>
            <button className="btn-secondary" onClick={() => setPrintOpen(false)}>OK</button>
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

      {/* Detail View Modal */}
      <Modal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setDetailSale(null)
        }}
        title="Sale Details"
        footer={(
          <button className="btn-primary" onClick={() => {
            setDetailOpen(false)
            setDetailSale(null)
          }}>Close</button>
        )}
      >
        {detailSale && (
          <div className="space-y-4">
            {/* Customer Info */}
            <div className="border-b pb-3">
              <h3 className="font-semibold text-lg mb-2">Customer Information</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Retailer Name:</span>
                  <div className="font-medium">{detailSale.retailerName}</div>
                </div>
                <div>
                  <span className="text-gray-500">Shop Name:</span>
                  <div className="font-medium">{detailSale.shopName || '—'}</div>
                </div>
                <div>
                  <span className="text-gray-500">Phone Number:</span>
                  <div className="font-medium">{detailSale.phone}</div>
                </div>
                <div>
                  <span className="text-gray-500">Date:</span>
                  <div className="font-medium">{detailSale.date}</div>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <div className="font-medium capitalize">{detailSale.status}</div>
                </div>
                <div>
                  <span className="text-gray-500">Total Amount:</span>
                  <div className="font-medium text-green-600">PKR {Number(detailSale.total).toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Items Details */}
            <div>
              <h3 className="font-semibold text-lg mb-2">Mobile Details</h3>
              <div className="space-y-3">
                {(detailSale.items || []).map((item, idx) => {
                  const inv = inventory.find(i => i.id === item.inventoryId)
                  return (
                    <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="col-span-2">
                          <span className="text-gray-500">Mobile Name:</span>
                          <div className="font-semibold text-base">{inv?.name || 'Mobile'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Brand:</span>
                          <div className="font-medium">{inv?.category || '—'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Color:</span>
                          <div className="font-medium">{inv?.color || '—'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Quantity:</span>
                          <div className="font-medium">{item.qty}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Price (each):</span>
                          <div className="font-medium">PKR {Number(item.price).toLocaleString()}</div>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Line Total:</span>
                          <div className="font-semibold text-green-600">PKR {(Number(item.price) * Number(item.qty)).toLocaleString()}</div>
                        </div>
                        {inv?.imeis && inv.imeis.length > 0 && (
                          <div className="col-span-2">
                            <span className="text-gray-500">IMEI Numbers:</span>
                            <div className="font-mono text-xs mt-1 p-2 bg-white rounded border">
                              {inv.imeis.slice(0, item.qty).join(', ')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Notes */}
            {detailSale.notes && (
              <div className="border-t pt-3">
                <span className="text-gray-500 text-sm">Notes:</span>
                <div className="text-sm mt-1">{detailSale.notes}</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
