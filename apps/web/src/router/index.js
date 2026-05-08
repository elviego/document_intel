"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
var react_router_dom_1 = require("react-router-dom");
var react_1 = require("react");
var AppLayout_1 = require("@/components/layout/AppLayout");
var AuthLayout_1 = require("@/components/layout/AuthLayout");
var RequireAuth_1 = require("@/components/auth/RequireAuth");
var Spinner = function () { return <div className="p-8 text-gray-400 text-sm">Loading…</div>; };
var s = function (C) { return (<react_1.Suspense fallback={<Spinner />}><C /></react_1.Suspense>); };
// Auth pages
var LoginPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/features/auth/LoginPage'); }); });
var AcceptInvitePage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/features/auth/AcceptInvitePage'); }); });
// App pages
var DashboardPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/features/dashboard/DashboardPage'); }); });
var TransactionsPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/features/transactions/TransactionsPage'); }); });
var SummaryPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/features/summary/SummaryPage'); }); });
var SalariesPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/features/salaries/SalariesPage'); }); });
var MealsPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/features/meals/MealsPage'); }); });
var BudgetPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/features/budget/BudgetPage'); }); });
var EmployeesPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/features/employees/EmployeesPage'); }); });
var ActivitiesPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/features/activities/ActivitiesPage'); }); });
var StudentsPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/features/students/StudentsPage'); }); });
var EnrollmentPlansPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/features/enrollment-plans/EnrollmentPlansPage'); }); });
// OCR pages
var OcrPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/features/ocr/OcrPage'); }); });
var OcrDocumentPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/features/ocr/OcrDocumentPage'); }); });
var OcrConfigPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/features/ocr/OcrConfigPage'); }); });
var OcrMetricsPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/features/ocr/OcrMetricsPage'); }); });
// Admin pages
var CategoriesPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/features/categories/CategoriesPage'); }); });
var BankAccountsPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/features/bank-accounts/BankAccountsPage'); }); });
var SchoolYearsPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/features/school-years/SchoolYearsPage'); }); });
var UsersPage = (0, react_1.lazy)(function () { return Promise.resolve().then(function () { return require('@/features/users/UsersPage'); }); });
exports.router = (0, react_router_dom_1.createBrowserRouter)([
    {
        path: '/auth',
        element: <AuthLayout_1.AuthLayout />,
        children: [
            { path: 'login', element: s(LoginPage) },
            { path: 'accept-invite', element: s(AcceptInvitePage) },
        ],
    },
    {
        path: '/',
        element: <RequireAuth_1.RequireAuth><AppLayout_1.AppLayout /></RequireAuth_1.RequireAuth>,
        children: [
            { index: true, element: <react_router_dom_1.Navigate to="/dashboard" replace/> },
            { path: 'dashboard', element: s(DashboardPage) },
            { path: 'transactions', element: s(TransactionsPage) },
            { path: 'summary', element: s(SummaryPage) },
            { path: 'salaries', element: <RequireAuth_1.RequireAuth role="admin">{s(SalariesPage)}</RequireAuth_1.RequireAuth> },
            { path: 'meals', element: s(MealsPage) },
            { path: 'budget', element: s(BudgetPage) },
            { path: 'employees', element: s(EmployeesPage) },
            { path: 'activities', element: s(ActivitiesPage) },
            { path: 'students', element: s(StudentsPage) },
            // Admin-only
            // OCR module
            { path: 'ocr', element: s(OcrPage) },
            { path: 'ocr/:id', element: s(OcrDocumentPage) },
            { path: 'ocr/config', element: <RequireAuth_1.RequireAuth role="admin">{s(OcrConfigPage)}</RequireAuth_1.RequireAuth> },
            { path: 'ocr/metrics', element: <RequireAuth_1.RequireAuth role="admin">{s(OcrMetricsPage)}</RequireAuth_1.RequireAuth> },
            // Admin-only
            { path: 'enrollment-plans', element: <RequireAuth_1.RequireAuth role="admin">{s(EnrollmentPlansPage)}</RequireAuth_1.RequireAuth> },
            { path: 'categories', element: <RequireAuth_1.RequireAuth role="admin">{s(CategoriesPage)}</RequireAuth_1.RequireAuth> },
            { path: 'bank-accounts', element: <RequireAuth_1.RequireAuth role="admin">{s(BankAccountsPage)}</RequireAuth_1.RequireAuth> },
            { path: 'school-years', element: <RequireAuth_1.RequireAuth role="admin">{s(SchoolYearsPage)}</RequireAuth_1.RequireAuth> },
            { path: 'users', element: <RequireAuth_1.RequireAuth role="admin">{s(UsersPage)}</RequireAuth_1.RequireAuth> },
        ],
    },
    { path: '*', element: <react_router_dom_1.Navigate to="/dashboard" replace/> },
]);
