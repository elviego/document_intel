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
exports.default = SalariesPage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var react_i18next_1 = require("react-i18next");
var api_client_1 = require("@/lib/api-client");
var useSchoolYear_1 = require("@/hooks/useSchoolYear");
var useBankAccounts_1 = require("@/hooks/useBankAccounts");
var PageHeader_1 = require("@/components/ui/PageHeader");
var Button_1 = require("@/components/ui/Button");
var Modal_1 = require("@/components/ui/Modal");
var Input_1 = require("@/components/ui/Input");
var Select_1 = require("@/components/ui/Select");
var Badge_1 = require("@/components/ui/Badge");
var MONTH_NAMES = [
    '', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];
var SALARY_TYPES = [
    { value: 'contrato', label: 'Contrato' },
    { value: 'rec_verdes', label: 'Recibos Verdes' },
    { value: 'horas', label: 'Horas Extra' },
    { value: 'terceiros', label: 'Terceiros' },
];
function useSalaries(schoolYearId) {
    return (0, react_query_1.useQuery)({
        queryKey: ['salaries', schoolYearId],
        queryFn: function () { return api_client_1.apiClient.get("/v1/salaries/".concat(schoolYearId)); },
        enabled: !!schoolYearId,
    });
}
function formatEuro(n) {
    return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}
