import { useMemo, useRef, useState } from 'react'
import useStore from '../store/useStore'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'
import { buildThermalReceiptHtml } from '../utils/posReceipt'

export default function Sales() {
  const { mobiles, sellMobile, businessDate, addBill, settings } = useStore()
  const inStock = useMemo(() => mobiles.filter(m => m.status === 'in_stock'), [mobiles])
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ mobileId: '', price: '', date: businessDate, customer: { name: '', phone: '', cnic: '' } })
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptHtml, setReceiptHtml] = useState('')
  const [frameRef, setFrameRef] = useState(null)

  const filtered = useMemo(() => inStock.filter(m =>
    [m.company, m.model, m.imei, m.color].join(' ').toLowerCase().includes(query.toLowerCase())
  ), [inStock, query])

  const cols = [
    { key: 'company', title: 'Company' },
    { key: 'model', title: 'Model' },
    { key: 'color', title: 'Color' },
    { key: 'imei', title: 'IMEI' },
    { key: 'purchasePrice', title: 'Purchase', render: v => Number(v).toLocaleString() },
  ]

  const printRef = useRef(null)

  const onSell = (m) => {
    setForm(f => ({ ...f, mobileId: m.id, price: '', customer: { name: '', phone: '', cnic: '' } }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (!form.mobileId) return alert('Select a mobile from list below to sell')
    const payload = { ...form, price: Number(form.price) }
    sellMobile(payload)
    const bill = {
      id: Date.now().toString(),
      billNo: Math.floor(Math.random()*900000 + 100000),
      date: businessDate,
      customer: payload.customer,
      item: mobiles.find(m => m.id === payload.mobileId),
      amount: payload.price,
    }
    addBill(bill)
    // Build POS-style thermal receipt and open preview
    try {
      const company = { name: settings?.companyName || 'MobileShop', phone: settings?.phone || '', address: settings?.address || '', logoDataUrl: settings?.logoDataUrl || '' }
      const item = bill.item || {}
      const name = `${item.company || ''} ${item.model || ''}${item.color ? ' ('+item.color+')' : ''}`.trim() || 'Mobile'
      const price = Number(bill.amount || 0)
      const items = [{ name, qty: 1, price, imeis: item.imei ? [item.imei] : [] }]
      const subtotal = price
      const discount = 0
      const tax = 0
      const total = price
      const html = buildThermalReceiptHtml({
        company,
        customerName: bill.customer?.name || 'Walk-in',
        billNo: String(bill.billNo || '').padStart(6,'0'),
        dateTime: bill.date || businessDate,
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
    } catch(_e) {}
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Sales</h1>

      <Card title="Sell Mobile">
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="label">Select Mobile (from stock)</label>
            <div className="text-sm text-gray-600">Choose from the table below and click "Sell"</div>
          </div>
          <div>
            <label className="label">Selling Price</label>
            <input type="number" className="input" value={form.price} onChange={e => setForm(v=>({...v, price: e.target.value}))} required />
          </div>
          <div>
            <label className="label">Sale Date (Business)</label>
            <input className="input" value={form.date} readOnly />
          </div>
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Customer Name</label>
              <input className="input" value={form.customer.name} onChange={e => setForm(v=>({...v, customer: {...v.customer, name: e.target.value}}))} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.customer.phone} onChange={e => setForm(v=>({...v, customer: {...v.customer, phone: e.target.value}}))} />
            </div>
            <div>
              <label className="label">CNIC</label>
              <input className="input" value={form.customer.cnic} onChange={e => setForm(v=>({...v, customer: {...v.customer, cnic: e.target.value}}))} />
            </div>
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button className="btn-primary" type="submit">Confirm Sale & Print Bill</button>
          </div>
        </form>
      </Card>

      <Card title="Stock" action={<input className="input" placeholder="Search..." value={query} onChange={e=>setQuery(e.target.value)} />}>
        <Table columns={cols} data={filtered} renderActions={(row) => (
          <button className="btn-secondary" onClick={() => onSell(row)}>Sell</button>
        )} empty="No mobiles in stock" />
      </Card>

      {/* In-app Receipt Preview/Print */}
      <Modal
        open={receiptOpen}
        onClose={()=>setReceiptOpen(false)}
        title="Receipt"
        footer={(
          <>
            <button className="btn-primary" onClick={()=>{ try { frameRef?.contentWindow?.focus(); frameRef?.contentWindow?.print(); } catch(e){} }}>Print</button>
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
