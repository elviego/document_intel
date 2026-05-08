"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VITE_API_URL = void 0;
exports.useOcrDocuments = useOcrDocuments;
exports.useOcrDocument = useOcrDocument;
exports.useOcrMetricsAggregate = useOcrMetricsAggregate;
exports.useOcrMetricsList = useOcrMetricsList;
exports.useOcrMetricsTrending = useOcrMetricsTrending;
exports.useUploadDocument = useUploadDocument;
exports.useBatchUpload = useBatchUpload;
exports.useProcessDocument = useProcessDocument;
exports.useDeleteDocument = useDeleteDocument;
exports.documentFileUrl = documentFileUrl;
exports.documentExportUrl = documentExportUrl;
var react_query_1 = require("@tanstack/react-query");
var api_client_1 = require("@/lib/api-client");
// ── Queries ──────────────────────────────────────────────────────────────────
function useOcrDocuments(page) {
    if (page === void 0) { page = 0; }
    return (0, react_query_1.useQuery)({
        queryKey: ['ocr-documents', page],
        queryFn: function () { return api_client_1.apiClient.get("/v1/ocr/documents?limit=50&offset=".concat(page * 50)); },
    });
}
function useOcrDocument(id) {
    return (0, react_query_1.useQuery)({
        queryKey: ['ocr-document', id],
        queryFn: function () { return api_client_1.apiClient.get("/v1/ocr/documents/".concat(id)); },
        enabled: !!id,
        refetchInterval: function (query) {
            var _a;
            var status = (_a = query.state.data) === null || _a === void 0 ? void 0 : _a.document.status;
            return status === 'pending' || status === 'processing' ? 3000 : false;
        },
    });
}
function useOcrMetricsAggregate() {
    return (0, react_query_1.useQuery)({
        queryKey: ['ocr-metrics-aggregate'],
        queryFn: function () { return api_client_1.apiClient.get('/v1/ocr/documents/metrics/aggregate'); },
    });
}
function useOcrMetricsList(opts) {
    return (0, react_query_1.useQuery)({
        queryKey: ['ocr-metrics-list', opts],
        queryFn: function () {
            var p = new URLSearchParams({ limit: '100' });
            if (opts === null || opts === void 0 ? void 0 : opts.documentId)
                p.set('documentId', opts.documentId);
            return api_client_1.apiClient.get("/v1/ocr/documents/metrics/list?".concat(p));
        },
    });
}
function useOcrMetricsTrending(days, documentType) {
    if (days === void 0) { days = 30; }
    return (0, react_query_1.useQuery)({
        queryKey: ['ocr-metrics-trending', days, documentType],
        queryFn: function () {
            var p = new URLSearchParams({ days: String(days) });
            if (documentType)
                p.set('documentType', documentType);
            return api_client_1.apiClient.get("/v1/ocr/documents/metrics/trending?".concat(p));
        },
    });
}
// ── Mutations ─────────────────────────────────────────────────────────────────
function useUploadDocument() {
    var qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (formData) { return api_client_1.apiClient.postForm('/v1/ocr/documents', formData); },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['ocr-documents'] }); },
    });
}
function useBatchUpload() {
    var qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (formData) {
            return api_client_1.apiClient.postForm('/v1/ocr/documents/batch', formData);
        },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['ocr-documents'] }); },
    });
}
function useProcessDocument() {
    var qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, override = _a.override;
            return api_client_1.apiClient.post("/v1/ocr/documents/".concat(id, "/process"), override !== null && override !== void 0 ? override : {});
        },
        onSuccess: function (_data, _a) {
            var id = _a.id;
            qc.invalidateQueries({ queryKey: ['ocr-documents'] });
            qc.invalidateQueries({ queryKey: ['ocr-document', id] });
            qc.invalidateQueries({ queryKey: ['ocr-metrics-aggregate'] });
            qc.invalidateQueries({ queryKey: ['ocr-metrics-trending'] });
        },
    });
}
function useDeleteDocument() {
    var qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_client_1.apiClient.delete("/v1/ocr/documents/".concat(id)); },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['ocr-documents'] }); },
    });
}
exports.VITE_API_URL = (_b = (_a = import.meta.env) === null || _a === void 0 ? void 0 : _a.VITE_API_URL) !== null && _b !== void 0 ? _b : '';
function documentFileUrl(id) {
    return "".concat(exports.VITE_API_URL, "/v1/ocr/documents/").concat(id, "/file");
}
function documentExportUrl(id, format) {
    return "".concat(exports.VITE_API_URL, "/v1/ocr/documents/").concat(id, "/export?format=").concat(format);
}
