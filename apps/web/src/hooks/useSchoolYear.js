"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSchoolYears = useSchoolYears;
exports.currentSchoolYearName = currentSchoolYearName;
var react_query_1 = require("@tanstack/react-query");
var api_client_1 = require("@/lib/api-client");
function useSchoolYears() {
    return (0, react_query_1.useQuery)({
        queryKey: ['school-years'],
        queryFn: function () { return api_client_1.apiClient.get('/v1/school-years'); },
    });
}
/** Resolves current school year (Sep–Aug cycle) */
function currentSchoolYearName() {
    var now = new Date();
    var m = now.getMonth() + 1;
    var y = now.getFullYear();
    return m >= 9
        ? "".concat(y, "-").concat(String(y + 1).slice(2))
        : "".concat(y - 1, "-").concat(String(y).slice(2));
}
