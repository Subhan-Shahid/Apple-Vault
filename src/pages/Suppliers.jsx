import { useState } from 'react'
import useStore from '../store/useStore'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { Pencil, Trash2, Plus, Eye } from 'lucide-react'

export default function Suppliers() {
  const { suppliers, addSupplier, removeSupplier, updateSupplier } = useStore()
  const [printOpen, setPrintOpen] = useState(false)
  const [printHtml, setPrintHtml] = useState('')
  const [frameRef, setFrameRef] = useState(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [cnic, setCnic] = useState('')
  const [address, setAddress] = useState('')
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [editingPhone, setEditingPhone] = useState('')
  const [editingCnic, setEditingCnic] = useState('')
  const [editingAddress, setEditingAddress] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailSupplier, setDetailSupplier] = useState(null)

  const onAdd = () => {
    const n = name.trim()
    if (!n) return
    addSupplier({ name: n, phone: phone.trim(), cnic: cnic.trim(), address: address.trim() })
    setName('')
    setPhone('')
    setCnic('')
    setAddress('')
    setOpen(false)
  }

  const onPrint = () => {
    const rows = suppliers || []
    const thead = `
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>CNIC</th>
          <th>Address</th>
        </tr>
      </thead>
    `
    const tbody = rows.map(s => `
      <tr>
        <td>${s.name || ''}</td>
        <td>${s.phone || '—'}</td>
        <td>${s.cnic || '—'}</td>
        <td>${s.address || '—'}</td>
      </tr>
    `).join('')
    const html = `<!doctype html><html><head><meta charset=\"utf-8\"><title>Suppliers</title>
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
        <div class=\"wrap\">
          <h2>Suppliers</h2>
          <table>${thead}<tbody>${tbody}</tbody></table>
        </div>
      </body></html>`
    setPrintHtml(html)
    setPrintOpen(true)
  }

  const onStartEdit = (s) => {
    setEditingId(s.id)
    setEditingName(s.name)
    setEditingPhone(s.phone || '')
    setEditingCnic(s.cnic || '')
    setEditingAddress(s.address || '')
  }

  const onSaveEdit = () => {
    const n = editingName.trim()
    if (!n) { setEditingId(null); setEditingName(''); setEditingPhone(''); setEditingCnic(''); setEditingAddress(''); return }
    updateSupplier(editingId, { name: n, phone: editingPhone.trim(), cnic: editingCnic.trim(), address: editingAddress.trim() })
    setEditingId(null)
    setEditingName('')
    setEditingPhone('')
    setEditingCnic('')
    setEditingAddress('')
  }

  return (
    <div className="space-y-4">
      <h1 className="font-semibold">Suppliers</h1>

      <Card title="Add Supplier">
        <div className="flex items-center gap-2">
          <button className="btn-primary" onClick={()=>setOpen(true)}><Plus size={16}/> Add Supplier</button>
        </div>
      </Card>

      <Card title="All Suppliers" action={(
        <button className="btn-secondary btn-sm" onClick={onPrint}>Print List</button>
      )}>
        <div className="divide-y">
          {(suppliers||[]).map(s => (
            <div key={s.id} className="py-3">
              {editingId === s.id ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="label">Supplier Name</label>
                    <input className="input" value={editingName} onChange={e=>setEditingName(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Phone Number</label>
                    <input className="input" value={editingPhone} onChange={e=>setEditingPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">CNIC</label>
                    <input className="input" value={editingCnic} onChange={e=>setEditingCnic(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Address</label>
                    <input className="input" value={editingAddress} onChange={e=>setEditingAddress(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2 mt-1">
                    <button className="btn-primary" onClick={onSaveEdit}>Save</button>
                    <button className="btn-secondary" onClick={()=>{ setEditingId(null); setEditingName(''); setEditingPhone(''); setEditingCnic(''); setEditingAddress('') }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <button className="font-medium text-left hover:underline" onClick={()=>{ setDetailSupplier(s); setDetailOpen(true) }}>{s.name}</button>
                    <div className="text-xs text-gray-600">{s.phone || '—'} • {s.cnic || '—'} • {s.address || '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="btn-secondary" onClick={()=>{ setDetailSupplier(s); setDetailOpen(true) }}><Eye size={16}/> View</button>
                    <button className="btn-secondary" onClick={()=>onStartEdit(s)}><Pencil size={16}/> Edit</button>
                    <button className="btn-primary bg-red-600 hover:bg-red-700" onClick={()=>{ setToDelete(s); setConfirmOpen(true) }}><Trash2 size={16}/> Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {(suppliers||[]).length === 0 && (
            <div className="text-sm text-gray-500 py-4">No suppliers yet</div>
          )}
        </div>
      </Card>

      {/* Add Supplier Modal */}
      <Modal
        open={open}
        onClose={()=>{ setOpen(false); setName(''); setPhone(''); setCnic(''); setAddress('') }}
        title="Add Supplier"
        footer={(
          <>
            <button className="btn-secondary" onClick={()=>{ setOpen(false); setName(''); setPhone(''); setCnic(''); setAddress('') }}>Cancel</button>
            <button className="btn-primary" onClick={onAdd}>Save</button>
          </>
        )}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Supplier Name</label>
            <input className="input" placeholder="e.g., Mobile Hub" value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input className="input" placeholder="03xx-xxxxxxx" value={phone} onChange={e=>setPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">CNIC</label>
            <input className="input" placeholder="35202-xxxxxxx-x" value={cnic} onChange={e=>setCnic(e.target.value)} />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" placeholder="Street, City" value={address} onChange={e=>setAddress(e.target.value)} />
          </div>
        </div>
      </Modal>

      {/* Supplier Details Modal */}
      <Modal
        open={detailOpen}
        onClose={()=>{ setDetailOpen(false); setDetailSupplier(null) }}
        title={detailSupplier ? `Supplier: ${detailSupplier.name}` : 'Supplier Details'}
        footer={(<button className="btn-secondary" onClick={()=>{ setDetailOpen(false); setDetailSupplier(null) }}>Close</button>)}
      >
        {detailSupplier ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-500">Name</div>
              <div className="font-medium">{detailSupplier.name}</div>
            </div>
            <div>
              <div className="text-gray-500">Phone</div>
              <div className="font-medium">{detailSupplier.phone || '—'}</div>
            </div>
            <div>
              <div className="text-gray-500">CNIC</div>
              <div className="font-medium">{detailSupplier.cnic || '—'}</div>
            </div>
            <div>
              <div className="text-gray-500">Address</div>
              <div className="font-medium">{detailSupplier.address || '—'}</div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">No supplier selected.</div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={confirmOpen}
        onClose={()=>{ setConfirmOpen(false); setToDelete(null) }}
        title="Delete Supplier"
        footer={(
          <>
            <button className="btn-secondary" onClick={()=>{ setConfirmOpen(false); setToDelete(null) }}>Cancel</button>
            <button
              className="btn-primary bg-red-600 hover:bg-red-700"
              onClick={()=>{
                if (toDelete) removeSupplier(toDelete.id)
                setConfirmOpen(false)
                setToDelete(null)
              }}
            >Yes, Delete</button>
          </>
        )}
      >
        <div className="space-y-2 text-sm">
          <p className="text-gray-700">You're about to delete this supplier. This action cannot be undone.</p>
          {toDelete && (
            <div className="p-3 border rounded-lg bg-gray-50">
              <div><span className="text-gray-500">Name:</span> <span className="font-medium">{toDelete.name}</span></div>
              <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{toDelete.phone || '—'}</span></div>
              <div><span className="text-gray-500">CNIC:</span> <span className="font-medium">{toDelete.cnic || '—'}</span></div>
              <div><span className="text-gray-500">Address:</span> <span className="font-medium">{toDelete.address || '—'}</span></div>
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
