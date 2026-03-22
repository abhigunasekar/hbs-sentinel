/**
 * HBS Sentinel — Admin Dashboard
 * v3.0 — Full HBS design refresh + Reports tab + map reset fix
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Shield, LogOut, Zap, RefreshCw, Users, AlertTriangle,
  CheckCircle, Globe, Bell, Newspaper, ChevronRight,
  MapPin, Clock, X, Send, RotateCcw, ExternalLink, BarChart2
} from 'lucide-react'
import { WorldMap } from '../components/WorldMap'
import { StatusBadge, SeverityBar } from '../components/StatusBadge'
import { PipelineProgress } from '../components/PipelineProgress'
import ReportsTab from '../components/ReportsTab'
import { useWebSocket } from '../useWebSocket'
import { api } from '../api'
import type { AuthUser, Student, CrisisEvent, DeliveryLogEntry, NewsItem } from '../types'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  user: AuthUser
  onLogout: () => void
}

type Tab = 'map' | 'students' | 'log' | 'news' | 'reports'

const HBS_CRIMSON = '#AC2134'
const AMBER = '#d97706'
const GREEN = '#16a34a'
const GRAY = '#6b7280'

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
        addNotification(`✓ ${data.student_name} confirmed safe`)
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
        // Bug fix #2: use students from WS payload (new array ref forces WorldMap re-render)
        setCrisis(null)
        setPipelineStage('')
        setPipelineRunning(false)
        setDeliveryLog([])
        if (data.students && data.students.length > 0) {
          setStudents([...data.students])  // spread ensures new reference → WorldMap re-renders
        } else {
          api.getDashboard().then(d => setStudents([...d.students]))
        }
        addNotification('Demo reset complete — map redrawn')
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

  const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: 'map', label: 'World Map', icon: Globe },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'log', label: 'Delivery Log', icon: Bell, badge: deliveryLog.filter(e => e.status === 'Delivered').length || undefined },
    { id: 'news', label: 'News', icon: Newspaper, badge: news.filter(n => n.is_crisis).length || undefined },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Top Navigation Bar ── */}
      <header style={{
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, background: HBS_CRIMSON, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={18} color="white" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 400, color: '#f1f5f9' }}>HBS</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 300, color: '#94a3b8', letterSpacing: '0.05em' }}>Sentinel</span>
          </div>
          {crisis && (
            <div style={{
              marginLeft: 8, display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(172,33,52,0.15)', border: '1px solid rgba(172,33,52,0.4)',
              borderRadius: 20, padding: '3px 10px',
            }}>
              <div style={{ width: 6, height: 6, background: HBS_CRIMSON, borderRadius: '50%', animation: 'pulse 2s infinite' }} />
              <span style={{ color: '#e88a96', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em' }}>
                ACTIVE CRISIS: {crisis.name.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {notifications.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#1e293b', borderRadius: 6, padding: '6px 12px',
              maxWidth: 280,
            }}>
              <Bell size={13} color="#9ca3af" />
              <span style={{ fontSize: 12, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {notifications[0]}
              </span>
            </div>
          )}
          <span style={{ fontSize: 13, color: '#6b7280' }}>{user.name}</span>
          <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ── Status Headline ── */}
      <div style={{
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          {crisis ? (
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 400, color: HBS_CRIMSON, margin: 0, lineHeight: 1 }}>
              ⚠ Active Crisis — {affected + atRisk} Student{affected + atRisk !== 1 ? 's' : ''} Affected
            </h1>
          ) : (
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 400, color: '#94a3b8', margin: 0, lineHeight: 1 }}>
              All Clear — All Students Safe
            </h1>
          )}
          <p style={{ fontSize: 13, color: '#4b5563', margin: '6px 0 0 0' }}>
            {user.title || 'Dean of Students'} · Harvard Business School
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <StatBlock label="Total" value={students.length} color="#f1f5f9" />
          <StatBlock label="Affected" value={affected} color={affected > 0 ? HBS_CRIMSON : '#4b5563'} />
          <StatBlock label="At Risk" value={atRisk} color={atRisk > 0 ? AMBER : '#4b5563'} />
          <StatBlock label="Safe" value={safe} color={safe > 0 ? GREEN : '#4b5563'} />
          <StatBlock label="Unconfirmed" value={unconfirmed} color={GRAY} />
          <button
            onClick={resetDemo}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: '1px solid #334155', borderRadius: 6,
              padding: '6px 12px', color: '#6b7280', fontSize: 12, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = '#475569' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = '#334155' }}
          >
            <RotateCcw size={12} /> Reset Demo
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: content area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Tab bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            padding: '0 20px',
            borderBottom: '1px solid #1e293b',
            background: '#0f172a',
            flexShrink: 0,
          }}>
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '12px 16px',
                    background: 'none', border: 'none',
                    borderBottom: isActive ? `2px solid ${HBS_CRIMSON}` : '2px solid transparent',
                    color: isActive ? '#f1f5f9' : '#6b7280',
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer', transition: 'all 0.15s',
                    marginBottom: -1,
                  }}
                >
                  <Icon size={14} />
                  {tab.label}
                  {tab.badge != null && tab.badge > 0 && (
                    <span style={{
                      background: tab.id === 'news' ? AMBER : HBS_CRIMSON,
                      color: '#fff', fontSize: 10, borderRadius: 10,
                      padding: '1px 6px', fontWeight: 700,
                    }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: 'hidden', background: '#030712', padding: activeTab === 'reports' ? '24px 28px' : 16 }}>

            {activeTab === 'map' && (
              <WorldMap
                students={students}
                crisis={crisis}
                onStudentClick={setSelectedStudent}
              />
            )}

            {activeTab === 'students' && (
              <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
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
              <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {deliveryLog.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#374151' }}>
                    <Bell size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <p style={{ fontSize: 14, margin: 0 }}>No alerts sent yet</p>
                    <p style={{ fontSize: 12, color: '#4b5563', margin: '4px 0 0 0' }}>Trigger a crisis to see the delivery log</p>
                  </div>
                ) : (
                  deliveryLog.map(entry => <DeliveryRow key={entry.id} entry={entry} />)
                )}
                <div ref={logEndRef} />
              </div>
            )}

            {activeTab === 'news' && (
              <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
                  <div>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Live global news feed monitored by AI</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
                        color: '#93c5fd', borderRadius: 20, padding: '2px 8px', fontSize: 11,
                      }}>
                        <Globe size={10} /> GDELT Live Feed
                      </span>
                      <span style={{ fontSize: 11, color: '#374151' }}>· Real headlines, AI-classified</span>
                    </div>
                  </div>
                  <button
                    onClick={scanNews}
                    disabled={scanningNews}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
                      padding: '7px 14px', color: '#cbd5e1', fontSize: 12, cursor: scanningNews ? 'not-allowed' : 'pointer',
                      opacity: scanningNews ? 0.6 : 1,
                    }}
                  >
                    <RefreshCw size={13} style={{ animation: scanningNews ? 'spin 1s linear infinite' : 'none' }} />
                    {scanningNews ? 'Scanning...' : 'Scan News'}
                  </button>
                </div>
                {news.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: '#374151' }}>
                    <Newspaper size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <p style={{ fontSize: 14, margin: 0 }}>No news items yet</p>
                    <p style={{ fontSize: 12, color: '#4b5563', margin: '4px 0 0 0' }}>Click "Scan News" to monitor live global news</p>
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

            {activeTab === 'reports' && <ReportsTab />}
          </div>
        </div>

        {/* ── Right sidebar ── */}
        {activeTab !== 'reports' && (
          <div style={{
            width: 300, borderLeft: '1px solid #1e293b', background: '#0a0f1a',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
          }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Crisis Controls */}
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 20 }}>
                <h3 style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={13} color={HBS_CRIMSON} /> Crisis Controls
                </h3>

                {(pipelineRunning || pipelineStage) && (
                  <div style={{ marginBottom: 16 }}>
                    <PipelineProgress currentStage={pipelineStage} message={pipelineMessage} error={pipelineError} />
                  </div>
                )}

                {!crisis && !pipelineRunning && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                      onClick={triggerBangkok}
                      style={{
                        width: '100%', background: HBS_CRIMSON, color: '#fff', border: 'none',
                        borderRadius: 8, padding: '14px 0', fontSize: 14, fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: `0 4px 16px rgba(172,33,52,0.3)`,
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      <AlertTriangle size={18} />
                      Trigger Bangkok Typhoon
                    </button>

                    {showCustomForm ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <textarea
                          value={customCrisis}
                          onChange={e => setCustomCrisis(e.target.value)}
                          placeholder="Describe the crisis event..."
                          rows={3}
                          style={{
                            width: '100%', background: '#0f172a', border: '1px solid #334155',
                            borderRadius: 6, padding: '10px 12px', color: '#f1f5f9', fontSize: 13,
                            resize: 'none', outline: 'none', boxSizing: 'border-box',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={triggerCustom} style={{
                            flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
                            padding: '8px 0', color: '#f1f5f9', fontSize: 13, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}>
                            <Send size={13} /> Trigger
                          </button>
                          <button onClick={() => setShowCustomForm(false)} style={{
                            background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
                            padding: '8px 12px', color: '#6b7280', fontSize: 13, cursor: 'pointer',
                          }}>
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowCustomForm(true)}
                        style={{
                          width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
                          padding: '10px 0', color: '#9ca3af', fontSize: 13, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#f1f5f9')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
                      >
                        <Globe size={14} /> Custom Crisis
                      </button>
                    )}
                  </div>
                )}

                {crisis && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ background: 'rgba(172,33,52,0.1)', border: '1px solid rgba(172,33,52,0.3)', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 8, height: 8, background: HBS_CRIMSON, borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                        <span style={{ color: '#e88a96', fontWeight: 600, fontSize: 14 }}>{crisis.name}</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 8px 0' }}>{crisis.affected_area}</p>
                      <SeverityBar severity={crisis.severity} />
                      <p style={{ fontSize: 11, color: '#6b7280', margin: '8px 0 0 0' }}>
                        Confidence: {Math.round(crisis.confidence * 100)}% · Radius: {crisis.radius_km}km
                      </p>
                      {crisis.source_headline && (
                        <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0 0', fontStyle: 'italic' }}>
                          "{crisis.source_headline}"
                        </p>
                      )}
                    </div>
                    <button
                      onClick={resolveActiveCrisis}
                      style={{
                        width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
                        padding: '10px 0', color: '#9ca3af', fontSize: 13, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <CheckCircle size={14} /> Resolve Crisis
                    </button>
                  </div>
                )}
              </div>

              {/* Student detail */}
              {selectedStudent && (
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                      Student Detail
                    </h3>
                    <button onClick={() => setSelectedStudent(null)} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer' }}>
                      <X size={14} />
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
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 20 }}>
                  <h3 style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={13} /> Students
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {students.map(s => {
                      const dotColor = s.risk_status === 'AFFECTED' ? HBS_CRIMSON
                        : s.risk_status === 'AT_RISK' ? AMBER
                        : s.risk_status === 'SAFE' ? GREEN
                        : GRAY
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSelectedStudent(s)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 8px', background: 'none', border: 'none', borderRadius: 6,
                            cursor: 'pointer', transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#0f172a')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <div style={{
                              width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0,
                              animation: s.risk_status === 'AFFECTED' ? 'pulse 2s infinite' : 'none',
                            }} />
                            <span style={{ fontSize: 13, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                          </div>
                          <ChevronRight size={12} color="#4b5563" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
      `}</style>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatBlock({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 40, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#4b5563', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  )
}

function StudentRow({ student, onSelect, onStatusChange }: {
  student: Student
  onSelect: () => void
  onStatusChange: (s: string) => void
}) {
  const dotColor = student.risk_status === 'AFFECTED' ? HBS_CRIMSON
    : student.risk_status === 'AT_RISK' ? AMBER
    : student.risk_status === 'SAFE' ? GREEN
    : GRAY

  return (
    <div
      onClick={onSelect}
      style={{
        background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer', transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#475569')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#334155')}
    >
      <div style={{
        width: 12, height: 12, borderRadius: '50%', background: dotColor, flexShrink: 0,
        animation: student.risk_status === 'AFFECTED' ? 'pulse 2s infinite' : 'none',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 500, color: '#f1f5f9', fontSize: 14 }}>{student.name}</span>
          <span style={{ fontSize: 11, color: '#4b5563' }}>{student.year}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
          <MapPin size={11} color="#4b5563" />
          <span style={{ fontSize: 12, color: '#6b7280' }}>{student.current_city}</span>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <p style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 15, margin: 0 }}>{student.name}</p>
        <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0 0' }}>{student.year} · {student.program}</p>
        <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
          <MapPin size={11} /> {student.current_city}
        </p>
      </div>
      <StatusBadge status={student.risk_status} size="md" />
      {student.alert_message && (
        <div style={{ background: '#0f172a', borderRadius: 6, padding: 12, borderLeft: `3px solid ${HBS_CRIMSON}` }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px 0' }}>AI Alert</p>
          <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>{student.alert_message}</p>
        </div>
      )}
      <div>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px 0' }}>Manual Override</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {['AFFECTED', 'AT_RISK', 'SAFE', 'UNCONFIRMED'].map(s => (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              style={{
                fontSize: 11, padding: '7px 0', borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
                background: student.risk_status === s ? '#334155' : '#0f172a',
                border: `1px solid ${student.risk_status === s ? '#475569' : '#1e293b'}`,
                color: student.risk_status === s ? '#f1f5f9' : '#6b7280',
                fontWeight: student.risk_status === s ? 600 : 400,
              }}
            >
              {s === 'AT_RISK' ? 'At Risk' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>
      {student.safe_confirmed_at && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: GREEN, fontSize: 12 }}>
          <CheckCircle size={13} />
          Safe confirmed {formatDistanceToNow(new Date(student.safe_confirmed_at), { addSuffix: true })}
        </div>
      )}
    </div>
  )
}

function DeliveryRow({ entry }: { entry: DeliveryLogEntry }) {
  const isDelivered = entry.status === 'Delivered'
  const isSafe = entry.status === 'No Alert — Safe'
  const dotColor = isDelivered ? GREEN : isSafe ? GRAY : AMBER

  return (
    <div style={{
      background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
      padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, marginTop: 5, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 500, color: '#f1f5f9', fontSize: 13 }}>{entry.student_name}</span>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500,
            background: isDelivered ? 'rgba(22,163,74,0.15)' : isSafe ? '#1e293b' : 'rgba(217,119,6,0.15)',
            color: isDelivered ? GREEN : isSafe ? GRAY : AMBER,
          }}>
            {entry.status}
          </span>
          <span style={{ fontSize: 11, background: '#0f172a', color: '#6b7280', padding: '2px 8px', borderRadius: 20 }}>
            {entry.channel}
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#4b5563', margin: '4px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.message_preview}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Clock size={11} color="#374151" />
          <span style={{ fontSize: 11, color: '#374151' }}>
            {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  )
}

function NewsRow({ item, onTrigger }: { item: NewsItem; onTrigger: () => void }) {
  return (
    <div style={{
      background: item.is_crisis ? 'rgba(217,119,6,0.05)' : '#1e293b',
      border: `1px solid ${item.is_crisis ? 'rgba(217,119,6,0.3)' : '#334155'}`,
      borderRadius: 8, padding: '12px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: item.is_crisis ? AMBER : '#374151',
          marginTop: 5, flexShrink: 0,
          animation: item.is_crisis ? 'pulse 2s infinite' : 'none',
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0, lineHeight: 1.4 }}>{item.headline}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#4b5563' }}>{item.source}</span>
            <span style={{ fontSize: 11, color: '#374151' }}>·</span>
            <span style={{ fontSize: 11, color: '#4b5563' }}>{item.location_mentioned}</span>
            {item.is_crisis && (
              <span style={{
                fontSize: 10, background: 'rgba(217,119,6,0.15)', color: AMBER,
                border: '1px solid rgba(217,119,6,0.3)', borderRadius: 20, padding: '2px 8px', fontWeight: 600,
              }}>
                Crisis Flagged
              </span>
            )}
          </div>
          {item.is_crisis && (
            <button
              onClick={onTrigger}
              style={{
                marginTop: 8, background: 'none', border: 'none', color: '#e88a96',
                fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0,
              }}
            >
              <Zap size={12} /> Trigger pipeline for this event
            </button>
          )}
        </div>
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: '#374151', flexShrink: 0 }}>
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  )
}
