import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppLayout }   from '@/components/layout/AppLayout'
import { AuthLayout }  from '@/components/layout/AuthLayout'
import { RequireAuth } from '@/components/auth/RequireAuth'

const Spinner = () => <div className="p-8 text-gray-400 text-sm">Loading…</div>
const s = (C: React.LazyExoticComponent<() => JSX.Element>) => (
  <Suspense fallback={<Spinner />}><C /></Suspense>
)

// Auth pages
const LoginPage         = lazy(() => import('@/features/auth/LoginPage'))
const AcceptInvitePage  = lazy(() => import('@/features/auth/AcceptInvitePage'))

// App pages
const DashboardPage    = lazy(() => import('@/features/dashboard/DashboardPage'))
const TransactionsPage = lazy(() => import('@/features/transactions/TransactionsPage'))
const SummaryPage      = lazy(() => import('@/features/summary/SummaryPage'))
const SalariesPage     = lazy(() => import('@/features/salaries/SalariesPage'))
const MealsPage        = lazy(() => import('@/features/meals/MealsPage'))
const BudgetPage       = lazy(() => import('@/features/budget/BudgetPage'))
const EmployeesPage    = lazy(() => import('@/features/employees/EmployeesPage'))
const ActivitiesPage   = lazy(() => import('@/features/activities/ActivitiesPage'))

// Admin pages
const CategoriesPage   = lazy(() => import('@/features/categories/CategoriesPage'))
const BankAccountsPage = lazy(() => import('@/features/bank-accounts/BankAccountsPage'))
const SchoolYearsPage  = lazy(() => import('@/features/school-years/SchoolYearsPage'))
const UsersPage        = lazy(() => import('@/features/users/UsersPage'))

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { path: 'login',          element: s(LoginPage) },
      { path: 'accept-invite',  element: s(AcceptInvitePage) },
    ],
  },
  {
    path: '/',
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [
      { index: true,            element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard',      element: s(DashboardPage) },
      { path: 'transactions',   element: s(TransactionsPage) },
      { path: 'summary',        element: s(SummaryPage) },
      { path: 'salaries',       element: <RequireAuth role="admin">{s(SalariesPage)}</RequireAuth> },
      { path: 'meals',          element: s(MealsPage) },
      { path: 'budget',         element: s(BudgetPage) },
      { path: 'employees',      element: s(EmployeesPage) },
      { path: 'activities',     element: s(ActivitiesPage) },
      // Admin-only
      { path: 'categories',     element: <RequireAuth role="admin">{s(CategoriesPage)}</RequireAuth> },
      { path: 'bank-accounts',  element: <RequireAuth role="admin">{s(BankAccountsPage)}</RequireAuth> },
      { path: 'school-years',   element: <RequireAuth role="admin">{s(SchoolYearsPage)}</RequireAuth> },
      { path: 'users',          element: <RequireAuth role="admin">{s(UsersPage)}</RequireAuth> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
