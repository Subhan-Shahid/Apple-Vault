import { useMemo, useState } from 'react'
import useStore from '../store/useStore'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'

const ROLES = ['Cashier', 'Admin', 'Manager', 'Employee']

export default function UserManagement() {
  const { users, addUser, updateUser, removeUser } = useStore()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('Cashier')
  const [error, setError] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailUser, setDetailUser] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  const resetForm = () => { setEditingId(null); setUsername(''); setPassword(''); setRole('Cashier'); setError('') }

  const onSave = () => {
    const uname = username.trim()
    if (!uname || !password) { setError('Username and Password are required'); return }
    // client-side unique validation
    const exists = users.some(u => u.username.toLowerCase() === uname.toLowerCase() && u.id !== editingId)
    if (exists) { setError('Username already exists'); return }
    if (editingId) {
      updateUser(editingId, { username: uname, ...(password ? { password } : {}), role })
    } else {
      addUser({ username: uname, password, role })
    }
    setOpen(false)
    resetForm()
  }

  const onEdit = (u) => { setEditingId(u.id); setUsername(u.username); setPassword(''); setRole(u.role); setOpen(true) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-semibold">User Management</h1>
        <button className="btn-primary" onClick={()=>{ resetForm(); setOpen(true) }}>Add User</button>
      </div>

      <Card title={`Users (${users.length})`}>
        <div className="divide-y rounded border border-gray-100 bg-white">
          {(users||[]).map(u => (
            <div key={u.id} className="flex items-center justify-between px-3 py-2">
              <div>
                <button className="font-medium hover:underline text-left" onClick={()=>{ setDetailUser(u); setDetailOpen(true) }}>{u.username}</button>
                <div className="text-xs text-gray-600">Role: {u.role}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-secondary btn-sm" onClick={()=>onEdit(u)}>Edit</button>
                <button className="btn-primary bg-red-600 hover:bg-red-700 btn-sm" onClick={()=>removeUser(u.id)}>Delete</button>
              </div>
            </div>
          ))}
          {(!users || users.length === 0) && (
            <div className="px-3 py-6 text-sm text-gray-500">No users yet.</div>
          )}
        </div>
      </Card>

      <Modal
        open={open}
        onClose={()=>{ setOpen(false); resetForm() }}
        title={editingId ? 'Edit User' : 'Add User'}
        footer={(
          <>
            <button className="btn-secondary" onClick={()=>{ setOpen(false); resetForm() }}>Cancel</button>
            <button className="btn-primary" onClick={onSave}>{editingId ? 'Update' : 'Save'}</button>
          </>
        )}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label">Username</label>
            <input className="input" value={username} onChange={e=>setUsername(e.target.value)} placeholder="unique username" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Password {editingId ? '(leave blank to keep unchanged)' : ''}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input pr-10"
                value={password}
                onChange={e=>setPassword(e.target.value)}
                placeholder="password"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-2 flex items-center text-slate-500 hover:text-slate-700"
                onClick={() => setShowPassword(v => !v)}
              >
                {showPassword ? (
                  // Eye-off icon
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M3 3l18 18" />
                    <path d="M10.584 10.587A2 2 0 0012 14a2 2 0 001.414-.586" />
                    <path d="M9.88 4.6A9.993 9.993 0 0121 12c-1.2 2.4-3.6 4.8-9 4.8-1.372 0-2.58-.196-3.63-.553" />
                    <path d="M6.18 6.18C4.26 7.45 2.97 9.03 2 12c1.2 2.4 3.6 4.8 9 4.8 1.13 0 2.16-.11 3.09-.32" />
                  </svg>
                ) : (
                  // Eye icon
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={role} onChange={e=>setRole(e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
      </Modal>

      {/* User Details Modal */}
      <Modal
        open={detailOpen}
        onClose={()=>{ setDetailOpen(false); setDetailUser(null) }}
        title={detailUser ? `User: ${detailUser.username}` : 'User Details'}
        footer={(<button className="btn-secondary" onClick={()=>{ setDetailOpen(false); setDetailUser(null) }}>Close</button>)}
      >
        {detailUser ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-500">Username</div>
              <div className="font-medium">{detailUser.username}</div>
            </div>
            <div>
              <div className="text-gray-500">Role</div>
              <div className="font-medium">{detailUser.role}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-gray-500">ID</div>
              <div className="font-mono text-xs">{detailUser.id}</div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">No user selected.</div>
        )}
      </Modal>
    </div>
  )
}

