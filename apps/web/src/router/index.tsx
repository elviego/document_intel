import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'

// Pages — lazy loaded per feature
import { lazy, Suspense } from 'react'

const withSuspense = (Component: React.LazyExoticComponent<() => JSX.Element>) => (
  <Suspense fallback={<div className="p-8 text-gray-400">Loading…</div>}>
    <Component />
  </Suspense>
)

const LoginPage        = lazy(() => import('@/features/auth/LoginPage'))
const DashboardPage    = lazy(() => import('@/features/dashboard/DashboardPage'))
const TransactionsPage = lazy(() => import('@/features/transactions/TransactionsPage'))
const SummaryPage      = lazy(() => import('@/features/summary/SummaryPage'))
const SalariesPage     = lazy(() => import('@/features/salaries/SalariesPage'))
const MealsPage        = lazy(() => import('@/features/meals/MealsPage'))
const BudgetPage       = lazy(() => import('@/features/budget/BudgetPage'))
const CategoriesPage   = lazy(() => import('@/features/categories/CategoriesPage'))
const BankAccountsPage = lazy(() => import('@/features/bank-accounts/BankAccountsPage'))
const SchoolYearsPage  = lazy(() => import('@/features/school-years/SchoolYearsPage'))
const UsersPage        = lazy(() => import('@/features/users/UsersPage'))

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: withSuspense(LoginPage) },
    ],
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard',    element: withSuspense(DashboardPage) },
      { path: 'transactions', element: withSuspense(TransactionsPage) },
      { path: 'summary',      element: withSuspense(SummaryPage) },
      { path: 'salaries',     element: withSuspense(SalariesPage) },
      { path: 'meals',        element: withSuspense(MealsPage) },
      { path: 'budget',       element: withSuspense(BudgetPage) },
      // Admin only
      { path: 'categories',   element: withSuspense(CategoriesPage) },
      { path: 'bank-accounts',element: withSuspense(BankAccountsPage) },
      { path: 'school-years', element: withSuspense(SchoolYearsPage) },
      { path: 'users',        element: withSuspense(UsersPage) },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
