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
exports.default = CategoriesPage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var react_i18next_1 = require("react-i18next");
var api_client_1 = require("@/lib/api-client");
var useCategories_1 = require("@/hooks/useCategories");
var PageHeader_1 = require("@/components/ui/PageHeader");
var Button_1 = require("@/components/ui/Button");
var Modal_1 = require("@/components/ui/Modal");
var Input_1 = require("@/components/ui/Input");
var Select_1 = require("@/components/ui/Select");
var Badge_1 = require("@/components/ui/Badge");
// ─── Add / Edit Category Modal ────────────────────────────────────────────────
function CategoryModal(_a) {
    var _b, _c, _d, _e, _f, _g, _h;
    var open = _a.open, onClose = _a.onClose, initial = _a.initial;
    var t = (0, react_i18next_1.useTranslation)().t;
    var qc = (0, react_query_1.useQueryClient)();
    var _j = (0, react_1.useState)({
        namePt: (_b = initial === null || initial === void 0 ? void 0 : initial.namePt) !== null && _b !== void 0 ? _b : '',
        nameEn: (_c = initial === null || initial === void 0 ? void 0 : initial.nameEn) !== null && _c !== void 0 ? _c : '',
        groupPt: (_d = initial === null || initial === void 0 ? void 0 : initial.groupPt) !== null && _d !== void 0 ? _d : '',
        groupEn: (_e = initial === null || initial === void 0 ? void 0 : initial.groupEn) !== null && _e !== void 0 ? _e : '',
        classification: (_f = initial === null || initial === void 0 ? void 0 : initial.classification) !== null && _f !== void 0 ? _f : 'despesa',
        descriptionPt: (_g = initial === null || initial === void 0 ? void 0 : initial.descriptionPt) !== null && _g !== void 0 ? _g : '',
        descriptionEn: (_h = initial === null || initial === void 0 ? void 0 : initial.descriptionEn) !== null && _h !== void 0 ? _h : '',
    }), form = _j[0], setForm = _j[1];
    var mutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return initial
            ? api_client_1.apiClient.patch("/v1/categories/".concat(initial.id), form)
            : api_client_1.apiClient.post('/v1/categories', form); },
        onSuccess: function () {
            qc.invalidateQueries({ queryKey: ['categories'] });
            onClose();
        },
    });
    var set = function (k) { return function (e) {
        return setForm(function (f) {
            var _a;
            return (__assign(__assign({}, f), (_a = {}, _a[k] = e.target.value, _a)));
        });
    }; };
    return (<Modal_1.Modal open={open} onClose={onClose} title={initial ? t('categories.edit') : t('categories.add')}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input_1.Input label={t('categories.namePt')} value={form.namePt} onChange={set('namePt')}/>
          <Input_1.Input label={t('categories.nameEn')} value={form.nameEn} onChange={set('nameEn')}/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input_1.Input label={t('categories.groupPt')} value={form.groupPt} onChange={set('groupPt')}/>
          <Input_1.Input label={t('categories.groupEn')} value={form.groupEn} onChange={set('groupEn')}/>
        </div>
        <Select_1.Select label={t('categories.classification')} value={form.classification} onChange={set('classification')} options={[
            { value: 'despesa', label: 'Despesa' },
            { value: 'receita', label: 'Receita' },
        ]}/>
        <Input_1.Input label={t('categories.descriptionPt')} value={form.descriptionPt} onChange={set('descriptionPt')}/>
        <Input_1.Input label={t('categories.descriptionEn')} value={form.descriptionEn} onChange={set('descriptionEn')}/>
        {mutation.isError && <p className="text-sm text-red-600">{(0, api_client_1.errorMessage)(mutation.error)}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button_1.Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button_1.Button>
        <Button_1.Button onClick={function () { return mutation.mutate(); }} disabled={mutation.isPending || !form.namePt}>
          {mutation.isPending ? t('common.loading') : t('common.save')}
        </Button_1.Button>
      </div>
    </Modal_1.Modal>);
}
// ─── Page ─────────────────────────────────────────────────────────────────────
function CategoriesPage() {
    var t = (0, react_i18next_1.useTranslation)().t;
    var _a = (0, useCategories_1.useCategories)(true), _b = _a.data, categories = _b === void 0 ? [] : _b, isLoading = _a.isLoading;
    var qc = (0, react_query_1.useQueryClient)();
    var _c = (0, react_1.useState)(false), showAdd = _c[0], setShowAdd = _c[1];
    var _d = (0, react_1.useState)(null), editing = _d[0], setEditing = _d[1];
    var _e = (0, react_1.useState)(''), filter = _e[0], setFilter = _e[1];
    var fileRef = (0, react_1.useRef)(null);
    var toggleActive = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, isActive = _a.isActive;
            return api_client_1.apiClient.patch("/v1/categories/".concat(id), { isActive: isActive });
        },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['categories'] }); },
    });
    var importMutation = (0, react_query_1.useMutation)({
        mutationFn: function (csv) { return api_client_1.apiClient.post('/v1/categories/import', { csv: csv }); },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['categories'] }); },
    });
    function handleImport(e) {
        var _a;
        var file = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (!file)
            return;
        var reader = new FileReader();
        reader.onload = function (ev) {
            var _a;
            var csv = (_a = ev.target) === null || _a === void 0 ? void 0 : _a.result;
            importMutation.mutate(csv);
        };
        reader.readAsText(file);
        e.target.value = '';
    }
    var filtered = categories.filter(function (c) {
        return !filter || c.namePt.toLowerCase().includes(filter.toLowerCase()) ||
            c.nameEn.toLowerCase().includes(filter.toLowerCase());
    });
    var grouped = {};
    filtered.forEach(function (c) {
        var _a;
        var grp = c.classification === 'receita' ? "Receita \u2014 ".concat(c.groupPt) : "Despesa \u2014 ".concat(c.groupPt);
        ((_a = grouped[grp]) !== null && _a !== void 0 ? _a : (grouped[grp] = [])).push(c);
    });
    if (isLoading)
        return <div className="p-8 text-gray-400 text-sm">{t('common.loading')}</div>;
    return (<div className="h-full flex flex-col">
      <PageHeader_1.PageHeader title={t('nav.categories')} subtitle={"".concat(categories.filter(function (c) { return c.isActive; }).length, " ativas")} actions={<div className="flex items-center gap-2">
            <input value={filter} onChange={function (e) { return setFilter(e.target.value); }} placeholder={t('common.search')} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"/>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden"/>
            <Button_1.Button variant="secondary" size="sm" onClick={function () { var _a; return (_a = fileRef.current) === null || _a === void 0 ? void 0 : _a.click(); }}>
              ↑ {t('common.import')} CSV
            </Button_1.Button>
            <Button_1.Button size="sm" onClick={function () { return setShowAdd(true); }}>+ {t('categories.add')}</Button_1.Button>
          </div>}/>

      <div className="flex-1 overflow-auto px-8 pb-8 space-y-6">
        {Object.entries(grouped).sort().map(function (_a) {
            var group = _a[0], cats = _a[1];
            return (<div key={group}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{group}</h3>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm">
              {cats.map(function (cat) { return (<div key={cat.id} className={"flex items-center gap-4 px-4 py-3 ".concat(!cat.isActive ? 'opacity-50' : '')}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{cat.namePt}</p>
                    <p className="text-xs text-gray-400">{cat.nameEn}</p>
                  </div>
                  <Badge_1.Badge variant={cat.classification === 'receita' ? 'green' : 'red'}>
                    {cat.classification}
                  </Badge_1.Badge>
                  <button onClick={function () { return toggleActive.mutate({ id: cat.id, isActive: !cat.isActive }); }} className={"relative inline-flex h-5 w-9 rounded-full transition-colors ".concat(cat.isActive ? 'bg-green-500' : 'bg-gray-300')}>
                    <span className={"absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ".concat(cat.isActive ? 'translate-x-4' : '')}/>
                  </button>
                  <button onClick={function () { return setEditing(cat); }} className="text-xs text-gray-400 hover:text-gray-700">
                    ✎
                  </button>
                </div>); })}
            </div>
          </div>);
        })}
      </div>

      {showAdd && <CategoryModal open onClose={function () { return setShowAdd(false); }}/>}
      {editing && <CategoryModal open onClose={function () { return setEditing(null); }} initial={editing}/>}
    </div>);
}
