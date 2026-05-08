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
exports.default = OcrConfigPage;
var react_1 = require("react");
var react_i18next_1 = require("react-i18next");
var PageHeader_1 = require("@/components/ui/PageHeader");
var Button_1 = require("@/components/ui/Button");
var Input_1 = require("@/components/ui/Input");
var Modal_1 = require("@/components/ui/Modal");
var Badge_1 = require("@/components/ui/Badge");
var api_client_1 = require("@/lib/api-client");
var useOcrConfig_1 = require("./hooks/useOcrConfig");
var PROVIDER_TYPES = [
    { value: 'anthropic', label: 'Anthropic (Claude)', hint: 'claude-3-5-sonnet-20241022' },
    { value: 'openai', label: 'OpenAI', hint: 'gpt-4o, gpt-4-turbo…' },
    { value: 'ollama', label: 'Ollama (local)', hint: 'llama3, mistral, phi…' },
    { value: 'deepseek', label: 'DeepSeek', hint: 'deepseek-chat, deepseek-reasoner…' },
    { value: 'custom', label: 'Custom (OpenAI-compatible)', hint: 'Any OpenAI-compatible endpoint' },
];
var DOC_TYPE_LABELS = {
    invoice: 'Invoice',
    receipt: 'Receipt',
    contract: 'Contract',
    id_document: 'ID Document',
    medical: 'Medical',
    bank_statement: 'Bank Statement',
    form: 'Form',
    other: 'Other',
};
var WEBHOOK_EVENTS = [
    { value: 'document.uploaded', label: 'Document uploaded' },
    { value: 'document.processing', label: 'Processing started' },
    { value: 'document.completed', label: 'Processing completed' },
    { value: 'document.failed', label: 'Processing failed' },
    { value: 'document.deleted', label: 'Document deleted' },
];
// ── Provider modal ────────────────────────────────────────────────────────────
function ProviderModal(_a) {
    var _this = this;
    var _b, _c, _d, _e, _f, _g, _h;
    var open = _a.open, onClose = _a.onClose, existing = _a.existing;
    var t = (0, react_i18next_1.useTranslation)().t;
    var create = (0, useOcrConfig_1.useCreateLlmProvider)();
    var update = (0, useOcrConfig_1.useUpdateLlmProvider)();
    var _j = (0, react_1.useState)({
        name: (_b = existing === null || existing === void 0 ? void 0 : existing.name) !== null && _b !== void 0 ? _b : '',
        providerType: (_c = existing === null || existing === void 0 ? void 0 : existing.providerType) !== null && _c !== void 0 ? _c : 'openai',
        baseUrl: (_d = existing === null || existing === void 0 ? void 0 : existing.baseUrl) !== null && _d !== void 0 ? _d : '',
        apiKey: '',
        defaultModel: (_e = existing === null || existing === void 0 ? void 0 : existing.defaultModel) !== null && _e !== void 0 ? _e : '',
        isActive: (_f = existing === null || existing === void 0 ? void 0 : existing.isActive) !== null && _f !== void 0 ? _f : true,
    }), form = _j[0], setForm = _j[1];
    var set = function (k) { return function (e) {
        return setForm(function (f) {
            var _a;
            return (__assign(__assign({}, f), (_a = {}, _a[k] = e.target.value, _a)));
        });
    }; };
    var setCheck = function (k) { return function (e) {
        return setForm(function (f) {
            var _a;
            return (__assign(__assign({}, f), (_a = {}, _a[k] = e.target.checked, _a)));
        });
    }; };
    var handleSubmit = function () { return __awaiter(_this, void 0, void 0, function () {
        var body;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    body = {
                        name: form.name,
                        providerType: form.providerType,
                        baseUrl: form.baseUrl || null,
                        defaultModel: form.defaultModel,
                        isActive: form.isActive,
                        isDefault: (_a = existing === null || existing === void 0 ? void 0 : existing.isDefault) !== null && _a !== void 0 ? _a : false,
                    };
                    if (form.apiKey)
                        body.apiKey = form.apiKey;
                    if (!existing) return [3 /*break*/, 2];
                    return [4 /*yield*/, update.mutateAsync(__assign({ id: existing.id }, body))];
                case 1:
                    _b.sent();
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, create.mutateAsync(body)];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    onClose();
                    return [2 /*return*/];
            }
        });
    }); };
    var isPending = create.isPending || update.isPending;
    var error = create.error || update.error;
    var modelHint = (_h = (_g = PROVIDER_TYPES.find(function (p) { return p.value === form.providerType; })) === null || _g === void 0 ? void 0 : _g.hint) !== null && _h !== void 0 ? _h : '';
    return (<Modal_1.Modal open={open} onClose={onClose} title={existing ? 'Edit LLM Provider' : 'Add LLM Provider'}>
      <div className="space-y-3">
        <Input_1.Input label="Name" value={form.name} onChange={set('name')} placeholder="My Claude provider"/>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Provider type</label>
          <select value={form.providerType} onChange={set('providerType')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
            {PROVIDER_TYPES.map(function (p) { return <option key={p.value} value={p.value}>{p.label}</option>; })}
          </select>
        </div>

        <Input_1.Input label="API Key" type="password" value={form.apiKey} onChange={set('apiKey')} placeholder={existing ? '(leave blank to keep existing)' : 'sk-…'}/>

        <Input_1.Input label="Base URL (optional)" value={form.baseUrl} onChange={set('baseUrl')} placeholder={form.providerType === 'ollama' ? 'http://localhost:11434/v1' :
            form.providerType === 'deepseek' ? 'https://api.deepseek.com/v1' :
                'https://api.openai.com/v1'}/>

        <Input_1.Input label="Default model" value={form.defaultModel} onChange={set('defaultModel')} placeholder={modelHint}/>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.isActive} onChange={setCheck('isActive')} className="rounded border-gray-300 text-brand-600"/>
          Active
        </label>

        {error && <p className="text-sm text-red-600">{(0, api_client_1.errorMessage)(error)}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button_1.Button variant="secondary" onClick={onClose} disabled={isPending}>{t('common.cancel')}</Button_1.Button>
        <Button_1.Button onClick={handleSubmit} disabled={!form.name || !form.defaultModel || isPending}>
          {isPending ? t('common.loading') : t('common.save')}
        </Button_1.Button>
      </div>
    </Modal_1.Modal>);
}
// ── Doc-type config row ───────────────────────────────────────────────────────
function ConfigRow(_a) {
    var _this = this;
    var _b, _c, _d, _e, _f;
    var cfg = _a.cfg, providers = _a.providers;
    var t = (0, react_i18next_1.useTranslation)().t;
    var update = (0, useOcrConfig_1.useUpdateOcrConfig)();
    var _g = (0, react_1.useState)(false), open = _g[0], setOpen = _g[1];
    var _h = (0, react_1.useState)({
        ocrLanguage: cfg.ocrLanguage,
        ocrDpi: String((_b = cfg.ocrDpi) !== null && _b !== void 0 ? _b : 300),
        llmProviderId: (_c = cfg.llmProviderId) !== null && _c !== void 0 ? _c : '',
        llmModel: (_d = cfg.llmModel) !== null && _d !== void 0 ? _d : '',
        llmPromptTemplate: (_e = cfg.llmPromptTemplate) !== null && _e !== void 0 ? _e : '',
    }), form = _h[0], setForm = _h[1];
    var set = function (k) { return function (e) {
        return setForm(function (f) {
            var _a;
            return (__assign(__assign({}, f), (_a = {}, _a[k] = e.target.value, _a)));
        });
    }; };
    var handleSave = function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, update.mutateAsync({
                        documentType: cfg.documentType,
                        ocrLanguage: form.ocrLanguage,
                        ocrDpi: Number(form.ocrDpi) || 300,
                        llmProviderId: form.llmProviderId || null,
                        llmModel: form.llmModel || null,
                        llmPromptTemplate: form.llmPromptTemplate || null,
                    })];
                case 1:
                    _a.sent();
                    setOpen(false);
                    return [2 /*return*/];
            }
        });
    }); };
    var activeProvider = providers.find(function (p) { return p.id === cfg.llmProviderId; });
    return (<>
      <tr className="hover:bg-gray-50 group">
        <td className="py-2 pr-4 font-medium text-gray-800">{DOC_TYPE_LABELS[cfg.documentType]}</td>
        <td className="py-2 pr-4 text-gray-600">{cfg.ocrEngine} / {cfg.ocrLanguage}</td>
        <td className="py-2 pr-4 text-gray-600">{(_f = cfg.ocrDpi) !== null && _f !== void 0 ? _f : 300} dpi</td>
        <td className="py-2 pr-4 text-gray-600">
          {activeProvider
            ? <>{activeProvider.name} <span className="text-gray-400">({cfg.llmModel || activeProvider.defaultModel})</span></>
            : <span className="text-gray-400">—</span>}
        </td>
        <td className="py-2">
          <button className="text-xs text-brand-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity" onClick={function () { return setOpen(true); }}>
            Edit
          </button>
        </td>
      </tr>

      <Modal_1.Modal open={open} onClose={function () { return setOpen(false); }} title={"Config \u2014 ".concat(DOC_TYPE_LABELS[cfg.documentType])}>
        <div className="space-y-3">
          <Input_1.Input label="OCR Language(s)" value={form.ocrLanguage} onChange={set('ocrLanguage')} placeholder="por+eng"/>
          <Input_1.Input label="DPI" type="number" value={form.ocrDpi} onChange={set('ocrDpi')} placeholder="300"/>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">LLM Provider</label>
            <select value={form.llmProviderId} onChange={set('llmProviderId')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
              <option value="">— Use system default —</option>
              {providers.filter(function (p) { return p.isActive; }).map(function (p) { return (<option key={p.id} value={p.id}>{p.name}</option>); })}
            </select>
          </div>

          <Input_1.Input label="Model override (optional)" value={form.llmModel} onChange={set('llmModel')} placeholder="Leave blank to use provider default"/>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Custom extraction prompt (optional)</label>
            <textarea value={form.llmPromptTemplate} onChange={set('llmPromptTemplate')} rows={4} placeholder="Custom instructions for extracting data from this document type…" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"/>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button_1.Button variant="secondary" onClick={function () { return setOpen(false); }}>{t('common.cancel')}</Button_1.Button>
          <Button_1.Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? t('common.loading') : t('common.save')}
          </Button_1.Button>
        </div>
      </Modal_1.Modal>
    </>);
}
// ── Webhook modal ─────────────────────────────────────────────────────────────
function WebhookModal(_a) {
    var _this = this;
    var _b, _c, _d, _e;
    var open = _a.open, onClose = _a.onClose, existing = _a.existing;
    var t = (0, react_i18next_1.useTranslation)().t;
    var create = (0, useOcrConfig_1.useCreateWebhook)();
    var update = (0, useOcrConfig_1.useUpdateWebhook)();
    var _f = (0, react_1.useState)({
        name: (_b = existing === null || existing === void 0 ? void 0 : existing.name) !== null && _b !== void 0 ? _b : '',
        url: (_c = existing === null || existing === void 0 ? void 0 : existing.url) !== null && _c !== void 0 ? _c : '',
        secret: '',
        events: (_d = existing === null || existing === void 0 ? void 0 : existing.events) !== null && _d !== void 0 ? _d : [],
        isActive: (_e = existing === null || existing === void 0 ? void 0 : existing.isActive) !== null && _e !== void 0 ? _e : true,
    }), form = _f[0], setForm = _f[1];
    var set = function (k) { return function (e) {
        return setForm(function (f) {
            var _a;
            return (__assign(__assign({}, f), (_a = {}, _a[k] = e.target.value, _a)));
        });
    }; };
    var setCheck = function (k) { return function (e) {
        return setForm(function (f) {
            var _a;
            return (__assign(__assign({}, f), (_a = {}, _a[k] = e.target.checked, _a)));
        });
    }; };
    var toggleEvent = function (ev) {
        return setForm(function (f) { return (__assign(__assign({}, f), { events: f.events.includes(ev) ? f.events.filter(function (e) { return e !== ev; }) : __spreadArray(__spreadArray([], f.events, true), [ev], false) })); });
    };
    var handleSubmit = function () { return __awaiter(_this, void 0, void 0, function () {
        var body;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    body = {
                        name: form.name,
                        url: form.url,
                        events: form.events,
                        isActive: form.isActive,
                        secret: form.secret || null,
                    };
                    if (!existing) return [3 /*break*/, 2];
                    return [4 /*yield*/, update.mutateAsync(__assign({ id: existing.id }, body))];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, create.mutateAsync(body)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    onClose();
                    return [2 /*return*/];
            }
        });
    }); };
    var isPending = create.isPending || update.isPending;
    var error = create.error || update.error;
    return (<Modal_1.Modal open={open} onClose={onClose} title={existing ? 'Edit Webhook' : 'Add Webhook'}>
      <div className="space-y-3">
        <Input_1.Input label="Name" value={form.name} onChange={set('name')} placeholder="My webhook"/>
        <Input_1.Input label="URL" value={form.url} onChange={set('url')} placeholder="https://example.com/webhook"/>
        <Input_1.Input label="Secret (optional)" type="password" value={form.secret} onChange={set('secret')} placeholder={existing ? '(leave blank to keep existing)' : 'Signing secret for X-OCR-Signature header'}/>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Events</label>
          {WEBHOOK_EVENTS.map(function (ev) { return (<label key={ev.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.events.includes(ev.value)} onChange={function () { return toggleEvent(ev.value); }} className="rounded border-gray-300 text-brand-600"/>
              <span className="text-gray-700">{ev.label}</span>
              <span className="text-gray-400 text-xs font-mono">{ev.value}</span>
            </label>); })}
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.isActive} onChange={setCheck('isActive')} className="rounded border-gray-300 text-brand-600"/>
          Active
        </label>

        {error && <p className="text-sm text-red-600">{(0, api_client_1.errorMessage)(error)}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button_1.Button variant="secondary" onClick={onClose} disabled={isPending}>{t('common.cancel')}</Button_1.Button>
        <Button_1.Button onClick={handleSubmit} disabled={!form.name || !form.url || form.events.length === 0 || isPending}>
          {isPending ? t('common.loading') : t('common.save')}
        </Button_1.Button>
      </div>
    </Modal_1.Modal>);
}
// ── Webhooks section ──────────────────────────────────────────────────────────
function WebhooksSection() {
    var t = (0, react_i18next_1.useTranslation)().t;
    var _a = (0, useOcrConfig_1.useWebhooks)(), _b = _a.data, webhooks = _b === void 0 ? [] : _b, isLoading = _a.isLoading;
    var remove = (0, useOcrConfig_1.useDeleteWebhook)();
    var _c = (0, react_1.useState)(false), showAdd = _c[0], setShowAdd = _c[1];
    var _d = (0, react_1.useState)(), editWebhook = _d[0], setEditWebhook = _d[1];
    return (<section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Webhooks</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Receive HTTP POST notifications for OCR events. Signed with HMAC-SHA256 via <code className="bg-gray-100 px-1 rounded">X-OCR-Signature</code>.
          </p>
        </div>
        <Button_1.Button size="sm" onClick={function () { setEditWebhook(undefined); setShowAdd(true); }}>
          + Add webhook
        </Button_1.Button>
      </div>

      {isLoading ? (<p className="text-sm text-gray-400">{t('common.loading')}</p>) : webhooks.length === 0 ? (<p className="text-sm text-gray-500">No webhooks configured.</p>) : (<div className="space-y-3">
          {webhooks.map(function (wh) { return (<div key={wh.id} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800 text-sm">{wh.name}</span>
                  {!wh.isActive && <Badge_1.Badge variant="gray">Inactive</Badge_1.Badge>}
                </div>
                <p className="text-xs text-gray-500 truncate">{wh.url}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {wh.events.map(function (ev) { return (<span key={ev} className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-mono">
                      {ev}
                    </span>); })}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs ml-4 shrink-0">
                <button className="text-brand-600 hover:underline" onClick={function () { setEditWebhook(wh); setShowAdd(true); }}>
                  Edit
                </button>
                <button className="text-red-500 hover:text-red-700" onClick={function () { if (confirm('Delete this webhook?'))
                remove.mutate(wh.id); }} disabled={remove.isPending}>
                  Delete
                </button>
              </div>
            </div>); })}
        </div>)}

      {showAdd && (<WebhookModal open={showAdd} onClose={function () { setShowAdd(false); setEditWebhook(undefined); }} existing={editWebhook}/>)}
    </section>);
}
// ── Page ──────────────────────────────────────────────────────────────────────
function OcrConfigPage() {
    var t = (0, react_i18next_1.useTranslation)().t;
    var _a = (0, useOcrConfig_1.useLlmProviders)(), _b = _a.data, providers = _b === void 0 ? [] : _b, providersLoading = _a.isLoading;
    var _c = (0, useOcrConfig_1.useOcrConfigs)(), _d = _c.data, configs = _d === void 0 ? [] : _d, configsLoading = _c.isLoading;
    var deleteProvider = (0, useOcrConfig_1.useDeleteLlmProvider)();
    var setDefault = (0, useOcrConfig_1.useSetDefaultProvider)();
    var _e = (0, react_1.useState)(false), showAdd = _e[0], setShowAdd = _e[1];
    var _f = (0, react_1.useState)(), editProvider = _f[0], setEditProvider = _f[1];
    return (<div className="h-full flex flex-col">
      <PageHeader_1.PageHeader title={t('ocr.configTitle')} subtitle={t('ocr.configSubtitle')}/>

      <div className="flex-1 overflow-auto px-8 pb-8 space-y-10">

        {/* LLM Providers */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">LLM Providers</h2>
            <Button_1.Button size="sm" onClick={function () { setEditProvider(undefined); setShowAdd(true); }}>
              + Add provider
            </Button_1.Button>
          </div>

          {providersLoading ? (<p className="text-sm text-gray-400">{t('common.loading')}</p>) : providers.length === 0 ? (<p className="text-sm text-gray-500">No providers configured. Add one to enable LLM extraction.</p>) : (<div className="space-y-3">
              {providers.map(function (p) {
                var _a;
                return (<div key={p.id} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 text-sm">{p.name}</span>
                      {p.isDefault && <Badge_1.Badge variant="green">Default</Badge_1.Badge>}
                      {!p.isActive && <Badge_1.Badge variant="gray">Inactive</Badge_1.Badge>}
                    </div>
                    <p className="text-xs text-gray-500">
                      {(_a = PROVIDER_TYPES.find(function (t) { return t.value === p.providerType; })) === null || _a === void 0 ? void 0 : _a.label} · {p.defaultModel}
                      {p.baseUrl && <> · {p.baseUrl}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {!p.isDefault && (<button className="text-gray-500 hover:text-gray-700" onClick={function () { return setDefault.mutate(p.id); }} disabled={setDefault.isPending}>
                        Set default
                      </button>)}
                    <button className="text-brand-600 hover:underline" onClick={function () { setEditProvider(p); setShowAdd(true); }}>
                      Edit
                    </button>
                    <button className="text-red-500 hover:text-red-700" onClick={function () { if (confirm('Delete this provider?'))
                    deleteProvider.mutate(p.id); }}>
                      Delete
                    </button>
                  </div>
                </div>);
            })}
            </div>)}
        </section>

        {/* Per-type config */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Per-Document-Type Configuration
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Configure OCR language, resolution, and LLM provider per document type.
            If no provider is set for a type, the system default is used.
          </p>

          {configsLoading ? (<p className="text-sm text-gray-400">{t('common.loading')}</p>) : (<table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="pb-2 pr-4 font-medium">Document type</th>
                  <th className="pb-2 pr-4 font-medium">OCR engine / language</th>
                  <th className="pb-2 pr-4 font-medium">Resolution</th>
                  <th className="pb-2 pr-4 font-medium">LLM provider / model</th>
                  <th className="pb-2 font-medium"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {configs.map(function (cfg) { return (<ConfigRow key={cfg.documentType} cfg={cfg} providers={providers}/>); })}
              </tbody>
            </table>)}
        </section>

        {/* Webhooks */}
        <WebhooksSection />
      </div>

      {showAdd && (<ProviderModal open={showAdd} onClose={function () { setShowAdd(false); setEditProvider(undefined); }} existing={editProvider}/>)}
    </div>);
}
