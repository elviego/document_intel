"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SummaryPage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var react_i18next_1 = require("react-i18next");
var api_client_1 = require("@/lib/api-client");
var useSchoolYear_1 = require("@/hooks/useSchoolYear");
var PageHeader_1 = require("@/components/ui/PageHeader");
var clsx_1 = require("clsx");
// School year runs Sep(9)–Aug(8). Months in display order:
var SCHOOL_MONTHS = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];
var MONTH_LABELS = ['set', 'out', 'nov', 'dez', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago'];
function useSummary(schoolYearId) {
    return (0, react_query_1.useQuery)({
        queryKey: ['summary', schoolYearId],
        queryFn: function () { return api_client_1.apiClient.get("/v1/transactions/summary/".concat(schoolYearId)); },
        enabled: !!schoolYearId,
    });
}
function useBudget(schoolYearId) {
    return (0, react_query_1.useQuery)({
        queryKey: ['budget', schoolYearId],
        queryFn: function () { return api_client_1.apiClient.get("/v1/budget/".concat(schoolYearId)); },
        enabled: !!schoolYearId,
    });
}
function fmt(n) {
    if (n === 0)
        return '—';
    return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}
function varianceColor(actual, planned, isExpense) {
    if (!planned)
        return '';
    var over = isExpense ? actual < planned : actual > planned; // expenses: under=good; income: over=good
    return over ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50';
}
function SummaryPage() {
    var _a;
    var _b = (0, react_i18next_1.useTranslation)(), t = _b.t, i18n = _b.i18n;
    var _c = (0, useSchoolYear_1.useSchoolYears)().data, years = _c === void 0 ? [] : _c;
    var currentYearName = (0, useSchoolYear_1.currentSchoolYearName)();
    var currentYear = (_a = years.find(function (y) { return y.name === currentYearName; })) !== null && _a !== void 0 ? _a : years[0];
    var _d = (0, react_1.useState)(''), selectedYearId = _d[0], setSelectedYearId = _d[1];
    var _e = (0, react_1.useState)(true), showPlanned = _e[0], setShowPlanned = _e[1];
    var yearId = selectedYearId || (currentYear === null || currentYear === void 0 ? void 0 : currentYear.id) || '';
    var _f = useSummary(yearId), _g = _f.data, rows = _g === void 0 ? [] : _g, isLoading = _f.isLoading;
    var _h = useBudget(yearId).data, budget = _h === void 0 ? [] : _h;
    // Build lookup: categoryId → month → { actual, planned }
    var budgetMap = (0, react_1.useMemo)(function () {
        var m = {};
        budget.forEach(function (b) { var _a; var _b; ((_a = m[_b = b.categoryId]) !== null && _a !== void 0 ? _a : (m[_b] = {}))[b.month] = b.plannedAmount; });
        return m;
    }, [budget]);
    // Group by classification then category
    var grouped = (0, react_1.useMemo)(function () {
        var map = {
            despesa: {}, receita: {},
        };
        rows.forEach(function (r) {
            var _a;
            var _b, _c;
            var cl = r.classification === 'receita' ? 'receita' : 'despesa';
            ((_a = (_b = map[cl])[_c = r.categoryName]) !== null && _a !== void 0 ? _a : (_b[_c] = {}))[r.month] = r.total;
        });
        return map;
    }, [rows]);
    function sectionTotal(classification, month) {
        return Object.values(grouped[classification]).reduce(function (s, byMonth) { var _a; return s + ((_a = byMonth[month]) !== null && _a !== void 0 ? _a : 0); }, 0);
    }
    if (isLoading)
        return <div className="p-8 text-gray-400 text-sm">{t('common.loading')}</div>;
    return (<div className="h-full flex flex-col">
      <PageHeader_1.PageHeader title={t('nav.summary')} actions={<div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={showPlanned} onChange={function (e) { return setShowPlanned(e.target.checked); }}/>
              {t('budget.planned')}
            </label>
            <select value={yearId} onChange={function (e) { return setSelectedYearId(e.target.value); }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
              {years.map(function (y) { return <option key={y.id} value={y.id}>{y.name}</option>; })}
            </select>
          </div>}/>

      <div className="flex-1 overflow-auto px-8 pb-8">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-white z-10">
            <tr>
              <th className="text-left py-2 pr-3 font-semibold text-gray-700 w-44">Categoria</th>
              {MONTH_LABELS.map(function (m, i) { return (<th key={i} className="text-right py-2 px-1.5 font-semibold text-gray-500 uppercase w-20">{m}</th>); })}
              <th className="text-right py-2 pl-2 font-semibold text-gray-700">Total</th>
            </tr>
          </thead>
          <tbody>
            {/* ── DESPESAS ── */}
            <SectionHeader label="DESPESAS" colSpan={SCHOOL_MONTHS.length + 2} color="bg-red-50 text-red-800"/>
            {Object.entries(grouped.despesa).map(function (_a) {
            var _b, _c;
            var catName = _a[0], byMonth = _a[1];
            var catId = (_c = (_b = rows.find(function (r) { return r.categoryName === catName; })) === null || _b === void 0 ? void 0 : _b.categoryId) !== null && _c !== void 0 ? _c : '';
            var yearTotal = Object.values(byMonth).reduce(function (s, v) { return s + v; }, 0);
            return (<tr key={catName} className="hover:bg-gray-50 border-b border-gray-100">
                  <td className="py-1.5 pr-3 text-gray-700 font-medium truncate max-w-[11rem]">{catName}</td>
                  {SCHOOL_MONTHS.map(function (m) {
                    var _a, _b, _c;
                    var actual = (_a = byMonth[m]) !== null && _a !== void 0 ? _a : 0;
                    var planned = (_c = (_b = budgetMap[catId]) === null || _b === void 0 ? void 0 : _b[m]) !== null && _c !== void 0 ? _c : 0;
                    return (<td key={m} className="py-1.5 px-1.5 text-right">
                        <span className={(0, clsx_1.default)('tabular-nums', actual && varianceColor(actual, planned, true))}>
                          {fmt(actual)}
                        </span>
                        {showPlanned && planned > 0 && (<div className="text-gray-300 leading-none">{fmt(planned)}</div>)}
                      </td>);
                })}
                  <td className="py-1.5 pl-2 text-right font-semibold tabular-nums text-gray-900">{fmt(yearTotal)}</td>
                </tr>);
        })}
            <TotalRow label="Total Despesas" months={SCHOOL_MONTHS} getValue={function (m) { return sectionTotal('despesa', m); }} className="bg-red-50 font-semibold text-red-900"/>

            {/* ── RECEITAS ── */}
            <SectionHeader label="RECEITAS" colSpan={SCHOOL_MONTHS.length + 2} color="bg-green-50 text-green-800"/>
            {Object.entries(grouped.receita).map(function (_a) {
            var _b, _c;
            var catName = _a[0], byMonth = _a[1];
            var catId = (_c = (_b = rows.find(function (r) { return r.categoryName === catName; })) === null || _b === void 0 ? void 0 : _b.categoryId) !== null && _c !== void 0 ? _c : '';
            var yearTotal = Object.values(byMonth).reduce(function (s, v) { return s + v; }, 0);
            return (<tr key={catName} className="hover:bg-gray-50 border-b border-gray-100">
                  <td className="py-1.5 pr-3 text-gray-700 font-medium truncate max-w-[11rem]">{catName}</td>
                  {SCHOOL_MONTHS.map(function (m) {
                    var _a, _b, _c;
                    var actual = (_a = byMonth[m]) !== null && _a !== void 0 ? _a : 0;
                    var planned = (_c = (_b = budgetMap[catId]) === null || _b === void 0 ? void 0 : _b[m]) !== null && _c !== void 0 ? _c : 0;
                    return (<td key={m} className="py-1.5 px-1.5 text-right">
                        <span className={(0, clsx_1.default)('tabular-nums', actual && varianceColor(actual, planned, false))}>
                          {fmt(actual)}
                        </span>
                        {showPlanned && planned > 0 && (<div className="text-gray-300 leading-none">{fmt(planned)}</div>)}
                      </td>);
                })}
                  <td className="py-1.5 pl-2 text-right font-semibold tabular-nums text-gray-900">{fmt(yearTotal)}</td>
                </tr>);
        })}
            <TotalRow label="Total Receitas" months={SCHOOL_MONTHS} getValue={function (m) { return sectionTotal('receita', m); }} className="bg-green-50 font-semibold text-green-900"/>

            {/* ── BALANÇO ── */}
            <TotalRow label="Balanço" months={SCHOOL_MONTHS} getValue={function (m) { return sectionTotal('receita', m) + sectionTotal('despesa', m); }} className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300" colorize/>
          </tbody>
        </table>
      </div>
    </div>);
}
function SectionHeader(_a) {
    var label = _a.label, colSpan = _a.colSpan, color = _a.color;
    return (<tr>
      <td colSpan={colSpan} className={(0, clsx_1.default)('py-1.5 px-2 text-xs font-bold uppercase tracking-wider', color)}>
        {label}
      </td>
    </tr>);
}
function TotalRow(_a) {
    var label = _a.label, months = _a.months, getValue = _a.getValue, className = _a.className, colorize = _a.colorize;
    var yearTotal = months.reduce(function (s, m) { return s + getValue(m); }, 0);
    return (<tr className={(0, clsx_1.default)('border-t border-gray-300', className)}>
      <td className="py-2 pr-3">{label}</td>
      {months.map(function (m) {
            var v = getValue(m);
            return (<td key={m} className={(0, clsx_1.default)('py-2 px-1.5 text-right tabular-nums', colorize && v !== 0 && (v > 0 ? 'text-green-700' : 'text-red-700'))}>
            {fmt(v)}
          </td>);
        })}
      <td className={(0, clsx_1.default)('py-2 pl-2 text-right tabular-nums', colorize && yearTotal !== 0 && (yearTotal > 0 ? 'text-green-700' : 'text-red-700'))}>
        {fmt(yearTotal)}
      </td>
    </tr>);
}
