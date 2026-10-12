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

  const onSave = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setError('')
    const uname = username.trim()
    if (!uname) { setError('Username is required'); return }
    if (!editingId && !password) { setError('Password is required for new users'); return }
    // client-side unique validation
    const userList = Array.isArray(users) ? users : Object.values(users || {})
    const exists = userList.some(u => u && u.username && u.username.toLowerCase() === uname.toLowerCase() && u.id !== editingId)
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
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400">Manage user accounts, roles, and login access</p>
        </div>
        <button className="btn-primary" onClick={()=>{ resetForm(); setOpen(true) }}>+ Add User</button>
      </div>

      <Card title={`Users (${users.length})`}>
        <div className="divide-y divide-gray-100 dark:divide-slate-700/60 rounded-xl border border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-850 overflow-hidden">
          {(users||[]).map(u => (
            <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3.5 sm:px-4 py-3 hover:bg-gray-50/60 dark:hover:bg-slate-750 transition-colors gap-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left truncate block max-w-full text-sm sm:text-base" 
                    onClick={()=>{ setDetailUser(u); setDetailOpen(true) }}
                  >
                    {u.username}
                  </button>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    u.role === 'Admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' :
                    u.role === 'Manager' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' :
                    u.role === 'Cashier' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {u.role}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button className="btn-secondary btn-sm !px-3 !py-1.5" onClick={()=>onEdit(u)}>Edit</button>
                <button 
                  className="btn-sm rounded-xl px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/60 transition-colors" 
                  onClick={()=>{
                    if (window.confirm(`Are you sure you want to delete user "${u.username}"?`)) {
                      removeUser(u.id)
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {(!users || users.length === 0) && (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
              No users yet. Click &quot;Add User&quot; above to create one.
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={open}
        onClose={()=>{ setOpen(false); resetForm() }}
        title={editingId ? 'Edit User' : 'Add User'}
        footer={(
          <div className="flex items-center justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={()=>{ setOpen(false); resetForm() }}>Cancel</button>
            <button type="button" className="btn-primary" onClick={onSave}>{editingId ? 'Update User' : 'Save User'}</button>
          </div>
        )}
      >
        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label className="label">Username</label>
            <input 
              type="text"
              className="input" 
              value={username} 
              onChange={e=>setUsername(e.target.value)} 
              placeholder="e.g. cashier1" 
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
          <div>
            <label className="label">
              Password {editingId ? <span className="text-xs font-normal text-gray-500">(leave blank to keep unchanged)</span> : ''}
            </label>
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
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M3 3l18 18" />
                    <path d="M10.584 10.587A2 2 0 0012 14a2 2 0 001.414-.586" />
                    <path d="M9.88 4.6A9.993 9.993 0 0121 12c-1.2 2.4-3.6 4.8-9 4.8-1.372 0-2.58-.196-3.63-.553" />
                    <path d="M6.18 6.18C4.26 7.45 2.97 9.03 2 12c1.2 2.4 3.6 4.8 9 4.8 1.13 0 2.16-.11 3.09-.32" />
                  </svg>
                ) : (
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
            <select className="input cursor-pointer" value={role} onChange={e=>setRole(e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400 font-medium">
              {error}
            </div>
          )}
        </form>
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

