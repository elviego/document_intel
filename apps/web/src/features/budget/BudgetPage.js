"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BudgetPage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var react_i18next_1 = require("react-i18next");
var api_client_1 = require("@/lib/api-client");
var useSchoolYear_1 = require("@/hooks/useSchoolYear");
var useCategories_1 = require("@/hooks/useCategories");
var PageHeader_1 = require("@/components/ui/PageHeader");
var Button_1 = require("@/components/ui/Button");
var auth_1 = require("@/lib/auth");
var clsx_1 = require("clsx");
var SCHOOL_MONTHS = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];
var MONTH_LABELS = ['Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'];
// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtK(n) {
    if (n === 0)
        return '—';
    return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}
function fmt0(n) { return n === 0 ? '' : n.toLocaleString('pt-PT', { maximumFractionDigits: 0 }); }
// ─── Editable cell ────────────────────────────────────────────────────────────
function EditableCell(_a) {
    var value = _a.value, onCommit = _a.onCommit;
    var _b = (0, react_1.useState)(value === 0 ? '' : String(value)), raw = _b[0], setRaw = _b[1];
    var ref = (0, react_1.useRef)(null);
    return (<input ref={ref} type="text" inputMode="numeric" value={raw} onChange={function (e) { return setRaw(e.target.value); }} onFocus={function () { var _a; return (_a = ref.current) === null || _a === void 0 ? void 0 : _a.select(); }} onBlur={function () { return onCommit(raw); }} placeholder="—" className="w-full text-right text-xs tabular-nums px-1 py-0.5 rounded border border-transparent
                 hover:border-gray-300 focus:border-brand-500 focus:outline-none bg-transparent focus:bg-white"/>);
}
// ─── Shared table header ──────────────────────────────────────────────────────
function TableHead() {
    return (<thead className="sticky top-0 bg-white z-10">
      <tr>
        <th className="text-left py-2 pr-3 font-semibold text-gray-700 w-44">Categoria</th>
        {MONTH_LABELS.map(function (m, i) { return (<th key={i} className="text-right py-2 px-1.5 font-semibold text-gray-500 uppercase w-20">{m}</th>); })}
        <th className="text-right py-2 pl-2 font-semibold text-gray-700">Total</th>
      </tr>
    </thead>);
}
function SectionHeader(_a) {
    var label = _a.label, color = _a.color, colCount = _a.colCount;
    return (<tr>
      <td colSpan={colCount} className={(0, clsx_1.default)('py-1.5 px-2 text-xs font-bold uppercase tracking-wider', color)}>
        {label}
      </td>
    </tr>);
}
function TotalRow(_a) {
    var label = _a.label, months = _a.months, getValue = _a.getValue, className = _a.className, colorize = _a.colorize;
    var yearTotal = months.reduce(function (s, m) { return s + getValue(m); }, 0);
    return (<tr className={(0, clsx_1.default)('border-t border-gray-300', className)}>
      <td className="py-2 pr-3 text-xs">{label}</td>
      {months.map(function (m) {
            var v = getValue(m);
            return (<td key={m} className={(0, clsx_1.default)('py-2 px-1.5 text-right tabular-nums text-xs', colorize && v !== 0 && (v > 0 ? 'text-green-700' : 'text-red-700'))}>
            {fmtK(v)}
          </td>);
        })}
      <td className={(0, clsx_1.default)('py-2 pl-2 text-right tabular-nums text-xs', colorize && yearTotal !== 0 && (yearTotal > 0 ? 'text-green-700' : 'text-red-700'))}>
        {fmtK(yearTotal)}
      </td>
    </tr>);
}
// ─── Planning tab ─────────────────────────────────────────────────────────────
function PlanningTab(_a) {
    var yearId = _a.yearId, categories = _a.categories, isAdmin = _a.isAdmin;
    var qc = (0, react_query_1.useQueryClient)();
    var _b = (0, react_query_1.useQuery)({
        queryKey: ['budget', yearId],
        queryFn: function () { return api_client_1.apiClient.get("/v1/budget/".concat(yearId)); },
        enabled: !!yearId,
    }).data, budget = _b === void 0 ? [] : _b;
    var _c = (0, react_1.useState)({}), edits = _c[0], setEdits = _c[1];
    var bkey = function (catId, month) { return "".concat(catId, "|").concat(month); };
    var budgetMap = (0, react_1.useMemo)(function () {
        var m = {};
        budget.forEach(function (b) { m[bkey(b.categoryId, b.month)] = b.plannedAmount; });
        return m;
    }, [budget]);
    function getAmount(catId, month) {
        var _a;
        var k = bkey(catId, month);
        return k in edits ? edits[k] : ((_a = budgetMap[k]) !== null && _a !== void 0 ? _a : 0);
    }
    var upsertMutation = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var categoryId = _a.categoryId, month = _a.month, amount = _a.amount;
            return api_client_1.apiClient.put('/v1/budget', { schoolYearId: yearId, categoryId: categoryId, month: month, plannedAmount: amount });
        },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['budget', yearId] }); },
    });
    function handleCommit(catId, month, raw) {
        if (!isAdmin)
            return;
        var val = parseFloat(raw.replace(',', '.')) || 0;
        setEdits(function (prev) {
            var _a;
            return (__assign(__assign({}, prev), (_a = {}, _a[bkey(catId, month)] = val, _a)));
        });
        upsertMutation.mutate({ categoryId: catId, month: month, amount: val });
    }
    var expenseCats = categories.filter(function (c) { return c.classification === 'despesa' && c.isActive; });
    var incomeCats = categories.filter(function (c) { return c.classification === 'receita' && c.isActive; });
    var cols = SCHOOL_MONTHS.length + 2;
    return (<table className="w-full text-xs border-collapse">
      <TableHead />
      <tbody>
        <SectionHeader label="DESPESAS" color="bg-red-50 text-red-800" colCount={cols}/>
        {expenseCats.map(function (cat) {
            var yearTotal = SCHOOL_MONTHS.reduce(function (s, m) { return s + getAmount(cat.id, m); }, 0);
            return (<tr key={cat.id} className="hover:bg-gray-50 border-b border-gray-100">
              <td className="py-1 pr-3 text-gray-700 font-medium truncate max-w-[11rem]">{cat.namePt}</td>
              {SCHOOL_MONTHS.map(function (m) { return (<td key={m} className="py-1 px-1">
                  {isAdmin
                        ? <EditableCell value={getAmount(cat.id, m)} onCommit={function (raw) { return handleCommit(cat.id, m, raw); }}/>
                        : <span className="block text-right tabular-nums text-gray-600 px-1">{fmt0(getAmount(cat.id, m))}</span>}
                </td>); })}
              <td className="py-1 pl-2 text-right font-semibold tabular-nums text-red-900">{fmt0(yearTotal)}</td>
            </tr>);
        })}
        <TotalRow label="Total Despesas" months={SCHOOL_MONTHS} getValue={function (m) { return expenseCats.reduce(function (s, c) { return s + getAmount(c.id, m); }, 0); }} className="bg-red-50 font-semibold text-red-900"/>

        <SectionHeader label="RECEITAS" color="bg-green-50 text-green-800" colCount={cols}/>
        {incomeCats.map(function (cat) {
            var yearTotal = SCHOOL_MONTHS.reduce(function (s, m) { return s + getAmount(cat.id, m); }, 0);
            return (<tr key={cat.id} className="hover:bg-gray-50 border-b border-gray-100">
              <td className="py-1 pr-3 text-gray-700 font-medium truncate max-w-[11rem]">{cat.namePt}</td>
              {SCHOOL_MONTHS.map(function (m) { return (<td key={m} className="py-1 px-1">
                  {isAdmin
                        ? <EditableCell value={getAmount(cat.id, m)} onCommit={function (raw) { return handleCommit(cat.id, m, raw); }}/>
                        : <span className="block text-right tabular-nums text-gray-600 px-1">{fmt0(getAmount(cat.id, m))}</span>}
                </td>); })}
              <td className="py-1 pl-2 text-right font-semibold tabular-nums text-green-900">{fmt0(yearTotal)}</td>
            </tr>);
        })}
        <TotalRow label="Total Receitas" months={SCHOOL_MONTHS} getValue={function (m) { return incomeCats.reduce(function (s, c) { return s + getAmount(c.id, m); }, 0); }} className="bg-green-50 font-semibold text-green-900"/>

        <TotalRow label="Balanço" months={SCHOOL_MONTHS} getValue={function (m) {
            return incomeCats.reduce(function (s, c) { return s + getAmount(c.id, m); }, 0) -
                expenseCats.reduce(function (s, c) { return s + getAmount(c.id, m); }, 0);
        }} className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300" colorize/>
      </tbody>
    </table>);
}
// ─── Execution tab ────────────────────────────────────────────────────────────
function ExecutionTab(_a) {
    var yearId = _a.yearId, categories = _a.categories;
    var _b = (0, react_query_1.useQuery)({
        queryKey: ['budget-execution', yearId],
        queryFn: function () { return api_client_1.apiClient.get("/v1/budget/".concat(yearId, "/execution")); },
        enabled: !!yearId,
    }).data, execution = _b === void 0 ? [] : _b;
    var execMap = (0, react_1.useMemo)(function () {
        var m = {};
        execution.forEach(function (e) { m["".concat(e.categoryId, "|").concat(e.month)] = e; });
        return m;
    }, [execution]);
    var getPlanned = function (catId, month) { var _a, _b; return (_b = (_a = execMap["".concat(catId, "|").concat(month)]) === null || _a === void 0 ? void 0 : _a.plannedAmount) !== null && _b !== void 0 ? _b : 0; };
    var getActual = function (catId, month) { var _a, _b; return (_b = (_a = execMap["".concat(catId, "|").concat(month)]) === null || _a === void 0 ? void 0 : _a.actualAmount) !== null && _b !== void 0 ? _b : 0; };
    var expenseCats = categories.filter(function (c) { return c.classification === 'despesa' && c.isActive; });
    var incomeCats = categories.filter(function (c) { return c.classification === 'receita' && c.isActive; });
    var cols = SCHOOL_MONTHS.length + 2;
    function CatRows(_a) {
        var cat = _a.cat, isExpense = _a.isExpense;
        var actualTotal = SCHOOL_MONTHS.reduce(function (s, m) { return s + getActual(cat.id, m); }, 0);
        var plannedTotal = SCHOOL_MONTHS.reduce(function (s, m) { return s + getPlanned(cat.id, m); }, 0);
        return (<>
        {/* Actual row */}
        <tr className="border-b border-gray-100 hover:bg-gray-50">
          <td className="py-1 pr-3 font-medium text-gray-800 truncate max-w-[11rem]" rowSpan={2}>{cat.namePt}</td>
          {SCHOOL_MONTHS.map(function (m) {
                var actual = getActual(cat.id, m);
                var planned = getPlanned(cat.id, m);
                var over = isExpense ? actual > planned && planned > 0 : actual < planned && planned > 0;
                return (<td key={m} className={(0, clsx_1.default)('py-1 px-1.5 text-right tabular-nums font-semibold', actual === 0 ? 'text-gray-300' : over ? 'text-red-700' : 'text-green-700')}>
                {fmt0(actual)}
              </td>);
            })}
          <td className={(0, clsx_1.default)('py-1 pl-2 text-right tabular-nums font-semibold', actualTotal === 0 ? 'text-gray-300'
                : (isExpense ? actualTotal > plannedTotal : actualTotal < plannedTotal) && plannedTotal > 0
                    ? 'text-red-700' : 'text-green-700')}>
            {fmt0(actualTotal)}
          </td>
        </tr>
        {/* Planned sub-row */}
        <tr className="border-b border-gray-100">
          {SCHOOL_MONTHS.map(function (m) { return (<td key={m} className="pb-1.5 px-1.5 text-right tabular-nums text-gray-400 text-[10px]">
              {fmt0(getPlanned(cat.id, m))}
            </td>); })}
          <td className="pb-1.5 pl-2 text-right tabular-nums text-gray-400 text-[10px]">{fmt0(plannedTotal)}</td>
        </tr>
      </>);
    }
    return (<div>
      {/* Legend */}
      <div className="mb-3 flex items-center gap-4 text-xs text-gray-500">
        <span><strong className="text-gray-800">Valor superior</strong> = executado</span>
        <span><strong className="text-gray-400">Valor inferior</strong> = planeado</span>
        <span className="text-green-700 font-semibold">Verde</span> = dentro do orçamento
        <span className="text-red-700 font-semibold">Vermelho</span> = fora do orçamento
      </div>

      <table className="w-full text-xs border-collapse">
        <TableHead />
        <tbody>
          <SectionHeader label="DESPESAS" color="bg-red-50 text-red-800" colCount={cols}/>
          {expenseCats.map(function (cat) { return <CatRows key={cat.id} cat={cat} isExpense={true}/>; })}
          <TotalRow label="Total Executado" months={SCHOOL_MONTHS} getValue={function (m) { return expenseCats.reduce(function (s, c) { return s + getActual(c.id, m); }, 0); }} className="bg-red-50 font-semibold text-red-900"/>
          <TotalRow label="Total Planeado" months={SCHOOL_MONTHS} getValue={function (m) { return expenseCats.reduce(function (s, c) { return s + getPlanned(c.id, m); }, 0); }} className="text-gray-400"/>

          <SectionHeader label="RECEITAS" color="bg-green-50 text-green-800" colCount={cols}/>
          {incomeCats.map(function (cat) { return <CatRows key={cat.id} cat={cat} isExpense={false}/>; })}
          <TotalRow label="Total Executado" months={SCHOOL_MONTHS} getValue={function (m) { return incomeCats.reduce(function (s, c) { return s + getActual(c.id, m); }, 0); }} className="bg-green-50 font-semibold text-green-900"/>
          <TotalRow label="Total Planeado" months={SCHOOL_MONTHS} getValue={function (m) { return incomeCats.reduce(function (s, c) { return s + getPlanned(c.id, m); }, 0); }} className="text-gray-400"/>

          <TotalRow label="Balanço Executado" months={SCHOOL_MONTHS} getValue={function (m) {
            return incomeCats.reduce(function (s, c) { return s + getActual(c.id, m); }, 0) -
                expenseCats.reduce(function (s, c) { return s + getActual(c.id, m); }, 0);
        }} className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300" colorize/>
        </tbody>
      </table>
    </div>);
}
// ─── Page ─────────────────────────────────────────────────────────────────────
function BudgetPage() {
    var _a, _b;
    var t = (0, react_i18next_1.useTranslation)().t;
    var user = auth_1.auth.getUser();
    var isAdmin = (user === null || user === void 0 ? void 0 : user.role) === 'admin';
    var _c = (0, useSchoolYear_1.useSchoolYears)().data, years = _c === void 0 ? [] : _c;
    var _d = (0, useCategories_1.useCategories)().data, categories = _d === void 0 ? [] : _d;
    var currentYearName = (0, useSchoolYear_1.currentSchoolYearName)();
    var currentYear = (_a = years.find(function (y) { return y.name === currentYearName; })) !== null && _a !== void 0 ? _a : years[0];
    var _e = (0, react_1.useState)(''), selectedYearId = _e[0], setSelectedYearId = _e[1];
    var _f = (0, react_1.useState)('planning'), tab = _f[0], setTab = _f[1];
    var _g = (0, react_1.useState)(''), copyFromId = _g[0], setCopyFromId = _g[1];
    var _h = (0, react_1.useState)('planned'), copyMode = _h[0], setCopyMode = _h[1];
    var yearId = selectedYearId || (currentYear === null || currentYear === void 0 ? void 0 : currentYear.id) || '';
    var otherYears = years.filter(function (y) { return y.id !== yearId; });
    var qc = (0, react_query_1.useQueryClient)();
    var copyMutation = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var fromYearId = _a.fromYearId, mode = _a.mode;
            return api_client_1.apiClient.post('/v1/budget/copy', { fromYearId: fromYearId, toYearId: yearId, mode: mode });
        },
        onSuccess: function () {
            qc.invalidateQueries({ queryKey: ['budget', yearId] });
            qc.invalidateQueries({ queryKey: ['budget-execution', yearId] });
        },
    });
    function handleCopy() {
        var _a, _b, _c;
        var sourceId = copyFromId || ((_a = otherYears[0]) === null || _a === void 0 ? void 0 : _a.id);
        if (!sourceId)
            return;
        var sourceName = (_c = (_b = years.find(function (y) { return y.id === sourceId; })) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : '';
        var modeLabel = copyMode === 'executed' ? 'executado' : 'planeado';
        if (confirm("Copiar or\u00E7amento ".concat(modeLabel, " de ").concat(sourceName, " para o ano selecionado?")))
            copyMutation.mutate({ fromYearId: sourceId, mode: copyMode });
    }
    return (<div className="h-full flex flex-col">
      <PageHeader_1.PageHeader title={t('nav.budget')} actions={<div className="flex items-center gap-3">
            {/* Copy from past budget */}
            {isAdmin && otherYears.length > 0 && tab === 'planning' && (<div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Copiar de</span>
                <select value={copyFromId || ((_b = otherYears[0]) === null || _b === void 0 ? void 0 : _b.id)} onChange={function (e) { return setCopyFromId(e.target.value); }} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                  {otherYears.map(function (y) { return <option key={y.id} value={y.id}>{y.name}</option>; })}
                </select>
                <select value={copyMode} onChange={function (e) { return setCopyMode(e.target.value); }} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                  <option value="planned">Planeado</option>
                  <option value="executed">Executado</option>
                </select>
                <Button_1.Button variant="secondary" size="sm" onClick={handleCopy} disabled={copyMutation.isPending}>
                  {copyMutation.isPending ? '…' : 'Copiar'}
                </Button_1.Button>
              </div>)}
            {/* Year selector */}
            <select value={yearId} onChange={function (e) { return setSelectedYearId(e.target.value); }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
              {years.map(function (y) { return <option key={y.id} value={y.id}>{y.name}</option>; })}
            </select>
          </div>}/>

      {/* Tabs */}
      <div className="px-8 pb-0 flex gap-1 border-b border-gray-200">
        {['planning', 'execution'].map(function (t) { return (<button key={t} onClick={function () { return setTab(t); }} className={(0, clsx_1.default)('px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors', tab === t
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {t === 'planning' ? 'Planeamento' : 'Execução'}
          </button>); })}
      </div>

      <div className="flex-1 overflow-auto px-8 pt-4 pb-8">
        {!isAdmin && tab === 'planning' && (<p className="text-xs text-gray-400 mb-3">{t('budget.readOnly')}</p>)}
        {!yearId ? (<p className="text-sm text-amber-600">No school year found. Create one first in School Years settings.</p>) : tab === 'planning' ? (<PlanningTab yearId={yearId} categories={categories} isAdmin={isAdmin}/>) : (<ExecutionTab yearId={yearId} categories={categories}/>)}
      </div>
    </div>);
}
