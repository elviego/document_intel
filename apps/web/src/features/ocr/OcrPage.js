"use strict";
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
exports.DOC_TYPES = void 0;
exports.default = OcrPage;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var react_i18next_1 = require("react-i18next");
var date_fns_1 = require("date-fns");
var PageHeader_1 = require("@/components/ui/PageHeader");
var Button_1 = require("@/components/ui/Button");
var Badge_1 = require("@/components/ui/Badge");
var Modal_1 = require("@/components/ui/Modal");
var api_client_1 = require("@/lib/api-client");
var useOcr_1 = require("./hooks/useOcr");
exports.DOC_TYPES = [
    { value: 'invoice', label: 'Invoice' },
    { value: 'receipt', label: 'Receipt' },
    { value: 'contract', label: 'Contract' },
    { value: 'id_document', label: 'ID Document' },
    { value: 'medical', label: 'Medical' },
    { value: 'bank_statement', label: 'Bank Statement' },
    { value: 'form', label: 'Form' },
    { value: 'other', label: 'Other' },
];
var STATUS_VARIANT = {
    pending: 'gray', processing: 'blue', completed: 'green', failed: 'red',
};
function fmtSize(bytes) {
    if (bytes < 1024)
        return "".concat(bytes, " B");
    if (bytes < 1024 * 1024)
        return "".concat((bytes / 1024).toFixed(1), " KB");
    return "".concat((bytes / 1024 / 1024).toFixed(1), " MB");
}
// ── Upload Modal (single + batch) ─────────────────────────────────────────────
function UploadModal(_a) {
    var _this = this;
    var _b;
    var open = _a.open, onClose = _a.onClose;
    var t = (0, react_i18next_1.useTranslation)().t;
    var fileRef = (0, react_1.useRef)(null);
    var _c = (0, react_1.useState)([]), files = _c[0], setFiles = _c[1];
    var _d = (0, react_1.useState)(true), autoDetect = _d[0], setAutoDetect = _d[1];
    var _e = (0, react_1.useState)(''), documentType = _e[0], setDocumentType = _e[1];
    var _f = (0, react_1.useState)(true), autoProcess = _f[0], setAutoProcess = _f[1];
    var _g = (0, react_1.useState)(false), dragOver = _g[0], setDragOver = _g[1];
    var _h = (0, react_1.useState)(null), batchResults = _h[0], setBatchResults = _h[1];
    var upload = (0, useOcr_1.useUploadDocument)();
    var batchUpload = (0, useOcr_1.useBatchUpload)();
    var addFiles = function (incoming) {
        if (!incoming)
            return;
        setFiles(function (prev) { return __spreadArray(__spreadArray([], prev, true), Array.from(incoming), true); });
    };
    var handleDrop = function (e) {
        e.preventDefault();
        setDragOver(false);
        addFiles(e.dataTransfer.files);
    };
    var handleSubmit = function () { return __awaiter(_this, void 0, void 0, function () {
        var fd, fd, _i, files_1, f, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (files.length === 0)
                        return [2 /*return*/];
                    if (!(files.length === 1)) return [3 /*break*/, 2];
                    fd = new FormData();
                    fd.append('file', files[0]);
                    fd.append('autoDetectType', String(autoDetect));
                    fd.append('autoProcess', String(autoProcess));
                    if (!autoDetect && documentType)
                        fd.append('documentType', documentType);
                    return [4 /*yield*/, upload.mutateAsync(fd)];
                case 1:
                    _a.sent();
                    handleClose();
                    return [3 /*break*/, 4];
                case 2:
                    fd = new FormData();
                    for (_i = 0, files_1 = files; _i < files_1.length; _i++) {
                        f = files_1[_i];
                        fd.append('file', f);
                    }
                    fd.append('autoDetectType', String(autoDetect));
                    fd.append('autoProcess', String(autoProcess));
                    if (!autoDetect && documentType)
                        fd.append('documentType', documentType);
                    return [4 /*yield*/, batchUpload.mutateAsync(fd)];
                case 3:
                    res = _a.sent();
                    setBatchResults(res.results);
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleClose = function () {
        onClose();
        setFiles([]);
        setBatchResults(null);
        upload.reset();
        batchUpload.reset();
    };
    var isPending = upload.isPending || batchUpload.isPending;
    if (batchResults) {
        return (<Modal_1.Modal open={open} onClose={handleClose} title={"Batch upload \u2014 ".concat(batchResults.length, " files")}>
        <div className="space-y-2 max-h-64 overflow-auto">
          {batchResults.map(function (r, i) { return (<div key={i} className={"flex items-center justify-between text-sm px-3 py-2 rounded-lg ".concat(r.error ? 'bg-red-50' : 'bg-green-50')}>
              <span className="truncate text-gray-700">{r.fileName}</span>
              {r.error
                    ? <span className="text-red-600 text-xs ml-2 shrink-0">{r.error}</span>
                    : <span className="text-green-600 text-xs ml-2 shrink-0">✓ uploaded</span>}
            </div>); })}
        </div>
        <div className="flex justify-end pt-2">
          <Button_1.Button onClick={handleClose}>Close</Button_1.Button>
        </div>
      </Modal_1.Modal>);
    }
    return (<Modal_1.Modal open={open} onClose={handleClose} title={t('ocr.uploadDocument')}>
      <div className="space-y-4">
        {/* Drop zone */}
        <div className={"border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ".concat(dragOver ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-gray-400')} onDrop={handleDrop} onDragOver={function (e) { e.preventDefault(); setDragOver(true); }} onDragLeave={function () { return setDragOver(false); }} onClick={function () { var _a; return (_a = fileRef.current) === null || _a === void 0 ? void 0 : _a.click(); }}>
          <input ref={fileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp,.webp" className="hidden" onChange={function (e) { return addFiles(e.target.files); }}/>
          {files.length > 0 ? (<div className="space-y-1">
              {files.map(function (f, i) { return (<div key={i} className="flex items-center justify-between text-sm text-gray-700">
                  <span className="truncate">{f.name}</span>
                  <span className="text-gray-400 ml-3 shrink-0">{fmtSize(f.size)}</span>
                </div>); })}
              <p className="text-xs text-gray-400 mt-2">Click to add more files</p>
            </div>) : (<div>
              <p className="text-sm text-gray-500">Drop files here, or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">PDF, PNG, JPG, TIFF, BMP, WebP · Multiple files supported</p>
            </div>)}
        </div>

        {files.length > 0 && (<button onClick={function () { return setFiles([]); }} className="text-xs text-red-500 hover:underline">
            Clear all files
          </button>)}

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={autoDetect} onChange={function (e) { return setAutoDetect(e.target.checked); }} className="rounded border-gray-300 text-brand-600"/>
          <span className="text-sm text-gray-700">{t('ocr.autoDetectType')}</span>
        </label>

        {!autoDetect && (<div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">{t('ocr.documentType')}</label>
            <select value={documentType} onChange={function (e) { return setDocumentType(e.target.value); }} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
              <option value="">— Select type —</option>
              {exports.DOC_TYPES.map(function (t) { return <option key={t.value} value={t.value}>{t.label}</option>; })}
            </select>
          </div>)}

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={autoProcess} onChange={function (e) { return setAutoProcess(e.target.checked); }} className="rounded border-gray-300 text-brand-600"/>
          <span className="text-sm text-gray-700">{t('ocr.processAfterUpload')}</span>
        </label>

        {(upload.isError || batchUpload.isError) && (<p className="text-sm text-red-600">{(0, api_client_1.errorMessage)((_b = upload.error) !== null && _b !== void 0 ? _b : batchUpload.error)}</p>)}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button_1.Button variant="secondary" onClick={handleClose} disabled={isPending}>{t('common.cancel')}</Button_1.Button>
        <Button_1.Button onClick={handleSubmit} disabled={files.length === 0 || isPending}>
          {isPending ? t('common.loading')
            : files.length > 1 ? "Upload ".concat(files.length, " files")
                : t('ocr.upload')}
        </Button_1.Button>
      </div>
    </Modal_1.Modal>);
}
// ── Page ──────────────────────────────────────────────────────────────────────
function OcrPage() {
    var _a, _b;
    var t = (0, react_i18next_1.useTranslation)().t;
    var _c = (0, react_1.useState)(false), showUpload = _c[0], setShowUpload = _c[1];
    var _d = (0, react_1.useState)(0), page = _d[0], setPage = _d[1];
    var _e = (0, useOcr_1.useOcrDocuments)(page), data = _e.data, isLoading = _e.isLoading;
    var process = (0, useOcr_1.useProcessDocument)();
    var remove = (0, useOcr_1.useDeleteDocument)();
    var docs = (_a = data === null || data === void 0 ? void 0 : data.items) !== null && _a !== void 0 ? _a : [];
    var total = (_b = data === null || data === void 0 ? void 0 : data.total) !== null && _b !== void 0 ? _b : 0;
    return (<div className="h-full flex flex-col">
      <PageHeader_1.PageHeader title={t('ocr.title')} subtitle={"".concat(total, " ").concat(t('ocr.documents'))} actions={<>
            <react_router_dom_1.Link to="/ocr/config"><Button_1.Button variant="secondary" size="sm">{t('ocr.settings')}</Button_1.Button></react_router_dom_1.Link>
            <react_router_dom_1.Link to="/ocr/metrics"><Button_1.Button variant="secondary" size="sm">{t('ocr.metricsNav')}</Button_1.Button></react_router_dom_1.Link>
            <Button_1.Button size="sm" onClick={function () { return setShowUpload(true); }}>+ {t('ocr.uploadDocument')}</Button_1.Button>
          </>}/>

      <div className="flex-1 overflow-auto px-8 pb-8">
        {isLoading ? (<p className="text-sm text-gray-400 py-4">{t('common.loading')}</p>) : docs.length === 0 ? (<div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-4xl mb-4">📄</div>
            <p className="text-gray-500 text-sm">{t('ocr.noDocuments')}</p>
            <Button_1.Button size="sm" className="mt-4" onClick={function () { return setShowUpload(true); }}>{t('ocr.uploadFirst')}</Button_1.Button>
          </div>) : (<table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                <th className="pb-2 pr-4 font-medium">{t('ocr.fileName')}</th>
                <th className="pb-2 pr-4 font-medium">{t('ocr.documentType')}</th>
                <th className="pb-2 pr-4 font-medium">{t('ocr.status')}</th>
                <th className="pb-2 pr-4 font-medium">{t('ocr.size')}</th>
                <th className="pb-2 pr-4 font-medium">{t('ocr.uploadedAt')}</th>
                <th className="pb-2 font-medium"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.map(function (doc) {
                var _a, _b;
                return (<tr key={doc.id} className="hover:bg-gray-50 group">
                  <td className="py-2 pr-4">
                    <react_router_dom_1.Link to={"/ocr/".concat(doc.id)} className="font-medium text-brand-700 hover:underline">{doc.fileName}</react_router_dom_1.Link>
                    {doc.autoDetectType && <span className="ml-2 text-xs text-gray-400">(auto)</span>}
                  </td>
                  <td className="py-2 pr-4 text-gray-600">
                    {doc.documentType
                        ? (_b = (_a = exports.DOC_TYPES.find(function (t) { return t.value === doc.documentType; })) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : doc.documentType
                        : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="py-2 pr-4"><Badge_1.Badge variant={STATUS_VARIANT[doc.status]}>{doc.status}</Badge_1.Badge></td>
                  <td className="py-2 pr-4 text-gray-500 tabular-nums">{fmtSize(doc.fileSizeBytes)}</td>
                  <td className="py-2 pr-4 text-gray-500">{(0, date_fns_1.format)(new Date(doc.createdAt), 'dd/MM/yyyy HH:mm')}</td>
                  <td className="py-2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {doc.status !== 'processing' && (<button className="text-xs text-brand-600 hover:underline" onClick={function () { return process.mutate({ id: doc.id }); }} disabled={process.isPending}>
                        {doc.status === 'completed' ? 'Re-run' : 'Process'}
                      </button>)}
                    <react_router_dom_1.Link to={"/ocr/".concat(doc.id)} className="text-xs text-gray-500 hover:text-gray-700">View</react_router_dom_1.Link>
                    <button className="text-xs text-red-400 hover:text-red-600" onClick={function () { if (confirm('Delete this document?'))
                    remove.mutate(doc.id); }}>
                      Delete
                    </button>
                  </td>
                </tr>);
            })}
            </tbody>
          </table>)}

        {total > 50 && (<div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <button disabled={page === 0} onClick={function () { return setPage(function (p) { return p - 1; }); }} className="disabled:opacity-40 hover:text-gray-700">← Prev</button>
            <span>Page {page + 1} of {Math.ceil(total / 50)}</span>
            <button disabled={(page + 1) * 50 >= total} onClick={function () { return setPage(function (p) { return p + 1; }); }} className="disabled:opacity-40 hover:text-gray-700">Next →</button>
          </div>)}
      </div>

      <UploadModal open={showUpload} onClose={function () { return setShowUpload(false); }}/>
    </div>);
}
