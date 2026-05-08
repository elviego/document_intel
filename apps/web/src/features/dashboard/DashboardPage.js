"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardPage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var react_i18next_1 = require("react-i18next");
var recharts_1 = require("recharts");
var api_client_1 = require("@/lib/api-client");
var useSchoolYear_1 = require("@/hooks/useSchoolYear");
var PageHeader_1 = require("@/components/ui/PageHeader");
var SCHOOL_MONTHS = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];
var MONTH_LABELS = ['Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'];
function useSummary(schoolYearId) {
    return (0, react_query_1.useQuery)({
        queryKey: ['summary', schoolYearId],
        queryFn: function () { return api_client_1.apiClient.get("/v1/transactions/summary/".concat(schoolYearId)); },
        enabled: !!schoolYearId,
    });
}
function fmt(n) {
    return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}
function KpiCard(_a) {
    var label = _a.label, value = _a.value, sub = _a.sub, color = _a.color;
    return (<div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-1 shadow-sm">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={"text-2xl font-bold ".concat(color)}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>);
}
function DashboardPage() {
    var _a, _b;
    var t = (0, react_i18next_1.useTranslation)().t;
    var _c = (0, useSchoolYear_1.useSchoolYears)().data, years = _c === void 0 ? [] : _c;
    var currentYearName = (0, useSchoolYear_1.currentSchoolYearName)();
    var currentYear = (_a = years.find(function (y) { return y.name === currentYearName; })) !== null && _a !== void 0 ? _a : years[0];
    var yearId = (_b = currentYear === null || currentYear === void 0 ? void 0 : currentYear.id) !== null && _b !== void 0 ? _b : '';
    var _d = useSummary(yearId), _e = _d.data, rows = _e === void 0 ? [] : _e, isLoading = _d.isLoading;
    // Aggregate totals
    var _f = (0, react_1.useMemo)(function () {
        var income = 0;
        var expense = 0;
        // Build per-month income/expense
        var byMonth = {};
        SCHOOL_MONTHS.forEach(function (m) { byMonth[m] = { income: 0, expense: 0 }; });
        rows.forEach(function (r) {
            if (r.classification === 'receita') {
                income += r.total;
                byMonth[r.month].income += r.total;
            }
            else {
                expense += r.total; // total is already negative from DB
                byMonth[r.month].expense += r.total;
            }
        });
        var chartData = SCHOOL_MONTHS.map(function (m, i) { return ({
            name: MONTH_LABELS[i],
            Receitas: Math.round(byMonth[m].income),
            Despesas: Math.round(Math.abs(byMonth[m].expense)),
        }); });
        return { totalIncome: income, totalExpense: expense, chartData: chartData };
    }, [rows]), totalIncome = _f.totalIncome, totalExpense = _f.totalExpense, chartData = _f.chartData;
    var balance = totalIncome + totalExpense;
    // Current month (today's month)
    var now = new Date();
    var thisMonth = now.getMonth() + 1;
    var thisMonthRows = rows.filter(function (r) { return r.month === thisMonth; });
    var monthIncome = thisMonthRows.filter(function (r) { return r.classification === 'receita'; }).reduce(function (s, r) { return s + r.total; }, 0);
    var monthExpense = thisMonthRows.filter(function (r) { return r.classification === 'despesa'; }).reduce(function (s, r) { return s + r.total; }, 0);
    if (isLoading)
        return <div className="p-8 text-gray-400 text-sm">{t('common.loading')}</div>;
    return (<div className="h-full flex flex-col">
      <PageHeader_1.PageHeader title={t('nav.dashboard')} subtitle={currentYear === null || currentYear === void 0 ? void 0 : currentYear.name}/>

      <div className="flex-1 overflow-auto px-8 pb-8 space-y-6">

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label={t('common.income')} value={fmt(totalIncome)} sub={t('dashboard.yearToDate')} color="text-green-700"/>
          <KpiCard label={t('common.expense')} value={fmt(totalExpense)} sub={t('dashboard.yearToDate')} color="text-red-700"/>
          <KpiCard label={t('common.balance')} value={fmt(balance)} sub={t('dashboard.yearToDate')} color={balance >= 0 ? 'text-green-700' : 'text-red-700'}/>
          <KpiCard label={t('dashboard.thisMonth')} value={fmt(monthIncome + monthExpense)} sub={"".concat(fmt(monthIncome), " / ").concat(fmt(monthExpense))} color={(monthIncome + monthExpense) >= 0 ? 'text-green-700' : 'text-red-700'}/>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">{t('dashboard.monthlyOverview')}</h2>
          <recharts_1.ResponsiveContainer width="100%" height={280}>
            <recharts_1.BarChart data={chartData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <recharts_1.XAxis dataKey="name" tick={{ fontSize: 11 }}/>
              <recharts_1.YAxis tickFormatter={function (v) { return "".concat((v / 1000).toFixed(0), "k"); }} tick={{ fontSize: 11 }}/>
              <recharts_1.Tooltip formatter={function (v) { return fmt(v); }}/>
              <recharts_1.Legend />
              <recharts_1.Bar dataKey="Receitas" fill="#16a34a" radius={[3, 3, 0, 0]}/>
              <recharts_1.Bar dataKey="Despesas" fill="#dc2626" radius={[3, 3, 0, 0]}/>
            </recharts_1.BarChart>
          </recharts_1.ResponsiveContainer>
        </div>

        {/* Top expense categories */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('dashboard.topExpenses')}</h2>
          <TopCategoriesTable rows={rows} classification="despesa"/>
        </div>

      </div>
    </div>);
}
function TopCategoriesTable(_a) {
    var rows = _a.rows, classification = _a.classification;
    var byCategory = (0, react_1.useMemo)(function () {
        var m = {};
        rows.filter(function (r) { return r.classification === classification; }).forEach(function (r) {
            if (!m[r.categoryId])
                m[r.categoryId] = { name: r.categoryName, total: 0 };
            m[r.categoryId].total += r.total;
        });
        return Object.values(m).sort(function (a, b) { return a.total - b.total; }).slice(0, 8);
    }, [rows, classification]);
    var maxAbs = Math.max.apply(Math, __spreadArray(__spreadArray([], byCategory.map(function (c) { return Math.abs(c.total); }), false), [1], false));
    return (<div className="space-y-1.5">
      {byCategory.map(function (c) { return (<div key={c.name} className="flex items-center gap-3">
          <span className="text-xs text-gray-600 w-44 truncate">{c.name}</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-red-400 rounded-full" style={{ width: "".concat((Math.abs(c.total) / maxAbs) * 100, "%") }}/>
          </div>
          <span className="text-xs font-mono text-red-700 w-20 text-right">{fmt(c.total)}</span>
        </div>); })}
    </div>);
}
