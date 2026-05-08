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
exports.default = SchoolYearsPage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var react_i18next_1 = require("react-i18next");
var api_client_1 = require("@/lib/api-client");
var PageHeader_1 = require("@/components/ui/PageHeader");
var Button_1 = require("@/components/ui/Button");
var Modal_1 = require("@/components/ui/Modal");
var Input_1 = require("@/components/ui/Input");
function useSchoolYearsAdmin() {
    return (0, react_query_1.useQuery)({
        queryKey: ['school-years'],
        queryFn: function () { return api_client_1.apiClient.get('/v1/school-years'); },
    });
}
function AddSchoolYearModal(_a) {
    var open = _a.open, onClose = _a.onClose;
    var t = (0, react_i18next_1.useTranslation)().t;
    var qc = (0, react_query_1.useQueryClient)();
    var _b = (0, react_1.useState)({ name: '', startDate: '', endDate: '' }), form = _b[0], setForm = _b[1];
    var mutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_client_1.apiClient.post('/v1/school-years', form); },
        onSuccess: function () { qc.invalidateQueries({ queryKey: ['school-years'] }); onClose(); },
    });
    var set = function (k) { return function (e) {
        return setForm(function (f) {
            var _a;
            return (__assign(__assign({}, f), (_a = {}, _a[k] = e.target.value, _a)));
        });
    }; };
    return (<Modal_1.Modal open={open} onClose={onClose} title={t('schoolYears.add')}>
      <div className="space-y-3">
        <Input_1.Input label={t('schoolYears.name')} value={form.name} onChange={set('name')} placeholder="ex: 2025-2026"/>
        <Input_1.Input label={t('schoolYears.startDate')} type="date" value={form.startDate} onChange={set('startDate')}/>
        <Input_1.Input label={t('schoolYears.endDate')} type="date" value={form.endDate} onChange={set('endDate')}/>
        {mutation.isError && <p className="text-sm text-red-600">{(0, api_client_1.errorMessage)(mutation.error)}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button_1.Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button_1.Button>
        <Button_1.Button onClick={function () { return mutation.mutate(); }} disabled={mutation.isPending || !form.name || !form.startDate || !form.endDate}>
          {mutation.isPending ? t('common.loading') : t('common.save')}
        </Button_1.Button>
      </div>
    </Modal_1.Modal>);
}
function SchoolYearsPage() {
    var t = (0, react_i18next_1.useTranslation)().t;
    var _a = useSchoolYearsAdmin(), _b = _a.data, years = _b === void 0 ? [] : _b, isLoading = _a.isLoading;
    var _c = (0, react_1.useState)(false), showAdd = _c[0], setShowAdd = _c[1];
    if (isLoading)
        return <div className="p-8 text-gray-400 text-sm">{t('common.loading')}</div>;
    return (<div className="h-full flex flex-col">
      <PageHeader_1.PageHeader title={t('nav.schoolYears')} subtitle={"".concat(years.length, " anos")} actions={<Button_1.Button size="sm" onClick={function () { return setShowAdd(true); }}>+ {t('schoolYears.add')}</Button_1.Button>}/>

      <div className="flex-1 overflow-auto px-8 pb-8">
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm max-w-lg">
          {years.map(function (y) { return (<div key={y.id} className="flex items-center gap-4 px-4 py-4">
              <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-700 font-bold text-xs">
                {y.name.slice(-2)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{y.name}</p>
                <p className="text-xs text-gray-400">{y.startDate.slice(0, 10)} → {y.endDate.slice(0, 10)}</p>
              </div>
            </div>); })}
          {years.length === 0 && (<p className="px-4 py-8 text-sm text-gray-400 text-center">{t('schoolYears.empty')}</p>)}
        </div>
      </div>

      {showAdd && <AddSchoolYearModal open onClose={function () { return setShowAdd(false); }}/>}
    </div>);
}
