"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OcrMetricsPage;
var react_1 = require("react");
var react_i18next_1 = require("react-i18next");
var date_fns_1 = require("date-fns");
var recharts_1 = require("recharts");
var PageHeader_1 = require("@/components/ui/PageHeader");
var useOcr_1 = require("./hooks/useOcr");
var ConfidenceBadge_1 = require("./components/ConfidenceBadge");
var OcrPage_1 = require("./OcrPage");
var COLORS = ['#4f46e5', '#7c3aed', '#db2777', '#0891b2', '#059669', '#d97706', '#dc2626', '#64748b'];
function StatCard(_a) {
    var label = _a.label, value = _a.value;
    return (<div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>);
}
function ChartCard(_a) {
    var title = _a.title, data = _a.data;
    if (data.length === 0)
        return null;
    return (<div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">{title}</h3>
      <recharts_1.ResponsiveContainer width="100%" height={180}>
        <recharts_1.BarChart data={data} layout="vertical" margin={{ left: 0 }}>
          <recharts_1.XAxis type="number" hide/>
          <recharts_1.YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }}/>
          <recharts_1.Tooltip formatter={function (v) { return [v, 'Count']; }}/>
          <recharts_1.Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map(function (d, i) { return <recharts_1.Cell key={i} fill={d.color}/>; })}
          </recharts_1.Bar>
        </recharts_1.BarChart>
      </recharts_1.ResponsiveContainer>
    </div>);
}
// ── Trending chart ─────────────────────────────────────────────────────────────
function TrendingSection() {
    var _a = (0, react_1.useState)(30), days = _a[0], setDays = _a[1];
    var _b = (0, react_1.useState)(''), docType = _b[0], setDocType = _b[1];
    var _c = (0, useOcr_1.useOcrMetricsTrending)(days, docType || undefined), _d = _c.data, points = _d === void 0 ? [] : _d, isLoading = _c.isLoading;
    var formatted = points.map(function (p) { return ({
        date: p.date.slice(5), // MM-DD
        confidence: p.avgConfidence != null ? Math.round(p.avgConfidence * 100) : null,
        count: p.count,
        avgMs: p.avgProcessingMs != null ? Math.round(p.avgProcessingMs) : null,
    }); });
    return (<section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Quality Trend</h2>
        <div className="flex items-center gap-3">
          <select value={docType} onChange={function (e) { return setDocType(e.target.value); }} className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
            <option value="">All document types</option>
            {OcrPage_1.DOC_TYPES.map(function (d) { return <option key={d.value} value={d.value}>{d.label}</option>; })}
          </select>

          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {[7, 30, 90].map(function (d) { return (<button key={d} onClick={function () { return setDays(d); }} className={"px-3 py-1.5 ".concat(days === d ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-50')}>
                {d}d
              </button>); })}
          </div>
        </div>
      </div>

      {isLoading ? (<p className="text-sm text-gray-400 py-8 text-center">Loading…</p>) : formatted.length === 0 ? (<p className="text-sm text-gray-500 py-8 text-center">No data for this period.</p>) : (<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Avg. Confidence (%)
            </h3>
            <recharts_1.ResponsiveContainer width="100%" height={200}>
              <recharts_1.LineChart data={formatted} margin={{ left: -10, right: 8 }}>
                <recharts_1.XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd"/>
                <recharts_1.YAxis domain={[0, 100]} tick={{ fontSize: 10 }}/>
                <recharts_1.Tooltip formatter={function (v) { return v != null ? ["".concat(v, "%"), 'Confidence'] : ['—', 'Confidence']; }}/>
                <recharts_1.Line type="monotone" dataKey="confidence" stroke="#4f46e5" strokeWidth={2} dot={false} connectNulls/>
              </recharts_1.LineChart>
            </recharts_1.ResponsiveContainer>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Documents Processed per Day
            </h3>
            <recharts_1.ResponsiveContainer width="100%" height={200}>
              <recharts_1.LineChart data={formatted} margin={{ left: -10, right: 8 }}>
                <recharts_1.XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd"/>
                <recharts_1.YAxis allowDecimals={false} tick={{ fontSize: 10 }}/>
                <recharts_1.Tooltip formatter={function (v) { return [v, 'Documents']; }}/>
                <recharts_1.Line type="monotone" dataKey="count" stroke="#059669" strokeWidth={2} dot={false}/>
              </recharts_1.LineChart>
            </recharts_1.ResponsiveContainer>
          </div>
        </div>)}
    </section>);
}
// ── Page ──────────────────────────────────────────────────────────────────────
function OcrMetricsPage() {
    var t = (0, react_i18next_1.useTranslation)().t;
    var _a = (0, useOcr_1.useOcrMetricsAggregate)(), agg = _a.data, aggLoading = _a.isLoading;
    var _b = (0, useOcr_1.useOcrMetricsList)(), _c = _b.data, metrics = _c === void 0 ? [] : _c, listLoading = _b.isLoading;
    return (<div className="h-full flex flex-col">
      <PageHeader_1.PageHeader title={t('ocr.metrics')} subtitle={t('ocr.metricsSubtitle')}/>

      <div className="flex-1 overflow-auto px-8 pb-8 space-y-8">

        {/* KPI cards */}
        {aggLoading ? (<p className="text-sm text-gray-400">{t('common.loading')}</p>) : agg ? (<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total processed" value={agg.totalDocuments}/>
            <StatCard label="Avg. confidence" value={agg.avgConfidence != null
                ? <ConfidenceBadge_1.ConfidenceBadge value={agg.avgConfidence} className="text-lg px-3 py-1"/>
                : '—'}/>
            <StatCard label="Avg. processing time" value={agg.avgProcessingMs != null ? "".concat(Math.round(agg.avgProcessingMs), " ms") : '—'}/>
            <StatCard label="LLM models used" value={agg.byLlmModel.length}/>
          </div>) : null}

        {/* Distribution charts */}
        {agg && (<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ChartCard title="By OCR Engine" data={agg.byEngine.map(function (d, i) { return ({ name: d.engine, value: d.count, color: COLORS[i % COLORS.length] }); })}/>
            <ChartCard title="By Document Type" data={agg.byDocType.map(function (d, i) { return ({ name: d.documentType, value: d.count, color: COLORS[i % COLORS.length] }); })}/>
            <ChartCard title="By LLM Model" data={agg.byLlmModel.map(function (d, i) { return ({ name: d.model, value: d.count, color: COLORS[i % COLORS.length] }); })}/>
          </div>)}

        {/* Trending chart */}
        <TrendingSection />

        {/* Recent jobs table */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Recent Jobs</h2>
          {listLoading ? (<p className="text-sm text-gray-400">{t('common.loading')}</p>) : metrics.length === 0 ? (<p className="text-sm text-gray-500">No metrics recorded yet.</p>) : (<div className="overflow-x-auto">
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
                  {metrics.map(function (m) {
                var _a, _b, _c, _d, _e;
                return (<tr key={m.id} className="hover:bg-gray-50">
                      <td className="py-2 pr-3 text-gray-500 tabular-nums whitespace-nowrap">
                        {(0, date_fns_1.format)(new Date(m.createdAt), 'dd/MM/yy HH:mm')}
                      </td>
                      <td className="py-2 pr-3 text-gray-700">{(_a = m.documentType) !== null && _a !== void 0 ? _a : '—'}</td>
                      <td className="py-2 pr-3 text-gray-500 text-xs">{m.ocrEngine}</td>
                      <td className="py-2 pr-3 text-gray-500 text-xs">{(_b = m.llmModel) !== null && _b !== void 0 ? _b : '—'}</td>
                      <td className="py-2 pr-3"><ConfidenceBadge_1.ConfidenceBadge value={m.overallConfidence}/></td>
                      <td className="py-2 pr-3 tabular-nums text-gray-500">{(_c = m.wordCount) !== null && _c !== void 0 ? _c : '—'}</td>
                      <td className="py-2 pr-3 tabular-nums text-gray-500">{(_d = m.characterCount) !== null && _d !== void 0 ? _d : '—'}</td>
                      <td className="py-2 pr-3 tabular-nums text-gray-500 text-right">{m.processingTimeMs}</td>
                      <td className="py-2 pr-3 tabular-nums text-gray-500 text-right">{(_e = m.llmTokensUsed) !== null && _e !== void 0 ? _e : '—'}</td>
                      <td className="py-2 text-gray-500 text-xs">
                        {m.autoDetectedType == null ? '—' : m.autoDetectedType ? 'Yes' : 'No'}
                      </td>
                    </tr>);
            })}
                </tbody>
              </table>
            </div>)}
        </section>
      </div>
    </div>);
}
