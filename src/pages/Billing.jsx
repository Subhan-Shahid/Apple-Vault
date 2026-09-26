import { useMemo, useRef, useState } from 'react'
import useStore from '../store/useStore'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'
import { buildThermalReceiptHtml } from '../utils/posReceipt'

export default function Billing() {
  const { sales, mobiles, businessDate, settings } = useStore()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptHtml, setReceiptHtml] = useState('')
  const [frameRef, setFrameRef] = useState(null)

  const salesWithMobile = useMemo(() => sales
    .map(s => ({
      ...s,
      mobile: mobiles.find(m => m.id === s.mobileId)
    }))
    .filter(s => !!s.mobile)
  , [sales, mobiles])

  const filtered = useMemo(() => salesWithMobile.filter(s => {
    const t = [s.mobile.company, s.mobile.model, s.mobile.imei, s.customer?.name, s.customer?.phone, s.customer?.cnic].join(' ').toLowerCase()
    return t.includes(query.toLowerCase())
  }), [salesWithMobile, query])

  const columns = [
    { key: 'date', title: 'Date' },
    { key: 'item', title: 'Item', render: (_, row) => `${row.mobile.company} ${row.mobile.model} (${row.mobile.color})` },
    { key: 'imei', title: 'IMEI', render: (_, row) => row.mobile.imei },
    { key: 'customer', title: 'Customer', render: (v) => v?.name || '-' },
    { key: 'price', title: 'Amount', render: (v) => Number(v).toLocaleString() },
  ]

  const onPrint = () => {
    if (!selected) return
    // Build POS-style thermal receipt for this sale
    const company = { name: settings?.companyName || 'MobileShop', phone: settings?.phone || '', address: settings?.address || '', logoDataUrl: settings?.logoDataUrl || '' }
    const item = selected.mobile
    const name = `${item.company} ${item.model}${item.color ? ' ('+item.color+')' : ''}`
    const price = Number(selected.price ?? selected.amount ?? 0)
    const items = [{ name, qty: 1, price, imeis: item.imei ? [item.imei] : [] }]
    const subtotal = price
    const discount = 0
    const tax = 0
    const total = price
    const html = buildThermalReceiptHtml({
      company,
      customerName: selected.customer?.name || 'Walk-in',
      billNo: selected.billNo || String(selected.id || '').slice(-6) || '-',
      dateTime: selected.date || businessDate,
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
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Billing</h1>

      <Card title="Sales" action={<input className="input" placeholder="Search by customer, IMEI, model" value={query} onChange={e=>setQuery(e.target.value)} />}>
        <Table columns={columns} data={filtered} renderActions={(row) => (
          <button className="btn-secondary" onClick={() => setSelected(row)}>Generate Bill</button>
        )} empty="No sales yet" />
      </Card>
      {selected && (
        <Card title="Preview">
          <div className="flex justify-end mb-3">
            <button className="btn-primary" onClick={onPrint}>Print</button>
          </div>
          <div className="text-sm text-gray-600">Thermal receipt preview will open in a popup window for printing.</div>
        </Card>
      )}

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
