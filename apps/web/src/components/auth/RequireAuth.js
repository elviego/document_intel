"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequireAuth = RequireAuth;
var react_router_dom_1 = require("react-router-dom");
var auth_1 = require("@/lib/auth");
function RequireAuth(_a) {
    var children = _a.children, role = _a.role;
    var location = (0, react_router_dom_1.useLocation)();
    var user = auth_1.auth.getUser();
    if (!auth_1.auth.isAuthenticated()) {
        return <react_router_dom_1.Navigate to="/auth/login" state={{ from: location }} replace/>;
    }
    if (role && (user === null || user === void 0 ? void 0 : user.role) !== role) {
        return <react_router_dom_1.Navigate to="/dashboard" replace/>;
    }
    return <>{children}</>;
}
