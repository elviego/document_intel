import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  useOcrMetricsAggregate, useOcrMetricsList, useOcrMetricsTrending,
} from './hooks/useOcr'
import type { OcrDocumentType } from './hooks/useOcr'
import { ConfidenceBadge } from './components/ConfidenceBadge'
import { DOC_TYPES } from './OcrPage'

const COLORS = ['#4f46e5', '#7c3aed', '#db2777', '#0891b2', '#059669', '#d97706', '#dc2626', '#64748b']

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  )
}

function ChartCard({ title, data }: { title: string; data: { name: string; value: number; color: string }[] }) {
  if (data.length === 0) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ left: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => [v, 'Count']} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Trending chart ─────────────────────────────────────────────────────────────

function TrendingSection() {
  const [days,    setDays]    = useState(30)
  const [docType, setDocType] = useState<OcrDocumentType | ''>('')

  const { data: points = [], isLoading } = useOcrMetricsTrending(
    days,
    docType || undefined,
  )

  const formatted = points.map(p => ({
    date:       p.date.slice(5), // MM-DD
    confidence: p.avgConfidence != null ? Math.round(p.avgConfidence * 100) : null,
    count:      p.count,
    avgMs:      p.avgProcessingMs != null ? Math.round(p.avgProcessingMs) : null,
  }))

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Quality Trend</h2>
        <div className="flex items-center gap-3">
          <select
            value={docType}
            onChange={e => setDocType(e.target.value as OcrDocumentType | '')}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All document types</option>
            {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>

          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 ${days === d ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
      ) : formatted.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No data for this period.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Avg. Confidence (%)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={formatted} margin={{ left: -10, right: 8 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number | null) => v != null ? [`${v}%`, 'Confidence'] : ['—', 'Confidence']}
                />
                <Line
                  type="monotone"
                  dataKey="confidence"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Documents Processed per Day
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={formatted} margin={{ left: -10, right: 8 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [v, 'Documents']} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OcrMetricsPage() {
  const { t } = useTranslation()
  const { data: agg,          isLoading: aggLoading  } = useOcrMetricsAggregate()
  const { data: metrics = [], isLoading: listLoading } = useOcrMetricsList()

  return (
    <div className="h-full flex flex-col">
      <PageHeader title={t('ocr.metrics')} subtitle={t('ocr.metricsSubtitle')} />

      <div className="flex-1 overflow-auto px-8 pb-8 space-y-8">

        {/* KPI cards */}
        {aggLoading ? (
          <p className="text-sm text-gray-400">{t('common.loading')}</p>
        ) : agg ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total processed" value={agg.totalDocuments} />
            <StatCard
              label="Avg. confidence"
              value={agg.avgConfidence != null
                ? <ConfidenceBadge value={agg.avgConfidence} className="text-lg px-3 py-1" />
                : '—'}
            />
            <StatCard
              label="Avg. processing time"
              value={agg.avgProcessingMs != null ? `${Math.round(agg.avgProcessingMs)} ms` : '—'}
            />
            <StatCard label="LLM models used" value={agg.byLlmModel.length} />
          </div>
        ) : null}

        {/* Distribution charts */}
        {agg && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ChartCard
              title="By OCR Engine"
              data={agg.byEngine.map((d, i) => ({ name: d.engine, value: d.count, color: COLORS[i % COLORS.length] }))}
            />
            <ChartCard
              title="By Document Type"
              data={agg.byDocType.map((d, i) => ({ name: d.documentType, value: d.count, color: COLORS[i % COLORS.length] }))}
            />
            <ChartCard
              title="By LLM Model"
              data={agg.byLlmModel.map((d, i) => ({ name: d.model, value: d.count, color: COLORS[i % COLORS.length] }))}
            />
          </div>
        )}

        {/* Trending chart */}
        <TrendingSection />

        {/* Recent jobs table */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Recent Jobs</h2>
          {listLoading ? (
            <p className="text-sm text-gray-400">{t('common.loading')}</p>
          ) : metrics.length === 0 ? (
            <p className="text-sm text-gray-500">No metrics recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="pb-2 pr-3 font-medium">Date</th>
                    <th className="pb-2 pr-3 font-medium">Doc type</th>
                    <th className="pb-2 pr-3 font-medium">Engine</th>
                    <th className="pb-2 pr-3 font-medium">LLM model</th>
                    <th className="pb-2 pr-3 font-medium">Confidence</th>
                    <th className="pb-2 pr-3 font-medium">Words</th>
                    <th className="pb-2 pr-3 font-medium">Chars</th>
                    <th className="pb-2 pr-3 font-medium text-right">Time (ms)</th>
                    <th className="pb-2 pr-3 font-medium text-right">Tokens</th>
                    <th className="pb-2 font-medium">Auto?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {metrics.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="py-2 pr-3 text-gray-500 tabular-nums whitespace-nowrap">
                        {format(new Date(m.createdAt), 'dd/MM/yy HH:mm')}
                      </td>
                      <td className="py-2 pr-3 text-gray-700">{m.documentType ?? '—'}</td>
                      <td className="py-2 pr-3 text-gray-500 text-xs">{m.ocrEngine}</td>
                      <td className="py-2 pr-3 text-gray-500 text-xs">{m.llmModel ?? '—'}</td>
                      <td className="py-2 pr-3"><ConfidenceBadge value={m.overallConfidence} /></td>
                      <td className="py-2 pr-3 tabular-nums text-gray-500">{m.wordCount ?? '—'}</td>
                      <td className="py-2 pr-3 tabular-nums text-gray-500">{m.characterCount ?? '—'}</td>
                      <td className="py-2 pr-3 tabular-nums text-gray-500 text-right">{m.processingTimeMs}</td>
                      <td className="py-2 pr-3 tabular-nums text-gray-500 text-right">{m.llmTokensUsed ?? '—'}</td>
                      <td className="py-2 text-gray-500 text-xs">
                        {m.autoDetectedType == null ? '—' : m.autoDetectedType ? 'Yes' : 'No'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
