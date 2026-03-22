const BASE = '/api'

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data: {
    name: string; email: string; password: string;
    year?: string; program?: string; hometown?: string;
    phone?: string; current_city?: string; current_lat?: number; current_lng?: number;
  }) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  // Students
  getStudents: () => request('/students'),
  getStudent: (id: string) => request(`/students/${id}`),
  updateLocation: (student_id: string, city: string, lat: number, lng: number) =>
    request('/students/location', { method: 'POST', body: JSON.stringify({ student_id, city, lat, lng }) }),
  addTravelPlan: (data: object) =>
    request('/students/travel-plan', { method: 'POST', body: JSON.stringify(data) }),
  updateContactPrefs: (data: object) =>
    request('/students/contact-prefs', { method: 'POST', body: JSON.stringify(data) }),
  confirmSafe: (student_id: string) =>
    request('/students/safe', { method: 'POST', body: JSON.stringify({ student_id }) }),
  getStudentAlerts: (student_id: string) =>
    request(`/students/${student_id}/alerts`),

  // Crisis
  getActiveCrisis: () => request('/crisis/active'),
  getAllCrises: () => request('/crisis/all'),
  triggerCrisis: (description: string, source_headline?: string, source_url?: string) =>
    request('/crisis/trigger', { method: 'POST', body: JSON.stringify({ description, source_headline, source_url }) }),
  triggerBangkok: () =>
    request('/crisis/trigger-bangkok', { method: 'POST' }),
  resolveCrisis: (crisis_id: string) =>
    request(`/crisis/${crisis_id}/resolve`, { method: 'POST' }),

  // Admin
  getDashboard: () => request('/admin/dashboard'),
  updateStudentStatus: (student_id: string, status: string) =>
    request('/admin/students/status', { method: 'POST', body: JSON.stringify({ student_id, status }) }),
  resetDemo: () => request('/admin/reset', { method: 'POST' }),

  // Delivery Log
  getDeliveryLog: (crisis_id?: string) =>
    request(`/delivery-log${crisis_id ? `?crisis_id=${crisis_id}` : ''}`),

  // News
  getNews: () => request('/news'),
  scanNews: () => request('/news/scan', { method: 'POST' }),
}
