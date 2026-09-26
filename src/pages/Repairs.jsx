import { useMemo, useState } from 'react'
import useStore from '../store/useStore'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'

export default function Repairs() {
  const { mobiles, repairs, sendToRepair, receiveFromRepair, businessDate } = useStore()
  const [query, setQuery] = useState('')
  const [cost, setCost] = useState('')

  const inStockOrRepair = useMemo(() => mobiles.filter(m => ['in_stock','repair'].includes(m.status)), [mobiles])
  const filtered = useMemo(() => inStockOrRepair.filter(m =>
    [m.company, m.model, m.imei, m.color].join(' ').toLowerCase().includes(query.toLowerCase())
  ), [inStockOrRepair, query])

  const cols = [
    { key: 'company', title: 'Company' },
    { key: 'model', title: 'Model' },
    { key: 'color', title: 'Color' },
    { key: 'imei', title: 'IMEI' },
    { key: 'status', title: 'Status' },
  ]

  const onSend = (m) => {
    if (!cost) return alert('Enter repair cost first')
    sendToRepair({ mobileId: m.id, cost: Number(cost), dateSent: businessDate })
    setCost('')
  }

  const pendingRepairs = repairs.filter(r => r.status === 'sent')

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Repairs</h1>
      <Card title="Send to Repair" action={<input className="input" placeholder="Search..." value={query} onChange={e=>setQuery(e.target.value)} />}>
        <div className="mb-3">
          <label className="label">Estimated Repair Cost</label>
          <input type="number" className="input" value={cost} onChange={e=>setCost(e.target.value)} />
        </div>
        <Table columns={cols} data={filtered} renderActions={(row) => (
          <button className="btn-secondary" onClick={() => onSend(row)}>Send</button>
        )} empty="No mobiles" />
      </Card>

      <Card title="Pending Repairs">
        <Table columns={[
          { key: 'mobileId', title: 'Mobile', render: (v) => {
            const m = mobiles.find(mm => mm.id === v)
            return m ? `${m.company} ${m.model} (${m.imei})` : v
          } },
          { key: 'cost', title: 'Cost', render: (v) => Number(v).toLocaleString() },
          { key: 'dateSent', title: 'Date Sent' },
          { key: 'status', title: 'Status' },
        ]} data={pendingRepairs} renderActions={(row) => (
          <button className="btn-secondary" onClick={() => receiveFromRepair({ repairId: row.id, dateReceived: businessDate, status: 'fixed' })}>Mark Received</button>
        )} empty="No pending repairs" />
      </Card>
    </div>
  )
}
