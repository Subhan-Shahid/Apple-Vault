import { useState } from 'react'
import useStore from '../store/useStore'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'

export default function DayControl() {
  const { businessDate, isDayOpen, closeDay, startNewDay, openDay } = useStore()
  const [confirmClose, setConfirmClose] = useState(false)
  const [confirmStart, setConfirmStart] = useState(false)
  const [confirmReopen, setConfirmReopen] = useState(false)

  const handleClose = () => {
    closeDay()
    setConfirmClose(false)
  }

  const handleStart = () => {
    startNewDay()
    setConfirmStart(false)
  }

  const handleReopen = () => {
    openDay(businessDate)
    setConfirmReopen(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Day Open / Close</h1>

      <Card title="Status">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Current Business Date</div>
            <div className="text-2xl font-bold">{businessDate}</div>
          </div>
          <div>
            <span className={`px-3 py-1 text-sm rounded-full ${isDayOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
              {isDayOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card title="Close Current Day" action={null}>
          <p className="text-sm text-gray-600 mb-3">Prevent new records for the current business date.</p>
          <button className="btn-secondary" onClick={() => setConfirmClose(true)} disabled={!isDayOpen}>Close Day</button>
        </Card>

        <Card title="Start New Day" action={null}>
          <p className="text-sm text-gray-600 mb-3">Increment business date and open a new day.</p>
          <button className="btn-primary" onClick={() => setConfirmStart(true)} disabled={isDayOpen}>Start New Day</button>
        </Card>

        <Card title="Re-open Today" action={null}>
          <p className="text-sm text-gray-600 mb-3">Re-open the current date if accidentally closed.</p>
          <button className="btn-secondary" onClick={() => setConfirmReopen(true)} disabled={isDayOpen}>Re-open</button>
        </Card>
      </div>

      <Modal open={confirmClose} onClose={() => setConfirmClose(false)} title="Confirm Close Day" footer={[
        <button key="cancel" className="btn-secondary" onClick={() => setConfirmClose(false)}>Cancel</button>,
        <button key="ok" className="btn-primary" onClick={handleClose}>Close Day</button>
      ]}>
        <p className="text-sm text-gray-700">Are you sure you want to close the business day <strong>{businessDate}</strong>? You will not be able to add new records until you start a new day or re-open.</p>
      </Modal>

      <Modal open={confirmStart} onClose={() => setConfirmStart(false)} title="Confirm Start New Day" footer={[
        <button key="cancel" className="btn-secondary" onClick={() => setConfirmStart(false)}>Cancel</button>,
        <button key="ok" className="btn-primary" onClick={handleStart}>Start New Day</button>
      ]}>
        <p className="text-sm text-gray-700">This will move the business date to the next day and open it. Continue?</p>
      </Modal>

      <Modal open={confirmReopen} onClose={() => setConfirmReopen(false)} title="Confirm Re-open Day" footer={[
        <button key="cancel" className="btn-secondary" onClick={() => setConfirmReopen(false)}>Cancel</button>,
        <button key="ok" className="btn-primary" onClick={handleReopen}>Re-open</button>
      ]}>
        <p className="text-sm text-gray-700">Re-open the current business date <strong>{businessDate}</strong> for new records?</p>
      </Modal>
    </div>
  )
}
