export type RiskStatus = 'AFFECTED' | 'AT_RISK' | 'SAFE' | 'UNCONFIRMED'
export type UserRole = 'student' | 'admin'

export interface TravelPlan {
  destination: string
  destination_lat: number
  destination_lng: number
  departure_date: string
  return_date: string
  purpose: string
}

export interface Student {
  id: string
  name: string
  email: string
  year: string
  program: string
  hometown: string
  phone: string
  current_city: string
  current_lat: number
  current_lng: number
  bio: string
  risk_status: RiskStatus
  alert_message: string | null
  alert_id: string | null
  safe_confirmed_at: string | null
  contact_email: boolean
  contact_sms: boolean
  contact_push: boolean
  travel_plans: TravelPlan[]
}

export interface CrisisEvent {
  id: string
  name: string
  crisis_type: string
  description: string
  severity: number
  center_lat: number
  center_lng: number
  radius_km: number
  affected_area: string
  triggered_at: string
  triggered_by: string
  confidence: number
  source_headline: string | null
  source_url: string | null
  is_active: boolean
  affected_students: string[]
  at_risk_students: string[]
  pipeline_status: string
}

export interface Alert {
  id: string
  crisis_id: string
  student_id: string
  student_name: string
  risk_status: RiskStatus
  message: string
  risk_rationale: string
  created_at: string
  status: string
  read_at: string | null
  acknowledged_at: string | null
}

export interface DeliveryLogEntry {
  id: string
  crisis_id: string
  student_id: string
  student_name: string
  channel: string
  status: string
  timestamp: string
  message_preview: string
}

export interface NewsItem {
  id: string
  headline: string
  source: string
  url: string
  detected_at: string
  severity_estimate: number
  location_mentioned: string
  is_crisis: boolean
  crisis_type: string | null
  auto_triggered: boolean
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  title?: string
  year?: string
  current_city?: string
}

export interface WSMessage {
  type: string
  data: any
}
