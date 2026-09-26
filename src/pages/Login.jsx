import { useState } from 'react'
import { User, Lock, Eye, EyeOff, Smartphone, ShieldCheck, ArrowRight, Cloud } from 'lucide-react'
import useStore from '../store/useStore'

export default function Login() {
  const { login, settings, cloudSyncStatus } = useStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
    setTimeout(() => {
      login({ username: uname, password })
      const after = useStore.getState().currentUser
      if (!after) {
        setError('Invalid username or password')
        setLoading(false)
        return
      }
      window.location.assign('#/dashboard')
    }, 200)
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/60 p-6 sm:p-8 transition-all">
          
          {/* Logo & Header */}
          <div className="text-center mb-8 flex flex-col items-center">
            {settings?.logoDataUrl ? (
              <div className="relative mb-4 group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-sm opacity-70 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white dark:bg-slate-900 p-2 shadow-inner border border-white/40 flex items-center justify-center overflow-hidden">
                  <img 
                    src={settings.logoDataUrl} 
                    alt={settings?.companyName || 'Shop Logo'} 
                    className="w-full h-full object-contain transform transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              </div>
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                <Smartphone className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
            )}

            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {settings?.companyName || 'Mobile Shop Management'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Sign in to manage sales, inventory & repairs
            </p>

            {/* Cloud connection pill */}
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300">
              <Cloud size={13} className={cloudSyncStatus === 'connected' ? 'text-emerald-500' : 'text-slate-400'} />
              <span>{cloudSyncStatus === 'connected' ? 'Firebase Cloud Connected' : 'Local Storage Mode'}</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input 
                  type="text"
                  className="input pl-10 h-11 text-sm bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 rounded-xl"
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  placeholder="e.g. admin" 
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-10 pr-11 h-11 text-sm bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 rounded-xl"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-xs font-medium animate-shake">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-11 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-70"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          {/* Quick hint for default admin */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck size={14} className="text-emerald-500" />
              Secure Access
            </span>
            <span className="text-[11px] bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-md font-mono">
              Default: admin / admin123
            </span>
          </div>

        </div>
      </div>

      {/* Footer copyright */}
      <div className="relative z-10 text-center mt-6 text-xs text-slate-400">
        &copy; {new Date().getFullYear()} {settings?.companyName || 'Mobile Shop Management'}. All rights reserved.
      </div>
    </div>
  )
}
