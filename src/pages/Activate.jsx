import { useEffect, useState } from 'react'

export default function Activate() {
  const [key, setKey] = useState('')
  const [status, setStatus] = useState('idle') // idle | checking | ok | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true
    async function check() {
      try {
        if (!window.api?.license?.check) return
        setStatus('checking')
        const res = await window.api.license.check()
        if (!mounted) return
        if (res?.activated) {
          setStatus('ok')
        } else {
          setStatus('idle')
        }
      } catch (e) {
        setStatus('idle')
      }
    }
    check()
    return () => { mounted = false }
  }, [])

  async function onActivate(e) {
    e.preventDefault()
    setStatus('checking')
    setMessage('')
    try {
      const res = await window.api.license.activate(key)
      if (res?.ok) {
        setStatus('ok')
        // Ensure the root App re-runs its license check effect
        // A full reload is simplest and most reliable across packaged builds
        setTimeout(() => {
          try { window.location.reload() } catch {}
        }, 150)
      } else {
        setStatus('error')
        setMessage(res?.message || 'Activation failed')
      }
    } catch (e) {
      setStatus('error')
      setMessage('Activation failed')
    }
  }

  // No navigation here; we trigger a full reload above on success.

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-semibold mb-4">Activate License</h1>
        <p className="text-sm text-gray-600 mb-6">Enter your license key to continue using the application.</p>
        <form onSubmit={onActivate} className="space-y-4">
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
            required
          />
          <button
            disabled={status === 'checking'}
            className="w-full bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 disabled:opacity-60"
            type="submit"
          >
            {status === 'checking' ? 'Activating…' : 'Activate'}
          </button>
        </form>
        {message && <p className="text-red-600 mt-3 text-sm">{message}</p>}
        <div className="mt-6 text-xs text-gray-500">
          Having trouble? Contact support.
        </div>
      </div>
    </div>
  )
}
