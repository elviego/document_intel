"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCategories = useCategories;
var react_query_1 = require("@tanstack/react-query");
var api_client_1 = require("@/lib/api-client");
function useCategories(includeInactive) {
    if (includeInactive === void 0) { includeInactive = false; }
    return (0, react_query_1.useQuery)({
        queryKey: ['categories', { includeInactive: includeInactive }],
        queryFn: function () { return api_client_1.apiClient.get("/v1/categories?includeInactive=".concat(includeInactive)); },
    });
}
