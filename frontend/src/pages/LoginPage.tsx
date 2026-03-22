import { useState } from 'react'
import { Eye, EyeOff, UserPlus, LogIn, MapPin } from 'lucide-react'
import { api } from '../api'
import type { AuthUser } from '../types'

interface Props {
  onLogin: (user: AuthUser) => void
}

const DEMO_ACCOUNTS = [
  { label: 'Angela Crispi', role: 'Dean of Students — Admin', email: 'admin@hbs.edu', password: 'sentinel2026' },
  { label: 'Priya Mehta', role: 'MBA \'26 — Bangkok (Affected)', email: 'priya.mehta@hbs.edu', password: 'hbs2026' },
  { label: 'James Okafor', role: 'MBA \'26 — Bangkok (Affected)', email: 'james.okafor@hbs.edu', password: 'hbs2026' },
  { label: 'Aisha Patel', role: 'MBA \'26 — London', email: 'aisha.patel@hbs.edu', password: 'hbs2026' },
]

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

const HBS_CRIMSON = '#AC2134'

export function LoginPage({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 6,
    padding: '10px 14px',
    color: '#f1f5f9',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.15s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 500,
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Subtle crimson glow at top */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 300,
        background: 'radial-gradient(ellipse at 50% -20%, rgba(172,33,52,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: 440 }}>
        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          {/* HBS Shield-style icon */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, marginBottom: 20,
            background: HBS_CRIMSON,
            borderRadius: 8,
            boxShadow: `0 0 32px ${HBS_CRIMSON}44`,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: 32, fontWeight: 400, color: '#f1f5f9', letterSpacing: '-0.5px' }}>HBS</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 28, fontWeight: 300, color: '#94a3b8', letterSpacing: '0.05em' }}>Sentinel</span>
          </div>
          <p style={{ fontSize: 14, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 400 }}>
            Student Safety Intelligence Platform
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginTop: 12,
            background: 'rgba(172,33,52,0.12)',
            border: '1px solid rgba(172,33,52,0.3)',
            borderRadius: 20, padding: '4px 12px',
          }}>
            <div style={{ width: 6, height: 6, background: HBS_CRIMSON, borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, color: '#e88a96', fontWeight: 500, letterSpacing: '0.06em' }}>LIVE — SPRING 2026</span>
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: '#1e293b', borderRadius: 8, padding: 4, marginBottom: 20, border: '1px solid #334155' }}>
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
                background: mode === m ? HBS_CRIMSON : 'transparent',
                color: mode === m ? '#fff' : '#9ca3af',
              }}
            >
              {m === 'login' ? <LogIn size={14} /> : <UserPlus size={14} />}
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 10,
          padding: 32,
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        }}>
          {/* ── LOGIN FORM ── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>HBS Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@hbs.edu" required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = HBS_CRIMSON)}
                  onBlur={e => (e.target.style.borderColor = '#334155')}
                />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••" required
                    style={{ ...inputStyle, paddingRight: 40 }}
                    onFocus={e => (e.target.style.borderColor = HBS_CRIMSON)}
                    onBlur={e => (e.target.style.borderColor = '#334155')}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {error && (
                <div style={{ background: 'rgba(172,33,52,0.12)', border: '1px solid rgba(172,33,52,0.3)', borderRadius: 6, padding: '10px 14px', color: '#e88a96', fontSize: 13 }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} style={{
                background: HBS_CRIMSON, color: '#fff', border: 'none', borderRadius: 6,
                padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity 0.15s',
              }}>
                {loading ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Signing in...</> : 'Sign In to Sentinel'}
              </button>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                Register as a new HBS student to receive crisis alerts and manage your safety profile.
              </p>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="e.g. Alex Johnson" required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = HBS_CRIMSON)} onBlur={e => (e.target.style.borderColor = '#334155')} />
              </div>
              <div>
                <label style={labelStyle}>HBS Email *</label>
                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="you@hbs.edu" required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = HBS_CRIMSON)} onBlur={e => (e.target.style.borderColor = '#334155')} />
              </div>
              <div>
                <label style={labelStyle}>Password *</label>
                <div style={{ position: 'relative' }}>
                  <input type={showRegPassword ? 'text' : 'password'} value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Min 6 characters" required
                    style={{ ...inputStyle, paddingRight: 40 }}
                    onFocus={e => (e.target.style.borderColor = HBS_CRIMSON)} onBlur={e => (e.target.style.borderColor = '#334155')} />
                  <button type="button" onClick={() => setShowRegPassword(!showRegPassword)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                    {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Program</label>
                  <select value={regProgram} onChange={e => setRegProgram(e.target.value)}
                    style={{ ...inputStyle, appearance: 'none' }}>
                    <option>MBA</option><option>MBA 2+2</option><option>Executive MBA</option><option>PhD</option><option>HBS Online</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Class Year</label>
                  <select value={regYear} onChange={e => setRegYear(e.target.value)}
                    style={{ ...inputStyle, appearance: 'none' }}>
                    <option>MBA 2025</option><option>MBA 2026</option><option>MBA 2027</option><option>Executive MBA 2026</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Hometown</label>
                <input type="text" value={regHometown} onChange={e => setRegHometown(e.target.value)} placeholder="e.g. Mumbai, India" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = HBS_CRIMSON)} onBlur={e => (e.target.style.borderColor = '#334155')} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="+1-617-555-0000" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = HBS_CRIMSON)} onBlur={e => (e.target.style.borderColor = '#334155')} />
              </div>
              <div>
                <label style={labelStyle}>Current City *</label>
                <input type="text" value={regCity} onChange={e => setRegCity(e.target.value)} placeholder="e.g. Boston, USA" required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = HBS_CRIMSON)} onBlur={e => (e.target.style.borderColor = '#334155')} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {CITY_PRESETS.map(p => (
                    <button key={p.city} type="button" onClick={() => selectCity(p)}
                      style={{
                        background: regCity === p.city ? 'rgba(172,33,52,0.2)' : '#0f172a',
                        border: `1px solid ${regCity === p.city ? HBS_CRIMSON : '#334155'}`,
                        borderRadius: 4, padding: '3px 8px', fontSize: 11, color: regCity === p.city ? '#e88a96' : '#9ca3af',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                      <MapPin size={10} /> {p.city.split(',')[0]}
                    </button>
                  ))}
                </div>
              </div>
              {error && (
                <div style={{ background: 'rgba(172,33,52,0.12)', border: '1px solid rgba(172,33,52,0.3)', borderRadius: 6, padding: '10px 14px', color: '#e88a96', fontSize: 13 }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} style={{
                background: HBS_CRIMSON, color: '#fff', border: 'none', borderRadius: 6,
                padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>

        {/* Demo accounts */}
        <div style={{ marginTop: 28 }}>
          <p style={{ fontSize: 11, color: '#4b5563', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Demo Accounts
          </p>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, overflow: 'hidden' }}>
            {DEMO_ACCOUNTS.map((acc, i) => (
              <button
                key={acc.email}
                onClick={() => quickLogin(acc)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: 'none', border: 'none',
                  borderBottom: i < DEMO_ACCOUNTS.length - 1 ? '1px solid #334155' : 'none',
                  cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#0f172a')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <div>
                  <div style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 500 }}>{acc.label}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{acc.role}</div>
                </div>
                <span style={{ fontSize: 11, color: '#4b5563', fontFamily: 'monospace' }}>{acc.email}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 11, color: '#374151', marginTop: 28, letterSpacing: '0.04em' }}>
          Harvard Business School — Soldiers Field, Boston MA 02163
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}
