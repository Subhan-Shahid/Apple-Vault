import { useState } from 'react'
import useStore from '../store/useStore'
import Card from '../components/ui/Card'

export default function AddMobile() {
  const { addMobile, businessDate } = useStore()
  const [form, setForm] = useState({
    company: '',
    model: '',
    imei: '',
    color: '',
    purchasePrice: '',
    purchaseDate: businessDate,
  })
  const [list, setList] = useState([])

  const onSubmit = (e) => {
    e.preventDefault()
    const payload = { ...form, purchasePrice: Number(form.purchasePrice) }
    addMobile(payload)
    setList([payload, ...list])
    setForm({ company: '', model: '', imei: '', color: '', purchasePrice: '', purchaseDate: businessDate })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Add Mobile</h1>
      <Card>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Company</label>
            <input className="input" value={form.company} onChange={e => setForm(v => ({...v, company: e.target.value}))} required />
          </div>
          <div>
            <label className="label">Model</label>
            <input className="input" value={form.model} onChange={e => setForm(v => ({...v, model: e.target.value}))} required />
          </div>
          <div>
            <label className="label">IMEI</label>
            <input className="input" value={form.imei} onChange={e => setForm(v => ({...v, imei: e.target.value}))} required />
          </div>
          <div>
            <label className="label">Color</label>
            <input className="input" value={form.color} onChange={e => setForm(v => ({...v, color: e.target.value}))} />
          </div>
          <div>
            <label className="label">Purchase Price</label>
            <input type="number" className="input" value={form.purchasePrice} onChange={e => setForm(v => ({...v, purchasePrice: e.target.value}))} required />
          </div>
          <div>
            <label className="label">Purchase Date (Business)</label>
            <input className="input" value={form.purchaseDate} onChange={e => setForm(v => ({...v, purchaseDate: e.target.value}))} readOnly />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button className="btn-primary" type="submit">Add Mobile</button>
          </div>
        </form>
      </Card>

      <Card title="Recently Added">
        <ul className="divide-y">
          {list.map((m, idx) => (
            <li key={idx} className="py-2 text-sm text-gray-700 flex justify-between">
              <span>{m.company} {m.model} • {m.color} • IMEI: {m.imei}</span>
              <span className="font-medium">{Number(m.purchasePrice).toLocaleString()}</span>
            </li>
          ))}
          {list.length === 0 && <div className="text-sm text-gray-500">No recent items</div>}
        </ul>
      </Card>
    </div>
  )
}
