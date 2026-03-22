import { useEffect, useRef } from 'react'
import type { Student, CrisisEvent } from '../types'

interface Props {
  students: Student[]
  crisis: CrisisEvent | null
  onStudentClick?: (student: Student) => void
}

// HBS design spec colors
const STATUS_COLORS: Record<string, string> = {
  AFFECTED: '#AC2134',   // HBS Crimson — danger signal
  AT_RISK: '#d97706',    // Amber
  SAFE: '#16a34a',       // Green
  UNCONFIRMED: '#6b7280', // Gray
}

const STATUS_BORDER: Record<string, string> = {
  AFFECTED: '#fff',
  AT_RISK: '#fff',
  SAFE: '#fff',
  UNCONFIRMED: '#9ca3af',
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

    const L = (window as any).L
    if (!L) {
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

      // CartoDB dark satellite tile layer
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '© OpenStreetMap contributors © CARTO',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(map)

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

    // Crisis zone circle — HBS Crimson at 30% opacity
    if (crisis) {
      const circle = L.circle([crisis.center_lat, crisis.center_lng], {
        radius: crisis.radius_km * 1000,
        color: '#AC2134',
        fillColor: '#AC2134',
        fillOpacity: 0.15,
        weight: 2,
        className: 'crisis-zone-circle',
      }).addTo(map)

      const crisisIcon = L.divIcon({
        html: `<div style="
          width: 36px; height: 36px;
          background: rgba(172,33,52,0.25);
          border: 2px solid #AC2134;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
        ">
          <div style="width: 12px; height: 12px; background: #AC2134; border-radius: 50%;"></div>
        </div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })
      const crisisMarker = L.marker([crisis.center_lat, crisis.center_lng], { icon: crisisIcon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width: 220px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <div style="width:10px;height:10px;background:#AC2134;border-radius:50%;"></div>
              <strong style="color:#AC2134; font-size:14px;">${crisis.name}</strong>
            </div>
            <div style="color:#94a3b8; font-size:12px; margin-bottom:4px;">${crisis.crisis_type} · Severity ${crisis.severity}/10</div>
            <div style="color:#cbd5e1; font-size:12px;">${crisis.affected_area}</div>
            <div style="color:#94a3b8; font-size:11px; margin-top:6px;">Radius: ${crisis.radius_km} km</div>
          </div>
        `)
      markersRef.current.push(crisisMarker)
      crisisLayerRef.current = circle
    }

    // Travel plan destination pins — blue diamond, 30% larger (18px)
    students.forEach(student => {
      if (!student.travel_plans || student.travel_plans.length === 0) return
      student.travel_plans.forEach((tp: any) => {
        if (!tp.destination_lat || !tp.destination_lng) return
        const travelIcon = L.divIcon({
          html: `<div style="
            position: relative;
            width: 18px; height: 18px;
          ">
            <div style="
              width: 100%; height: 100%;
              background: #3b82f6;
              border: 2px solid white;
              border-radius: 3px;
              transform: rotate(45deg);
              box-shadow: 0 0 8px #3b82f688;
            "></div>
          </div>`,
          className: '',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        })
        const travelMarker = L.marker([tp.destination_lat, tp.destination_lng], { icon: travelIcon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width: 180px;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
                <div style="width:10px;height:10px;background:#3b82f6;border-radius:2px;transform:rotate(45deg);"></div>
                <strong style="color:#f1f5f9; font-size:13px;">Planned Travel</strong>
              </div>
              <div style="color:#93c5fd; font-size:12px; font-weight:600; margin-bottom:4px;">✈️ ${tp.destination}</div>
              <div style="color:#94a3b8; font-size:11px; margin-bottom:2px;">Student: ${student.name}</div>
              <div style="color:#94a3b8; font-size:11px;">Departs: ${tp.departure_date}</div>
              <div style="color:#94a3b8; font-size:11px;">Returns: ${tp.return_date}</div>
              <div style="color:#94a3b8; font-size:11px; margin-top:4px; font-style:italic;">${tp.purpose}</div>
            </div>
          `)
        markersRef.current.push(travelMarker)

        if (student.current_lat && student.current_lng) {
          const line = L.polyline(
            [[student.current_lat, student.current_lng], [tp.destination_lat, tp.destination_lng]],
            { color: '#3b82f6', weight: 1.5, dashArray: '4, 6', opacity: 0.5 }
          ).addTo(map)
          markersRef.current.push(line)
        }
      })
    })

    // Student markers — design spec colors
    students.forEach(student => {
      const color = STATUS_COLORS[student.risk_status] || '#6b7280'
      const border = STATUS_BORDER[student.risk_status] || '#9ca3af'
      const label = STATUS_LABELS[student.risk_status] || 'Unknown'
      const isAffected = student.risk_status === 'AFFECTED'
      const isSafe = student.risk_status === 'SAFE'
      const size = isAffected ? 22 : 16

      const icon = L.divIcon({
        html: `<div style="position: relative; width: ${size}px; height: ${size}px;">
          ${isAffected ? `<div style="
            position: absolute; inset: -5px;
            background: rgba(172,33,52,0.25);
            border-radius: 50%;
            animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
          "></div>` : ''}
          <div style="
            width: 100%; height: 100%;
            background: ${color};
            border: 2px solid ${border};
            border-radius: 50%;
            box-shadow: 0 0 8px ${color}66;
            position: relative;
          "></div>
        </div>`,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
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

      {/* Legend — clean floating card */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16,
        background: 'rgba(15,23,42,0.92)',
        border: '1px solid #334155',
        borderRadius: 8,
        padding: '12px 16px',
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
      }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, margin: '0 0 10px 0' }}>
          Student Status
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#cbd5e1' }}>{STATUS_LABELS[status]}</span>
            </div>
          ))}
          {crisis && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: '1px solid #334155', marginTop: 2 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid #AC2134', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#cbd5e1' }}>Crisis Zone</span>
            </div>
          )}
          {students.some(s => s.travel_plans && s.travel_plans.length > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: '1px solid #334155', marginTop: 2 }}>
              <div style={{ width: 10, height: 10, background: '#3b82f6', border: '2px solid rgba(255,255,255,0.3)', transform: 'rotate(45deg)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#cbd5e1' }}>Planned Travel</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
