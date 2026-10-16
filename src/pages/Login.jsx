import { useState } from 'react'
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'

export default function Login() {
  const navigate = useNavigate()
  const { login, settings } = useStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const brand = settings?.companyName || 'Apple Vault'

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
        setError('Invalid username or password')
        setLoading(false)
        return
      }
      const role = String(after.role || '').toLowerCase()
      if (role === 'cashier') {
        navigate('/pos', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch {
      setError('An error occurred during sign in')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#0b0f14] text-slate-100">
      {/* Atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% -10%, rgba(37,99,235,0.22), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 100%, rgba(14,165,233,0.08), transparent 50%), #0b0f14',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)',
        }}
      />

      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px] animate-fade-in">
          {/* Brand */}
          <div className="mb-8 flex flex-col items-center text-center animate-slide-up">
            <div className="mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-white/10 bg-[#141a22] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <img
                src={settings?.logoDataUrl || '/apple-touch-icon.png'}
                alt={brand}
                className="h-full w-full rounded-xl object-contain"
              />
            </div>
            <h1 className="text-[1.75rem] font-bold tracking-tight text-white leading-none">
              {brand}
            </h1>
            <p className="mt-2 max-w-[280px] text-sm text-slate-400 leading-relaxed">
              Sign in to manage inventory, sales, and daily operations.
            </p>
          </div>

          {/* Form panel */}
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-white/10 bg-[#141a22]/90 p-6 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm animate-scale-in"
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="login-username" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Username
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <User size={17} strokeWidth={1.75} />
                  </div>
                  <input
                    id="login-username"
                    type="text"
                    className="w-full rounded-xl border border-white/10 bg-[#0f141c] py-3 pl-11 pr-4 text-base text-slate-100 placeholder:text-slate-600 outline-none transition-colors focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
                    style={{ minHeight: 48, fontSize: 16 }}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Lock size={17} strokeWidth={1.75} />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="w-full rounded-xl border border-white/10 bg-[#0f141c] py-3 pl-11 pr-12 text-base text-slate-100 placeholder:text-slate-600 outline-none transition-colors focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
                    style={{ minHeight: 48, fontSize: 16 }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 transition-colors hover:text-slate-300"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-300"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                style={{ minHeight: 48 }}
              >
                <span>{loading ? 'Signing in…' : 'Sign In'}</span>
                {!loading && (
                  <ArrowRight
                    size={17}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                )}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-[11px] text-slate-600">
            © {new Date().getFullYear()} {brand}
          </p>
        </div>
      </div>
    </div>
  )
}
