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
exports.default = StudentsPage;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var api_client_1 = require("@/lib/api-client");
var auth_1 = require("@/lib/auth");
var useSchoolYear_1 = require("@/hooks/useSchoolYear");
var PageHeader_1 = require("@/components/ui/PageHeader");
var Button_1 = require("@/components/ui/Button");
var Modal_1 = require("@/components/ui/Modal");
var Input_1 = require("@/components/ui/Input");
function useStudents(schoolYearId) {
    return (0, react_query_1.useQuery)({
        queryKey: ['students', schoolYearId],
        queryFn: function () { return api_client_1.apiClient.get("/v1/students/".concat(schoolYearId, "?includeInactive=true")); },
        enabled: !!schoolYearId,
    });
}
function usePlans() {
    return (0, react_query_1.useQuery)({
        queryKey: ['enrollment-plans'],
        queryFn: function () { return api_client_1.apiClient.get('/v1/enrollment-plans'); },
    });
}
var BLOOD_TYPES = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'];
// ─── Student form modal ───────────────────────────────────────────────────────
function StudentModal(_a) {
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25;
    var open = _a.open, onClose = _a.onClose, schoolYearId = _a.schoolYearId, initial = _a.initial;
    var qc = (0, react_query_1.useQueryClient)();
    var _26 = usePlans().data, plans = _26 === void 0 ? [] : _26;
    var _27 = (0, react_1.useState)('basic'), tab = _27[0], setTab = _27[1];
    var blank = {
        fullName: '',
        schoolYearId: schoolYearId,
        tuitionType: '', firstName: '', lastName: '',
        birthDate: '', nationality: 'Portuguesa', nif: '', address: '',
        bloodType: '', allergies: '', medicalNotes: '', photoConsent: false,
        enrollmentDate: '', planId: '',
        parent1FirstName: '', parent1LastName: '', parent1Phone: '', parent1Email: '', parent1Relation: 'Mãe/Pai',
        parent2FirstName: '', parent2LastName: '', parent2Phone: '', parent2Email: '', parent2Relation: '',
        emergencyContact: '', emergencyPhone: '', notes: '',
    };
    var _28 = (0, react_1.useState)(initial ? {
        fullName: initial.fullName,
        schoolYearId: initial.schoolYearId,
        tuitionType: initial.tuitionType,
        firstName: (_b = initial.firstName) !== null && _b !== void 0 ? _b : '',
        lastName: (_c = initial.lastName) !== null && _c !== void 0 ? _c : '',
        birthDate: (_d = initial.birthDate) !== null && _d !== void 0 ? _d : '',
        nationality: (_e = initial.nationality) !== null && _e !== void 0 ? _e : 'Portuguesa',
        nif: (_f = initial.nif) !== null && _f !== void 0 ? _f : '',
        address: (_g = initial.address) !== null && _g !== void 0 ? _g : '',
        bloodType: (_h = initial.bloodType) !== null && _h !== void 0 ? _h : '',
        allergies: (_j = initial.allergies) !== null && _j !== void 0 ? _j : '',
        medicalNotes: (_k = initial.medicalNotes) !== null && _k !== void 0 ? _k : '',
        photoConsent: initial.photoConsent,
        enrollmentDate: (_l = initial.enrollmentDate) !== null && _l !== void 0 ? _l : '',
        planId: (_o = (_m = initial.plan) === null || _m === void 0 ? void 0 : _m.id) !== null && _o !== void 0 ? _o : '',
        parent1FirstName: (_p = initial.parent1FirstName) !== null && _p !== void 0 ? _p : '',
        parent1LastName: (_q = initial.parent1LastName) !== null && _q !== void 0 ? _q : '',
        parent1Phone: (_r = initial.parent1Phone) !== null && _r !== void 0 ? _r : '',
        parent1Email: (_s = initial.parent1Email) !== null && _s !== void 0 ? _s : '',
        parent1Relation: (_t = initial.parent1Relation) !== null && _t !== void 0 ? _t : 'Mãe/Pai',
        parent2FirstName: (_u = initial.parent2FirstName) !== null && _u !== void 0 ? _u : '',
        parent2LastName: (_v = initial.parent2LastName) !== null && _v !== void 0 ? _v : '',
        parent2Phone: (_w = initial.parent2Phone) !== null && _w !== void 0 ? _w : '',
        parent2Email: (_x = initial.parent2Email) !== null && _x !== void 0 ? _x : '',
        parent2Relation: (_y = initial.parent2Relation) !== null && _y !== void 0 ? _y : '',
        emergencyContact: (_z = initial.emergencyContact) !== null && _z !== void 0 ? _z : '',
        emergencyPhone: (_0 = initial.emergencyPhone) !== null && _0 !== void 0 ? _0 : '',
        notes: (_1 = initial.notes) !== null && _1 !== void 0 ? _1 : '',
    } : blank), form = _28[0], setForm = _28[1];
    var set = function (k) { return function (e) {
        return setForm(function (f) {
            var _a;
            return (__assign(__assign({}, f), (_a = {}, _a[k] = e.target.value, _a)));
        });
    }; };
    // Auto-fill fullName from first+last name
    var handleName = function (k) { return function (e) {
        var val = e.target.value;
        setForm(function (f) {
            var _a;
            var updated = __assign(__assign({}, f), (_a = {}, _a[k] = val, _a));
            var first = k === 'firstName' ? val : f.firstName;
            var last = k === 'lastName' ? val : f.lastName;
            if (first || last)
                updated.fullName = "".concat(first !== null && first !== void 0 ? first : '', " ").concat(last !== null && last !== void 0 ? last : '').trim();
            return updated;
        });
    }; };
    var mutation = (0, react_query_1.useMutation)({
        mutationFn: function () {
            var payload = __assign(__assign({}, form), { planId: form.planId || undefined, birthDate: form.birthDate || undefined, enrollmentDate: form.enrollmentDate || undefined });
            return initial
                ? api_client_1.apiClient.put("/v1/students/".concat(initial.id), payload)
                : api_client_1.apiClient.post('/v1/students', payload);
        },
        onSuccess: function () { qc.invalidateQueries({ queryKey: ['students'] }); onClose(); },
    });
    var tabs = [
        { key: 'basic', label: 'Geral' },
        { key: 'personal', label: 'Dados Pessoais' },
        { key: 'parents', label: 'Encarregados' },
    ];
    return (<Modal_1.Modal open={open} onClose={onClose} title={initial ? "Editar \u2014 ".concat(initial.fullName) : 'Nova Criança'}>
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-4 -mx-6 px-6">
        {tabs.map(function (t) { return (<button key={t.key} onClick={function () { return setTab(t.key); }} className={"px-4 py-2 text-sm font-medium border-b-2 transition-colors ".concat(tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700')}>{t.label}</button>); })}
      </div>

      <div className="space-y-3 min-h-[280px]">
        {tab === 'basic' && (<>
            <div className="grid grid-cols-2 gap-3">
              <Input_1.Input label="Primeiro nome" value={(_2 = form.firstName) !== null && _2 !== void 0 ? _2 : ''} onChange={handleName('firstName')}/>
              <Input_1.Input label="Apelido" value={(_3 = form.lastName) !== null && _3 !== void 0 ? _3 : ''} onChange={handleName('lastName')}/>
            </div>
            <Input_1.Input label="Nome completo *" value={form.fullName} onChange={set('fullName')}/>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plano de matrícula</label>
                <select value={(_4 = form.planId) !== null && _4 !== void 0 ? _4 : ''} onChange={set('planId')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">— Sem plano —</option>
                  {plans.map(function (p) { return <option key={p.id} value={p.id}>{p.name}</option>; })}
                </select>
              </div>
              <Input_1.Input label="Tipo de propina" value={form.tuitionType} onChange={set('tuitionType')} placeholder="ex: completa"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input_1.Input label="Data de matrícula" type="date" value={(_5 = form.enrollmentDate) !== null && _5 !== void 0 ? _5 : ''} onChange={set('enrollmentDate')}/>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="consent" checked={form.photoConsent} onChange={function (e) { return setForm(function (f) { return (__assign(__assign({}, f), { photoConsent: e.target.checked })); }); }} className="rounded text-brand-600"/>
                <label htmlFor="consent" className="text-sm text-gray-700">Autoriza fotografias</label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea value={(_6 = form.notes) !== null && _6 !== void 0 ? _6 : ''} onChange={set('notes')} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"/>
            </div>
          </>)}

        {tab === 'personal' && (<>
            <div className="grid grid-cols-2 gap-3">
              <Input_1.Input label="Data de nascimento" type="date" value={(_7 = form.birthDate) !== null && _7 !== void 0 ? _7 : ''} onChange={set('birthDate')}/>
              <Input_1.Input label="Nacionalidade" value={(_8 = form.nationality) !== null && _8 !== void 0 ? _8 : ''} onChange={set('nationality')}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input_1.Input label="NIF" value={(_9 = form.nif) !== null && _9 !== void 0 ? _9 : ''} onChange={set('nif')}/>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grupo sanguíneo</label>
                <select value={(_10 = form.bloodType) !== null && _10 !== void 0 ? _10 : ''} onChange={set('bloodType')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">—</option>
                  {BLOOD_TYPES.map(function (b) { return <option key={b} value={b}>{b}</option>; })}
                </select>
              </div>
            </div>
            <Input_1.Input label="Morada" value={(_11 = form.address) !== null && _11 !== void 0 ? _11 : ''} onChange={set('address')}/>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alergias / intolerâncias</label>
              <textarea value={(_12 = form.allergies) !== null && _12 !== void 0 ? _12 : ''} onChange={set('allergies')} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas médicas</label>
              <textarea value={(_13 = form.medicalNotes) !== null && _13 !== void 0 ? _13 : ''} onChange={set('medicalNotes')} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"/>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Contacto de emergência</p>
              <div className="grid grid-cols-2 gap-3">
                <Input_1.Input label="Nome" value={(_14 = form.emergencyContact) !== null && _14 !== void 0 ? _14 : ''} onChange={set('emergencyContact')}/>
                <Input_1.Input label="Telefone" value={(_15 = form.emergencyPhone) !== null && _15 !== void 0 ? _15 : ''} onChange={set('emergencyPhone')}/>
              </div>
            </div>
          </>)}

        {tab === 'parents' && (<>
            <p className="text-xs font-semibold text-gray-500 uppercase">Encarregado 1</p>
            <div className="grid grid-cols-2 gap-3">
              <Input_1.Input label="Primeiro nome" value={(_16 = form.parent1FirstName) !== null && _16 !== void 0 ? _16 : ''} onChange={set('parent1FirstName')}/>
              <Input_1.Input label="Apelido" value={(_17 = form.parent1LastName) !== null && _17 !== void 0 ? _17 : ''} onChange={set('parent1LastName')}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input_1.Input label="Telefone" value={(_18 = form.parent1Phone) !== null && _18 !== void 0 ? _18 : ''} onChange={set('parent1Phone')}/>
              <Input_1.Input label="Email" type="email" value={(_19 = form.parent1Email) !== null && _19 !== void 0 ? _19 : ''} onChange={set('parent1Email')}/>
            </div>
            <Input_1.Input label="Parentesco" value={(_20 = form.parent1Relation) !== null && _20 !== void 0 ? _20 : ''} onChange={set('parent1Relation')} placeholder="Mãe/Pai"/>

            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Encarregado 2</p>
              <div className="grid grid-cols-2 gap-3">
                <Input_1.Input label="Primeiro nome" value={(_21 = form.parent2FirstName) !== null && _21 !== void 0 ? _21 : ''} onChange={set('parent2FirstName')}/>
                <Input_1.Input label="Apelido" value={(_22 = form.parent2LastName) !== null && _22 !== void 0 ? _22 : ''} onChange={set('parent2LastName')}/>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Input_1.Input label="Telefone" value={(_23 = form.parent2Phone) !== null && _23 !== void 0 ? _23 : ''} onChange={set('parent2Phone')}/>
                <Input_1.Input label="Email" type="email" value={(_24 = form.parent2Email) !== null && _24 !== void 0 ? _24 : ''} onChange={set('parent2Email')}/>
              </div>
              <div className="mt-3">
                <Input_1.Input label="Parentesco" value={(_25 = form.parent2Relation) !== null && _25 !== void 0 ? _25 : ''} onChange={set('parent2Relation')} placeholder="Mãe/Pai"/>
              </div>
            </div>
          </>)}
      </div>

      {mutation.isError && <p className="text-sm text-red-600 mt-2">{(0, api_client_1.errorMessage)(mutation.error)}</p>}
      <div className="flex justify-end gap-2 pt-3">
        <Button_1.Button variant="secondary" onClick={onClose}>Cancelar</Button_1.Button>
        <Button_1.Button onClick={function () { return mutation.mutate(); }} disabled={mutation.isPending || !form.fullName}>
          {mutation.isPending ? 'A guardar…' : 'Guardar'}
        </Button_1.Button>
      </div>
    </Modal_1.Modal>);
}
// ─── Student detail panel ─────────────────────────────────────────────────────
function StudentCard(_a) {
    var _b, _c, _d, _e;
    var student = _a.student, isAdmin = _a.isAdmin, onEdit = _a.onEdit, onToggle = _a.onToggle, onDelete = _a.onDelete;
    var _f = (0, react_1.useState)(false), expanded = _f[0], setExpanded = _f[1];
    var age = student.birthDate
        ? Math.floor((Date.now() - new Date(student.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))
        : null;
    return (<div className={"bg-white rounded-xl border border-gray-200 shadow-sm ".concat(!student.isActive ? 'opacity-60' : '')}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm shrink-0">
          {student.fullName.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{student.fullName}</p>
          <p className="text-xs text-gray-500">
            {(_c = (_b = student.plan) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : student.tuitionType}
            {age != null ? " \u00B7 ".concat(age, " anos") : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {student.allergies && (<span title={student.allergies} className="text-xs bg-red-50 text-red-600 rounded-full px-2 py-0.5">⚠ alergia</span>)}
          <button onClick={function () { return setExpanded(function (v) { return !v; }); }} className="text-xs text-gray-400 hover:text-gray-700">
            {expanded ? '▲' : '▼'}
          </button>
          {isAdmin && (<>
              <button onClick={onEdit} className="text-xs text-gray-400 hover:text-gray-600">✎</button>
              <button onClick={onToggle} className={"relative inline-flex h-5 w-9 rounded-full transition-colors ".concat(student.isActive ? 'bg-green-500' : 'bg-gray-300')}>
                <span className={"absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ".concat(student.isActive ? 'translate-x-4' : '')}/>
              </button>
            </>)}
        </div>
      </div>

      {expanded && (<div className="border-t border-gray-100 px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
          {student.birthDate && <p><span className="font-medium">Nasc.:</span> {new Date(student.birthDate).toLocaleDateString('pt-PT')}</p>}
          {student.nationality && <p><span className="font-medium">Nacionalidade:</span> {student.nationality}</p>}
          {student.bloodType && <p><span className="font-medium">Sangue:</span> {student.bloodType}</p>}
          {student.nif && <p><span className="font-medium">NIF:</span> {student.nif}</p>}
          {student.parent1FirstName && (<p className="col-span-2"><span className="font-medium">{(_d = student.parent1Relation) !== null && _d !== void 0 ? _d : 'Enc. 1'}:</span>{' '}
              {student.parent1FirstName} {student.parent1LastName}
              {student.parent1Phone ? " \u00B7 ".concat(student.parent1Phone) : ''}
              {student.parent1Email ? " \u00B7 ".concat(student.parent1Email) : ''}
            </p>)}
          {student.parent2FirstName && (<p className="col-span-2"><span className="font-medium">{(_e = student.parent2Relation) !== null && _e !== void 0 ? _e : 'Enc. 2'}:</span>{' '}
              {student.parent2FirstName} {student.parent2LastName}
              {student.parent2Phone ? " \u00B7 ".concat(student.parent2Phone) : ''}
            </p>)}
          {student.emergencyContact && (<p className="col-span-2"><span className="font-medium">Emergência:</span> {student.emergencyContact} {student.emergencyPhone}</p>)}
          {student.allergies && <p className="col-span-2 text-red-600"><span className="font-medium">Alergias:</span> {student.allergies}</p>}
          {student.medicalNotes && <p className="col-span-2"><span className="font-medium">Notas médicas:</span> {student.medicalNotes}</p>}
          {student.notes && <p className="col-span-2"><span className="font-medium">Notas:</span> {student.notes}</p>}
          {isAdmin && (<button onClick={function () { if (confirm("Eliminar \"".concat(student.fullName, "\"?")))
                onDelete(); }} className="col-span-2 text-red-400 hover:text-red-600 text-left mt-1">Eliminar</button>)}
        </div>)}
    </div>);
}
// ─── Page ─────────────────────────────────────────────────────────────────────
function StudentsPage() {
    var _a, _b;
    var isAdmin = ((_a = auth_1.auth.getUser()) === null || _a === void 0 ? void 0 : _a.role) === 'admin';
    var qc = (0, react_query_1.useQueryClient)();
    var _c = (0, useSchoolYear_1.useSchoolYears)().data, years = _c === void 0 ? [] : _c;
    var currentYearName = (0, useSchoolYear_1.currentSchoolYearName)();
    var currentYear = (_b = years.find(function (y) { return y.name === currentYearName; })) !== null && _b !== void 0 ? _b : years[0];
    var _d = (0, react_1.useState)(''), selectedYearId = _d[0], setSelectedYearId = _d[1];
    var schoolYearId = selectedYearId || (currentYear === null || currentYear === void 0 ? void 0 : currentYear.id) || '';
    var _e = useStudents(schoolYearId), _f = _e.data, students = _f === void 0 ? [] : _f, isLoading = _e.isLoading;
    var _g = (0, react_1.useState)(false), showModal = _g[0], setShowModal = _g[1];
    var _h = (0, react_1.useState)(null), editing = _h[0], setEditing = _h[1];
    var _j = (0, react_1.useState)(''), search = _j[0], setSearch = _j[1];
    var filtered = students.filter(function (s) {
        var _a, _b;
        return s.fullName.toLowerCase().includes(search.toLowerCase()) ||
            ((_a = s.parent1FirstName) !== null && _a !== void 0 ? _a : '').toLowerCase().includes(search.toLowerCase()) ||
            ((_b = s.parent1LastName) !== null && _b !== void 0 ? _b : '').toLowerCase().includes(search.toLowerCase());
    });
    var active = filtered.filter(function (s) { return s.isActive; });
    var inactive = filtered.filter(function (s) { return !s.isActive; });
    var toggleActive = (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, isActive = _a.isActive;
            return api_client_1.apiClient.put("/v1/students/".concat(id), { isActive: isActive });
        },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['students'] }); },
    });
    var deleteMutation = (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_client_1.apiClient.delete("/v1/students/".concat(id)); },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['students'] }); },
    });
    return (<div className="h-full flex flex-col">
      <PageHeader_1.PageHeader title="Crianças" subtitle={"".concat(active.length, " ativas").concat(inactive.length > 0 ? " \u00B7 ".concat(inactive.length, " inativas") : '')} actions={<div className="flex items-center gap-2">
            <input value={search} onChange={function (e) { return setSearch(e.target.value); }} placeholder="Pesquisar…" className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none w-40"/>
            <select value={schoolYearId} onChange={function (e) { return setSelectedYearId(e.target.value); }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none">
              {years.map(function (y) { return <option key={y.id} value={y.id}>{y.name}</option>; })}
            </select>
            {isAdmin && <Button_1.Button size="sm" onClick={function () { setEditing(null); setShowModal(true); }}>+ Nova criança</Button_1.Button>}
          </div>}/>

      <div className="flex-1 overflow-auto px-8 pb-8">
        {isLoading ? (<p className="text-sm text-gray-400 py-4">A carregar…</p>) : filtered.length === 0 ? (<p className="text-sm text-gray-400 text-center py-12">Nenhuma criança encontrada.</p>) : (<div className="space-y-2 pt-2 max-w-4xl">
            {active.map(function (s) { return (<StudentCard key={s.id} student={s} isAdmin={isAdmin} onEdit={function () { setEditing(s); setShowModal(true); }} onToggle={function () { return toggleActive.mutate({ id: s.id, isActive: false }); }} onDelete={function () { return deleteMutation.mutate(s.id); }}/>); })}
            {inactive.length > 0 && (<>
                <p className="text-xs font-semibold text-gray-400 uppercase pt-4 pb-1">Inativas</p>
                {inactive.map(function (s) { return (<StudentCard key={s.id} student={s} isAdmin={isAdmin} onEdit={function () { setEditing(s); setShowModal(true); }} onToggle={function () { return toggleActive.mutate({ id: s.id, isActive: true }); }} onDelete={function () { return deleteMutation.mutate(s.id); }}/>); })}
              </>)}
          </div>)}
      </div>

      {showModal && (<StudentModal open onClose={function () { return setShowModal(false); }} schoolYearId={schoolYearId} initial={editing}/>)}
    </div>);
}
