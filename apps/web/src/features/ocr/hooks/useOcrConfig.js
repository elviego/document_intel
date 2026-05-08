"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useLlmProviders = useLlmProviders;
exports.useCreateLlmProvider = useCreateLlmProvider;
exports.useUpdateLlmProvider = useUpdateLlmProvider;
exports.useDeleteLlmProvider = useDeleteLlmProvider;
exports.useSetDefaultProvider = useSetDefaultProvider;
exports.useOcrConfigs = useOcrConfigs;
exports.useUpdateOcrConfig = useUpdateOcrConfig;
exports.useWebhooks = useWebhooks;
exports.useCreateWebhook = useCreateWebhook;
exports.useUpdateWebhook = useUpdateWebhook;
exports.useDeleteWebhook = useDeleteWebhook;
var react_query_1 = require("@tanstack/react-query");
var api_client_1 = require("@/lib/api-client");
// ── Providers ─────────────────────────────────────────────────────────────────
function useLlmProviders() {
    return (0, react_query_1.useQuery)({
        queryKey: ['ocr-llm-providers'],
        queryFn: function () { return api_client_1.apiClient.get('/v1/ocr/providers'); },
    });
}
function useCreateLlmProvider() {
    var qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (body) {
            return api_client_1.apiClient.post('/v1/ocr/providers', body);
        },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['ocr-llm-providers'] }); },
    });
}
function useUpdateLlmProvider() {
    var qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, body = __rest(_a, ["id"]);
            return api_client_1.apiClient.patch("/v1/ocr/providers/".concat(id), body);
        },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['ocr-llm-providers'] }); },
    });
}
function useDeleteLlmProvider() {
    var qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_client_1.apiClient.delete("/v1/ocr/providers/".concat(id)); },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['ocr-llm-providers'] }); },
    });
}
function useSetDefaultProvider() {
    var qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_client_1.apiClient.put("/v1/ocr/providers/".concat(id, "/default"), {}); },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['ocr-llm-providers'] }); },
    });
}
// ── Configs ───────────────────────────────────────────────────────────────────
function useOcrConfigs() {
    return (0, react_query_1.useQuery)({
        queryKey: ['ocr-configs'],
        queryFn: function () { return api_client_1.apiClient.get('/v1/ocr/configs'); },
    });
}
function useUpdateOcrConfig() {
    var qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var documentType = _a.documentType, body = __rest(_a, ["documentType"]);
            return api_client_1.apiClient.put("/v1/ocr/configs/".concat(documentType), body);
        },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['ocr-configs'] }); },
    });
}
function useWebhooks() {
    return (0, react_query_1.useQuery)({
        queryKey: ['ocr-webhooks'],
        queryFn: function () { return api_client_1.apiClient.get('/v1/ocr/webhooks'); },
    });
}
function useCreateWebhook() {
    var qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (body) {
            return api_client_1.apiClient.post('/v1/ocr/webhooks', body);
        },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['ocr-webhooks'] }); },
    });
}
function useUpdateWebhook() {
    var qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, body = __rest(_a, ["id"]);
            return api_client_1.apiClient.patch("/v1/ocr/webhooks/".concat(id), body);
        },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['ocr-webhooks'] }); },
    });
}
function useDeleteWebhook() {
    var qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (id) { return api_client_1.apiClient.delete("/v1/ocr/webhooks/".concat(id)); },
        onSuccess: function () { return qc.invalidateQueries({ queryKey: ['ocr-webhooks'] }); },
    });
}
