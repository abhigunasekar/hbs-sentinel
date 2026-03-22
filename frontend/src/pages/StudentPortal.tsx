import { useState, useEffect, useCallback } from 'react'
import {
  Shield, LogOut, MapPin, Calendar, Bell, CheckCircle,
  AlertTriangle, User, Phone, Mail, Plus, X, Clock,
  ChevronDown, ChevronUp, Plane, Settings, Home
} from 'lucide-react'
import { useWebSocket } from '../useWebSocket'
import { api } from '../api'
import { StatusBadge } from '../components/StatusBadge'
import type { AuthUser, Student, Alert, CrisisEvent } from '../types'
import { formatDistanceToNow, format } from 'date-fns'

interface Props {
  user: AuthUser
  onLogout: () => void
}

type Tab = 'home' | 'location' | 'travel' | 'settings'

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

  // Load initial data
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
          setAlerts(prev => [data.alert, ...prev.filter(a => a.id !== data.alert.id)])
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

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-crimson-700 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-none">HBS Sentinel</h1>
            <p className="text-xs text-gray-500 mt-0.5">Student Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {student && <StatusBadge status={student.risk_status} />}
          <span className="text-sm text-gray-400 hidden sm:block">{user.name}</span>
          <button onClick={onLogout} className="text-gray-500 hover:text-gray-300">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Alert Banner — shown when student is affected */}
      {isAffected && latestAlert && (
        <div className={`bg-red-950 border-b-2 border-red-700 px-4 py-4 alert-drop ${
          student?.risk_status === 'AT_RISK' ? 'bg-amber-950 border-amber-700' : ''
        }`}>
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-6 h-6 shrink-0 mt-0.5 ${
                student?.risk_status === 'AT_RISK' ? 'text-amber-400' : 'text-red-400'
              }`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-bold text-sm ${
                    student?.risk_status === 'AT_RISK' ? 'text-amber-300' : 'text-red-300'
                  }`}>
                    {student?.risk_status === 'AT_RISK' ? 'TRAVEL ADVISORY' : 'SAFETY ALERT'} — {activeCrisis?.name}
                  </span>
                  {safeConfirmed && (
                    <span className="bg-emerald-900/50 text-emerald-400 border border-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      ✓ Marked Safe
                    </span>
                  )}
                </div>

                <div className={`text-sm leading-relaxed ${showAlertFull ? '' : 'line-clamp-2'} ${
                  student?.risk_status === 'AT_RISK' ? 'text-amber-100' : 'text-red-100'
                }`}>
                  {latestAlert.message}
                </div>

                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <button
                    onClick={() => setShowAlertFull(!showAlertFull)}
                    className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"
                  >
                    {showAlertFull ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read full alert</>}
                  </button>

                  {!safeConfirmed && (
                    <button
                      onClick={confirmSafe}
                      disabled={safeConfirming}
                      className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
                    >
                      {safeConfirming ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
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
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {/* Tab navigation */}
        <div className="flex gap-1 bg-gray-900 rounded-xl p-1 mb-6">
          {([
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'location', icon: MapPin, label: 'Location' },
            { id: 'travel', icon: Plane, label: 'Travel Plans' },
            { id: 'settings', icon: Settings, label: 'Settings' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Home tab */}
        {activeTab === 'home' && student && (
          <div className="space-y-4">
            {/* Student card */}
            <div className="sentinel-card p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-crimson-900/50 border border-crimson-800/50 rounded-xl flex items-center justify-center text-crimson-400 font-bold text-lg">
                  {student.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-white">{student.name}</h2>
                  <p className="text-sm text-gray-400">{student.year} · Harvard Business School</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-sm text-gray-400">{student.current_city}</span>
                  </div>
                </div>
                <StatusBadge status={student.risk_status} size="md" />
              </div>
            </div>

            {/* Active crisis notice */}
            {activeCrisis && !isAffected && (
              <div className="sentinel-card p-4 border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <span className="text-sm font-semibold text-amber-300">Active Crisis Nearby</span>
                </div>
                <p className="text-sm text-gray-400">{activeCrisis.name} — {activeCrisis.affected_area}</p>
                <p className="text-xs text-gray-500 mt-1">Your current location is outside the affected zone.</p>
              </div>
            )}

            {/* No crisis */}
            {!activeCrisis && (
              <div className="sentinel-card p-5 text-center">
                <div className="w-12 h-12 bg-emerald-900/30 border border-emerald-800/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="font-semibold text-white">All Clear</p>
                <p className="text-sm text-gray-400 mt-1">No active crisis events in your area.</p>
              </div>
            )}

            {/* Recent alerts */}
            {alerts.length > 0 && (
              <div className="sentinel-card p-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gray-400" />
                  Alert History
                </h3>
                <div className="space-y-3">
                  {alerts.slice(0, 3).map(alert => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))}
                </div>
              </div>
            )}

            {/* Travel plans */}
            {student.travel_plans.length > 0 && (
              <div className="sentinel-card p-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Plane className="w-4 h-4 text-gray-400" />
                  Upcoming Travel
                </h3>
                <div className="space-y-2">
                  {student.travel_plans.map((tp, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
                      <Plane className="w-4 h-4 text-blue-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-white">{tp.destination}</p>
                        <p className="text-xs text-gray-400">{tp.departure_date} → {tp.return_date}</p>
                        <p className="text-xs text-gray-500">{tp.purpose}</p>
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
          <div className="space-y-4">
            <div className="sentinel-card p-5">
              <h3 className="font-semibold text-white mb-1">Current Location</h3>
              <p className="text-sm text-gray-400 mb-4">
                Keep your location updated so HBS can reach you during a crisis.
              </p>
              <div className="bg-gray-800/50 rounded-lg p-3 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-crimson-400" />
                <div>
                  <p className="text-sm font-medium text-white">{student.current_city}</p>
                  <p className="text-xs text-gray-500">{student.current_lat.toFixed(4)}, {student.current_lng.toFixed(4)}</p>
                </div>
              </div>

              <form onSubmit={saveLocation} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">City, Country</label>
                  <input
                    type="text"
                    value={locationCity}
                    onChange={e => setLocationCity(e.target.value)}
                    placeholder="e.g. Tokyo, Japan"
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-crimson-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={locationLat}
                      onChange={e => setLocationLat(e.target.value)}
                      placeholder="35.6762"
                      required
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-crimson-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={locationLng}
                      onChange={e => setLocationLng(e.target.value)}
                      placeholder="139.6503"
                      required
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-crimson-600"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={locationSaving}
                  className="w-full sentinel-btn-primary justify-center py-2.5"
                >
                  {locationSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : locationSaved ? (
                    <><CheckCircle className="w-4 h-4" /> Location Updated</>
                  ) : (
                    <><MapPin className="w-4 h-4" /> Update Location</>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Travel tab */}
        {activeTab === 'travel' && student && (
          <div className="space-y-4">
            {student.travel_plans.length > 0 && (
              <div className="sentinel-card p-4">
                <h3 className="font-semibold text-white mb-3">Registered Travel Plans</h3>
                <div className="space-y-2">
                  {student.travel_plans.map((tp, i) => (
                    <div key={i} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                      <div className="flex items-center gap-2 mb-1">
                        <Plane className="w-4 h-4 text-blue-400" />
                        <span className="font-medium text-white text-sm">{tp.destination}</span>
                      </div>
                      <p className="text-xs text-gray-400">{tp.departure_date} → {tp.return_date}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{tp.purpose}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="sentinel-card p-5">
              <h3 className="font-semibold text-white mb-1">Register Travel Plan</h3>
              <p className="text-sm text-gray-400 mb-4">
                Register upcoming travel so HBS can send proactive advisories if a crisis develops at your destination.
              </p>
              <form onSubmit={saveTravelPlan} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Destination</label>
                  <input
                    type="text"
                    value={travelDest}
                    onChange={e => setTravelDest(e.target.value)}
                    placeholder="e.g. Singapore, Singapore"
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-crimson-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Dest. Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={travelLat}
                      onChange={e => setTravelLat(e.target.value)}
                      placeholder="1.3521"
                      required
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-crimson-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Dest. Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={travelLng}
                      onChange={e => setTravelLng(e.target.value)}
                      placeholder="103.8198"
                      required
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-crimson-600"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Departure Date</label>
                    <input
                      type="date"
                      value={travelDepart}
                      onChange={e => setTravelDepart(e.target.value)}
                      required
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crimson-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Return Date</label>
                    <input
                      type="date"
                      value={travelReturn}
                      onChange={e => setTravelReturn(e.target.value)}
                      required
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-crimson-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Purpose</label>
                  <input
                    type="text"
                    value={travelPurpose}
                    onChange={e => setTravelPurpose(e.target.value)}
                    placeholder="e.g. Field Study, Personal Travel, Conference"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-crimson-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={travelSaving}
                  className="w-full sentinel-btn-primary justify-center py-2.5"
                >
                  {travelSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : travelSaved ? (
                    <><CheckCircle className="w-4 h-4" /> Travel Plan Saved</>
                  ) : (
                    <><Plus className="w-4 h-4" /> Register Travel Plan</>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Settings tab */}
        {activeTab === 'settings' && student && (
          <div className="space-y-4">
            <div className="sentinel-card p-5">
              <h3 className="font-semibold text-white mb-1">Contact Information</h3>
              <p className="text-sm text-gray-400 mb-4">Your contact details on file with HBS Sentinel.</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm text-white">{student.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm text-white">{student.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Hometown</p>
                    <p className="text-sm text-white">{student.hometown}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sentinel-card p-5">
              <h3 className="font-semibold text-white mb-1">Notification Preferences</h3>
              <p className="text-sm text-gray-400 mb-4">Choose how you want to receive crisis alerts.</p>
              <form onSubmit={saveContactPrefs} className="space-y-3">
                {[
                  { key: 'email', label: 'Email Alerts', desc: 'Receive alerts at your HBS email', value: prefEmail, setter: setPrefEmail },
                  { key: 'sms', label: 'SMS Alerts', desc: 'Text message to your registered phone', value: prefSms, setter: setPrefSms },
                  { key: 'push', label: 'Portal Notifications', desc: 'In-app alerts on this portal', value: prefPush, setter: setPrefPush },
                ].map(pref => (
                  <label key={pref.key} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3 cursor-pointer hover:bg-gray-800 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-white">{pref.label}</p>
                      <p className="text-xs text-gray-500">{pref.desc}</p>
                    </div>
                    <div
                      onClick={() => pref.setter(!pref.value)}
                      className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${pref.value ? 'bg-crimson-700' : 'bg-gray-700'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${pref.value ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                  </label>
                ))}
                <button
                  type="submit"
                  disabled={prefSaving}
                  className="w-full sentinel-btn-primary justify-center py-2.5"
                >
                  {prefSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : prefSaved ? (
                    <><CheckCircle className="w-4 h-4" /> Preferences Saved</>
                  ) : (
                    'Save Preferences'
                  )}
                </button>
              </form>
            </div>

            <div className="sentinel-card p-4 border-gray-700/50">
              <p className="text-xs text-gray-500 leading-relaxed">
                <strong className="text-gray-400">Privacy Notice:</strong> HBS Sentinel collects location data exclusively for crisis alerting. Your data is not used for academic monitoring or any commercial purpose. Location history is automatically purged 90 days after each trip. GPS tracking requires your explicit consent and can be revoked at any time.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AlertCard({ alert }: { alert: Alert }) {
  const [expanded, setExpanded] = useState(false)
  const isAffected = alert.risk_status === 'AFFECTED'

  return (
    <div className={`rounded-lg p-3 border ${
      isAffected
        ? 'bg-red-950/20 border-red-900/40'
        : 'bg-amber-950/20 border-amber-900/40'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isAffected ? 'bg-red-500' : 'bg-amber-500'}`} />
          <span className={`text-xs font-semibold ${isAffected ? 'text-red-300' : 'text-amber-300'}`}>
            {alert.risk_status === 'AFFECTED' ? 'Safety Alert' : 'Travel Advisory'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-gray-500">
          <Clock className="w-3 h-3" />
          <span className="text-xs">{formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}</span>
        </div>
      </div>
      <p className={`text-xs text-gray-300 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
        {alert.message}
      </p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-gray-500 hover:text-gray-300 mt-1 flex items-center gap-1"
      >
        {expanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
      </button>
    </div>
  )
}
