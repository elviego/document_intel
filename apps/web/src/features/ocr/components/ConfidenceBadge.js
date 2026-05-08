"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfidenceBadge = ConfidenceBadge;
var clsx_1 = require("clsx");
function ConfidenceBadge(_a) {
    var value = _a.value, className = _a.className;
    if (value == null)
        return <span className={(0, clsx_1.default)('text-gray-400 text-xs', className)}>—</span>;
    var pct = Math.round(value * 100);
    var color = pct >= 80 ? 'text-green-700 bg-green-50' : pct >= 50 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';
    return (<span className={(0, clsx_1.default)('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', color, className)}>
      {pct}%
    </span>);
}
