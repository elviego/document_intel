"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BankAccountsPage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var react_i18next_1 = require("react-i18next");
var api_client_1 = require("@/lib/api-client");
var useBankAccounts_1 = require("@/hooks/useBankAccounts");
var PageHeader_1 = require("@/components/ui/PageHeader");
var Button_1 = require("@/components/ui/Button");
var Modal_1 = require("@/components/ui/Modal");
var Input_1 = require("@/components/ui/Input");
// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
function BankAccountModal(_a) {
    var _b, _c;
    var open = _a.open, onClose = _a.onClose, initial = _a.initial;
    var t = (0, react_i18next_1.useTranslation)().t;
    var qc = (0, react_query_1.useQueryClient)();
    var _d = (0, react_1.useState)((_b = initial === null || initial === void 0 ? void 0 : initial.name) !== null && _b !== void 0 ? _b : ''), name = _d[0], setName = _d[1];
    var _e = (0, react_1.useState)((_c = initial === null || initial === void 0 ? void 0 : initial.iban) !== null && _c !== void 0 ? _c : ''), iban = _e[0], setIban = _e[1];
    var mutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return initial
            ? api_client_1.apiClient.patch("/v1/bank-accounts/".concat(initial.id), { name: name, iban: iban || null })
            : api_client_1.apiClient.post('/v1/bank-accounts', { name: name, iban: iban || undefined }); },
        onSuccess: function () {
            qc.invalidateQueries({ queryKey: ['bank-accounts'] });
            onClose();
        },
    });
    return (<Modal_1.Modal open={open} onClose={onClose} title={initial ? t('bankAccounts.edit') : t('bankAccounts.add')}>
      <div className="space-y-3">
        <Input_1.Input label={t('bankAccounts.name')} value={name} onChange={function (e) { return setName(e.target.value); }}/>
        <Input_1.Input label="IBAN" value={iban} onChange={function (e) { return setIban(e.target.value); }} placeholder="PT50 0000 0000 0000 0000 0000 0"/>
        {mutation.isError && <p className="text-sm text-red-600">{(0, api_client_1.errorMessage)(mutation.error)}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button_1.Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button_1.Button>
        <Button_1.Button onClick={function () { return mutation.mutate(); }} disabled={mutation.isPending || !name.trim()}>
          {mutation.isPending ? t('common.loading') : t('common.save')}
        </Button_1.Button>
      </div>
    </Modal_1.Modal>);
}
// ─── Page ─────────────────────────────────────────────────────────────────────
function BankAccountsPage() {
    var t = (0, react_i18next_1.useTranslation)().t;
    var _a = (0, useBankAccounts_1.useBankAccounts)(), _b = _a.data, accounts = _b === void 0 ? [] : _b, isLoading = _a.isLoading;
    var qc = (0, react_query_1.useQueryClient)();
    var _c = (0, react_1.useState)(false), showAdd = _c[0], setShowAdd = _c[1];
    var _d = (0, react_1.useState)(null), editing = _d[0], setEditing = _d[1];
    var toggleActive = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, isActive = _a.isActive;
            return api_client_1.apiClient.patch("/v1/bank-accounts/".concat(id), { isActive: isActive });
        },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['bank-accounts'] }); },
    });
    if (isLoading)
        return <div className="p-8 text-gray-400 text-sm">{t('common.loading')}</div>;
    return (<div className="h-full flex flex-col">
      <PageHeader_1.PageHeader title={t('nav.bankAccounts')} subtitle={"".concat(accounts.length, " contas")} actions={<Button_1.Button size="sm" onClick={function () { return setShowAdd(true); }}>+ {t('bankAccounts.add')}</Button_1.Button>}/>

      <div className="flex-1 overflow-auto px-8 pb-8">
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm max-w-lg">
          {accounts.map(function (acc) { return (<div key={acc.id} className={"flex items-center gap-4 px-4 py-4 ".concat(!acc.isActive ? 'opacity-50' : '')}>
              {/* Icon */}
              <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-700 font-bold text-sm">
                {acc.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{acc.name}</p>
                {acc.iban
                ? <p className="text-xs text-gray-500 font-mono truncate">{acc.iban}</p>
                : <p className="text-xs text-gray-400">{acc.isActive ? t('common.active') : t('common.inactive')}</p>}
              </div>
              <button onClick={function () { return toggleActive.mutate({ id: acc.id, isActive: !acc.isActive }); }} className={"relative inline-flex h-5 w-9 rounded-full transition-colors ".concat(acc.isActive ? 'bg-green-500' : 'bg-gray-300')}>
                <span className={"absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ".concat(acc.isActive ? 'translate-x-4' : '')}/>
              </button>
              <button onClick={function () { return setEditing(acc); }} className="text-xs text-gray-400 hover:text-gray-700">✎</button>
            </div>); })}

          {accounts.length === 0 && (<p className="px-4 py-8 text-sm text-gray-400 text-center">{t('bankAccounts.empty')}</p>)}
        </div>
      </div>

      {showAdd && <BankAccountModal open onClose={function () { return setShowAdd(false); }}/>}
      {editing && <BankAccountModal open onClose={function () { return setEditing(null); }} initial={editing}/>}
    </div>);
}