// ─── Add Salary Modal ─────────────────────────────────────────────────────────
function AddSalaryModal(_a) {
    var open = _a.open, onClose = _a.onClose, schoolYearId = _a.schoolYearId;
    var t = (0, react_i18next_1.useTranslation)().t;
    var qc = (0, react_query_1.useQueryClient)();
    var _b = (0, useBankAccounts_1.useBankAccounts)().data, bankAccounts = _b === void 0 ? [] : _b;
    var _c = (0, react_1.useState)({
        personName: '',
        salaryType: 'contrato',
        serviceName: '',
        baseAmount: '',
        month: String(new Date().getMonth() + 1),
        actualAmount: '',
        bankAccountId: '',
    }), form = _c[0], setForm = _c[1];
    var mutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_client_1.apiClient.post('/v1/salaries', __assign(__assign({}, form), { schoolYearId: schoolYearId, month: parseInt(form.month), baseAmount: parseFloat(form.baseAmount) || 0, actualAmount: parseFloat(form.actualAmount) || parseFloat(form.baseAmount) || 0 })); },
        onSuccess: function () {
            qc.invalidateQueries({ queryKey: ['salaries'] });
            qc.invalidateQueries({ queryKey: ['transactions'] });
            onClose();
        },
    });
    var set = function (k) { return function (e) {
        return setForm(function (f) {
            var _a;
            return (__assign(__assign({}, f), (_a = {}, _a[k] = e.target.value, _a)));
        });
    }; };
    var monthOptions = MONTH_NAMES.slice(1).map(function (name, i) { return ({ value: String(i + 1), label: name }); });
    var bankOptions = __spreadArray([
        { value: '', label: '— Conta —' }
    ], bankAccounts.map(function (b) { return ({ value: b.id, label: b.name }); }), true);
    return (<Modal_1.Modal open={open} onClose={onClose} title={t('salaries.add')}>
      <div className="space-y-3">
        <Input_1.Input label={t('salaries.personName')} value={form.personName} onChange={set('personName')}/>
        <Select_1.Select label={t('salaries.type')} value={form.salaryType} onChange={set('salaryType')} options={SALARY_TYPES}/>
        <Input_1.Input label={t('salaries.serviceName')} value={form.serviceName} onChange={set('serviceName')} placeholder={t('salaries.serviceNameHint')}/>
        <Select_1.Select label={t('salaries.month')} value={form.month} onChange={set('month')} options={monthOptions}/>
        <Select_1.Select label={t('transactions.account')} value={form.bankAccountId} onChange={set('bankAccountId')} options={bankOptions}/>
        <Input_1.Input label={t('salaries.baseAmount')} type="number" step="0.01" value={form.baseAmount} onChange={set('baseAmount')}/>
        <Input_1.Input label={t('salaries.actualAmount')} type="number" step="0.01" value={form.actualAmount} onChange={set('actualAmount')} placeholder={t('salaries.actualAmountHint')}/>
        {mutation.isError && (<p className="text-sm text-red-600">{(0, api_client_1.errorMessage)(mutation.error)}</p>)}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button_1.Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button_1.Button>
        <Button_1.Button onClick={function () { return mutation.mutate(); }} disabled={mutation.isPending || !form.personName || !form.baseAmount || !form.bankAccountId}>
          {mutation.isPending ? t('common.loading') : t('common.save')}
        </Button_1.Button>
      </div>
    </Modal_1.Modal>);
}
// ─── Page ─────────────────────────────────────────────────────────────────────
function SalariesPage() {
    var _a;
    var t = (0, react_i18next_1.useTranslation)().t;
    var _b = (0, useSchoolYear_1.useSchoolYears)().data, years = _b === void 0 ? [] : _b;
    var currentYearName = (0, useSchoolYear_1.currentSchoolYearName)();
    var currentYear = (_a = years.find(function (y) { return y.name === currentYearName; })) !== null && _a !== void 0 ? _a : years[0];
    var _c = (0, react_1.useState)(''), selectedYearId = _c[0], setSelectedYearId = _c[1];
    var _d = (0, react_1.useState)(false), showAdd = _d[0], setShowAdd = _d[1];
    var _e = (0, react_1.useState)(''), filterMonth = _e[0], setFilterMonth = _e[1];
    var yearId = selectedYearId || (currentYear === null || currentYear === void 0 ? void 0 : currentYear.id) || '';
    var _f = useSalaries(yearId), _g = _f.data, entries = _g === void 0 ? [] : _g, isLoading = _f.isLoading;
    var qc = (0, react_query_1.useQueryClient)();
    var deleteMutation = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_client_1.apiClient.delete("/v1/salaries/".concat(id)); },
        onSuccess: function () {
            qc.invalidateQueries({ queryKey: ['salaries'] });
            qc.invalidateQueries({ queryKey: ['transactions'] });
        },
    });
    var filtered = filterMonth
        ? entries.filter(function (e) { return e.month === parseInt(filterMonth); })
        : entries;
    // Group by person
    var byPerson = {};
    filtered.forEach(function (e) {
        var _a;
        var _b;
        ;
        ((_a = byPerson[_b = e.personName]) !== null && _a !== void 0 ? _a : (byPerson[_b] = [])).push(e);
    });
    var totalActual = filtered.reduce(function (s, e) { return s + e.actualAmount; }, 0);
    var monthOptions = MONTH_NAMES.slice(1).map(function (name, i) { return ({ value: String(i + 1), label: name }); });
    if (isLoading)
        return <div className="p-8 text-gray-400 text-sm">{t('common.loading')}</div>;
    return (<div className="h-full flex flex-col">
      <PageHeader_1.PageHeader title={t('nav.salaries')} subtitle={"Total: ".concat(formatEuro(totalActual))} actions={<div className="flex items-center gap-3">
            <select value={filterMonth} onChange={function (e) { return setFilterMonth(e.target.value); }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
              <option value="">Todos os meses</option>
              {monthOptions.map(function (o) { return <option key={o.value} value={o.value}>{o.label}</option>; })}
            </select>
            <select value={yearId} onChange={function (e) { return setSelectedYearId(e.target.value); }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
              {years.map(function (y) { return <option key={y.id} value={y.id}>{y.name}</option>; })}
            </select>
            <Button_1.Button size="sm" onClick={function () { return setShowAdd(true); }}>+ {t('salaries.add')}</Button_1.Button>
          </div>}/>

      <div className="flex-1 overflow-auto px-8 pb-8">
        {Object.keys(byPerson).length === 0 ? (<p className="text-sm text-gray-400 py-8 text-center">{t('salaries.empty')}</p>) : (<div className="space-y-6">
            {Object.entries(byPerson).map(function (_a) {
                var person = _a[0], personEntries = _a[1];
                return (<PersonCard key={person} person={person} entries={personEntries} onDelete={function (id) { if (confirm(t('salaries.confirmDelete')))
                    deleteMutation.mutate(id); }}/>);
            })}
          </div>)}
      </div>

      {showAdd && (<AddSalaryModal open={showAdd} onClose={function () { return setShowAdd(false); }} schoolYearId={yearId}/>)}
    </div>);
}
function PersonCard(_a) {
    var person = _a.person, entries = _a.entries, onDelete = _a.onDelete;
    var total = entries.reduce(function (s, e) { return s + e.actualAmount; }, 0);
    return (<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 text-sm">{person}</h3>
        <span className="text-sm font-mono font-semibold text-gray-700">{formatEuro(total)}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="px-4 py-2 font-medium">Mês</th>
            <th className="px-4 py-2 font-medium">Tipo</th>
            <th className="px-4 py-2 font-medium">Serviço</th>
            <th className="px-4 py-2 font-medium text-right">Base</th>
            <th className="px-4 py-2 font-medium text-right">Real</th>
            <th className="px-4 py-2 font-medium">Transação</th>
            <th className="px-4 py-2 w-8"/>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {entries.map(function (e) {
            var _a, _b, _c;
            return (<tr key={e.id} className="hover:bg-gray-50 group">
              <td className="px-4 py-2 text-gray-600">{MONTH_NAMES[e.month]}</td>
              <td className="px-4 py-2">
                <Badge_1.Badge variant="gray">{(_b = (_a = SALARY_TYPES.find(function (s) { return s.value === e.salaryType; })) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : e.salaryType}</Badge_1.Badge>
              </td>
              <td className="px-4 py-2 text-gray-500 max-w-xs truncate">{(_c = e.serviceName) !== null && _c !== void 0 ? _c : '—'}</td>
              <td className="px-4 py-2 text-right font-mono text-gray-600">{formatEuro(e.baseAmount)}</td>
              <td className="px-4 py-2 text-right font-mono font-semibold text-gray-900">{formatEuro(e.actualAmount)}</td>
              <td className="px-4 py-2">
                {e.linkedTransactionId ? (<Badge_1.Badge variant="green">✓ mov.</Badge_1.Badge>) : (<Badge_1.Badge variant="gray">—</Badge_1.Badge>)}
              </td>
              <td className="px-4 py-2">
                <button onClick={function () { return onDelete(e.id); }} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                  ✕
                </button>
              </td>
            </tr>);
        })}
        </tbody>
      </table>
    </div>);
}
