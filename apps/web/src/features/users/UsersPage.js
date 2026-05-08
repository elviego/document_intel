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
exports.default = UsersPage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var react_i18next_1 = require("react-i18next");
var api_client_1 = require("@/lib/api-client");
var PageHeader_1 = require("@/components/ui/PageHeader");
var Button_1 = require("@/components/ui/Button");
var Modal_1 = require("@/components/ui/Modal");
var Input_1 = require("@/components/ui/Input");
var Select_1 = require("@/components/ui/Select");
var Badge_1 = require("@/components/ui/Badge");
function useUsers() {
    return (0, react_query_1.useQuery)({
        queryKey: ['users'],
        queryFn: function () { return api_client_1.apiClient.get('/v1/users'); },
    });
}
var ROLE_OPTIONS = [
    { value: 'admin', label: 'Admin' },
    { value: 'staff', label: 'Staff' },
    { value: 'accountant', label: 'Contabilista' },
];
var ROLE_VARIANT = {
    admin: 'red',
    staff: 'blue',
    accountant: 'gray',
};
// ─── Invite Modal ─────────────────────────────────────────────────────────────
function InviteModal(_a) {
    var open = _a.open, onClose = _a.onClose;
    var t = (0, react_i18next_1.useTranslation)().t;
    var qc = (0, react_query_1.useQueryClient)();
    var _b = (0, react_1.useState)({ email: '', fullName: '', role: 'staff' }), form = _b[0], setForm = _b[1];
    var mutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_client_1.apiClient.post('/v1/auth/invite', form); },
        onSuccess: function () { qc.invalidateQueries({ queryKey: ['users'] }); onClose(); },
    });
    var set = function (k) { return function (e) {
        return setForm(function (f) {
            var _a;
            return (__assign(__assign({}, f), (_a = {}, _a[k] = e.target.value, _a)));
        });
    }; };
    return (<Modal_1.Modal open={open} onClose={onClose} title={t('users.invite')}>
      <div className="space-y-3">
        <Input_1.Input label={t('users.fullName')} value={form.fullName} onChange={set('fullName')}/>
        <Input_1.Input label={t('users.email')} type="email" value={form.email} onChange={set('email')}/>
        <Select_1.Select label={t('users.role')} value={form.role} onChange={set('role')} options={ROLE_OPTIONS}/>
        {mutation.isError && <p className="text-sm text-red-600">{(0, api_client_1.errorMessage)(mutation.error)}</p>}
        {mutation.isSuccess && (<p className="text-sm text-green-600">✓ {t('users.inviteSent')}</p>)}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button_1.Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button_1.Button>
        <Button_1.Button onClick={function () { return mutation.mutate(); }} disabled={mutation.isPending || !form.email || !form.fullName}>
          {mutation.isPending ? t('common.loading') : t('users.sendInvite')}
        </Button_1.Button>
      </div>
    </Modal_1.Modal>);
}
// ─── Edit Role Modal ──────────────────────────────────────────────────────────
function EditUserModal(_a) {
    var open = _a.open, onClose = _a.onClose, user = _a.user;
    var t = (0, react_i18next_1.useTranslation)().t;
    var qc = (0, react_query_1.useQueryClient)();
    var _b = (0, react_1.useState)(user.role), role = _b[0], setRole = _b[1];
    var mutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_client_1.apiClient.patch("/v1/users/".concat(user.id), { role: role }); },
        onSuccess: function () { qc.invalidateQueries({ queryKey: ['users'] }); onClose(); },
    });
    return (<Modal_1.Modal open={open} onClose={onClose} title={user.fullName}>
      <div className="space-y-3">
        <p className="text-sm text-gray-500">{user.email}</p>
        <Select_1.Select label={t('users.role')} value={role} onChange={function (e) { return setRole(e.target.value); }} options={ROLE_OPTIONS}/>
        {mutation.isError && <p className="text-sm text-red-600">{(0, api_client_1.errorMessage)(mutation.error)}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button_1.Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button_1.Button>
        <Button_1.Button onClick={function () { return mutation.mutate(); }} disabled={mutation.isPending}>
          {mutation.isPending ? t('common.loading') : t('common.save')}
        </Button_1.Button>
      </div>
    </Modal_1.Modal>);
}
// ─── Page ─────────────────────────────────────────────────────────────────────
function UsersPage() {
    var t = (0, react_i18next_1.useTranslation)().t;
    var _a = useUsers(), _b = _a.data, users = _b === void 0 ? [] : _b, isLoading = _a.isLoading;
    var qc = (0, react_query_1.useQueryClient)();
    var _c = (0, react_1.useState)(false), showInvite = _c[0], setShowInvite = _c[1];
    var _d = (0, react_1.useState)(null), editing = _d[0], setEditing = _d[1];
    var toggleActive = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, isActive = _a.isActive;
            return api_client_1.apiClient.patch("/v1/users/".concat(id), { isActive: isActive });
        },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['users'] }); },
    });
    if (isLoading)
        return <div className="p-8 text-gray-400 text-sm">{t('common.loading')}</div>;
    return (<div className="h-full flex flex-col">
      <PageHeader_1.PageHeader title={t('nav.users')} subtitle={"".concat(users.filter(function (u) { return u.isActive; }).length, " ativos")} actions={<Button_1.Button size="sm" onClick={function () { return setShowInvite(true); }}>
            + {t('users.invite')}
          </Button_1.Button>}/>

      <div className="flex-1 overflow-auto px-8 pb-8">
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm">
          {users.map(function (user) { return (<div key={user.id} className={"flex items-center gap-4 px-4 py-4 ".concat(!user.isActive ? 'opacity-50' : '')}>
              <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
                {user.fullName.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{user.fullName}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
              <Badge_1.Badge variant={ROLE_VARIANT[user.role]}>{user.role}</Badge_1.Badge>
              <button onClick={function () { return toggleActive.mutate({ id: user.id, isActive: !user.isActive }); }} className={"relative inline-flex h-5 w-9 rounded-full transition-colors ".concat(user.isActive ? 'bg-green-500' : 'bg-gray-300')}>
                <span className={"absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ".concat(user.isActive ? 'translate-x-4' : '')}/>
              </button>
              <button onClick={function () { return setEditing(user); }} className="text-xs text-gray-400 hover:text-gray-700">✎</button>
            </div>); })}
          {users.length === 0 && (<p className="px-4 py-8 text-sm text-gray-400 text-center">{t('users.empty')}</p>)}
        </div>
      </div>

      {showInvite && <InviteModal open onClose={function () { return setShowInvite(false); }}/>}
      {editing && <EditUserModal open onClose={function () { return setEditing(null); }} user={editing}/>}
    </div>);
}
