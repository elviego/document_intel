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
exports.Select = Select;
var clsx_1 = require("clsx");
function Select(_a) {
    var label = _a.label, options = _a.options, className = _a.className, props = __rest(_a, ["label", "options", "className"]);
    return (<div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <select className={(0, clsx_1.default)('block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm bg-white', 'focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500', className)} {...props}>
        {options.map(function (o) { return <option key={o.value} value={o.value}>{o.label}</option>; })}
      </select>
    </div>);
}
