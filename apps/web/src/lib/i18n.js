"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var i18next_1 = require("i18next");
var react_i18next_1 = require("react-i18next");
var pt_json_1 = require("../locales/pt.json");
var en_json_1 = require("../locales/en.json");
i18next_1.default.use(react_i18next_1.initReactI18next).init({
    resources: { pt: { translation: pt_json_1.default }, en: { translation: en_json_1.default } },
    lng: (_a = localStorage.getItem('lang')) !== null && _a !== void 0 ? _a : 'pt',
    fallbackLng: 'pt',
    interpolation: { escapeValue: false },
});
exports.default = i18next_1.default;
