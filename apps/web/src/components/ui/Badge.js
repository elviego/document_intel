"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Badge = Badge;
var clsx_1 = require("clsx");
var styles = {
    green: 'bg-green-50 text-green-700 ring-green-600/20',
    red: 'bg-red-50 text-red-700 ring-red-600/20',
    gray: 'bg-gray-50 text-gray-600 ring-gray-500/10',
    blue: 'bg-blue-50 text-blue-700 ring-blue-700/10',
    yellow: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
};
function Badge(_a) {
    var children = _a.children, _b = _a.variant, variant = _b === void 0 ? 'gray' : _b;
    return (<span className={(0, clsx_1.default)('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', styles[variant])}>
      {children}
    </span>);
}
