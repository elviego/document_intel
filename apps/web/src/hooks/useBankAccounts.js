"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useBankAccounts = useBankAccounts;
var react_query_1 = require("@tanstack/react-query");
var api_client_1 = require("@/lib/api-client");
function useBankAccounts() {
    return (0, react_query_1.useQuery)({
        queryKey: ['bank-accounts'],
        queryFn: function () { return api_client_1.apiClient.get('/v1/bank-accounts'); },
    });
}
