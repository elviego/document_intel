import { useState } from 'react'
import type { OcrJob } from '../hooks/useOcr'
import { ConfidenceBadge } from './ConfidenceBadge'

interface Props { job: OcrJob }

export function OcrResultViewer({ job }: Props) {
  const [tab, setTab] = useState<'structured' | 'raw' | 'meta'>('structured')
  const meta = job.metadata

  if (!meta) return <p className="text-sm text-gray-500 py-4">No result metadata available.</p>

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap gap-6 p-4 bg-gray-50 rounded-lg text-sm">
        <Stat label="Engine"     value={`${meta.ocr.engine} ${meta.ocr.engineVersion ?? ''}`} />
        <Stat label="Pages"      value={String(meta.ocr.pages.length)} />
        <Stat label="Confidence" value={<ConfidenceBadge value={meta.ocr.overallConfidence} />} />
        <Stat label="OCR time"   value={`${meta.ocr.processingTimeMs} ms`} />
        {meta.llm && (
          <>
            <Stat label="LLM"       value={`${meta.llm.provider} / ${meta.llm.model}`} />
            <Stat label="Tokens"    value={String(meta.llm.tokensUsed)} />
            <Stat label="LLM time"  value={`${meta.llm.processingTimeMs} ms`} />
          </>
        )}
        <Stat label="Doc type" value={meta.detection.documentType} />
        {meta.detection.autoDetected && (
          <Stat label="Detected" value={<ConfidenceBadge value={meta.detection.detectionConfidence} />} />
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6 text-sm">
          {(['structured', 'raw', 'meta'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2 font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'structured' ? 'Structured Data' : t === 'raw' ? 'Raw Text' : 'Metadata'}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'structured' && (
        <div>
          {meta.structuredData ? (
            <pre className="bg-gray-900 text-green-300 rounded-lg p-4 text-xs overflow-auto max-h-96 font-mono">
              {JSON.stringify(meta.structuredData, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-gray-500">No LLM extraction was run. Configure a provider on the settings page.</p>
          )}
        </div>
      )}

      {tab === 'raw' && (
        <div className="space-y-3">
          {meta.ocr.pages.map(p => (
            <div key={p.pageNumber} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 flex items-center justify-between text-xs text-gray-500 border-b border-gray-200">
                <span>Page {p.pageNumber}</span>
                <div className="flex items-center gap-3">
                  <span>{p.wordCount} words</span>
                  <ConfidenceBadge value={p.confidence} />
                </div>
              </div>
              <pre className="p-4 text-xs text-gray-800 whitespace-pre-wrap font-mono max-h-64 overflow-auto">
                {p.rawText || <span className="text-gray-400">(empty)</span>}
              </pre>
            </div>
          ))}
        </div>
      )}

      {tab === 'meta' && (
        <pre className="bg-gray-900 text-blue-300 rounded-lg p-4 text-xs overflow-auto max-h-96 font-mono">
          {JSON.stringify(meta, null, 2)}
        </pre>
      )}

      {meta.validation.status !== 'valid' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>Validation:</strong> {meta.validation.status}
          {meta.validation.issues.length > 0 && (
            <ul className="mt-1 list-disc list-inside text-xs">
              {meta.validation.issues.map((iss, i) => <li key={i}>{iss}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="font-medium text-gray-800 text-sm mt-0.5">{value}</p>
    </div>
  )
}
