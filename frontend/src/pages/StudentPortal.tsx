/**
 * HBS Sentinel — Student Portal
 * v3.0 — Full HBS design refresh
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Shield, LogOut, MapPin, Bell, CheckCircle,
  AlertTriangle, User, Phone, Mail, Plus,
  ChevronDown, ChevronUp, Plane, Settings, Home, Clock
} from 'lucide-react'
import { useWebSocket } from '../useWebSocket'
import { api } from '../api'
import { StatusBadge } from '../components/StatusBadge'
import type { AuthUser, Student, Alert, CrisisEvent } from '../types'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  user: AuthUser
  onLogout: () => void
}

type Tab = 'home' | 'location' | 'travel' | 'settings'

const HBS_CRIMSON = '#AC2134'
const AMBER = '#d97706'
const GREEN = '#16a34a'

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 6,
  padding: '10px 14px',
  color: '#f1f5f9',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: '#9ca3af',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontWeight: 500,
}

export function StudentPortal({ user, onLogout }: Props) {
  const [student, setStudent] = useState<Student | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [activeCrisis, setActiveCrisis] = useState<CrisisEvent | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [safeConfirming, setSafeConfirming] = useState(false)
  const [safeConfirmed, setSafeConfirmed] = useState(false)
  const [showAlertFull, setShowAlertFull] = useState(false)
  const [newAlert, setNewAlert] = useState<Alert | null>(null)

  // Location form
  const [locationCity, setLocationCity] = useState('')
  const [locationLat, setLocationLat] = useState('')
  const [locationLng, setLocationLng] = useState('')
  const [locationSaving, setLocationSaving] = useState(false)
  const [locationSaved, setLocationSaved] = useState(false)

  // Travel form
  const [travelDest, setTravelDest] = useState('')
  const [travelLat, setTravelLat] = useState('')
  const [travelLng, setTravelLng] = useState('')
  const [travelDepart, setTravelDepart] = useState('')
  const [travelReturn, setTravelReturn] = useState('')
  const [travelPurpose, setTravelPurpose] = useState('')
  const [travelSaving, setTravelSaving] = useState(false)
  const [travelSaved, setTravelSaved] = useState(false)

  // Contact prefs
  const [prefEmail, setPrefEmail] = useState(true)
  const [prefSms, setPrefSms] = useState(true)
  const [prefPush, setPrefPush] = useState(true)
  const [prefSaving, setPrefSaving] = useState(false)
  const [prefSaved, setPrefSaved] = useState(false)

  useEffect(() => {
    api.getStudent(user.id).then(s => {
      setStudent(s)
      setPrefEmail(s.contact_email)
      setPrefSms(s.contact_sms)
      setPrefPush(s.contact_push)
    }).catch(console.error)

    api.getStudentAlerts(user.id).then(r => {
      setAlerts(r.alerts || [])
    }).catch(console.error)

    api.getActiveCrisis().then(r => {
      setActiveCrisis(r.crisis)
    }).catch(console.error)
  }, [user.id])

  const handleWSMessage = useCallback((msg: any) => {
    const { type, data } = msg
    switch (type) {
      case 'connected':
        if (data.student) setStudent(data.student)
        if (data.alerts) setAlerts(data.alerts)
        if (data.active_crisis) setActiveCrisis(data.active_crisis)
        break
      case 'crisis_alert':
        if (data.student) setStudent(data.student)
        if (data.alert) {
          setAlerts(prev => [data.alert, ...prev.filter((a: Alert) => a.id !== data.alert.id)])
          setNewAlert(data.alert)
          setShowAlertFull(true)
        }
        if (data.crisis) setActiveCrisis(data.crisis)
        break
      case 'safe_confirmed':
        setSafeConfirmed(true)
        break
      case 'status_updated':
        setStudent(prev => prev ? { ...prev, risk_status: data.status } : prev)
        break
      case 'crisis_resolved':
        setActiveCrisis(null)
        setStudent(prev => prev ? { ...prev, risk_status: 'UNCONFIRMED', alert_message: null, alert_id: null } : prev)
        setNewAlert(null)
        setSafeConfirmed(false)
        break
      case 'demo_reset':
        setActiveCrisis(null)
        setAlerts([])
        setNewAlert(null)
        setSafeConfirmed(false)
        api.getStudent(user.id).then(setStudent).catch(console.error)
        break
    }
  }, [user.id])

  useWebSocket(`/ws/student/${user.id}`, handleWSMessage)

  const confirmSafe = async () => {
    setSafeConfirming(true)
    try {
      await api.confirmSafe(user.id)
      setSafeConfirmed(true)
      setStudent(prev => prev ? { ...prev, risk_status: 'SAFE' } : prev)
    } finally {
      setSafeConfirming(false)
    }
  }

  const saveLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocationSaving(true)
    try {
      const res = await api.updateLocation(user.id, locationCity, parseFloat(locationLat), parseFloat(locationLng))
      setStudent(res.student)
      setLocationSaved(true)
      setTimeout(() => setLocationSaved(false), 3000)
      setLocationCity(''); setLocationLat(''); setLocationLng('')
    } finally {
      setLocationSaving(false)
    }
  }

  const saveTravelPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    setTravelSaving(true)
    try {
      const res = await api.addTravelPlan({
        student_id: user.id,
        destination: travelDest,
        destination_lat: parseFloat(travelLat),
        destination_lng: parseFloat(travelLng),
        departure_date: travelDepart,
        return_date: travelReturn,
        purpose: travelPurpose || 'Personal Travel',
      })
      setStudent(res.student)
      setTravelSaved(true)
      setTimeout(() => setTravelSaved(false), 3000)
      setTravelDest(''); setTravelLat(''); setTravelLng('')
      setTravelDepart(''); setTravelReturn(''); setTravelPurpose('')
    } finally {
      setTravelSaving(false)
    }
  }

  const saveContactPrefs = async (e: React.FormEvent) => {
    e.preventDefault()
    setPrefSaving(true)
    try {
      await api.updateContactPrefs({ student_id: user.id, email: prefEmail, sms: prefSms, push: prefPush })
      setPrefSaved(true)
      setTimeout(() => setPrefSaved(false), 3000)
    } finally {
      setPrefSaving(false)
    }
  }

  const isAffected = student?.risk_status === 'AFFECTED' || student?.risk_status === 'AT_RISK'
  const latestAlert = alerts[0]

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'travel', label: 'Travel Plans', icon: Plane },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <header style={{
        background: '#0f172a', borderBottom: '1px solid #1e293b',
        padding: '0 20px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, background: HBS_CRIMSON, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color="white" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 400, color: '#f1f5f9' }}>HBS</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 300, color: '#94a3b8', letterSpacing: '0.05em' }}>Sentinel</span>
          </div>
          <span style={{ fontSize: 11, color: '#4b5563', marginLeft: 4 }}>Student Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {student && <StatusBadge status={student.risk_status} />}
          <span style={{ fontSize: 13, color: '#6b7280' }}>{user.name}</span>
          <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Alert Banner */}
      {isAffected && latestAlert && (
        <div style={{
          background: student?.risk_status === 'AT_RISK' ? 'rgba(217,119,6,0.12)' : 'rgba(172,33,52,0.12)',
          borderBottom: `2px solid ${student?.risk_status === 'AT_RISK' ? AMBER : HBS_CRIMSON}`,
          padding: '16px 20px',
          animation: 'alertDrop 0.4s ease-out forwards',
        }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <AlertTriangle size={20} color={student?.risk_status === 'AT_RISK' ? AMBER : HBS_CRIMSON} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: student?.risk_status === 'AT_RISK' ? '#fbbf24' : '#e88a96', letterSpacing: '0.04em' }}>
                    {student?.risk_status === 'AT_RISK' ? 'TRAVEL ADVISORY' : 'SAFETY ALERT'} — {activeCrisis?.name}
                  </span>
                  {safeConfirmed && (
                    <span style={{ background: 'rgba(22,163,74,0.15)', color: GREEN, border: `1px solid ${GREEN}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                      ✓ Marked Safe
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.5, margin: 0, overflow: showAlertFull ? 'visible' : 'hidden', display: '-webkit-box', WebkitLineClamp: showAlertFull ? 'unset' : 2, WebkitBoxOrient: 'vertical' as any }}>
                  {latestAlert.message}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => setShowAlertFull(!showAlertFull)}
                    style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
                    {showAlertFull ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Read full alert</>}
                  </button>
                  {!safeConfirmed && (
                    <button
                      onClick={confirmSafe}
                      disabled={safeConfirming}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: GREEN, color: '#fff', border: 'none', borderRadius: 6,
                        padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: safeConfirming ? 'not-allowed' : 'pointer',
                        opacity: safeConfirming ? 0.7 : 1,
                      }}
                    >
                      {safeConfirming ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <CheckCircle size={14} />}
                      I Am Safe
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, maxWidth: 640, margin: '0 auto', width: '100%', padding: '24px 20px' }}>

        {/* Tab navigation */}
        <div style={{ display: 'flex', background: '#1e293b', borderRadius: 8, padding: 4, marginBottom: 24, border: '1px solid #334155' }}>
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: isActive ? 600 : 400, transition: 'all 0.15s',
                  background: isActive ? '#334155' : 'transparent',
                  color: isActive ? '#f1f5f9' : '#6b7280',
                }}
              >
                <Icon size={14} />
                <span style={{ display: 'none' }}>{tab.label}</span>
                <span style={{ display: 'block' }}>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Home tab */}
        {activeTab === 'home' && student && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Student card */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{
                  width: 48, height: 48, background: 'rgba(172,33,52,0.15)', border: `1px solid rgba(172,33,52,0.3)`,
                  borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 700, color: '#e88a96', flexShrink: 0,
                }}>
                  {student.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 400, color: '#f1f5f9', margin: 0 }}>{student.name}</h2>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0 0' }}>{student.year} · Harvard Business School</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                    <MapPin size={12} color="#6b7280" />
                    <span style={{ fontSize: 13, color: '#6b7280' }}>{student.current_city}</span>
                  </div>
                </div>
                <StatusBadge status={student.risk_status} size="md" />
              </div>
            </div>

            {/* Active crisis notice */}
            {activeCrisis && !isAffected && (
              <div style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.3)', borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, background: AMBER, borderRadius: '50%' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24' }}>Active Crisis Nearby</span>
                </div>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>{activeCrisis.name} — {activeCrisis.affected_area}</p>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0 0' }}>Your current location is outside the affected zone.</p>
              </div>
            )}

            {/* All clear */}
            {!activeCrisis && (
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 24, textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Shield size={24} color={GREEN} />
                </div>
                <p style={{ fontWeight: 600, color: '#f1f5f9', margin: 0 }}>All Clear</p>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0 0' }}>No active crisis events in your area.</p>
              </div>
            )}

            {/* Recent alerts */}
            {alerts.length > 0 && (
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 20 }}>
                <h3 style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Bell size={13} /> Alert History
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {alerts.slice(0, 3).map(alert => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))}
                </div>
              </div>
            )}

            {/* Travel plans */}
            {student.travel_plans.length > 0 && (
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 20 }}>
                <h3 style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plane size={13} /> Upcoming Travel
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {student.travel_plans.map((tp, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#0f172a', borderRadius: 6, padding: 12 }}>
                      <Plane size={16} color="#3b82f6" style={{ flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#f1f5f9', margin: 0 }}>{tp.destination}</p>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '3px 0 0 0' }}>{tp.departure_date} → {tp.return_date}</p>
                        <p style={{ fontSize: 11, color: '#4b5563', margin: '2px 0 0 0' }}>{tp.purpose}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Location tab */}
        {activeTab === 'location' && student && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 20 }}>
              <h3 style={{ fontWeight: 600, color: '#f1f5f9', margin: '0 0 6px 0' }}>Current Location</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px 0' }}>
                Keep your location updated so HBS can reach you during a crisis.
              </p>
              <div style={{ background: '#0f172a', borderRadius: 6, padding: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <MapPin size={16} color={HBS_CRIMSON} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#f1f5f9', margin: 0 }}>{student.current_city}</p>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0 0' }}>{student.current_lat.toFixed(4)}, {student.current_lng.toFixed(4)}</p>
                </div>
              </div>
              <form onSubmit={saveLocation} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>City, Country</label>
                  <input type="text" value={locationCity} onChange={e => setLocationCity(e.target.value)} placeholder="e.g. Tokyo, Japan" required style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = HBS_CRIMSON)} onBlur={e => (e.target.style.borderColor = '#334155')} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Latitude</label>
                    <input type="number" step="any" value={locationLat} onChange={e => setLocationLat(e.target.value)} placeholder="35.6762" required style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = HBS_CRIMSON)} onBlur={e => (e.target.style.borderColor = '#334155')} />
                  </div>
                  <div>
                    <label style={labelStyle}>Longitude</label>
                    <input type="number" step="any" value={locationLng} onChange={e => setLocationLng(e.target.value)} placeholder="139.6503" required style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = HBS_CRIMSON)} onBlur={e => (e.target.style.borderColor = '#334155')} />
                  </div>
                </div>
                <button type="submit" disabled={locationSaving} style={{
                  background: HBS_CRIMSON, color: '#fff', border: 'none', borderRadius: 6,
                  padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: locationSaving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: locationSaving ? 0.7 : 1,
                }}>
                  {locationSaving ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    : locationSaved ? <><CheckCircle size={14} /> Location Updated</>
                    : <><MapPin size={14} /> Update Location</>}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Travel tab */}
        {activeTab === 'travel' && student && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {student.travel_plans.length > 0 && (
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 20 }}>
                <h3 style={{ fontWeight: 600, color: '#f1f5f9', margin: '0 0 14px 0' }}>Registered Travel Plans</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {student.travel_plans.map((tp, i) => (
                    <div key={i} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Plane size={14} color="#3b82f6" />
                        <span style={{ fontWeight: 500, color: '#f1f5f9', fontSize: 14 }}>{tp.destination}</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{tp.departure_date} → {tp.return_date}</p>
                      <p style={{ fontSize: 11, color: '#4b5563', margin: '3px 0 0 0' }}>{tp.purpose}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 20 }}>
              <h3 style={{ fontWeight: 600, color: '#f1f5f9', margin: '0 0 6px 0' }}>Register Travel Plan</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px 0' }}>
                Register upcoming travel so HBS can send proactive advisories if a crisis develops at your destination.
              </p>
              <form onSubmit={saveTravelPlan} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Destination</label>
                  <input type="text" value={travelDest} onChange={e => setTravelDest(e.target.value)} placeholder="e.g. Singapore, Singapore" required style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = HBS_CRIMSON)} onBlur={e => (e.target.style.borderColor = '#334155')} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Dest. Latitude</label>
                    <input type="number" step="any" value={travelLat} onChange={e => setTravelLat(e.target.value)} placeholder="1.3521" required style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = HBS_CRIMSON)} onBlur={e => (e.target.style.borderColor = '#334155')} />
                  </div>
                  <div>
                    <label style={labelStyle}>Dest. Longitude</label>
                    <input type="number" step="any" value={travelLng} onChange={e => setTravelLng(e.target.value)} placeholder="103.8198" required style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = HBS_CRIMSON)} onBlur={e => (e.target.style.borderColor = '#334155')} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Departure Date</label>
                    <input type="date" value={travelDepart} onChange={e => setTravelDepart(e.target.value)} required style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = HBS_CRIMSON)} onBlur={e => (e.target.style.borderColor = '#334155')} />
                  </div>
                  <div>
                    <label style={labelStyle}>Return Date</label>
                    <input type="date" value={travelReturn} onChange={e => setTravelReturn(e.target.value)} required style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = HBS_CRIMSON)} onBlur={e => (e.target.style.borderColor = '#334155')} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Purpose</label>
                  <input type="text" value={travelPurpose} onChange={e => setTravelPurpose(e.target.value)} placeholder="e.g. Field Study, Personal Travel, Conference" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = HBS_CRIMSON)} onBlur={e => (e.target.style.borderColor = '#334155')} />
                </div>
                <button type="submit" disabled={travelSaving} style={{
                  background: HBS_CRIMSON, color: '#fff', border: 'none', borderRadius: 6,
                  padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: travelSaving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: travelSaving ? 0.7 : 1,
                }}>
                  {travelSaving ? 'Saving...' : travelSaved ? <><CheckCircle size={14} /> Travel Plan Saved</> : <><Plus size={14} /> Register Travel Plan</>}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Settings tab */}
        {activeTab === 'settings' && student && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 20 }}>
              <h3 style={{ fontWeight: 600, color: '#f1f5f9', margin: '0 0 6px 0' }}>Contact Information</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px 0' }}>Your contact details on file with HBS Sentinel.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { icon: Mail, label: 'Email', value: student.email },
                  { icon: Phone, label: 'Phone', value: student.phone },
                  { icon: User, label: 'Hometown', value: student.hometown },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#0f172a', borderRadius: 6, padding: 12 }}>
                    <item.icon size={16} color="#6b7280" />
                    <div>
                      <p style={{ fontSize: 11, color: '#4b5563', margin: 0 }}>{item.label}</p>
                      <p style={{ fontSize: 14, color: '#f1f5f9', margin: '2px 0 0 0' }}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 20 }}>
              <h3 style={{ fontWeight: 600, color: '#f1f5f9', margin: '0 0 6px 0' }}>Notification Preferences</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px 0' }}>Choose how you want to receive crisis alerts.</p>
              <form onSubmit={saveContactPrefs} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { key: 'email', label: 'Email Alerts', desc: 'Receive alerts at your HBS email', value: prefEmail, setter: setPrefEmail },
                  { key: 'sms', label: 'SMS Alerts', desc: 'Text message to your registered phone', value: prefSms, setter: setPrefSms },
                  { key: 'push', label: 'Portal Notifications', desc: 'In-app alerts on this portal', value: prefPush, setter: setPrefPush },
                ].map(pref => (
                  <label key={pref.key} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#0f172a', borderRadius: 6, padding: 12, cursor: 'pointer',
                  }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#f1f5f9', margin: 0 }}>{pref.label}</p>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0 0' }}>{pref.desc}</p>
                    </div>
                    <div
                      onClick={() => pref.setter(!pref.value)}
                      style={{
                        width: 40, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer',
                        background: pref.value ? HBS_CRIMSON : '#334155', transition: 'background 0.2s',
                        flexShrink: 0,
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, background: '#fff', borderRadius: '50%',
                        position: 'absolute', top: 4, transition: 'transform 0.2s',
                        transform: pref.value ? 'translateX(20px)' : 'translateX(4px)',
                      }} />
                    </div>
                  </label>
                ))}
                <button type="submit" disabled={prefSaving} style={{
                  background: HBS_CRIMSON, color: '#fff', border: 'none', borderRadius: 6,
                  padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: prefSaving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: prefSaving ? 0.7 : 1,
                  marginTop: 4,
                }}>
                  {prefSaving ? 'Saving...' : prefSaved ? <><CheckCircle size={14} /> Preferences Saved</> : 'Save Preferences'}
                </button>
              </form>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #1e293b', borderRadius: 8, padding: 16 }}>
              <p style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: '#6b7280' }}>Privacy Notice:</strong> HBS Sentinel collects location data exclusively for crisis alerting. Your data is not used for academic monitoring or any commercial purpose. Location history is automatically purged 90 days after each trip.
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes alertDrop { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  )
}

function AlertCard({ alert }: { alert: Alert }) {
  const [expanded, setExpanded] = useState(false)
  const isAffected = alert.risk_status === 'AFFECTED'

  return (
    <div style={{
      background: isAffected ? 'rgba(172,33,52,0.08)' : 'rgba(217,119,6,0.08)',
      border: `1px solid ${isAffected ? 'rgba(172,33,52,0.3)' : 'rgba(217,119,6,0.3)'}`,
      borderRadius: 6, padding: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: isAffected ? HBS_CRIMSON : AMBER }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: isAffected ? '#e88a96' : '#fbbf24' }}>
            {alert.risk_status === 'AFFECTED' ? 'Safety Alert' : 'Travel Advisory'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4b5563' }}>
          <Clock size={11} />
          <span style={{ fontSize: 11 }}>{formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}</span>
        </div>
      </div>
      <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, margin: 0, overflow: expanded ? 'visible' : 'hidden', display: '-webkit-box', WebkitLineClamp: expanded ? 'unset' : 2, WebkitBoxOrient: 'vertical' as any }}>
        {alert.message}
      </p>
      <button onClick={() => setExpanded(!expanded)}
        style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
        {expanded ? <><ChevronUp size={11} /> Less</> : <><ChevronDown size={11} /> Read more</>}
      </button>
    </div>
  )
}
