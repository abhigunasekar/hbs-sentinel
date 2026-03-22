import { useState } from 'react'
import { Shield, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { api } from '../api'
import type { AuthUser } from '../types'

interface Props {
  onLogin: (user: AuthUser) => void
}

const DEMO_ACCOUNTS = [
  { label: 'Admin — Angela Crispi', email: 'admin@hbs.edu', password: 'sentinel2026', role: 'admin' },
  { label: 'Student — Priya Mehta (Bangkok)', email: 'priya.mehta@hbs.edu', password: 'hbs2026', role: 'student' },
  { label: 'Student — James Okafor (Bangkok)', email: 'james.okafor@hbs.edu', password: 'hbs2026', role: 'student' },
  { label: 'Student — Aisha Patel (London)', email: 'aisha.patel@hbs.edu', password: 'hbs2026', role: 'student' },
]

export function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.login(email, password)
      onLogin(res.user)
    } catch (err: any) {
      setError(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email)
    setPassword(acc.password)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-crimson-950/30 via-gray-950 to-gray-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-crimson-900/10 blur-3xl rounded-full" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-crimson-700 rounded-2xl mb-4 shadow-lg shadow-crimson-900/50">
            <Shield className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">HBS Sentinel</h1>
          <p className="text-gray-400 mt-1 text-sm">Student Safety Intelligence Platform</p>
          <div className="mt-2 inline-flex items-center gap-1.5 bg-crimson-900/30 border border-crimson-800/50 rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 bg-crimson-400 rounded-full animate-pulse" />
            <span className="text-crimson-300 text-xs font-medium">Live — Spring 2026</span>
          </div>
        </div>

        {/* Login card */}
        <div className="sentinel-card p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                HBS Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@hbs.edu"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-crimson-600 focus:ring-1 focus:ring-crimson-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-crimson-600 focus:ring-1 focus:ring-crimson-600 transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-800/50 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-crimson-700 hover:bg-crimson-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors duration-150 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In to Sentinel'
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">
              Demo Accounts
            </p>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => quickLogin(acc)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-200 font-medium">{acc.label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{acc.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      acc.role === 'admin'
                        ? 'bg-crimson-900/50 text-crimson-300 border border-crimson-800/50'
                        : 'bg-blue-900/50 text-blue-300 border border-blue-800/50'
                    }`}>
                      {acc.role}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Harvard Business School · DSAIL 2026 · Confidential
        </p>
      </div>
    </div>
  )
}
