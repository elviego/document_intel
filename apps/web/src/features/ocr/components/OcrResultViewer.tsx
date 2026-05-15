import { useState } from 'react'
import type { OcrJob } from '../hooks/useOcr'
import { ConfidenceBadge } from './ConfidenceBadge'

// ── JSON syntax highlighter ───────────────────────────────────────────────────

function JsonNode({ value, indent }: { value: unknown; indent: number }) {
  const pad = '  '.repeat(indent)
  const inner = '  '.repeat(indent + 1)

  if (value === null)
    return <span className="text-purple-400">null</span>

  if (typeof value === 'boolean')
    return <span className="text-purple-400">{String(value)}</span>

  if (typeof value === 'number')
    return <span className="text-amber-400">{value}</span>

  if (typeof value === 'string')
    return (
      <span className="text-emerald-400">
        &quot;<span className="text-emerald-300">{value}</span>&quot;
      </span>
    )

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-500">{'[]'}</span>
    return (
      <>
        <span className="text-gray-400">{'['}</span>{'\n'}
        {value.map((item, i) => (
          <span key={i}>
            {inner}<JsonNode value={item} indent={indent + 1} />
            {i < value.length - 1 ? <span className="text-gray-600">,</span> : null}{'\n'}
          </span>
        ))}
        {pad}<span className="text-gray-400">{']'}</span>
      </>
    )
  }

  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value)
    if (entries.length === 0) return <span className="text-gray-500">{'{}'}</span>
    return (
      <>
        <span className="text-gray-400">{'{'}</span>{'\n'}
        {entries.map(([k, v], i) => (
          <span key={k}>
            {inner}
            <span className="text-sky-400">&quot;{k}&quot;</span>
            <span className="text-gray-500">: </span>
            <JsonNode value={v} indent={indent + 1} />
            {i < entries.length - 1 ? <span className="text-gray-600">,</span> : null}{'\n'}
          </span>
        ))}
        {pad}<span className="text-gray-400">{'}'}</span>
      </>
    )
  }

  return <span className="text-gray-300">{String(value)}</span>
}

function JsonViewer({ data, onCopy }: { data: unknown; onCopy: () => void }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopy()
  }
  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 text-[10px] font-mono text-gray-500 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        {copied ? 'copied!' : 'copy'}
      </button>
      <pre className="bg-gray-950 rounded-lg px-5 py-4 text-xs overflow-auto max-h-[36rem] font-mono leading-relaxed">
        <JsonNode value={data} indent={0} />
      </pre>
    </div>
  )
}

// ── Unwrap legacy { raw: "```json...```" } payloads ──────────────────────────

function unwrapStructuredData(data: Record<string, unknown>): Record<string, unknown> {
  const keys = Object.keys(data)
  if (keys.length === 1 && keys[0] === 'raw' && typeof data.raw === 'string') {
    const raw = (data.raw as string).trim()
    const fenced = raw.match(/```(?:json)?\s*\n([\s\S]*?)\n```/)
    const json = fenced ? fenced[1].trim() : raw
    try { return JSON.parse(json) as Record<string, unknown> } catch { /* fall through */ }
  }
  return data
}

// ─────────────────────────────────────────────────────────────────────────────

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
            <JsonViewer data={unwrapStructuredData(meta.structuredData)} onCopy={() => {}} />
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
        <JsonViewer data={meta} onCopy={() => {}} />
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
