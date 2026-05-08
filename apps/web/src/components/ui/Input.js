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
exports.Input = Input;
var clsx_1 = require("clsx");
function Input(_a) {
    var label = _a.label, error = _a.error, className = _a.className, props = __rest(_a, ["label", "error", "className"]);
    return (<div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <input className={(0, clsx_1.default)('block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm', 'placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500', error && 'border-red-500 focus:border-red-500 focus:ring-red-500', className)} {...props}/>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>);
}
