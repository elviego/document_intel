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
exports.default = TransactionsPage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var react_i18next_1 = require("react-i18next");
var date_fns_1 = require("date-fns");
var api_client_1 = require("@/lib/api-client");
var auth_1 = require("@/lib/auth");
var useSchoolYear_1 = require("@/hooks/useSchoolYear");
var useCategories_1 = require("@/hooks/useCategories");
var useBankAccounts_1 = require("@/hooks/useBankAccounts");
var PageHeader_1 = require("@/components/ui/PageHeader");
var Button_1 = require("@/components/ui/Button");
var Badge_1 = require("@/components/ui/Badge");
var Modal_1 = require("@/components/ui/Modal");
var Input_1 = require("@/components/ui/Input");
var Select_1 = require("@/components/ui/Select");
var ImportModal_1 = require("./ImportModal");
// ─── Hooks ────────────────────────────────────────────────────────────────────
function useTransactions(filters) {
    var params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(function (_a) {
        var v = _a[1];
        return v;
    })));
    return (0, react_query_1.useQuery)({
        queryKey: ['transactions', filters],
        queryFn: function () { return api_client_1.apiClient.get("/v1/transactions?".concat(params)); },
    });
}
// ─── Add Transaction Modal ────────────────────────────────────────────────────
function AddTransactionModal(_a) {
    var open = _a.open, onClose = _a.onClose, schoolYearId = _a.schoolYearId, categories = _a.categories, bankAccounts = _a.bankAccounts;
    var t = (0, react_i18next_1.useTranslation)().t;
    var qc = (0, react_query_1.useQueryClient)();
    var _b = (0, react_1.useState)({
        date: (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd'),
        categoryId: '',
        bankAccountId: '',
        amount: '',
        description: '',
    }), form = _b[0], setForm = _b[1];
    var mutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_client_1.apiClient.post('/v1/transactions', __assign(__assign({}, form), { schoolYearId: schoolYearId, amount: parseFloat(form.amount) })); },
        onSuccess: function () { qc.invalidateQueries({ queryKey: ['transactions'] }); onClose(); },
    });
    var set = function (k) { return function (e) {
        return setForm(function (f) {
            var _a;
            return (__assign(__assign({}, f), (_a = {}, _a[k] = e.target.value, _a)));
        });
    }; };
    var incomeCategories = categories.filter(function (c) { return c.classification === 'receita'; });
    var expenseCategories = categories.filter(function (c) { return c.classification === 'despesa'; });
    return (<Modal_1.Modal open={open} onClose={onClose} title={t('transactions.addTransaction')}>
      <div className="space-y-3">
        <Input_1.Input label={t('transactions.date')} type="date" value={form.date} onChange={set('date')}/>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">{t('transactions.type')}</label>
          <select value={form.categoryId} onChange={set('categoryId')} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
            <option value="">— {t('transactions.type')} —</option>
            <optgroup label="Receitas">
              {incomeCategories.map(function (c) { return <option key={c.id} value={c.id}>{c.namePt}</option>; })}
            </optgroup>
            <optgroup label="Despesas">
              {expenseCategories.map(function (c) { return <option key={c.id} value={c.id}>{c.namePt}</option>; })}
            </optgroup>
          </select>
        </div>

        <Select_1.Select label={t('transactions.account')} value={form.bankAccountId} onChange={set('bankAccountId')} options={__spreadArray([{ value: '', label: '— Conta —' }], bankAccounts.map(function (b) { return ({ value: b.id, label: b.name }); }), true)}/>
        <Input_1.Input label={t('transactions.amount')} type="number" step="0.01" placeholder="ex: -400 ou 1200" value={form.amount} onChange={set('amount')}/>
        <Input_1.Input label={t('transactions.description')} value={form.description} onChange={set('description')}/>

        {!schoolYearId && (<p className="text-sm text-amber-600">No school year found. Create one first in School Years settings.</p>)}
        {mutation.isError && (<p className="text-sm text-red-600">{(0, api_client_1.errorMessage)(mutation.error)}</p>)}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button_1.Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button_1.Button>
        <Button_1.Button onClick={function () { return mutation.mutate(); }} disabled={mutation.isPending || !form.categoryId || !form.bankAccountId || !form.amount || !schoolYearId}>
          {mutation.isPending ? t('common.loading') : t('common.save')}
        </Button_1.Button>
      </div>
    </Modal_1.Modal>);
}
// ─── Page ────────────────────────────────────────────────────────────────────
function TransactionsPage() {
    var _a;
    var _b = (0, react_i18next_1.useTranslation)(), t = _b.t, i18n = _b.i18n;
    var user = auth_1.auth.getUser();
    var isAdmin = (user === null || user === void 0 ? void 0 : user.role) === 'admin';
    var _c = (0, useSchoolYear_1.useSchoolYears)().data, years = _c === void 0 ? [] : _c;
    var _d = (0, useCategories_1.useCategories)().data, categories = _d === void 0 ? [] : _d;
    var _e = (0, useBankAccounts_1.useBankAccounts)().data, bankAccounts = _e === void 0 ? [] : _e;
    var currentYearName = (0, useSchoolYear_1.currentSchoolYearName)();
    var currentYear = (_a = years.find(function (y) { return y.name === currentYearName; })) !== null && _a !== void 0 ? _a : years[0];
    var _f = (0, react_1.useState)({
        schoolYearId: '',
        monthLabel: '',
        search: '',
    }), filters = _f[0], setFilters = _f[1];
    var _g = (0, react_1.useState)(false), showAdd = _g[0], setShowAdd = _g[1];
    var _h = (0, react_1.useState)(false), showImport = _h[0], setShowImport = _h[1];
    var schoolYearId = filters.schoolYearId || (currentYear === null || currentYear === void 0 ? void 0 : currentYear.id) || '';
    var _j = useTransactions(__assign(__assign({}, filters), { schoolYearId: schoolYearId })), _k = _j.data, transactions = _k === void 0 ? [] : _k, isLoading = _j.isLoading;
    var qc = (0, react_query_1.useQueryClient)();
    var deleteMutation = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_client_1.apiClient.delete("/v1/transactions/".concat(id)); },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['transactions'] }); },
    });
    var setFilter = function (k) { return function (e) {
        return setFilters(function (f) {
            var _a;
            return (__assign(__assign({}, f), (_a = {}, _a[k] = e.target.value, _a)));
        });
    }; };
    // Derive unique month labels from loaded transactions
    var monthLabels = __spreadArray([], new Set(transactions.map(function (t) { return t.monthLabel; })), true).sort().reverse();
    function handleExport() {
        var params = new URLSearchParams({ schoolYearId: schoolYearId });
        if (filters.monthLabel)
            params.set('monthLabel', filters.monthLabel);
        window.open("/api/v1/transactions/export?".concat(params), '_blank');
    }
    var totalIncome = transactions.filter(function (t) { return t.amount > 0; }).reduce(function (s, t) { return s + t.amount; }, 0);
    var totalExpense = transactions.filter(function (t) { return t.amount < 0; }).reduce(function (s, t) { return s + t.amount; }, 0);
    var balance = totalIncome + totalExpense;
    return (<div className="h-full flex flex-col">
      <PageHeader_1.PageHeader title={t('transactions.title')} subtitle={"".concat(transactions.length, " movimentos")} actions={<>
            {isAdmin && (<Button_1.Button variant="secondary" size="sm" onClick={handleExport}>
                ↓ {t('common.export')}
              </Button_1.Button>)}
            {isAdmin && (<Button_1.Button variant="secondary" size="sm" onClick={function () { return setShowImport(true); }}>
                ↑ Import Excel
              </Button_1.Button>)}
            {(isAdmin || (user === null || user === void 0 ? void 0 : user.role) === 'staff') && (<Button_1.Button size="sm" onClick={function () { return setShowAdd(true); }}>
                + {t('transactions.addTransaction')}
              </Button_1.Button>)}
          </>}/>

      {/* Filters */}
      <div className="px-8 pb-4 flex flex-wrap gap-3">
        <select value={filters.schoolYearId} onChange={setFilter('schoolYearId')} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
          {years.map(function (y) { return <option key={y.id} value={y.id}>{y.name}</option>; })}
        </select>

        <select value={filters.monthLabel} onChange={setFilter('monthLabel')} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
          <option value="">Todos os meses</option>
          {monthLabels.map(function (m) { return <option key={m} value={m}>{m}</option>; })}
        </select>

        <input value={filters.search} onChange={setFilter('search')} placeholder={t('common.search')} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"/>
      </div>

      {/* Summary bar */}
      <div className="px-8 pb-4 flex gap-6">
        <Stat label={t('common.income')} value={totalIncome} color="text-green-700"/>
        <Stat label={t('common.expense')} value={totalExpense} color="text-red-700"/>
        <Stat label={t('common.balance')} value={balance} color={balance >= 0 ? 'text-green-700' : 'text-red-700'}/>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-8">
        {isLoading ? (<p className="text-sm text-gray-400 py-4">{t('common.loading')}</p>) : (<table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                <th className="pb-2 pr-4 font-medium">{t('transactions.date')}</th>
                <th className="pb-2 pr-4 font-medium">{t('transactions.month')}</th>
                <th className="pb-2 pr-4 font-medium">{t('transactions.type')}</th>
                <th className="pb-2 pr-4 font-medium">{t('transactions.description')}</th>
                <th className="pb-2 pr-4 font-medium text-right">{t('transactions.amount')}</th>
                <th className="pb-2 pr-4 font-medium">{t('transactions.account')}</th>
                {isAdmin && <th className="pb-2 font-medium"/>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map(function (tx) { return (<tr key={tx.id} className="hover:bg-gray-50 group">
                  <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">{tx.date.slice(0, 10)}</td>
                  <td className="py-2 pr-4">
                    <Badge_1.Badge variant="gray">{tx.monthLabel}</Badge_1.Badge>
                  </td>
                  <td className="py-2 pr-4 font-medium text-gray-900">
                    {i18n.language === 'pt' ? tx.categoryName : tx.categoryName}
                  </td>
                  <td className="py-2 pr-4 text-gray-600 max-w-xs truncate">{tx.description}</td>
                  <td className={"py-2 pr-4 text-right font-mono font-semibold ".concat(tx.amount >= 0 ? 'text-green-700' : 'text-red-700')}>
                    {formatEuro(tx.amount)}
                  </td>
                  <td className="py-2 pr-4 text-gray-500">{tx.bankAccountName}</td>
                  {isAdmin && (<td className="py-2">
                      <button onClick={function () { if (confirm('Eliminar este movimento?'))
                    deleteMutation.mutate(tx.id); }} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                        ✕
                      </button>
                    </td>)}
                </tr>); })}
            </tbody>
          </table>)}
      </div>

      {showAdd && (<AddTransactionModal open={showAdd} onClose={function () { return setShowAdd(false); }} schoolYearId={schoolYearId} categories={categories} bankAccounts={bankAccounts}/>)}

      {showImport && (<ImportModal_1.ImportModal open={showImport} onClose={function () { return setShowImport(false); }} schoolYearId={schoolYearId}/>)}
    </div>);
}
function Stat(_a) {
    var label = _a.label, value = _a.value, color = _a.color;
    return (<div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={"text-base font-semibold ".concat(color)}>{formatEuro(value)}</p>
    </div>);
}
function formatEuro(n) {
    return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}
