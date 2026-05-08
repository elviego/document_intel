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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EmployeesPage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var api_client_1 = require("@/lib/api-client");
var auth_1 = require("@/lib/auth");
var PageHeader_1 = require("@/components/ui/PageHeader");
var Button_1 = require("@/components/ui/Button");
var Modal_1 = require("@/components/ui/Modal");
var Input_1 = require("@/components/ui/Input");
var Select_1 = require("@/components/ui/Select");
var CONTRACT_TYPES = [
    { value: 'contrato', label: 'Contrato' },
    { value: 'rec_verdes', label: 'Rec. Verdes' },
    { value: 'horas', label: 'Horas' },
    { value: 'terceiros', label: 'Terceiros' },
];
var WAGE_CONTRACT_TYPES = [
    { value: 'sem_termo', label: 'Contrato sem termo', detail: 'Permanente — IRS tabela + SS 11% / 23.75%' },
    { value: 'a_termo', label: 'Contrato a termo', detail: 'Prazo certo — IRS tabela + SS 11% / 23.75%' },
    { value: 'rec_verdes', label: 'Prestação de serviços', detail: 'Recibos verdes — IRS 25% flat, sem SS patronal' },
    { value: 'horas', label: 'Horas / serviços pontuais', detail: 'Trabalho horário — IRS tabela + SS 11% / 23.75%' },
];
var MARITAL_STATUS = [
    { value: 'nao_casado', label: 'Não casado(a)' },
    { value: 'casado_2_titulares', label: 'Casado(a) — 2 titulares' },
    { value: 'casado_1_titular', label: 'Casado(a) — 1 titular' },
];
var EMPTY = {
    fullName: '', position: '', contractType: 'contrato',
    email: '', phone: '', nif: '', iban: '', baseSalary: 0,
    startDate: '', endDate: '', notes: '',
};
function eur(n) {
    return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}
