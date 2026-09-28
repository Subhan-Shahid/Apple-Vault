import { useState } from 'react'
import { User, Lock, Eye, EyeOff, ArrowRight, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'

export default function Login() {
  const navigate = useNavigate()
  const { login, settings } = useStore()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const onSubmit = (e) => {
    e.preventDefault()
    setError('')
    const uname = username.trim()
    if (!uname || !password) {
      setError('Please enter your username and password')
      return
    }

    setLoading(true)
    try {
      login({ username: uname, password })
      const after = useStore.getState().currentUser
      if (!after) {
        setError('Invalid username or password (default: admin / admin123)')
        setLoading(false)
        return
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError('An error occurred during sign in')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 overflow-x-hidden">
      {/* Container */}
      <div className="w-full max-w-sm mx-auto">
        {/* Clean Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl">
          {/* Logo & Header */}
          <div className="text-center mb-6 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700/80 p-2 flex items-center justify-center mb-3.5 shadow-sm">
              <img
                src={settings?.logoDataUrl || '/apple-touch-icon.png'}
                alt={settings?.companyName || 'Apple Vault'}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            <h1 className="text-xl font-bold text-white tracking-tight">
              {settings?.companyName || 'Apple Vault'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Sign in to manage your inventory
            </p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  className="input !pl-10 !h-11 !text-sm !bg-slate-950 !border-slate-800 !text-slate-100 !rounded-xl focus:!border-blue-500"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input !pl-10 !pr-10 !h-11 !text-sm !bg-slate-950 !border-slate-800 !text-slate-100 !rounded-xl focus:!border-blue-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !h-11 !min-h-[44px] !bg-blue-600 hover:!bg-blue-500 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 mt-2 transition-all active:scale-98"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          {/* Simple default credentials hint */}
          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Shield size={13} className="text-slate-400" />
              Secure Sign In
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              admin / admin123
            </span>
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="text-center mt-5 text-xs text-slate-600">
          &copy; {new Date().getFullYear()} {settings?.companyName || 'Apple Vault'}
        </div>
      </div>
    </div>
  )
}
