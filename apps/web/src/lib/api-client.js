"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiClient = exports.ApiError = void 0;
exports.errorMessage = errorMessage;
var BASE_URL = (_a = import.meta.env.VITE_API_URL) !== null && _a !== void 0 ? _a : '';
console.log('[api] BASE_URL =', BASE_URL || '(empty — VITE_API_URL not set, using same origin)');
var ApiError = /** @class */ (function (_super) {
    __extends(ApiError, _super);
    function ApiError(status, code, message, reqId) {
        var _this = _super.call(this, message) || this;
        _this.status = status;
        _this.code = code;
        _this.reqId = reqId;
        _this.name = 'ApiError';
        return _this;
    }
    Object.defineProperty(ApiError.prototype, "isUnauthorized", {
        get: function () { return this.status === 401; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ApiError.prototype, "isForbidden", {
        get: function () { return this.status === 403; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ApiError.prototype, "isNotFound", {
        get: function () { return this.status === 404; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ApiError.prototype, "isConflict", {
        get: function () { return this.status === 409; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ApiError.prototype, "isValidation", {
        get: function () { return this.status === 400; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ApiError.prototype, "isServerError", {
        get: function () { return this.status >= 500; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ApiError.prototype, "userMessage", {
        /** User-facing message with optional request ID for support */
        get: function () {
            if (this.isUnauthorized)
                return 'Session expired — please log in again.';
            if (this.isForbidden)
                return 'You do not have permission to perform this action.';
            if (this.isNotFound)
                return 'The requested resource was not found.';
            if (this.isConflict)
                return this.message;
            if (this.isValidation)
                return this.message;
            if (this.isServerError)
                return "Server error".concat(this.reqId ? " (ref: ".concat(this.reqId, ")") : '', ". Please try again or contact support.");
            return this.message;
        },
        enumerable: false,
        configurable: true
    });
    return ApiError;
}(Error));
exports.ApiError = ApiError;
function requestForm(path, body) {
    return __awaiter(this, void 0, void 0, function () {
        var token, url, res, err_1, b, msg;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    token = localStorage.getItem('access_token');
                    url = "".concat(BASE_URL).concat(path);
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch(url, {
                            method: 'POST',
                            headers: token ? { Authorization: "Bearer ".concat(token) } : {},
                            body: body,
                        })];
                case 2:
                    res = _d.sent();
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _d.sent();
                    throw new Error("Network error \u2014 cannot reach API at ".concat(BASE_URL || 'same origin', ". Check your connection."));
                case 4:
                    if (!!res.ok) return [3 /*break*/, 6];
                    return [4 /*yield*/, res.json().catch(function () { return ({}); })];
                case 5:
                    b = _d.sent();
                    msg = (_b = (_a = b.message) !== null && _a !== void 0 ? _a : b.error) !== null && _b !== void 0 ? _b : "".concat(res.status, " ").concat(res.statusText);
                    throw new ApiError(res.status, (_c = b.code) !== null && _c !== void 0 ? _c : 'UNKNOWN', msg, b.reqId);
                case 6: return [2 /*return*/, res.json()];
            }
        });
    });
}
function request(path, options) {
    return __awaiter(this, void 0, void 0, function () {
        var token, url, method, res, err_2, body, message, code, reqId;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    token = localStorage.getItem('access_token');
                    url = "".concat(BASE_URL).concat(path);
                    method = (_a = options === null || options === void 0 ? void 0 : options.method) !== null && _a !== void 0 ? _a : 'GET';
                    console.log("[api] ".concat(method, " ").concat(url));
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch(url, __assign({ headers: __assign({ 'Content-Type': 'application/json' }, (token ? { Authorization: "Bearer ".concat(token) } : {})) }, options))];
                case 2:
                    res = _e.sent();
                    return [3 /*break*/, 4];
                case 3:
                    err_2 = _e.sent();
                    console.error("[api] ".concat(method, " ").concat(url, " \u2192 network error:"), err_2);
                    throw new Error("Network error \u2014 cannot reach API at ".concat(BASE_URL || 'same origin', ". Check your connection."));
                case 4:
                    if (!!res.ok) return [3 /*break*/, 6];
                    return [4 /*yield*/, res.json().catch(function () { return ({}); })];
                case 5:
                    body = _e.sent();
                    message = (_c = (_b = body.message) !== null && _b !== void 0 ? _b : body.error) !== null && _c !== void 0 ? _c : "".concat(res.status, " ").concat(res.statusText);
                    code = (_d = body.code) !== null && _d !== void 0 ? _d : 'UNKNOWN';
                    reqId = body.reqId;
                    console.error("[api] ".concat(method, " ").concat(url, " \u2192 ").concat(res.status), { code: code, reqId: reqId, body: body });
                    throw new ApiError(res.status, code, message, reqId);
                case 6: return [2 /*return*/, res.json()];
            }
        });
    });
}
/** Returns the best user-facing message from any thrown error. */
function errorMessage(err) {
    if (err instanceof ApiError)
        return err.userMessage;
    if (err instanceof Error)
        return err.message;
    return 'An unexpected error occurred.';
}
exports.apiClient = {
    get: function (path) { return request(path); },
    post: function (path, body) { return request(path, { method: 'POST', body: JSON.stringify(body) }); },
    put: function (path, body) { return request(path, { method: 'PUT', body: JSON.stringify(body) }); },
    patch: function (path, body) { return request(path, { method: 'PATCH', body: JSON.stringify(body) }); },
    delete: function (path) { return request(path, { method: 'DELETE' }); },
    postForm: function (path, body) { return requestForm(path, body); },
};
