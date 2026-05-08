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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OcrDocumentPage;
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
var useOcrConfig_1 = require("./hooks/useOcrConfig");
var OcrResultViewer_1 = require("./components/OcrResultViewer");
var ConfidenceBadge_1 = require("./components/ConfidenceBadge");
var OcrPage_1 = require("./OcrPage");
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
// ── Authenticated file fetch + blob URL ───────────────────────────────────────
function usePreviewUrl(docId, mimeType) {
    var _a = (0, react_1.useState)(null), url = _a[0], setUrl = _a[1];
    var _b = (0, react_1.useState)(false), err = _b[0], setErr = _b[1];
    (0, react_1.useEffect)(function () {
        var objectUrl = null;
        var token = localStorage.getItem('access_token');
        fetch((0, useOcr_1.documentFileUrl)(docId), {
            headers: token ? { Authorization: "Bearer ".concat(token) } : {},
        })
            .then(function (r) {
            if (!r.ok)
                throw new Error("".concat(r.status));
            return r.blob();
        })
            .then(function (blob) {
            objectUrl = URL.createObjectURL(new Blob([blob], { type: mimeType }));
            setUrl(objectUrl);
        })
            .catch(function () { return setErr(true); });
        return function () { if (objectUrl)
            URL.revokeObjectURL(objectUrl); };
    }, [docId, mimeType]);
    return { url: url, err: err };
}
// ── Preview panel ─────────────────────────────────────────────────────────────
function PreviewPanel(_a) {
    var docId = _a.docId, mimeType = _a.mimeType, fileName = _a.fileName;
    var _b = usePreviewUrl(docId, mimeType), url = _b.url, err = _b.err;
    var isImage = mimeType.startsWith('image/');
    var isPdf = mimeType === 'application/pdf';
    if (err) {
        return (<div className="flex items-center justify-center h-full text-sm text-gray-400">
        Preview unavailable
      </div>);
    }
    if (!url) {
        return (<div className="flex items-center justify-center h-full text-sm text-gray-400">
        <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-brand-600 rounded-full"/>
      </div>);
    }
    if (isImage) {
        return (<img src={url} alt={fileName} className="max-w-full max-h-full object-contain"/>);
    }
    if (isPdf) {
        return (<iframe src={url} title={fileName} className="w-full h-full border-0"/>);
    }
    return (<div className="flex flex-col items-center justify-center h-full gap-3 text-sm text-gray-500">
      <span className="text-4xl">📄</span>
      <a href={url} download={fileName} className="text-brand-600 hover:underline">
        Download to view
      </a>
    </div>);
}
// ── Re-process override modal ─────────────────────────────────────────────────
function OverrideModal(_a) {
    var _this = this;
    var open = _a.open, onClose = _a.onClose, docId = _a.docId, currentType = _a.currentType;
    var t = (0, react_i18next_1.useTranslation)().t;
    var process = (0, useOcr_1.useProcessDocument)();
    var _b = (0, useOcrConfig_1.useLlmProviders)().data, providers = _b === void 0 ? [] : _b;
    var _c = (0, react_1.useState)(currentType !== null && currentType !== void 0 ? currentType : ''), docType = _c[0], setDocType = _c[1];
    var _d = (0, react_1.useState)(''), providerId = _d[0], setProviderId = _d[1];
    var _e = (0, react_1.useState)(''), model = _e[0], setModel = _e[1];
    var handleSubmit = function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, process.mutateAsync({
                        id: docId,
                        override: {
                            documentType: docType || undefined,
                            llmProviderId: providerId || undefined,
                            llmModel: model || undefined,
                        },
                    })];
                case 1:
                    _a.sent();
                    onClose();
                    return [2 /*return*/];
            }
        });
    }); };
    return (<Modal_1.Modal open={open} onClose={onClose} title="Re-process with override">
      <div className="space-y-4 text-sm">
        <div className="space-y-1">
          <label className="block font-medium text-gray-700">Document type override</label>
          <select value={docType} onChange={function (e) { return setDocType(e.target.value); }} className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-500">
            <option value="">— Keep current ({currentType !== null && currentType !== void 0 ? currentType : 'auto'}) —</option>
            {OcrPage_1.DOC_TYPES.map(function (d) { return <option key={d.value} value={d.value}>{d.label}</option>; })}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block font-medium text-gray-700">LLM provider override</label>
          <select value={providerId} onChange={function (e) { return setProviderId(e.target.value); }} className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-500">
            <option value="">— Use configured default —</option>
            {providers.filter(function (p) { return p.isActive; }).map(function (p) { return (<option key={p.id} value={p.id}>{p.name}</option>); })}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block font-medium text-gray-700">Model override</label>
          <input type="text" value={model} onChange={function (e) { return setModel(e.target.value); }} placeholder="Leave blank to use provider default" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"/>
        </div>

        {process.isError && (<p className="text-red-600 text-xs">{(0, api_client_1.errorMessage)(process.error)}</p>)}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button_1.Button variant="secondary" onClick={onClose} disabled={process.isPending}>
          {t('common.cancel')}
        </Button_1.Button>
        <Button_1.Button onClick={handleSubmit} disabled={process.isPending}>
          {process.isPending ? t('common.loading') : 'Re-process'}
        </Button_1.Button>
      </div>
    </Modal_1.Modal>);
}
// ── Authenticated download helper ─────────────────────────────────────────────
function downloadExport(docId, fmt, fileName) {
    return __awaiter(this, void 0, void 0, function () {
        var token, res, blob, url, a;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    token = localStorage.getItem('access_token');
                    return [4 /*yield*/, fetch((0, useOcr_1.documentExportUrl)(docId, fmt), {
                            headers: token ? { Authorization: "Bearer ".concat(token) } : {},
                        })];
                case 1:
                    res = _a.sent();
                    if (!res.ok)
                        return [2 /*return*/];
                    return [4 /*yield*/, res.blob()];
                case 2:
                    blob = _a.sent();
                    url = URL.createObjectURL(blob);
                    a = document.createElement('a');
                    a.href = url;
                    a.download = "".concat(fileName.replace(/\.[^.]+$/, ''), "-ocr.").concat(fmt);
                    a.click();
                    URL.revokeObjectURL(url);
                    return [2 /*return*/];
            }
        });
    });
}
// ── Page ──────────────────────────────────────────────────────────────────────
function OcrDocumentPage() {
    var _a, _b, _c, _d;
    var id = (0, react_router_dom_1.useParams)().id;
    var t = (0, react_i18next_1.useTranslation)().t;
    var _e = (0, useOcr_1.useOcrDocument)(id), data = _e.data, isLoading = _e.isLoading, isError = _e.isError;
    var process = (0, useOcr_1.useProcessDocument)();
    var _f = (0, react_1.useState)(false), showOverride = _f[0], setShowOverride = _f[1];
    var _g = (0, react_1.useState)(true), showPreview = _g[0], setShowPreview = _g[1];
    if (isLoading)
        return <p className="p-8 text-sm text-gray-400">{t('common.loading')}</p>;
    if (isError || !data)
        return <p className="p-8 text-sm text-red-500">Document not found.</p>;
    var doc = data.document, job = data.job;
    var isProcessing = doc.status === 'processing' || doc.status === 'pending';
    var canExport = doc.status === 'completed' && !!(job === null || job === void 0 ? void 0 : job.metadata);
    return (<div className="h-full flex flex-col">
      <PageHeader_1.PageHeader title={doc.fileName} subtitle={"".concat(fmtSize(doc.fileSizeBytes), " \u00B7 ").concat(doc.mimeType)} actions={<>
            <react_router_dom_1.Link to="/ocr">
              <Button_1.Button variant="secondary" size="sm">← {t('ocr.back')}</Button_1.Button>
            </react_router_dom_1.Link>

            <Button_1.Button variant="secondary" size="sm" onClick={function () { return setShowPreview(function (p) { return !p; }); }}>
              {showPreview ? 'Hide preview' : 'Show preview'}
            </Button_1.Button>

            {canExport && (<>
                <Button_1.Button variant="secondary" size="sm" onClick={function () { return downloadExport(doc.id, 'json', doc.fileName); }}>
                  Export JSON
                </Button_1.Button>
                <Button_1.Button variant="secondary" size="sm" onClick={function () { return downloadExport(doc.id, 'csv', doc.fileName); }}>
                  Export CSV
                </Button_1.Button>
              </>)}

            {job ? (<Button_1.Button size="sm" onClick={function () { return setShowOverride(true); }} disabled={isProcessing}>
                {isProcessing ? t('common.loading') : t('ocr.reProcess')}
              </Button_1.Button>) : (<Button_1.Button size="sm" onClick={function () { return process.mutate({ id: doc.id }); }} disabled={process.isPending || isProcessing}>
                {isProcessing ? t('common.loading') : t('ocr.process')}
              </Button_1.Button>)}
          </>}/>

      <div className="flex-1 overflow-hidden flex">
        {/* Preview panel */}
        {showPreview && (<div className="w-96 shrink-0 border-r border-gray-200 flex flex-col bg-gray-50">
            <div className="px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Preview
            </div>
            <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
              <PreviewPanel docId={doc.id} mimeType={doc.mimeType} fileName={doc.fileName}/>
            </div>
          </div>)}

        {/* Main content */}
        <div className="flex-1 overflow-auto px-8 py-6 space-y-6">
          {process.isError && (<p className="text-sm text-red-600">{(0, api_client_1.errorMessage)(process.error)}</p>)}

          {/* Metadata cards */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoCard label={t('ocr.status')}>
              <Badge_1.Badge variant={STATUS_VARIANT[doc.status]}>{doc.status}</Badge_1.Badge>
            </InfoCard>
            <InfoCard label={t('ocr.documentType')}>
              {doc.documentType
            ? (_b = (_a = OcrPage_1.DOC_TYPES.find(function (d) { return d.value === doc.documentType; })) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : doc.documentType
            : <span className="text-gray-400">—</span>}
            </InfoCard>
            <InfoCard label={t('ocr.detection')}>
              {doc.autoDetectType ? 'Auto' : 'Manual'}
            </InfoCard>
            <InfoCard label={t('ocr.pages')}>
              {(_c = doc.pageCount) !== null && _c !== void 0 ? _c : '—'}
            </InfoCard>
            <InfoCard label={t('ocr.size')}>
              {fmtSize(doc.fileSizeBytes)}
            </InfoCard>
            <InfoCard label={t('ocr.uploadedAt')}>
              {(0, date_fns_1.format)(new Date(doc.createdAt), 'dd/MM/yyyy HH:mm')}
            </InfoCard>
            {(job === null || job === void 0 ? void 0 : job.completedAt) && (<InfoCard label={t('ocr.processedAt')}>
                {(0, date_fns_1.format)(new Date(job.completedAt), 'dd/MM/yyyy HH:mm')}
              </InfoCard>)}
            {(job === null || job === void 0 ? void 0 : job.metadata) && (<InfoCard label={t('ocr.confidence')}>
                <ConfidenceBadge_1.ConfidenceBadge value={job.metadata.ocr.overallConfidence}/>
              </InfoCard>)}
            {((_d = job === null || job === void 0 ? void 0 : job.metadata) === null || _d === void 0 ? void 0 : _d.llm) && (<InfoCard label={t('ocr.llmModel')}>
                <span className="text-xs">{job.metadata.llm.model}</span>
              </InfoCard>)}
          </section>

          {/* Processing indicator */}
          {isProcessing && (<div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"/>
              {t('ocr.processingMessage')}
            </div>)}

          {/* Error */}
          {doc.status === 'failed' && (job === null || job === void 0 ? void 0 : job.errorMessage) && (<div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <strong>{t('ocr.processingFailed')}:</strong> {job.errorMessage}
            </div>)}

          {/* Results */}
          {job && doc.status === 'completed' && (<section>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('ocr.results')}</h2>
              <OcrResultViewer_1.OcrResultViewer job={job}/>
            </section>)}

          {/* Not yet processed */}
          {!job && doc.status === 'pending' && !isProcessing && (<div className="text-center py-12 text-sm text-gray-500">
              <p>{t('ocr.notYetProcessed')}</p>
              <Button_1.Button size="sm" className="mt-3" onClick={function () { return process.mutate({ id: doc.id }); }}>
                {t('ocr.process')}
              </Button_1.Button>
            </div>)}
        </div>
      </div>

      <OverrideModal open={showOverride} onClose={function () { return setShowOverride(false); }} docId={doc.id} currentType={doc.documentType}/>
    </div>);
}
function InfoCard(_a) {
    var label = _a.label, children = _a.children;
    return (<div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm font-medium text-gray-800">{children}</div>
    </div>);
}
