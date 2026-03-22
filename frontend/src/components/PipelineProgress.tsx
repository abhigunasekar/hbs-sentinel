import { CheckCircle, Circle, Loader2, AlertCircle } from 'lucide-react'

interface Stage {
  id: string
  label: string
  description: string
}

const STAGES: Stage[] = [
  { id: 'detecting', label: 'Crisis Detector', description: 'Claude analyzes event type, severity, and geography' },
  { id: 'scoring', label: 'Risk Scorer', description: 'Geo-overlap analysis across all student locations' },
  { id: 'composing', label: 'Alert Composer', description: 'Personalized messages composed per student' },
  { id: 'complete', label: 'Alerts Delivered', description: 'Real-time notifications sent to affected students' },
]

interface Props {
  currentStage: string
  message: string
  error?: string
}

export function PipelineProgress({ currentStage, message, error }: Props) {
  const stageIndex = STAGES.findIndex(s => s.id === currentStage)

  return (
    <div className="sentinel-card p-5 border-crimson-800/50 bg-crimson-950/20">
      <div className="flex items-center gap-2 mb-4">
        {error ? (
          <AlertCircle className="w-5 h-5 text-red-400" />
        ) : currentStage === 'complete' ? (
          <CheckCircle className="w-5 h-5 text-emerald-400" />
        ) : (
          <Loader2 className="w-5 h-5 text-crimson-400 animate-spin" />
        )}
        <h3 className="font-semibold text-white">
          {error ? 'Pipeline Error' : currentStage === 'complete' ? 'Pipeline Complete' : 'AI Pipeline Running'}
        </h3>
      </div>

      {error ? (
        <div className="text-red-300 text-sm bg-red-900/20 rounded-lg p-3">{error}</div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {STAGES.map((stage, i) => {
              const isComplete = stageIndex > i || currentStage === 'complete'
              const isCurrent = stage.id === currentStage
              const isPending = stageIndex < i && currentStage !== 'complete'

              return (
                <div key={stage.id} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {isComplete ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-crimson-400 animate-spin" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${
                      isComplete ? 'text-emerald-400' :
                      isCurrent ? 'text-white' :
                      'text-gray-500'
                    }`}>
                      {stage.label}
                    </p>
                    <p className={`text-xs mt-0.5 ${
                      isComplete || isCurrent ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {stage.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-gray-900 rounded-lg px-3 py-2 border border-gray-700">
            <p className="text-xs text-gray-400 font-mono">{message}</p>
          </div>
        </>
      )}
    </div>
  )
}
