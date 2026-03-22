import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Shield, LogOut, Zap, RefreshCw, Users, AlertTriangle,
  CheckCircle, Globe, Bell, Newspaper, ChevronRight,
  MapPin, Clock, X, Send, RotateCcw, ExternalLink
} from 'lucide-react'
import { WorldMap } from '../components/WorldMap'
import { StatusBadge, SeverityBar } from '../components/StatusBadge'
import { PipelineProgress } from '../components/PipelineProgress'
import { useWebSocket } from '../useWebSocket'
import { api } from '../api'
import type { AuthUser, Student, CrisisEvent, DeliveryLogEntry, NewsItem } from '../types'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  user: AuthUser
  onLogout: () => void
}

type Tab = 'map' | 'students' | 'log' | 'news'

export function AdminDashboard({ user, onLogout }: Props) {
  const [students, setStudents] = useState<Student[]>([])
  const [crisis, setCrisis] = useState<CrisisEvent | null>(null)
  const [deliveryLog, setDeliveryLog] = useState<DeliveryLogEntry[]>([])
  const [news, setNews] = useState<NewsItem[]>([])
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const [pipelineStage, setPipelineStage] = useState('')
  const [pipelineMessage, setPipelineMessage] = useState('')
  const [pipelineError, setPipelineError] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('map')
  const [customCrisis, setCustomCrisis] = useState('')
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [notifications, setNotifications] = useState<string[]>([])
  const [scanningNews, setScanningNews] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  // Load initial data
  useEffect(() => {
    api.getDashboard().then(data => {
      setStudents(data.students || [])
      setCrisis(data.active_crisis)
      setDeliveryLog(data.delivery_log || [])
      setNews(data.news || [])
      setPipelineRunning(data.pipeline_running || false)
    }).catch(console.error)
  }, [])

  // Auto-scroll delivery log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [deliveryLog])

  const addNotification = (msg: string) => {
    setNotifications(prev => [msg, ...prev].slice(0, 5))
    setTimeout(() => setNotifications(prev => prev.filter(n => n !== msg)), 8000)
  }

  const handleWSMessage = useCallback((msg: any) => {
    const { type, data } = msg

    switch (type) {
      case 'connected':
        setStudents(data.students || [])
        setCrisis(data.active_crisis)
        setNews(data.news || [])
        setPipelineRunning(data.pipeline_running || false)
        break

      case 'pipeline_progress':
        setPipelineRunning(true)
        setPipelineStage(data.stage)
        setPipelineMessage(data.message)
        setPipelineError('')
        break

      case 'crisis_detected':
        setCrisis(data.crisis)
        setStudents(data.students || [])
        setPipelineRunning(false)
        setPipelineStage('complete')
        addNotification(`Crisis detected: ${data.crisis?.name}`)
        api.getDeliveryLog().then(r => setDeliveryLog(r.entries || []))
        break

      case 'alert_delivered':
        setStudents(prev => prev.map(s =>
          s.id === data.student_id
            ? { ...s, risk_status: data.risk_status }
            : s
        ))
        if (data.delivery_log) setDeliveryLog(data.delivery_log)
        break

      case 'student_safe_confirmed':
        setStudents(prev => prev.map(s =>
          s.id === data.student_id ? { ...s, ...data.student } : s
        ))
        addNotification(`✓ ${data.student_name} marked themselves safe`)
        break

      case 'student_status_updated':
        setStudents(prev => prev.map(s =>
          s.id === data.student?.id ? { ...s, ...data.student } : s
        ))
        break

      case 'student_location_updated':
      case 'student_travel_updated':
        setStudents(prev => prev.map(s =>
          s.id === data.student?.id ? { ...s, ...data.student } : s
        ))
        break

      case 'student_online':
        addNotification(`${data.student_name} came online`)
        break

      case 'news_scan_started':
        setScanningNews(true)
        break

      case 'news_scan_complete':
        setScanningNews(false)
        setNews(data.news || [])
        if (data.new_count > 0) {
          addNotification(`News scan: ${data.new_count} items found, ${data.crisis_count} flagged`)
        }
        break

      case 'news_scan_error':
        setScanningNews(false)
        break

      case 'pipeline_error':
        setPipelineRunning(false)
        setPipelineError(data.message)
        setPipelineStage('error')
        break

      case 'crisis_resolved':
        setCrisis(null)
        setStudents(data.students || [])
        setPipelineStage('')
        addNotification('Crisis resolved — all students reset to unconfirmed')
        break

      case 'demo_reset':
        setCrisis(null)
        setPipelineStage('')
        setPipelineRunning(false)
        setDeliveryLog([])
        api.getDashboard().then(d => setStudents(d.students || []))
        addNotification('Demo reset complete')
        break
    }
  }, [])

  useWebSocket(`/ws/admin/${user.id}`, handleWSMessage)

  const triggerBangkok = async () => {
    setPipelineError('')
    setPipelineStage('detecting')
    setPipelineMessage('Initializing Bangkok Typhoon scenario...')
    try {
      await api.triggerBangkok()
    } catch (e: any) {
      setPipelineError(e.message)
    }
  }

  const triggerCustom = async () => {
    if (!customCrisis.trim()) return
    setPipelineError('')
    setPipelineStage('detecting')
    setPipelineMessage('Starting custom crisis pipeline...')
    try {
      await api.triggerCrisis(customCrisis)
      setCustomCrisis('')
      setShowCustomForm(false)
    } catch (e: any) {
      setPipelineError(e.message)
    }
  }

  const scanNews = async () => {
    setScanningNews(true)
    try {
      await api.scanNews()
    } catch (e) {
      setScanningNews(false)
    }
  }

  const resetDemo = async () => {
    if (!confirm('Reset all demo data? This will clear the active crisis and reset all student statuses.')) return
    await api.resetDemo()
  }

  const resolveActiveCrisis = async () => {
    if (!crisis) return
    await api.resolveCrisis(crisis.id)
  }

  const updateStudentStatus = async (studentId: string, status: string) => {
    await api.updateStudentStatus(studentId, status)
  }

  // Stats
  const affected = students.filter(s => s.risk_status === 'AFFECTED').length
  const atRisk = students.filter(s => s.risk_status === 'AT_RISK').length
  const safe = students.filter(s => s.risk_status === 'SAFE').length
  const unconfirmed = students.filter(s => s.risk_status === 'UNCONFIRMED').length

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-crimson-700 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg leading-none">HBS Sentinel</h1>
            <p className="text-xs text-gray-500 mt-0.5">Admin Dashboard</p>
          </div>
          {crisis && (
            <div className="ml-4 flex items-center gap-1.5 bg-red-900/30 border border-red-800/50 rounded-full px-3 py-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-300 text-xs font-semibold">ACTIVE CRISIS: {crisis.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5 max-w-xs">
              <Bell className="w-4 h-4 text-crimson-400 shrink-0" />
              <span className="text-xs text-gray-300 truncate">{notifications[0]}</span>
            </div>
          )}
          <span className="text-sm text-gray-400">{user.name}</span>
          <button onClick={onLogout} className="text-gray-500 hover:text-gray-300 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-gray-900/50 border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">{students.length} Students Tracked</span>
        </div>
        <div className="h-4 w-px bg-gray-700" />
        <StatPill label="Affected" value={affected} color="text-red-400" />
        <StatPill label="At Risk" value={atRisk} color="text-amber-400" />
        <StatPill label="Safe" value={safe} color="text-emerald-400" />
        <StatPill label="Unconfirmed" value={unconfirmed} color="text-gray-400" />
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={resetDemo}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Demo
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Map + Controls */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-gray-800 bg-gray-950">
            {(['map', 'students', 'log', 'news'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors capitalize ${
                  activeTab === tab
                    ? 'bg-gray-900 text-white border-t border-l border-r border-gray-700'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab === 'map' && <Globe className="w-3.5 h-3.5 inline mr-1.5" />}
                {tab === 'students' && <Users className="w-3.5 h-3.5 inline mr-1.5" />}
                {tab === 'log' && <Bell className="w-3.5 h-3.5 inline mr-1.5" />}
                {tab === 'news' && <Newspaper className="w-3.5 h-3.5 inline mr-1.5" />}
                {tab === 'map' ? 'World Map' : tab === 'log' ? 'Delivery Log' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'log' && deliveryLog.length > 0 && (
                  <span className="ml-1.5 bg-crimson-700 text-white text-xs rounded-full px-1.5 py-0.5">
                    {deliveryLog.filter(e => e.status === 'Delivered').length}
                  </span>
                )}
                {tab === 'news' && news.filter(n => n.is_crisis).length > 0 && (
                  <span className="ml-1.5 bg-amber-600 text-white text-xs rounded-full px-1.5 py-0.5">
                    {news.filter(n => n.is_crisis).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden bg-gray-900 p-4">
            {activeTab === 'map' && (
              <WorldMap
                students={students}
                crisis={crisis}
                onStudentClick={setSelectedStudent}
              />
            )}

            {activeTab === 'students' && (
              <div className="h-full overflow-y-auto space-y-2 pr-1">
                {students.map(student => (
                  <StudentRow
                    key={student.id}
                    student={student}
                    onSelect={() => setSelectedStudent(student)}
                    onStatusChange={(s) => updateStudentStatus(student.id, s)}
                  />
                ))}
              </div>
            )}

            {activeTab === 'log' && (
              <div className="h-full overflow-y-auto space-y-2 pr-1">
                {deliveryLog.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-600">
                    <Bell className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">No alerts sent yet</p>
                    <p className="text-xs mt-1">Trigger a crisis to see the delivery log</p>
                  </div>
                ) : (
                  deliveryLog.map(entry => (
                    <DeliveryRow key={entry.id} entry={entry} />
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            )}

            {activeTab === 'news' && (
              <div className="h-full overflow-y-auto space-y-2 pr-1">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-400">Live global news feed monitored by Claude</p>
                  <button
                    onClick={scanNews}
                    disabled={scanningNews}
                    className="sentinel-btn-secondary text-xs py-1.5"
                  >
                    {scanningNews ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Scanning...</>
                    ) : (
                      <><RefreshCw className="w-3.5 h-3.5" /> Scan News</>
                    )}
                  </button>
                </div>
                {news.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-600">
                    <Newspaper className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">No news items yet</p>
                    <p className="text-xs mt-1">Click "Scan News" to monitor live global news</p>
                  </div>
                ) : (
                  news.map(item => <NewsRow key={item.id} item={item} onTrigger={() => {
                    setCustomCrisis(item.headline)
                    setShowCustomForm(true)
                    setActiveTab('map')
                  }} />)
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-80 border-l border-gray-800 bg-gray-950 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Crisis Controls */}
            <div className="sentinel-card p-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-crimson-400" />
                Crisis Controls
              </h3>

              {/* Pipeline progress */}
              {(pipelineRunning || pipelineStage) && (
                <div className="mb-3">
                  <PipelineProgress
                    currentStage={pipelineStage}
                    message={pipelineMessage}
                    error={pipelineError}
                  />
                </div>
              )}

              {/* Bangkok button */}
              {!crisis && !pipelineRunning && (
                <button
                  onClick={triggerBangkok}
                  className="w-full bg-crimson-700 hover:bg-crimson-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mb-2 shadow-lg shadow-crimson-900/30"
                >
                  <AlertTriangle className="w-5 h-5" />
                  Trigger Bangkok Typhoon
                </button>
              )}

              {/* Custom crisis */}
              {!crisis && !pipelineRunning && (
                <>
                  {showCustomForm ? (
                    <div className="space-y-2">
                      <textarea
                        value={customCrisis}
                        onChange={e => setCustomCrisis(e.target.value)}
                        placeholder="Describe the crisis event..."
                        rows={3}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-crimson-600 resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={triggerCustom} className="flex-1 sentinel-btn-primary text-sm py-2 justify-center">
                          <Send className="w-3.5 h-3.5" />
                          Trigger
                        </button>
                        <button onClick={() => setShowCustomForm(false)} className="sentinel-btn-secondary text-sm py-2">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCustomForm(true)}
                      className="w-full sentinel-btn-secondary text-sm py-2 justify-center"
                    >
                      <Globe className="w-4 h-4" />
                      Custom Crisis
                    </button>
                  )}
                </>
              )}

              {/* Active crisis info */}
              {crisis && (
                <div className="space-y-3">
                  <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-red-300 font-semibold text-sm">{crisis.name}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{crisis.affected_area}</p>
                    <SeverityBar severity={crisis.severity} />
                    <p className="text-xs text-gray-500 mt-2">
                      Confidence: {Math.round(crisis.confidence * 100)}% · Radius: {crisis.radius_km}km
                    </p>
                    {crisis.source_headline && (
                      <p className="text-xs text-gray-500 mt-1 italic">"{crisis.source_headline}"</p>
                    )}
                  </div>
                  <button
                    onClick={resolveActiveCrisis}
                    className="w-full sentinel-btn-secondary text-sm py-2 justify-center"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Resolve Crisis
                  </button>
                </div>
              )}
            </div>

            {/* Student detail */}
            {selectedStudent && (
              <div className="sentinel-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Student Detail</h3>
                  <button onClick={() => setSelectedStudent(null)} className="text-gray-500 hover:text-gray-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <StudentDetail
                  student={selectedStudent}
                  onStatusChange={(s) => updateStudentStatus(selectedStudent.id, s)}
                />
              </div>
            )}

            {/* Quick student list */}
            {!selectedStudent && (
              <div className="sentinel-card p-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  Students
                </h3>
                <div className="space-y-1.5">
                  {students.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudent(s)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          s.risk_status === 'AFFECTED' ? 'bg-red-500 animate-pulse' :
                          s.risk_status === 'AT_RISK' ? 'bg-amber-500' :
                          s.risk_status === 'SAFE' ? 'bg-emerald-500' :
                          'bg-gray-500'
                        }`} />
                        <span className="text-sm text-gray-300 truncate">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-gray-500 hidden group-hover:block">
                          {s.current_city.split(',')[0]}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-lg font-bold ${color}`}>{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  )
}

function StudentRow({ student, onSelect, onStatusChange }: {
  student: Student
  onSelect: () => void
  onStatusChange: (s: string) => void
}) {
  return (
    <div className="sentinel-card p-3 flex items-center gap-3 hover:border-gray-700 transition-colors cursor-pointer" onClick={onSelect}>
      <div className={`w-3 h-3 rounded-full shrink-0 ${
        student.risk_status === 'AFFECTED' ? 'bg-red-500 animate-pulse' :
        student.risk_status === 'AT_RISK' ? 'bg-amber-500' :
        student.risk_status === 'SAFE' ? 'bg-emerald-500' :
        'bg-gray-500'
      }`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white text-sm">{student.name}</span>
          <span className="text-xs text-gray-500">{student.year}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-400">{student.current_city}</span>
        </div>
      </div>
      <StatusBadge status={student.risk_status} />
    </div>
  )
}

function StudentDetail({ student, onStatusChange }: {
  student: Student
  onStatusChange: (s: string) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold text-white">{student.name}</p>
        <p className="text-xs text-gray-400">{student.year} · {student.program}</p>
        <p className="text-xs text-gray-500 mt-1">📍 {student.current_city}</p>
      </div>
      <StatusBadge status={student.risk_status} size="md" />
      {student.alert_message && (
        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Claude Alert</p>
          <p className="text-xs text-gray-300 leading-relaxed">{student.alert_message}</p>
        </div>
      )}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Manual Override</p>
        <div className="grid grid-cols-2 gap-1.5">
          {['AFFECTED', 'AT_RISK', 'SAFE', 'UNCONFIRMED'].map(s => (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={`text-xs py-1.5 rounded-lg border transition-colors ${
                student.risk_status === s
                  ? 'bg-gray-700 border-gray-600 text-white font-semibold'
                  : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              {s === 'AT_RISK' ? 'At Risk' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>
      {student.safe_confirmed_at && (
        <div className="flex items-center gap-2 text-emerald-400 text-xs">
          <CheckCircle className="w-3.5 h-3.5" />
          Safe confirmed {formatDistanceToNow(new Date(student.safe_confirmed_at), { addSuffix: true })}
        </div>
      )}
    </div>
  )
}

function DeliveryRow({ entry }: { entry: DeliveryLogEntry }) {
  const isDelivered = entry.status === 'Delivered'
  const isSafe = entry.status === 'No Alert — Safe'
  return (
    <div className="sentinel-card p-3 flex items-start gap-3 slide-in">
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
        isDelivered ? 'bg-emerald-500' : isSafe ? 'bg-gray-500' : 'bg-amber-500'
      }`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-white text-sm">{entry.student_name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isDelivered ? 'bg-emerald-900/40 text-emerald-400' :
            isSafe ? 'bg-gray-800 text-gray-500' :
            'bg-amber-900/40 text-amber-400'
          }`}>
            {entry.status}
          </span>
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{entry.channel}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1 truncate">{entry.message_preview}</p>
        <div className="flex items-center gap-1 mt-1">
          <Clock className="w-3 h-3 text-gray-600" />
          <span className="text-xs text-gray-600">
            {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  )
}

function NewsRow({ item, onTrigger }: { item: NewsItem; onTrigger: () => void }) {
  return (
    <div className={`sentinel-card p-3 ${item.is_crisis ? 'border-amber-800/50 bg-amber-950/10' : ''}`}>
      <div className="flex items-start gap-2">
        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
          item.is_crisis ? 'bg-amber-500 animate-pulse' : 'bg-gray-600'
        }`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200 leading-snug">{item.headline}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs text-gray-500">{item.source}</span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-500">{item.location_mentioned}</span>
            {item.is_crisis && (
              <span className="text-xs bg-amber-900/40 text-amber-400 border border-amber-800/50 px-2 py-0.5 rounded-full font-medium">
                Crisis Flagged
              </span>
            )}
          </div>
          {item.is_crisis && (
            <button
              onClick={onTrigger}
              className="mt-2 text-xs text-crimson-400 hover:text-crimson-300 flex items-center gap-1"
            >
              <Zap className="w-3 h-3" />
              Trigger pipeline for this event
            </button>
          )}
        </div>
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-400 shrink-0">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  )
}
