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
exports.default = MealsPage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var react_i18next_1 = require("react-i18next");
var date_fns_1 = require("date-fns");
var api_client_1 = require("@/lib/api-client");
var useSchoolYear_1 = require("@/hooks/useSchoolYear");
var PageHeader_1 = require("@/components/ui/PageHeader");
var Button_1 = require("@/components/ui/Button");
var Modal_1 = require("@/components/ui/Modal");
var Input_1 = require("@/components/ui/Input");
var auth_1 = require("@/lib/auth");
var StudentImportModal_1 = require("./StudentImportModal");
// ─── Hooks ────────────────────────────────────────────────────────────────────
function useChildren(schoolYearId) {
    return (0, react_query_1.useQuery)({
        queryKey: ['children', schoolYearId],
        queryFn: function () { return api_client_1.apiClient.get("/v1/meals/children/".concat(schoolYearId)); },
        enabled: !!schoolYearId,
    });
}
function useMealRecords(date) {
    return (0, react_query_1.useQuery)({
        queryKey: ['meal-records', date],
        queryFn: function () { return api_client_1.apiClient.get("/v1/meals/records?from=".concat(date, "&to=").concat(date)); },
        enabled: !!date,
    });
}
function useBilling(schoolYearId, year, month) {
    return (0, react_query_1.useQuery)({
        queryKey: ['meal-billing', schoolYearId, year, month],
        queryFn: function () { return api_client_1.apiClient.get("/v1/meals/billing/".concat(schoolYearId, "/").concat(year, "/").concat(month)); },
        enabled: !!schoolYearId,
    });
}
function usePricing(schoolYearId) {
    return (0, react_query_1.useQuery)({
        queryKey: ['meal-pricing', schoolYearId],
        queryFn: function () { return api_client_1.apiClient.get("/v1/meals/pricing/".concat(schoolYearId)); },
        enabled: !!schoolYearId,
    });
}
// ─── Add Child Modal ──────────────────────────────────────────────────────────
function AddChildModal(_a) {
    var open = _a.open, onClose = _a.onClose, schoolYearId = _a.schoolYearId;
    var t = (0, react_i18next_1.useTranslation)().t;
    var qc = (0, react_query_1.useQueryClient)();
    var _b = (0, react_1.useState)({ fullName: '', tuitionType: 'mensalidade' }), form = _b[0], setForm = _b[1];
    var mutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_client_1.apiClient.post('/v1/meals/children', __assign(__assign({}, form), { schoolYearId: schoolYearId })); },
        onSuccess: function () { qc.invalidateQueries({ queryKey: ['children'] }); onClose(); },
    });
    return (<Modal_1.Modal open={open} onClose={onClose} title={t('meals.addChild')}>
      <div className="space-y-3">
        <Input_1.Input label={t('meals.childName')} value={form.fullName} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { fullName: e.target.value })); }); }}/>
        <Input_1.Input label={t('meals.tuitionType')} value={form.tuitionType} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { tuitionType: e.target.value })); }); }}/>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button_1.Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button_1.Button>
        <Button_1.Button onClick={function () { return mutation.mutate(); }} disabled={mutation.isPending || !form.fullName}>
          {mutation.isPending ? t('common.loading') : t('common.save')}
        </Button_1.Button>
      </div>
    </Modal_1.Modal>);
}
// ─── Daily Tab ────────────────────────────────────────────────────────────────
function DailyTab(_a) {
    var schoolYearId = _a.schoolYearId;
    var t = (0, react_i18next_1.useTranslation)().t;
    var _b = (0, react_1.useState)((0, date_fns_1.format)(new Date(), 'yyyy-MM-dd')), date = _b[0], setDate = _b[1];
    var _c = useChildren(schoolYearId).data, children = _c === void 0 ? [] : _c;
    var _d = useMealRecords(date), _e = _d.data, records = _e === void 0 ? [] : _e, isLoading = _d.isLoading;
    var qc = (0, react_query_1.useQueryClient)();
    var toggleMutation = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var childId = _a.childId, mealType = _a.mealType;
            var existing = records.find(function (r) { return r.childId === childId && r.mealType === mealType; });
            if (existing)
                return api_client_1.apiClient.delete("/v1/meals/records/".concat(existing.id));
            return api_client_1.apiClient.post('/v1/meals/records', { childId: childId, date: date, mealType: mealType });
        },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['meal-records', date] }); },
    });
    var activeChildren = children.filter(function (c) { return c.isActive; });
    return (<div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Data</label>
        <input type="date" value={date} onChange={function (e) { return setDate(e.target.value); }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"/>
      </div>

      {isLoading ? (<p className="text-sm text-gray-400">{t('common.loading')}</p>) : (<table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b border-gray-200 text-xs text-gray-500 uppercase">
              <th className="pb-2 pr-4 font-medium">{t('meals.childName')}</th>
              <th className="pb-2 pr-4 font-medium text-center">{t('meals.withSoup')}</th>
              <th className="pb-2 font-medium text-center">{t('meals.withoutSoup')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activeChildren.map(function (child) {
                var hasSoup = records.some(function (r) { return r.childId === child.id && r.mealType === 'com_sopa'; });
                var hasNoSoup = records.some(function (r) { return r.childId === child.id && r.mealType === 'sem_sopa'; });
                return (<tr key={child.id} className="hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium text-gray-900">{child.fullName}</td>
                  <td className="py-2 pr-4 text-center">
                    <button onClick={function () { return toggleMutation.mutate({ childId: child.id, mealType: 'com_sopa' }); }} className={"w-7 h-7 rounded-full border-2 text-xs font-bold transition-colors ".concat(hasSoup ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-300 hover:border-green-400')}>
                      ✓
                    </button>
                  </td>
                  <td className="py-2 text-center">
                    <button onClick={function () { return toggleMutation.mutate({ childId: child.id, mealType: 'sem_sopa' }); }} className={"w-7 h-7 rounded-full border-2 text-xs font-bold transition-colors ".concat(hasNoSoup ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 text-gray-300 hover:border-blue-400')}>
                      ✓
                    </button>
                  </td>
                </tr>);
            })}
            {activeChildren.length === 0 && (<tr><td colSpan={3} className="py-8 text-center text-sm text-gray-400">Nenhuma criança ativa</td></tr>)}
          </tbody>
        </table>)}
    </div>);
}
// ─── Billing Tab ──────────────────────────────────────────────────────────────
function BillingTab(_a) {
    var schoolYearId = _a.schoolYearId;
    var t = (0, react_i18next_1.useTranslation)().t;
    var now = new Date();
    var _b = (0, react_1.useState)(now.getMonth() + 1), month = _b[0], setMonth = _b[1];
    var _c = (0, react_1.useState)(now.getFullYear()), year = _c[0], setYear = _c[1];
    var _d = useBilling(schoolYearId, year, month), _e = _d.data, billing = _e === void 0 ? [] : _e, isLoading = _d.isLoading;
    var monthNames = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    var totalParent = billing.reduce(function (s, b) { return s + b.parentCharge; }, 0);
    var totalSchool = billing.reduce(function (s, b) { return s + b.schoolCost; }, 0);
    return (<div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={month} onChange={function (e) { return setMonth(Number(e.target.value)); }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white">
          {monthNames.slice(1).map(function (n, i) { return <option key={i + 1} value={i + 1}>{n}</option>; })}
        </select>
        <input type="number" value={year} onChange={function (e) { return setYear(Number(e.target.value)); }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm w-24"/>
      </div>
      {isLoading ? (<p className="text-sm text-gray-400">{t('common.loading')}</p>) : (<table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b border-gray-200 text-xs text-gray-500 uppercase">
              <th className="pb-2 pr-4 font-medium">{t('meals.childName')}</th>
              <th className="pb-2 pr-4 font-medium text-center">{t('meals.withSoup')}</th>
              <th className="pb-2 pr-4 font-medium text-center">{t('meals.withoutSoup')}</th>
              <th className="pb-2 pr-4 font-medium text-right">{t('meals.schoolCost')}</th>
              <th className="pb-2 font-medium text-right">{t('meals.parentCharge')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {billing.map(function (b) { return (<tr key={b.childId} className="hover:bg-gray-50">
                <td className="py-2 pr-4 font-medium text-gray-900">{b.childName}</td>
                <td className="py-2 pr-4 text-center">{b.withSoupCount}</td>
                <td className="py-2 pr-4 text-center">{b.withoutSoupCount}</td>
                <td className="py-2 pr-4 text-right font-mono text-gray-600">
                  {b.schoolCost.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                </td>
                <td className="py-2 text-right font-mono font-semibold text-gray-900">
                  {b.parentCharge.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                </td>
              </tr>); })}
          </tbody>
          <tfoot className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
            <tr>
              <td className="py-2 pr-4 text-gray-700" colSpan={3}>Total</td>
              <td className="py-2 pr-4 text-right font-mono text-gray-700">
                {totalSchool.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
              </td>
              <td className="py-2 text-right font-mono text-gray-900">
                {totalParent.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
              </td>
            </tr>
          </tfoot>
        </table>)}
    </div>);
}
// ─── Pricing Tab ──────────────────────────────────────────────────────────────
function PricingTab(_a) {
    var _this = this;
    var _b, _c, _d, _e;
    var schoolYearId = _a.schoolYearId;
    var t = (0, react_i18next_1.useTranslation)().t;
    var qc = (0, react_query_1.useQueryClient)();
    var _f = usePricing(schoolYearId).data, pricing = _f === void 0 ? [] : _f;
    var soupEntry = pricing.find(function (p) { return p.mealType === 'com_sopa'; });
    var noSoupEntry = pricing.find(function (p) { return p.mealType === 'sem_sopa'; });
    var _g = (0, react_1.useState)(''), withSoupSchool = _g[0], setWithSoupSchool = _g[1];
    var _h = (0, react_1.useState)(''), withSoupParent = _h[0], setWithSoupParent = _h[1];
    var _j = (0, react_1.useState)(''), withoutSoupSchool = _j[0], setWithoutSoupSchool = _j[1];
    var _k = (0, react_1.useState)(''), withoutSoupParent = _k[0], setWithoutSoupParent = _k[1];
    var _l = (0, react_1.useState)(false), saved = _l[0], setSaved = _l[1];
    var saveMutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            api_client_1.apiClient.put('/v1/meals/pricing', {
                                schoolYearId: schoolYearId,
                                mealType: 'com_sopa',
                                schoolCost: parseFloat(withSoupSchool || String((_a = soupEntry === null || soupEntry === void 0 ? void 0 : soupEntry.schoolCost) !== null && _a !== void 0 ? _a : 0)),
                                parentPrice: parseFloat(withSoupParent || String((_b = soupEntry === null || soupEntry === void 0 ? void 0 : soupEntry.parentPrice) !== null && _b !== void 0 ? _b : 0)),
                            }),
                            api_client_1.apiClient.put('/v1/meals/pricing', {
                                schoolYearId: schoolYearId,
                                mealType: 'sem_sopa',
                                schoolCost: parseFloat(withoutSoupSchool || String((_c = noSoupEntry === null || noSoupEntry === void 0 ? void 0 : noSoupEntry.schoolCost) !== null && _c !== void 0 ? _c : 0)),
                                parentPrice: parseFloat(withoutSoupParent || String((_d = noSoupEntry === null || noSoupEntry === void 0 ? void 0 : noSoupEntry.parentPrice) !== null && _d !== void 0 ? _d : 0)),
                            }),
                        ])];
                    case 1:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); },
        onSuccess: function () {
            qc.invalidateQueries({ queryKey: ['meal-pricing', schoolYearId] });
            setSaved(true);
            setTimeout(function () { return setSaved(false); }, 2000);
        },
    });
    return (<div className="max-w-md space-y-5">
      <p className="text-sm text-gray-500">{t('meals.pricingHint')}</p>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Com Sopa</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input_1.Input label={t('meals.schoolCost') + ' (€)'} type="number" step="0.01" value={withSoupSchool || String((_b = soupEntry === null || soupEntry === void 0 ? void 0 : soupEntry.schoolCost) !== null && _b !== void 0 ? _b : '')} onChange={function (e) { return setWithSoupSchool(e.target.value); }} placeholder="ex: 3.50"/>
          <Input_1.Input label={t('meals.parentCharge') + ' (€)'} type="number" step="0.01" value={withSoupParent || String((_c = soupEntry === null || soupEntry === void 0 ? void 0 : soupEntry.parentPrice) !== null && _c !== void 0 ? _c : '')} onChange={function (e) { return setWithSoupParent(e.target.value); }} placeholder="ex: 4.00"/>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Sem Sopa</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input_1.Input label={t('meals.schoolCost') + ' (€)'} type="number" step="0.01" value={withoutSoupSchool || String((_d = noSoupEntry === null || noSoupEntry === void 0 ? void 0 : noSoupEntry.schoolCost) !== null && _d !== void 0 ? _d : '')} onChange={function (e) { return setWithoutSoupSchool(e.target.value); }} placeholder="ex: 2.50"/>
          <Input_1.Input label={t('meals.parentCharge') + ' (€)'} type="number" step="0.01" value={withoutSoupParent || String((_e = noSoupEntry === null || noSoupEntry === void 0 ? void 0 : noSoupEntry.parentPrice) !== null && _e !== void 0 ? _e : '')} onChange={function (e) { return setWithoutSoupParent(e.target.value); }} placeholder="ex: 3.00"/>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button_1.Button onClick={function () { return saveMutation.mutate(); }} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? t('common.loading') : t('common.save')}
        </Button_1.Button>
        {saved && <span className="text-sm text-green-600">✓ {t('common.saved')}</span>}
      </div>
    </div>);
}
// ─── Children Tab ─────────────────────────────────────────────────────────────
function ChildrenTab(_a) {
    var schoolYearId = _a.schoolYearId;
    var t = (0, react_i18next_1.useTranslation)().t;
    var _b = useChildren(schoolYearId), _c = _b.data, children = _c === void 0 ? [] : _c, isLoading = _b.isLoading;
    var _d = (0, react_1.useState)(false), showAdd = _d[0], setShowAdd = _d[1];
    var _e = (0, react_1.useState)(false), showImport = _e[0], setShowImport = _e[1];
    var qc = (0, react_query_1.useQueryClient)();
    var toggleActive = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, isActive = _a.isActive;
            return api_client_1.apiClient.patch("/v1/meals/children/".concat(id), { isActive: isActive });
        },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['children'] }); },
    });
    return (<div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button_1.Button variant="secondary" size="sm" onClick={function () { return setShowImport(true); }}>↑ Import CSV</Button_1.Button>
        <Button_1.Button size="sm" onClick={function () { return setShowAdd(true); }}>+ {t('meals.addChild')}</Button_1.Button>
      </div>
      {isLoading ? (<p className="text-sm text-gray-400">{t('common.loading')}</p>) : (<table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b border-gray-200 text-xs text-gray-500 uppercase">
              <th className="pb-2 pr-4 font-medium">{t('meals.childName')}</th>
              <th className="pb-2 pr-4 font-medium">{t('meals.tuitionType')}</th>
              <th className="pb-2 font-medium">{t('common.active')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {children.map(function (child) { return (<tr key={child.id} className="hover:bg-gray-50">
                <td className="py-2 pr-4 font-medium text-gray-900">{child.fullName}</td>
                <td className="py-2 pr-4 text-gray-500">{child.tuitionType}</td>
                <td className="py-2">
                  <button onClick={function () { return toggleActive.mutate({ id: child.id, isActive: !child.isActive }); }} className={"relative inline-flex h-5 w-9 rounded-full transition-colors ".concat(child.isActive ? 'bg-green-500' : 'bg-gray-300')}>
                    <span className={"absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ".concat(child.isActive ? 'translate-x-4' : '')}/>
                  </button>
                </td>
              </tr>); })}
            {children.length === 0 && (<tr><td colSpan={3} className="py-8 text-center text-sm text-gray-400">Nenhuma criança registada</td></tr>)}
          </tbody>
        </table>)}
      {showAdd && <AddChildModal open onClose={function () { return setShowAdd(false); }} schoolYearId={schoolYearId}/>}
      {showImport && <StudentImportModal_1.StudentImportModal open onClose={function () { return setShowImport(false); }} schoolYearId={schoolYearId}/>}
    </div>);
}
// ─── Page ─────────────────────────────────────────────────────────────────────
function MealsPage() {
    var _a;
    var t = (0, react_i18next_1.useTranslation)().t;
    var user = auth_1.auth.getUser();
    var isAdmin = (user === null || user === void 0 ? void 0 : user.role) === 'admin';
    var _b = (0, useSchoolYear_1.useSchoolYears)().data, years = _b === void 0 ? [] : _b;
    var currentYearName = (0, useSchoolYear_1.currentSchoolYearName)();
    var currentYear = (_a = years.find(function (y) { return y.name === currentYearName; })) !== null && _a !== void 0 ? _a : years[0];
    var _c = (0, react_1.useState)(''), selectedYearId = _c[0], setSelectedYearId = _c[1];
    var _d = (0, react_1.useState)('daily'), tab = _d[0], setTab = _d[1];
    var yearId = selectedYearId || (currentYear === null || currentYear === void 0 ? void 0 : currentYear.id) || '';
    var tabs = __spreadArray([
        { id: 'daily', label: t('meals.tabDaily') },
        { id: 'billing', label: t('meals.tabBilling') }
    ], (isAdmin ? [
        { id: 'pricing', label: t('meals.tabPricing') },
        { id: 'children', label: t('meals.tabChildren') },
    ] : []), true);
    return (<div className="h-full flex flex-col">
      <PageHeader_1.PageHeader title={t('nav.meals')} actions={<select value={yearId} onChange={function (e) { return setSelectedYearId(e.target.value); }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
            {years.map(function (y) { return <option key={y.id} value={y.id}>{y.name}</option>; })}
          </select>}/>

      {/* Tab bar */}
      <div className="px-8 border-b border-gray-200 flex gap-1">
        {tabs.map(function (tb) { return (<button key={tb.id} onClick={function () { return setTab(tb.id); }} className={"px-4 py-2 text-sm font-medium border-b-2 transition-colors ".concat(tab === tb.id
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {tb.label}
          </button>); })}
      </div>

      <div className="flex-1 overflow-auto px-8 py-6">
        {tab === 'daily' && yearId && <DailyTab schoolYearId={yearId}/>}
        {tab === 'billing' && yearId && <BillingTab schoolYearId={yearId}/>}
        {tab === 'pricing' && isAdmin && yearId && <PricingTab schoolYearId={yearId}/>}
        {tab === 'children' && isAdmin && yearId && <ChildrenTab schoolYearId={yearId}/>}
      </div>
    </div>);
}
