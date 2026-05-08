"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageHeader = PageHeader;
function PageHeader(_a) {
    var title = _a.title, subtitle = _a.subtitle, actions = _a.actions;
    return (<div className="flex items-start justify-between px-8 pt-8 pb-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>);
}