function pct(n) {
    return "".concat((n * 100).toFixed(1), "%");
}
// ─── Employee form modal ──────────────────────────────────────────────────────
function EmployeeModal(_a) {
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    var open = _a.open, onClose = _a.onClose, initial = _a.initial;
    var qc = (0, react_query_1.useQueryClient)();
    var _r = (0, react_1.useState)(initial ? {
        fullName: initial.fullName, position: initial.position,
        contractType: initial.contractType, email: (_b = initial.email) !== null && _b !== void 0 ? _b : '',
        phone: (_c = initial.phone) !== null && _c !== void 0 ? _c : '', nif: (_d = initial.nif) !== null && _d !== void 0 ? _d : '',
        iban: (_e = initial.iban) !== null && _e !== void 0 ? _e : '', baseSalary: initial.baseSalary,
        startDate: (_f = initial.startDate) !== null && _f !== void 0 ? _f : '', endDate: (_g = initial.endDate) !== null && _g !== void 0 ? _g : '',
        notes: (_h = initial.notes) !== null && _h !== void 0 ? _h : '',
    } : EMPTY), form = _r[0], setForm = _r[1];
    var mutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return initial
            ? api_client_1.apiClient.put("/v1/employees/".concat(initial.id), form)
            : api_client_1.apiClient.post('/v1/employees', form); },
        onSuccess: function () { qc.invalidateQueries({ queryKey: ['employees'] }); onClose(); },
    });
    var set = function (k) {
        return function (e) {
            return setForm(function (f) {
                var _a;
                return (__assign(__assign({}, f), (_a = {}, _a[k] = e.target.value, _a)));
            });
        };
    };
    return (<Modal_1.Modal open={open} onClose={onClose} title={initial ? 'Editar Funcionário' : 'Novo Funcionário'}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input_1.Input label="Nome completo *" value={form.fullName} onChange={set('fullName')} className="col-span-2"/>
          <Input_1.Input label="Cargo / função" value={form.position} onChange={set('position')}/>
          <Select_1.Select label="Tipo de contrato" value={form.contractType} onChange={set('contractType')} options={CONTRACT_TYPES.map(function (c) { return ({ value: c.value, label: c.label }); })}/>
          <Input_1.Input label="Salário base (€)" type="number" step="0.01" value={String(form.baseSalary)} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { baseSalary: parseFloat(e.target.value) || 0 })); }); }}/>
          <Input_1.Input label="Email" type="email" value={(_j = form.email) !== null && _j !== void 0 ? _j : ''} onChange={set('email')}/>
          <Input_1.Input label="Telefone" value={(_k = form.phone) !== null && _k !== void 0 ? _k : ''} onChange={set('phone')}/>
          <Input_1.Input label="NIF" value={(_l = form.nif) !== null && _l !== void 0 ? _l : ''} onChange={set('nif')}/>
          <Input_1.Input label="IBAN" value={(_m = form.iban) !== null && _m !== void 0 ? _m : ''} onChange={set('iban')}/>
          <Input_1.Input label="Data de início" type="date" value={(_o = form.startDate) !== null && _o !== void 0 ? _o : ''} onChange={set('startDate')}/>
          <Input_1.Input label="Data de fim" type="date" value={(_p = form.endDate) !== null && _p !== void 0 ? _p : ''} onChange={set('endDate')}/>
        </div>
        <Input_1.Input label="Notas" value={(_q = form.notes) !== null && _q !== void 0 ? _q : ''} onChange={set('notes')}/>
        {mutation.isError && <p className="text-sm text-red-600">{(0, api_client_1.errorMessage)(mutation.error)}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button_1.Button variant="secondary" onClick={onClose}>Cancelar</Button_1.Button>
        <Button_1.Button onClick={function () { return mutation.mutate(); }} disabled={mutation.isPending || !form.fullName}>
          {mutation.isPending ? 'A guardar…' : 'Guardar'}
        </Button_1.Button>
      </div>
    </Modal_1.Modal>);
}
// ─── Wage modal ───────────────────────────────────────────────────────────────
function WageModal(_a) {
    var open = _a.open, onClose = _a.onClose, employee = _a.employee;
    var qc = (0, react_query_1.useQueryClient)();
    var today = new Date().toISOString().slice(0, 10);
    var _b = (0, react_1.useState)({
        grossAmount: employee.baseSalary || 0,
        contractType: 'sem_termo',
        maritalStatus: 'nao_casado',
        dependents: 0,
        effectiveFrom: today,
        notes: '',
    }), form = _b[0], setForm = _b[1];
    var _c = (0, react_1.useState)(null), preview = _c[0], setPreview = _c[1];
    var _d = (0, react_1.useState)(false), previewing = _d[0], setPreviewing = _d[1];
    var _e = (0, react_query_1.useQuery)({
        queryKey: ['wages', employee.id],
        queryFn: function () { return api_client_1.apiClient.get("/v1/wages/employee/".concat(employee.id)); },
        enabled: open,
    }).data, history = _e === void 0 ? [] : _e;
    function handlePreview() {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        setPreviewing(true);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 3, 4]);
                        return [4 /*yield*/, api_client_1.apiClient.post('/v1/wages/preview', {
                                grossAmount: form.grossAmount,
                                contractType: form.contractType,
                                maritalStatus: form.maritalStatus,
                                dependents: form.dependents,
                            })];
                    case 2:
                        result = _a.sent();
                        setPreview(result);
                        return [3 /*break*/, 4];
                    case 3:
                        setPreviewing(false);
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    var saveMutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_client_1.apiClient.post('/v1/wages', {
            employeeId: employee.id,
            effectiveFrom: form.effectiveFrom,
            grossAmount: form.grossAmount,
            contractType: form.contractType,
            maritalStatus: form.maritalStatus,
            dependents: form.dependents,
            notes: form.notes || undefined,
        }); },
        onSuccess: function () {
            qc.invalidateQueries({ queryKey: ['wages', employee.id] });
            setPreview(null);
        },
    });
    var deleteMutation = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_client_1.apiClient.delete("/v1/wages/".concat(id)); },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['wages', employee.id] }); },
    });
    return (<Modal_1.Modal open={open} onClose={onClose} title={"Sal\u00E1rio \u2014 ".concat(employee.fullName)}>
      <div className="space-y-4">
        {/* Calculator */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase">Calculadora de vencimento</p>
          <div className="grid grid-cols-2 gap-3">
            <Input_1.Input label="Salário bruto (€) *" type="number" step="0.01" value={String(form.grossAmount)} onChange={function (e) { setForm(function (f) { return (__assign(__assign({}, f), { grossAmount: parseFloat(e.target.value) || 0 })); }); setPreview(null); }}/>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de contrato</label>
              <select value={form.contractType} onChange={function (e) { setForm(function (f) { return (__assign(__assign({}, f), { contractType: e.target.value })); }); setPreview(null); }} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {WAGE_CONTRACT_TYPES.map(function (c) { return <option key={c.value} value={c.value}>{c.label}</option>; })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado civil</label>
              <select value={form.maritalStatus} onChange={function (e) { setForm(function (f) { return (__assign(__assign({}, f), { maritalStatus: e.target.value })); }); setPreview(null); }} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {MARITAL_STATUS.map(function (m) { return <option key={m.value} value={m.value}>{m.label}</option>; })}
              </select>
            </div>
            <Input_1.Input label="Dependentes" type="number" min="0" max="20" value={String(form.dependents)} onChange={function (e) { setForm(function (f) { return (__assign(__assign({}, f), { dependents: parseInt(e.target.value) || 0 })); }); setPreview(null); }}/>
          </div>

          <Button_1.Button variant="secondary" onClick={handlePreview} disabled={previewing || !form.grossAmount}>
            {previewing ? 'A calcular…' : 'Calcular'}
          </Button_1.Button>

          {preview && (<div className="mt-2 space-y-1">
              <div className="grid grid-cols-2 gap-x-6 text-sm">
                <Row label="Salário bruto" value={eur(preview.grossAmount)} bold/>
                <Row label={"IRS (".concat(pct(preview.irsRate), ")")} value={"\u2212 ".concat(eur(preview.irsAmount))} red/>
                <Row label={"SS trabalhador (".concat(pct(preview.ssEmployeeRate), ")")} value={"\u2212 ".concat(eur(preview.ssEmployeeAmount))} red/>
                <Row label="Salário líquido" value={eur(preview.netAmount)} bold green/>
              </div>
              <div className="border-t border-gray-200 pt-2 grid grid-cols-2 gap-x-6 text-sm">
                <Row label={"SS patronal (".concat(pct(preview.ssEmployerRate), ")")} value={eur(preview.ssEmployerAmount)}/>
                <Row label="Custo total patronal" value={eur(preview.totalEmployerCost)} bold/>
              </div>
              <p className="text-xs text-gray-400 pt-1">
                Tabela IRS Continente 2026 (verificar anualmente em portaldasfinancas.gov.pt)
              </p>

              {/* Save section */}
              <div className="pt-2 border-t border-gray-200 flex items-end gap-3">
                <Input_1.Input label="Válido a partir de" type="date" value={form.effectiveFrom} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { effectiveFrom: e.target.value })); }); }}/>
                <Input_1.Input label="Notas" value={form.notes} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { notes: e.target.value })); }); }}/>
                <div className="pb-0.5">
                  <Button_1.Button onClick={function () { return saveMutation.mutate(); }} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'A guardar…' : 'Guardar'}
                  </Button_1.Button>
                </div>
              </div>
              {saveMutation.isError && <p className="text-sm text-red-600">{(0, api_client_1.errorMessage)(saveMutation.error)}</p>}
              {saveMutation.isSuccess && <p className="text-sm text-green-600">Vencimento guardado.</p>}
            </div>)}
        </div>

        {/* History */}
        {history.length > 0 && (<div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Histórico</p>
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
              {history.map(function (w) { return (<div key={w.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">{eur(w.grossAmount)}</span>
                    <span className="text-gray-400 ml-2 text-xs">bruto</span>
                    <span className="ml-4 text-green-700 font-medium">{eur(w.netAmount)}</span>
                    <span className="text-gray-400 ml-1 text-xs">líquido</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>desde {w.effectiveFrom}</span>
                    <button onClick={function () { if (confirm('Eliminar este registo?'))
                deleteMutation.mutate(w.id); }} className="text-red-400 hover:text-red-600">✕</button>
                  </div>
                </div>); })}
            </div>
          </div>)}
      </div>

      <div className="flex justify-end pt-2">
        <Button_1.Button variant="secondary" onClick={onClose}>Fechar</Button_1.Button>
      </div>
    </Modal_1.Modal>);
}
function Row(_a) {
    var label = _a.label, value = _a.value, bold = _a.bold, red = _a.red, green = _a.green;
    return (<>
      <span className={"text-gray-500 py-0.5 ".concat(bold ? 'font-semibold text-gray-700' : '')}>{label}</span>
      <span className={"text-right py-0.5 font-mono ".concat(bold ? 'font-semibold' : '', " ").concat(red ? 'text-red-600' : '', " ").concat(green ? 'text-green-700' : 'text-gray-800')}>{value}</span>
    </>);
}
// ─── Page ─────────────────────────────────────────────────────────────────────
function EmployeesPage() {
    var _a;
    var isAdmin = ((_a = auth_1.auth.getUser()) === null || _a === void 0 ? void 0 : _a.role) === 'admin';
    var qc = (0, react_query_1.useQueryClient)();
    var _b = (0, react_query_1.useQuery)({
        queryKey: ['employees'],
        queryFn: function () { return api_client_1.apiClient.get('/v1/employees'); },
    }), _c = _b.data, employees = _c === void 0 ? [] : _c, isLoading = _b.isLoading;
    var _d = (0, react_1.useState)(false), showModal = _d[0], setShowModal = _d[1];
    var _e = (0, react_1.useState)(null), editing = _e[0], setEditing = _e[1];
    var _f = (0, react_1.useState)(null), wageTarget = _f[0], setWageTarget = _f[1];
    var _g = (0, react_1.useState)(true), filterActive = _g[0], setFilterActive = _g[1];
    var toggleActive = (0, react_query_1.useMutation)({
        mutationFn: function (emp) {
            return api_client_1.apiClient.put("/v1/employees/".concat(emp.id), { isActive: !emp.isActive });
        },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['employees'] }); },
    });
    var deleteMutation = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_client_1.apiClient.delete("/v1/employees/".concat(id)); },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['employees'] }); },
    });
    var visible = employees.filter(function (e) { return filterActive ? e.isActive : !e.isActive; });
    return (<div className="h-full flex flex-col">
      <PageHeader_1.PageHeader title="Funcionários" subtitle={"".concat(visible.length, " ").concat(filterActive ? 'ativos' : 'inativos')} actions={<>
            <select value={filterActive ? 'active' : 'inactive'} onChange={function (e) { return setFilterActive(e.target.value === 'active'); }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none">
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
            {isAdmin && <Button_1.Button size="sm" onClick={function () { setEditing(null); setShowModal(true); }}>+ Novo funcionário</Button_1.Button>}
          </>}/>

      <div className="flex-1 overflow-auto px-8 pb-8">
        {isLoading ? (<p className="text-sm text-gray-400 py-4">A carregar…</p>) : (<table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                <th className="pb-2 pr-4 font-medium">Nome</th>
                <th className="pb-2 pr-4 font-medium">Cargo</th>
                <th className="pb-2 pr-4 font-medium">Contrato</th>
                <th className="pb-2 pr-4 font-medium text-right">Salário base</th>
                <th className="pb-2 pr-4 font-medium">Contacto</th>
                <th className="pb-2 pr-4 font-medium">Início</th>
                <th className="pb-2 font-medium"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map(function (emp) {
                var _a, _b, _c, _d;
                return (<tr key={emp.id} className="hover:bg-gray-50 group">
                  <td className="py-2 pr-4 font-medium text-gray-900">{emp.fullName}</td>
                  <td className="py-2 pr-4 text-gray-600">{emp.position || '—'}</td>
                  <td className="py-2 pr-4">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {(_b = (_a = CONTRACT_TYPES.find(function (c) { return c.value === emp.contractType; })) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : emp.contractType}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-gray-700">
                    {eur(emp.baseSalary)}
                  </td>
                  <td className="py-2 pr-4 text-gray-500 text-xs">
                    {emp.email && <div>{emp.email}</div>}
                    {emp.phone && <div>{emp.phone}</div>}
                  </td>
                  <td className="py-2 pr-4 text-gray-500">{(_d = (_c = emp.startDate) === null || _c === void 0 ? void 0 : _c.slice(0, 10)) !== null && _d !== void 0 ? _d : '—'}</td>
                  <td className="py-2">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={function () { return setWageTarget(emp); }} className="text-xs text-green-600 hover:text-green-800 font-medium">Salário</button>
                      {isAdmin && (<>
                          <button onClick={function () { setEditing(emp); setShowModal(true); }} className="text-xs text-brand-600 hover:text-brand-800">Editar</button>
                          <button onClick={function () { return toggleActive.mutate(emp); }} className="text-xs text-gray-400 hover:text-gray-600">
                            {emp.isActive ? 'Desativar' : 'Ativar'}
                          </button>
                          <button onClick={function () { if (confirm("Eliminar ".concat(emp.fullName, "?")))
                        deleteMutation.mutate(emp.id); }} className="text-xs text-red-400 hover:text-red-600">Eliminar</button>
                        </>)}
                    </div>
                  </td>
                </tr>);
            })}
            </tbody>
          </table>)}
        {!isLoading && visible.length === 0 && (<p className="text-sm text-gray-400 text-center py-12">Nenhum funcionário encontrado.</p>)}
      </div>

      {showModal && (<EmployeeModal open onClose={function () { return setShowModal(false); }} initial={editing}/>)}
      {wageTarget && (<WageModal open onClose={function () { return setWageTarget(null); }} employee={wageTarget}/>)}
    </div>);
}
