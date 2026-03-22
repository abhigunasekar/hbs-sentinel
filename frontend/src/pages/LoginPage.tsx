import { useState } from 'react'
import { Shield, AlertTriangle, Eye, EyeOff, UserPlus, LogIn, MapPin } from 'lucide-react'
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

// Common city coordinates for quick selection
const CITY_PRESETS = [
  { city: 'Boston, USA', lat: 42.3601, lng: -71.0589 },
  { city: 'New York, USA', lat: 40.7128, lng: -74.0060 },
  { city: 'London, UK', lat: 51.5074, lng: -0.1278 },
  { city: 'Bangkok, Thailand', lat: 13.7563, lng: 100.5018 },
  { city: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { city: 'Dubai, UAE', lat: 25.2048, lng: 55.2708 },
  { city: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503 },
  { city: 'São Paulo, Brazil', lat: -23.5505, lng: -46.6333 },
]

export function LoginPage({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  // Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Register state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regYear, setRegYear] = useState('MBA 2026')
  const [regProgram, setRegProgram] = useState('MBA')
  const [regHometown, setRegHometown] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regCity, setRegCity] = useState('')
  const [regLat, setRegLat] = useState<number>(0)
  const [regLng, setRegLng] = useState<number>(0)
  const [showRegPassword, setShowRegPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Name, email, and password are required.')
      return
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      const res = await api.register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        year: regYear,
        program: regProgram,
        hometown: regHometown,
        phone: regPhone,
        current_city: regCity,
        current_lat: regLat,
        current_lng: regLng,
      })
      onLogin(res.user)
    } catch (err: any) {
      setError(err.message || 'Registration failed. Email may already be in use.')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email)
    setPassword(acc.password)
    setMode('login')
  }

  const selectCity = (preset: typeof CITY_PRESETS[0]) => {
    setRegCity(preset.city)
    setRegLat(preset.lat)
    setRegLng(preset.lng)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      {/* Background */}
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

        {/* Mode toggle */}
        <div className="flex rounded-xl bg-gray-900 border border-gray-800 p-1 mb-4">
          <button
            onClick={() => { setMode('login'); setError('') }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'login'
                ? 'bg-crimson-700 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>
          <button
            onClick={() => { setMode('register'); setError('') }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'register'
                ? 'bg-crimson-700 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Create Account
          </button>
        </div>

        {/* Card */}
        <div className="sentinel-card p-8 shadow-2xl">

          {/* ── LOGIN FORM ── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">HBS Email</label>
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
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-crimson-600 focus:ring-1 focus:ring-crimson-600 transition-colors pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
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
              <button type="submit" disabled={loading} className="w-full bg-crimson-700 hover:bg-crimson-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors duration-150 flex items-center justify-center gap-2">
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</> : 'Sign In to Sentinel'}
              </button>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <p className="text-xs text-gray-400 mb-2">Register as a new HBS student to receive crisis alerts and manage your safety profile.</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Full Name *</label>
                  <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="e.g. Alex Johnson" required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-crimson-600 focus:ring-1 focus:ring-crimson-600" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-400 mb-1">HBS Email *</label>
                  <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="you@hbs.edu" required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-crimson-600 focus:ring-1 focus:ring-crimson-600" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Password *</label>
                  <div className="relative">
                    <input type={showRegPassword ? 'text' : 'password'} value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Min 6 characters" required
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-crimson-600 focus:ring-1 focus:ring-crimson-600 pr-9" />
                    <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Program</label>
                  <select value={regProgram} onChange={e => setRegProgram(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-crimson-600">
                    <option>MBA</option>
                    <option>MBA 2+2</option>
                    <option>Executive MBA</option>
                    <option>PhD</option>
                    <option>HBS Online</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Class Year</label>
                  <select value={regYear} onChange={e => setRegYear(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-crimson-600">
                    <option>MBA 2026</option>
                    <option>MBA 2027</option>
                    <option>MBA 2028</option>
                    <option>Executive MBA 2026</option>
                    <option>PhD 2026</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Hometown</label>
                  <input type="text" value={regHometown} onChange={e => setRegHometown(e.target.value)} placeholder="e.g. Mumbai, India"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-crimson-600" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Phone</label>
                  <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="+1-617-555-0000"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-crimson-600" />
                </div>
              </div>

              {/* Current Location */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Current Location
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {CITY_PRESETS.map(p => (
                    <button key={p.city} type="button" onClick={() => selectCity(p)}
                      className={`text-xs px-2 py-1 rounded-md border transition-all ${
                        regCity === p.city
                          ? 'bg-crimson-700 border-crimson-600 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                      }`}>
                      {p.city}
                    </button>
                  ))}
                </div>
                <input type="text" value={regCity} onChange={e => setRegCity(e.target.value)} placeholder="Or type your city"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-crimson-600" />
                {regLat !== 0 && (
                  <p className="text-xs text-gray-500 mt-1">📍 {regLat.toFixed(4)}, {regLng.toFixed(4)}</p>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-900/30 border border-red-800/50 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-red-300 text-sm">{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full bg-crimson-700 hover:bg-crimson-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors duration-150 flex items-center justify-center gap-2">
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account...</> : <><UserPlus className="w-4 h-4" /> Create Student Account</>}
              </button>
            </form>
          )}

          {/* Demo accounts (login mode only) */}
          {mode === 'login' && (
            <div className="mt-6 pt-6 border-t border-gray-800">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">Demo Accounts</p>
              <div className="space-y-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button key={acc.email} onClick={() => quickLogin(acc)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 transition-all group">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-200 font-medium">{acc.label}</span>
                        <p className="text-xs text-gray-500 mt-0.5">{acc.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        acc.role === 'admin'
                          ? 'bg-crimson-900/50 text-crimson-300 border border-crimson-800/50'
                          : 'bg-blue-900/50 text-blue-300 border border-blue-800/50'
                      }`}>{acc.role}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Register mode: link to sign in */}
          {mode === 'register' && (
            <p className="mt-4 text-center text-xs text-gray-500">
              Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError('') }} className="text-crimson-400 hover:text-crimson-300 underline">
                Sign in
              </button>
            </p>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Harvard Business School · DSAIL 2026 · Confidential
        </p>
      </div>
    </div>
  )
}
