"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryClient = void 0;
var react_query_1 = require("@tanstack/react-query");
exports.queryClient = new react_query_1.QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 min
            retry: 1,
        },
    },
});
