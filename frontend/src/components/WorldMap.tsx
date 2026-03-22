import { useEffect, useRef } from 'react'
import type { Student, CrisisEvent } from '../types'

interface Props {
  students: Student[]
  crisis: CrisisEvent | null
  onStudentClick?: (student: Student) => void
}

const STATUS_COLORS: Record<string, string> = {
  AFFECTED: '#ef4444',
  AT_RISK: '#f59e0b',
  SAFE: '#10b981',
  UNCONFIRMED: '#6b7280',
}

const STATUS_LABELS: Record<string, string> = {
  AFFECTED: 'Affected',
  AT_RISK: 'At Risk',
  SAFE: 'Safe',
  UNCONFIRMED: 'Unconfirmed',
}

export function WorldMap({ students, crisis, onStudentClick }: Props) {
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const crisisLayerRef = useRef<any>(null)

  useEffect(() => {
    if (mapInstanceRef.current) return
    if (!mapRef.current) return

    // Dynamic import of Leaflet to avoid SSR issues
    const L = (window as any).L
    if (!L) {
      // Load Leaflet dynamically
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => initMap()
      document.head.appendChild(script)
    } else {
      initMap()
    }

    function initMap() {
      const L = (window as any).L
      const map = L.map(mapRef.current, {
        center: [20, 10],
        zoom: 2,
        zoomControl: true,
        attributionControl: false,
      })

      // Dark satellite-style tile layer
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '© OpenStreetMap contributors © CARTO',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(map)

      // Attribution in corner
      L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map)

      mapInstanceRef.current = map
      renderMarkers(map, L)
    }
  }, [])

  // Update markers when students or crisis changes
  useEffect(() => {
    const L = (window as any).L
    if (!mapInstanceRef.current || !L) return
    renderMarkers(mapInstanceRef.current, L)
  }, [students, crisis])

  function renderMarkers(map: any, L: any) {
    // Clear existing markers
    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []
    if (crisisLayerRef.current) {
      map.removeLayer(crisisLayerRef.current)
      crisisLayerRef.current = null
    }

    // Add crisis zone circle
    if (crisis) {
      const circle = L.circle([crisis.center_lat, crisis.center_lng], {
        radius: crisis.radius_km * 1000,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '8, 6',
        className: 'crisis-zone-circle',
      }).addTo(map)

      // Crisis center marker
      const crisisIcon = L.divIcon({
        html: `<div style="
          width: 32px; height: 32px;
          background: rgba(239,68,68,0.2);
          border: 2px solid #ef4444;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          animation: pulse 2s infinite;
        ">
          <div style="width: 10px; height: 10px; background: #ef4444; border-radius: 50%;"></div>
        </div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
      const crisisMarker = L.marker([crisis.center_lat, crisis.center_lng], { icon: crisisIcon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width: 220px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <div style="width:10px;height:10px;background:#ef4444;border-radius:50%;animation:pulse 1s infinite;"></div>
              <strong style="color:#ef4444; font-size:14px;">${crisis.name}</strong>
            </div>
            <div style="color:#94a3b8; font-size:12px; margin-bottom:4px;">${crisis.crisis_type} · Severity ${crisis.severity}/10</div>
            <div style="color:#cbd5e1; font-size:12px;">${crisis.affected_area}</div>
            <div style="color:#94a3b8; font-size:11px; margin-top:6px;">Radius: ${crisis.radius_km} km</div>
          </div>
        `)
      markersRef.current.push(crisisMarker)
      crisisLayerRef.current = circle
    }

    // Add student markers
    students.forEach(student => {
      const color = STATUS_COLORS[student.risk_status] || '#6b7280'
      const label = STATUS_LABELS[student.risk_status] || 'Unknown'
      const isAffected = student.risk_status === 'AFFECTED'

      const icon = L.divIcon({
        html: `<div style="
          position: relative;
          width: ${isAffected ? '20px' : '16px'};
          height: ${isAffected ? '20px' : '16px'};
        ">
          ${isAffected ? `<div style="
            position: absolute; inset: -4px;
            background: ${color}33;
            border-radius: 50%;
            animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
          "></div>` : ''}
          <div style="
            width: 100%; height: 100%;
            background: ${color};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 0 8px ${color}88;
            position: relative;
          "></div>
        </div>`,
        className: '',
        iconSize: [isAffected ? 20 : 16, isAffected ? 20 : 16],
        iconAnchor: [isAffected ? 10 : 8, isAffected ? 10 : 8],
      })

      const marker = L.marker([student.current_lat, student.current_lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width: 200px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <div style="width:10px;height:10px;background:${color};border-radius:50%;"></div>
              <strong style="color:#f1f5f9; font-size:14px;">${student.name}</strong>
            </div>
            <div style="color:#94a3b8; font-size:12px; margin-bottom:2px;">${student.year} · ${student.program}</div>
            <div style="color:#cbd5e1; font-size:12px; margin-bottom:6px;">📍 ${student.current_city}</div>
            <div style="
              display:inline-flex; align-items:center; gap:4px;
              background:${color}22; border:1px solid ${color}44;
              border-radius:999px; padding:2px 8px;
              color:${color}; font-size:11px; font-weight:600;
            ">
              ${label}
            </div>
            ${student.alert_message ? `
              <div style="margin-top:8px; padding:6px; background:#1e293b; border-radius:6px; border-left:3px solid ${color};">
                <div style="color:#94a3b8; font-size:10px; margin-bottom:3px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Alert</div>
                <div style="color:#cbd5e1; font-size:11px; line-height:1.4;">${student.alert_message.substring(0, 120)}...</div>
              </div>
            ` : ''}
          </div>
        `)

      marker.on('click', () => {
        onStudentClick?.(student)
      })

      markersRef.current.push(marker)
    })
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden" />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-xl p-3 z-[1000]">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Student Status</p>
        <div className="space-y-1.5">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border border-white/30" style={{ background: color }} />
              <span className="text-xs text-gray-300">{STATUS_LABELS[status]}</span>
            </div>
          ))}
          {crisis && (
            <div className="flex items-center gap-2 pt-1 border-t border-gray-700 mt-1">
              <div className="w-3 h-3 rounded-full border-2 border-red-500 border-dashed" />
              <span className="text-xs text-gray-300">Crisis Zone</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
