import type { RiskStatus } from '../types'

interface Props {
  status: RiskStatus
  size?: 'sm' | 'md'
}

const CONFIG: Record<RiskStatus, { label: string; className: string; dot: string }> = {
  AFFECTED: {
    label: 'Affected',
    className: 'sentinel-badge-affected',
    dot: 'bg-red-400',
  },
  AT_RISK: {
    label: 'At Risk',
    className: 'sentinel-badge-at-risk',
    dot: 'bg-amber-400',
  },
  SAFE: {
    label: 'Safe',
    className: 'sentinel-badge-safe',
    dot: 'bg-emerald-400',
  },
  UNCONFIRMED: {
    label: 'Unconfirmed',
    className: 'sentinel-badge-unconfirmed',
    dot: 'bg-gray-400',
  },
}

export function StatusBadge({ status, size = 'sm' }: Props) {
  const config = CONFIG[status] || CONFIG.UNCONFIRMED
  return (
    <span className={`${config.className} inline-flex items-center gap-1.5 ${size === 'md' ? 'text-sm px-3 py-1' : ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === 'AFFECTED' ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  )
}

export function SeverityBar({ severity }: { severity: number }) {
  const color = severity >= 8 ? 'bg-red-500' : severity >= 5 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-4 rounded-sm ${i < severity ? color : 'bg-gray-700'}`}
          />
        ))}
      </div>
      <span className="text-sm font-bold text-white">{severity}/10</span>
    </div>
  )
}
