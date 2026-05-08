"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Modal = Modal;
var react_1 = require("react");
function Modal(_a) {
    var open = _a.open, onClose = _a.onClose, title = _a.title, children = _a.children;
    (0, react_1.useEffect)(function () {
        var handler = function (e) { if (e.key === 'Escape')
            onClose(); };
        document.addEventListener('keydown', handler);
        return function () { return document.removeEventListener('keydown', handler); };
    }, [onClose]);
    if (!open)
        return null;
    return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}/>
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>);
}
