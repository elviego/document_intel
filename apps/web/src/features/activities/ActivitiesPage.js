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
exports.default = ActivitiesPage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var api_client_1 = require("@/lib/api-client");
var auth_1 = require("@/lib/auth");
var useSchoolYear_1 = require("@/hooks/useSchoolYear");
var PageHeader_1 = require("@/components/ui/PageHeader");
var Button_1 = require("@/components/ui/Button");
var Modal_1 = require("@/components/ui/Modal");
var Input_1 = require("@/components/ui/Input");
function useActivities(schoolYearId) {
    return (0, react_query_1.useQuery)({
        queryKey: ['activities', schoolYearId],
        queryFn: function () { return api_client_1.apiClient.get("/v1/activities/".concat(schoolYearId)); },
        enabled: !!schoolYearId,
    });
}
function useStudents(schoolYearId) {
    return (0, react_query_1.useQuery)({
        queryKey: ['children', schoolYearId],
        queryFn: function () { return api_client_1.apiClient.get("/v1/meals/children/".concat(schoolYearId)); },
        enabled: !!schoolYearId,
    });
}
// ─── Activity form modal ──────────────────────────────────────────────────────
function ActivityModal(_a) {
    var _b, _c, _d, _e, _f, _g;
    var open = _a.open, onClose = _a.onClose, schoolYearId = _a.schoolYearId, initial = _a.initial;
    var qc = (0, react_query_1.useQueryClient)();
    var _h = (0, react_1.useState)({
        name: (_b = initial === null || initial === void 0 ? void 0 : initial.name) !== null && _b !== void 0 ? _b : '',
        description: (_c = initial === null || initial === void 0 ? void 0 : initial.description) !== null && _c !== void 0 ? _c : '',
        schedule: (_d = initial === null || initial === void 0 ? void 0 : initial.schedule) !== null && _d !== void 0 ? _d : '',
        capacity: (_e = initial === null || initial === void 0 ? void 0 : initial.capacity) !== null && _e !== void 0 ? _e : undefined,
    }), form = _h[0], setForm = _h[1];
    var mutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return initial
            ? api_client_1.apiClient.put("/v1/activities/".concat(initial.id), form)
            : api_client_1.apiClient.post('/v1/activities', __assign(__assign({}, form), { schoolYearId: schoolYearId })); },
        onSuccess: function () { qc.invalidateQueries({ queryKey: ['activities'] }); onClose(); },
    });
    var set = function (k) {
        return function (e) {
            return setForm(function (f) {
                var _a;
                return (__assign(__assign({}, f), (_a = {}, _a[k] = e.target.value, _a)));
            });
        };
    };
    return (<Modal_1.Modal open={open} onClose={onClose} title={initial ? 'Edit Activity' : 'New Activity'}>
      <div className="space-y-3">
        <Input_1.Input label="Activity name *" value={form.name} onChange={set('name')}/>
        <Input_1.Input label="Description" value={(_f = form.description) !== null && _f !== void 0 ? _f : ''} onChange={set('description')}/>
        <Input_1.Input label="Schedule" value={(_g = form.schedule) !== null && _g !== void 0 ? _g : ''} onChange={set('schedule')} placeholder="ex: Monday 15:00–16:00"/>
        <Input_1.Input label="Capacity" type="number" value={form.capacity != null ? String(form.capacity) : ''} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { capacity: e.target.value ? parseInt(e.target.value) : undefined })); }); }}/>
        {mutation.isError && <p className="text-sm text-red-600">{(0, api_client_1.errorMessage)(mutation.error)}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button_1.Button variant="secondary" onClick={onClose}>Cancel</Button_1.Button>
        <Button_1.Button onClick={function () { return mutation.mutate(); }} disabled={mutation.isPending || !form.name}>
          {mutation.isPending ? 'Saving…' : 'Save'}
        </Button_1.Button>
      </div>
    </Modal_1.Modal>);
}
// ─── Enrol student modal ──────────────────────────────────────────────────────
function EnrolModal(_a) {
    var open = _a.open, onClose = _a.onClose, activity = _a.activity, schoolYearId = _a.schoolYearId;
    var qc = (0, react_query_1.useQueryClient)();
    var _b = useStudents(schoolYearId).data, allStudents = _b === void 0 ? [] : _b;
    var enrolled = new Set(activity.students.map(function (s) { return s.id; }));
    var available = allStudents.filter(function (s) { return s.isActive && !enrolled.has(s.id); });
    var enrol = (0, react_query_1.useMutation)({
        mutationFn: function (studentId) {
            return api_client_1.apiClient.post("/v1/activities/".concat(activity.id, "/students"), { studentId: studentId });
        },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['activities'] }); },
    });
    var unenrol = (0, react_query_1.useMutation)({
        mutationFn: function (studentId) {
            return api_client_1.apiClient.delete("/v1/activities/".concat(activity.id, "/students/").concat(studentId));
        },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['activities'] }); },
    });
    return (<Modal_1.Modal open={open} onClose={onClose} title={"Students \u2014 ".concat(activity.name)}>
      <div className="space-y-4">
        {/* Enrolled */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Enrolled ({activity.students.length}{activity.capacity ? " / ".concat(activity.capacity) : ''})
          </p>
          {activity.students.length === 0 ? (<p className="text-sm text-gray-400">No students enrolled yet.</p>) : (<ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
              {activity.students.map(function (s) { return (<li key={s.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-medium text-gray-800">{s.fullName}</span>
                  <button onClick={function () { return unenrol.mutate(s.id); }} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                </li>); })}
            </ul>)}
        </div>

        {/* Available to enrol */}
        {available.length > 0 && (<div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Add student</p>
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg max-h-48 overflow-auto">
              {available.map(function (s) { return (<li key={s.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-gray-700">{s.fullName}</span>
                  <button onClick={function () { return enrol.mutate(s.id); }} className="text-xs text-brand-600 hover:text-brand-800 font-medium">+ Enrol</button>
                </li>); })}
            </ul>
          </div>)}
      </div>
      <div className="flex justify-end pt-2">
        <Button_1.Button onClick={onClose}>Done</Button_1.Button>
      </div>
    </Modal_1.Modal>);
}
// ─── Page ─────────────────────────────────────────────────────────────────────
function ActivitiesPage() {
    var _a, _b;
    var isAdmin = ((_a = auth_1.auth.getUser()) === null || _a === void 0 ? void 0 : _a.role) === 'admin';
    var qc = (0, react_query_1.useQueryClient)();
    var _c = (0, useSchoolYear_1.useSchoolYears)().data, years = _c === void 0 ? [] : _c;
    var currentYearName = (0, useSchoolYear_1.currentSchoolYearName)();
    var currentYear = (_b = years.find(function (y) { return y.name === currentYearName; })) !== null && _b !== void 0 ? _b : years[0];
    var _d = (0, react_1.useState)(''), selectedYearId = _d[0], setSelectedYearId = _d[1];
    var schoolYearId = selectedYearId || (currentYear === null || currentYear === void 0 ? void 0 : currentYear.id) || '';
    var _e = useActivities(schoolYearId), _f = _e.data, activities = _f === void 0 ? [] : _f, isLoading = _e.isLoading;
    var _g = (0, react_1.useState)(false), showModal = _g[0], setShowModal = _g[1];
    var _h = (0, react_1.useState)(null), editing = _h[0], setEditing = _h[1];
    var _j = (0, react_1.useState)(null), enrolTarget = _j[0], setEnrolTarget = _j[1];
    var deleteMutation = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_client_1.apiClient.delete("/v1/activities/".concat(id)); },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['activities'] }); },
    });
    function openEdit(a) { setEditing(a); setShowModal(true); }
    function openNew() { setEditing(null); setShowModal(true); }
    return (<div className="h-full flex flex-col">
      <PageHeader_1.PageHeader title="Extra-curricular Activities" subtitle={"".concat(activities.length, " activities")} actions={<div className="flex items-center gap-2">
            <select value={schoolYearId} onChange={function (e) { return setSelectedYearId(e.target.value); }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none">
              {years.map(function (y) { return <option key={y.id} value={y.id}>{y.name}</option>; })}
            </select>
            {isAdmin && <Button_1.Button size="sm" onClick={openNew}>+ New Activity</Button_1.Button>}
          </div>}/>

      <div className="flex-1 overflow-auto px-8 pb-8">
        {isLoading ? (<p className="text-sm text-gray-400 py-4">Loading…</p>) : activities.length === 0 ? (<p className="text-sm text-gray-400 text-center py-12">No activities yet.</p>) : (<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2">
            {activities.map(function (activity) { return (<div key={activity.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{activity.name}</h3>
                    {activity.description && <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>}
                  </div>
                  {!activity.isActive && (<span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">Inactive</span>)}
                </div>

                {activity.schedule && (<p className="text-xs text-gray-500">🕐 {activity.schedule}</p>)}

                <div className="flex items-center justify-between">
                  <button onClick={function () { return setEnrolTarget(activity); }} className="text-sm font-medium text-brand-600 hover:text-brand-800">
                    {activity.students.length} student{activity.students.length !== 1 ? 's' : ''}
                    {activity.capacity ? " / ".concat(activity.capacity) : ''}
                  </button>

                  {isAdmin && (<div className="flex gap-2">
                      <button onClick={function () { return openEdit(activity); }} className="text-xs text-gray-400 hover:text-gray-600">Edit</button>
                      <button onClick={function () { if (confirm("Delete \"".concat(activity.name, "\"?")))
                    deleteMutation.mutate(activity.id); }} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                    </div>)}
                </div>

                {/* Student chips */}
                {activity.students.length > 0 && (<div className="flex flex-wrap gap-1">
                    {activity.students.slice(0, 5).map(function (s) { return (<span key={s.id} className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                        {s.fullName.split(' ')[0]}
                      </span>); })}
                    {activity.students.length > 5 && (<span className="text-xs text-gray-400">+{activity.students.length - 5} more</span>)}
                  </div>)}
              </div>); })}
          </div>)}
      </div>

      {showModal && (<ActivityModal open onClose={function () { return setShowModal(false); }} schoolYearId={schoolYearId} initial={editing}/>)}
      {enrolTarget && (<EnrolModal open onClose={function () { return setEnrolTarget(null); }} activity={enrolTarget} schoolYearId={schoolYearId}/>)}
    </div>);
}
