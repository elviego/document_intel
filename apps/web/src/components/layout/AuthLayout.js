"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthLayout = AuthLayout;
var react_router_dom_1 = require("react-router-dom");
function AuthLayout() {
    return (<div className="min-h-screen bg-gradient-to-br from-brand-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-700">Tribo Verde</h1>
          <p className="text-gray-500 mt-1 text-sm">Gestão Financeira</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <react_router_dom_1.Outlet />
        </div>
      </div>
    </div>);
}
