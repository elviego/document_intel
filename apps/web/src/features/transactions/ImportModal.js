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
exports.ImportModal = ImportModal;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var xlsx_1 = require("xlsx");
var api_client_1 = require("@/lib/api-client");
var Modal_1 = require("@/components/ui/Modal");
var Button_1 = require("@/components/ui/Button");
var Input_1 = require("@/components/ui/Input");
var CLASSIFICATIONS = [
    { value: 'despesa', label: 'Despesa (Expense)' },
    { value: 'receita', label: 'Receita (Income)' },
];
// ─── Template download ────────────────────────────────────────────────────────
function downloadTemplate() {
    var ws = xlsx_1.utils.aoa_to_sheet([
        ['Data', 'Tipo', 'Valor', 'Descrição', 'Conta'],
        ['2025-09-01', 'Rendas', '-1200', 'Renda setembro', 'CGD'],
        ['2025-09-05', 'Propinas', '800', 'Propina João', 'CGD'],
    ]);
    var wb = xlsx_1.utils.book_new();
    xlsx_1.utils.book_append_sheet(wb, ws, 'Movimentos');
    (0, xlsx_1.writeFile)(wb, 'template_movimentos.xlsx');
}
// ─── New category form ────────────────────────────────────────────────────────
function NewCategoryForm(_a) {
    var _b;
    var namePt = _a.namePt, value = _a.value, onChange = _a.onChange;
    var set = function (k) {
        return function (e) {
            var _a;
            return onChange(__assign(__assign({}, value), (_a = {}, _a[k] = e.target.value, _a)));
        };
    };
    return (<div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
      <p className="text-xs font-semibold text-amber-800">New category: <span className="font-bold">{namePt}</span></p>
      <div className="grid grid-cols-2 gap-2">
        <Input_1.Input label="Name (EN)" value={value.nameEn} onChange={set('nameEn')} placeholder="English name"/>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700">Classification</label>
          <select value={value.classification} onChange={set('classification')} className="block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
            {CLASSIFICATIONS.map(function (c) { return <option key={c.value} value={c.value}>{c.label}</option>; })}
          </select>
        </div>
        <Input_1.Input label="Group (PT)" value={value.groupPt} onChange={set('groupPt')} placeholder="ex: Pessoal"/>
        <Input_1.Input label="Group (EN)" value={value.groupEn} onChange={set('groupEn')} placeholder="ex: Personnel"/>
      </div>
      <Input_1.Input label="Description (optional)" value={(_b = value.descriptionPt) !== null && _b !== void 0 ? _b : ''} onChange={set('descriptionPt')}/>
    </div>);
}
// ─── Main modal ───────────────────────────────────────────────────────────────
function ImportModal(_a) {
    var _this = this;
    var open = _a.open, onClose = _a.onClose, schoolYearId = _a.schoolYearId;
    var qc = (0, react_query_1.useQueryClient)();
    var _b = (0, react_1.useState)('upload'), step = _b[0], setStep = _b[1];
    var _c = (0, react_1.useState)(null), file = _c[0], setFile = _c[1];
    var _d = (0, react_1.useState)(null), preview = _d[0], setPreview = _d[1];
    var _e = (0, react_1.useState)([]), newCategories = _e[0], setNewCategories = _e[1];
    var _f = (0, react_1.useState)(null), result = _f[0], setResult = _f[1];
    // Step 1 → 2: upload and preview
    var previewMutation = (0, react_query_1.useMutation)({
        mutationFn: function (f) { return __awaiter(_this, void 0, void 0, function () {
            var form, token, base, res, body;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        form = new FormData();
                        form.append('file', f);
                        token = localStorage.getItem('access_token');
                        base = (_a = import.meta.env.VITE_API_URL) !== null && _a !== void 0 ? _a : '';
                        return [4 /*yield*/, fetch("".concat(base, "/v1/transactions/import/preview"), {
                                method: 'POST',
                                headers: token ? { Authorization: "Bearer ".concat(token) } : {},
                                body: form,
                            })];
                    case 1:
                        res = _c.sent();
                        if (!!res.ok) return [3 /*break*/, 3];
                        return [4 /*yield*/, res.json().catch(function () { return ({}); })];
                    case 2:
                        body = _c.sent();
                        throw new Error((_b = body.error) !== null && _b !== void 0 ? _b : "".concat(res.status, " ").concat(res.statusText));
                    case 3: return [2 /*return*/, res.json()];
                }
            });
        }); },
        onSuccess: function (data) {
            setPreview(data);
            setNewCategories(data.unknownCategories.map(function (namePt) { return ({
                namePt: namePt,
                nameEn: '',
                classification: 'despesa',
                groupPt: '',
                groupEn: '',
                descriptionPt: '',
            }); }));
            setStep('review');
        },
    });
    // Step 2 → 3: confirm import
    var confirmMutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return api_client_1.apiClient.post('/v1/transactions/import/confirm', {
            schoolYearId: schoolYearId,
            rows: preview.rows,
            newCategories: newCategories,
        }); },
        onSuccess: function (data) {
            setResult(data);
            setStep('done');
            qc.invalidateQueries({ queryKey: ['transactions'] });
        },
    });
    var updateNewCat = function (i, v) {
        return setNewCategories(function (prev) { return prev.map(function (c, idx) { return idx === i ? v : c; }); });
    };
    var newCatsValid = newCategories.every(function (c) { return c.nameEn && c.groupPt && c.groupEn; });
    function handleClose() {
        setStep('upload');
        setFile(null);
        setPreview(null);
        setNewCategories([]);
        setResult(null);
        onClose();
    }
    return (<Modal_1.Modal open={open} onClose={handleClose} title="Import Movements from Excel">

      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (<div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload an Excel file (.xlsx) with columns: <strong>Data</strong>, <strong>Tipo</strong>,{' '}
            <strong>Valor</strong>, <strong>Descrição</strong>, <strong>Conta</strong>.
          </p>
          <button onClick={downloadTemplate} className="text-xs text-brand-600 underline hover:text-brand-800">
            ↓ Download template
          </button>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Excel file</label>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={function (e) { var _a, _b; return setFile((_b = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : null); }} className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"/>
          </div>
          {previewMutation.isError && (<p className="text-sm text-red-600">{(0, api_client_1.errorMessage)(previewMutation.error)}</p>)}
          <div className="flex justify-end gap-2 pt-1">
            <Button_1.Button variant="secondary" onClick={handleClose}>Cancel</Button_1.Button>
            <Button_1.Button onClick={function () { return file && previewMutation.mutate(file); }} disabled={!file || previewMutation.isPending}>
              {previewMutation.isPending ? 'Parsing…' : 'Parse file →'}
            </Button_1.Button>
          </div>
        </div>)}

      {/* ── Step 2: Review ── */}
      {step === 'review' && preview && (<div className="space-y-4">
          {/* Parse errors */}
          {preview.parseErrors.length > 0 && (<div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">Parse errors ({preview.parseErrors.length} rows skipped)</p>
              <ul className="text-xs text-red-600 space-y-0.5 max-h-24 overflow-auto">
                {preview.parseErrors.map(function (e, i) { return <li key={i}>• {e}</li>; })}
              </ul>
            </div>)}

          {/* Unknown accounts warning */}
          {preview.unknownAccounts.length > 0 && (<div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">Unknown bank accounts — rows will be skipped</p>
              <p className="text-xs text-amber-600">{preview.unknownAccounts.join(', ')}</p>
              <p className="text-xs text-amber-500 mt-1">Create these accounts in Settings first, then re-import.</p>
            </div>)}

          {/* New categories */}
          {newCategories.length > 0 && (<div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                {newCategories.length} new {newCategories.length === 1 ? 'category' : 'categories'} found — fill in details to create:
              </p>
              {newCategories.map(function (cat, i) { return (<NewCategoryForm key={cat.namePt} namePt={cat.namePt} value={cat} onChange={function (v) { return updateNewCat(i, v); }}/>); })}
            </div>)}

          {/* Row preview */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">{preview.rows.length} rows to import</p>
            <div className="max-h-48 overflow-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-left text-gray-500">
                    <th className="px-2 py-1.5 font-medium">Date</th>
                    <th className="px-2 py-1.5 font-medium">Category</th>
                    <th className="px-2 py-1.5 font-medium">Account</th>
                    <th className="px-2 py-1.5 font-medium text-right">Amount</th>
                    <th className="px-2 py-1.5 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.rows.map(function (row) { return (<tr key={row.rowIndex} className="hover:bg-gray-50">
                      <td className="px-2 py-1 text-gray-500 whitespace-nowrap">{row.date}</td>
                      <td className="px-2 py-1 font-medium">{row.categoryName}</td>
                      <td className="px-2 py-1 text-gray-500">{row.bankAccountName || '—'}</td>
                      <td className={"px-2 py-1 text-right font-mono font-semibold ".concat(row.amount >= 0 ? 'text-green-700' : 'text-red-700')}>
                        {row.amount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                      </td>
                      <td className="px-2 py-1 text-gray-500 truncate max-w-[160px]">{row.description}</td>
                    </tr>); })}
                </tbody>
              </table>
            </div>
          </div>

          {confirmMutation.isError && (<p className="text-sm text-red-600">{(0, api_client_1.errorMessage)(confirmMutation.error)}</p>)}

          <div className="flex justify-end gap-2 pt-1">
            <Button_1.Button variant="secondary" onClick={function () { return setStep('upload'); }}>← Back</Button_1.Button>
            <Button_1.Button onClick={function () { return confirmMutation.mutate(); }} disabled={confirmMutation.isPending || !newCatsValid || preview.rows.length === 0}>
              {confirmMutation.isPending ? 'Importing…' : "Import ".concat(preview.rows.length, " rows")}
            </Button_1.Button>
          </div>
        </div>)}

      {/* ── Step 3: Done ── */}
      {step === 'done' && result && (<div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{result.imported}</p>
              <p className="text-xs text-green-600 mt-0.5">Imported</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-500">{result.skipped}</p>
              <p className="text-xs text-gray-400 mt-0.5">Skipped</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-500">{result.errors.length}</p>
              <p className="text-xs text-red-400 mt-0.5">Errors</p>
            </div>
          </div>

          {result.errors.length > 0 && (<div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">Errors</p>
              <ul className="text-xs text-red-600 space-y-0.5 max-h-32 overflow-auto">
                {result.errors.map(function (e, i) { return <li key={i}>• {e}</li>; })}
              </ul>
            </div>)}

          <div className="flex justify-end">
            <Button_1.Button onClick={handleClose}>Close</Button_1.Button>
          </div>
        </div>)}
    </Modal_1.Modal>);
}
