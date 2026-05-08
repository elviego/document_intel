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
exports.default = EnrollmentPlansPage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var api_client_1 = require("@/lib/api-client");
var PageHeader_1 = require("@/components/ui/PageHeader");
var Button_1 = require("@/components/ui/Button");
var Modal_1 = require("@/components/ui/Modal");
var Input_1 = require("@/components/ui/Input");
var auth_1 = require("@/lib/auth");
var SCHEDULE_LABELS = {
    full_time: 'Tempo Integral (5 dias/semana)',
    part_time_days: 'Part-time — N dias/semana',
    part_time_mornings: 'Só de Manhãs',
    holiday: 'Plano Férias',
    custom: 'Personalizado',
};
var BILLING_LABELS = {
    monthly: 'Mensal',
    trimestral: 'Trimestral',
    annual: 'Anual',
};
function usePlans() {
    return (0, react_query_1.useQuery)({
        queryKey: ['enrollment-plans'],
        queryFn: function () { return api_client_1.apiClient.get('/v1/enrollment-plans?includeInactive=true'); },
    });
}
// ─── Modal ────────────────────────────────────────────────────────────────────
function PlanModal(_a) {
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    var open = _a.open, onClose = _a.onClose, initial = _a.initial;
    var qc = (0, react_query_1.useQueryClient)();
    var _m = (0, react_1.useState)({
        name: (_b = initial === null || initial === void 0 ? void 0 : initial.name) !== null && _b !== void 0 ? _b : '',
        description: (_c = initial === null || initial === void 0 ? void 0 : initial.description) !== null && _c !== void 0 ? _c : '',
        scheduleType: (_d = initial === null || initial === void 0 ? void 0 : initial.scheduleType) !== null && _d !== void 0 ? _d : 'custom',
        daysPerWeek: (_e = initial === null || initial === void 0 ? void 0 : initial.daysPerWeek) !== null && _e !== void 0 ? _e : undefined,
        morningsOnly: (_f = initial === null || initial === void 0 ? void 0 : initial.morningsOnly) !== null && _f !== void 0 ? _f : false,
        billingCycle: (_g = initial === null || initial === void 0 ? void 0 : initial.billingCycle) !== null && _g !== void 0 ? _g : 'monthly',
        baseAmount: (_h = initial === null || initial === void 0 ? void 0 : initial.baseAmount) !== null && _h !== void 0 ? _h : 0,
        discountPercent: (_j = initial === null || initial === void 0 ? void 0 : initial.discountPercent) !== null && _j !== void 0 ? _j : undefined,
        discountFixed: (_k = initial === null || initial === void 0 ? void 0 : initial.discountFixed) !== null && _k !== void 0 ? _k : undefined,
    }), form = _m[0], setForm = _m[1];
    var set = function (k) { return function (e) {
        return setForm(function (f) {
            var _a;
            return (__assign(__assign({}, f), (_a = {}, _a[k] = e.target.value, _a)));
        });
    }; };
    var mutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return initial
            ? api_client_1.apiClient.put("/v1/enrollment-plans/".concat(initial.id), __assign(__assign({}, form), { baseAmount: parseFloat(String(form.baseAmount)) || 0, discountPercent: form.discountPercent ? parseFloat(String(form.discountPercent)) : undefined, discountFixed: form.discountFixed ? parseFloat(String(form.discountFixed)) : undefined, daysPerWeek: form.daysPerWeek ? parseInt(String(form.daysPerWeek)) : undefined }))
            : api_client_1.apiClient.post('/v1/enrollment-plans', __assign(__assign({}, form), { baseAmount: parseFloat(String(form.baseAmount)) || 0, discountPercent: form.discountPercent ? parseFloat(String(form.discountPercent)) : undefined, discountFixed: form.discountFixed ? parseFloat(String(form.discountFixed)) : undefined, daysPerWeek: form.daysPerWeek ? parseInt(String(form.daysPerWeek)) : undefined })); },
        onSuccess: function () { qc.invalidateQueries({ queryKey: ['enrollment-plans'] }); onClose(); },
    });
    var showDaysPerWeek = form.scheduleType === 'part_time_days' || form.scheduleType === 'part_time_mornings';
    return (<Modal_1.Modal open={open} onClose={onClose} title={initial ? 'Editar Plano' : 'Novo Plano'}>
      <div className="space-y-3">
        <Input_1.Input label="Nome do plano *" value={form.name} onChange={set('name')}/>
        <Input_1.Input label="Descrição" value={(_l = form.description) !== null && _l !== void 0 ? _l : ''} onChange={set('description')}/>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de horário</label>
          <select value={form.scheduleType} onChange={set('scheduleType')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            {Object.keys(SCHEDULE_LABELS).map(function (k) { return (<option key={k} value={k}>{SCHEDULE_LABELS[k]}</option>); })}
          </select>
        </div>

        {showDaysPerWeek && (<Input_1.Input label="Dias por semana" type="number" value={form.daysPerWeek != null ? String(form.daysPerWeek) : ''} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { daysPerWeek: e.target.value ? parseInt(e.target.value) : undefined })); }); }}/>)}

        <div className="flex items-center gap-2">
          <input type="checkbox" id="mornings" checked={form.morningsOnly} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { morningsOnly: e.target.checked })); }); }} className="rounded text-brand-600"/>
          <label htmlFor="mornings" className="text-sm text-gray-700">Apenas período da manhã</label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ciclo de faturação</label>
          <select value={form.billingCycle} onChange={set('billingCycle')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            {Object.keys(BILLING_LABELS).map(function (k) { return (<option key={k} value={k}>{BILLING_LABELS[k]}</option>); })}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input_1.Input label="Valor base (€) *" type="number" value={String(form.baseAmount)} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { baseAmount: parseFloat(e.target.value) || 0 })); }); }}/>
          <Input_1.Input label="Desconto (%)" type="number" value={form.discountPercent != null ? String(form.discountPercent) : ''} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { discountPercent: e.target.value ? parseFloat(e.target.value) : undefined })); }); }}/>
          <Input_1.Input label="Desconto fixo (€)" type="number" value={form.discountFixed != null ? String(form.discountFixed) : ''} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { discountFixed: e.target.value ? parseFloat(e.target.value) : undefined })); }); }}/>
        </div>

        {mutation.isError && <p className="text-sm text-red-600">{(0, api_client_1.errorMessage)(mutation.error)}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button_1.Button variant="secondary" onClick={onClose}>Cancelar</Button_1.Button>
        <Button_1.Button onClick={function () { return mutation.mutate(); }} disabled={mutation.isPending || !form.name}>
          {mutation.isPending ? 'A guardar…' : 'Guardar'}
        </Button_1.Button>
      </div>
    </Modal_1.Modal>);
}
// ─── Page ─────────────────────────────────────────────────────────────────────
function EnrollmentPlansPage() {
    var _a;
    var isAdmin = ((_a = auth_1.auth.getUser()) === null || _a === void 0 ? void 0 : _a.role) === 'admin';
    var qc = (0, react_query_1.useQueryClient)();
    var _b = usePlans(), _c = _b.data, plans = _c === void 0 ? [] : _c, isLoading = _b.isLoading;
    var _d = (0, react_1.useState)(false), showModal = _d[0], setShowModal = _d[1];
    var _e = (0, react_1.useState)(null), editing = _e[0], setEditing = _e[1];
    var toggleActive = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, isActive = _a.isActive;
            return api_client_1.apiClient.put("/v1/enrollment-plans/".concat(id), { isActive: isActive });
        },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['enrollment-plans'] }); },
    });
    var deleteMutation = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_client_1.apiClient.delete("/v1/enrollment-plans/".concat(id)); },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['enrollment-plans'] }); },
    });
    function eur(n) { return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }); }
    return (<div className="h-full flex flex-col">
      <PageHeader_1.PageHeader title="Planos de Matrícula" subtitle={"".concat(plans.length, " planos")} actions={isAdmin ? <Button_1.Button size="sm" onClick={function () { setEditing(null); setShowModal(true); }}>+ Novo plano</Button_1.Button> : undefined}/>

      <div className="flex-1 overflow-auto px-8 pb-8">
        {isLoading ? (<p className="text-sm text-gray-400 py-4">A carregar…</p>) : (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {plans.map(function (plan) {
                var finalAmount = plan.discountFixed
                    ? plan.baseAmount - plan.discountFixed
                    : plan.discountPercent
                        ? plan.baseAmount * (1 - plan.discountPercent / 100)
                        : plan.baseAmount;
                return (<div key={plan.id} className={"bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2 ".concat(!plan.isActive ? 'opacity-50' : '')}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                      {plan.isPreset && (<span className="text-xs bg-brand-50 text-brand-700 rounded-full px-2 py-0.5">Pré-definido</span>)}
                    </div>
                    <p className="text-lg font-bold text-brand-700 shrink-0">{eur(finalAmount)}</p>
                  </div>

                  {plan.description && <p className="text-xs text-gray-500">{plan.description}</p>}

                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p>📅 {SCHEDULE_LABELS[plan.scheduleType]}</p>
                    {plan.daysPerWeek && <p>📆 {plan.daysPerWeek} dias/semana</p>}
                    <p>🗓 {BILLING_LABELS[plan.billingCycle]}</p>
                    {(plan.discountPercent || plan.discountFixed) && (<p className="text-green-600">
                        🏷 Desconto: {plan.discountPercent ? "".concat(plan.discountPercent, "%") : ''}{plan.discountFixed ? " ".concat(eur(plan.discountFixed)) : ''}
                      </p>)}
                  </div>

                  {isAdmin && (<div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <button onClick={function () { return toggleActive.mutate({ id: plan.id, isActive: !plan.isActive }); }} className={"relative inline-flex h-5 w-9 rounded-full transition-colors ".concat(plan.isActive ? 'bg-green-500' : 'bg-gray-300')}>
                        <span className={"absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ".concat(plan.isActive ? 'translate-x-4' : '')}/>
                      </button>
                      <div className="flex gap-2">
                        <button onClick={function () { setEditing(plan); setShowModal(true); }} className="text-xs text-gray-400 hover:text-gray-600">Editar</button>
                        {!plan.isPreset && (<button onClick={function () { if (confirm("Eliminar \"".concat(plan.name, "\"?")))
                            deleteMutation.mutate(plan.id); }} className="text-xs text-red-400 hover:text-red-600">Eliminar</button>)}
                      </div>
                    </div>)}
                </div>);
            })}
          </div>)}
      </div>

      {showModal && (<PlanModal open onClose={function () { return setShowModal(false); }} initial={editing}/>)}
    </div>);
}
