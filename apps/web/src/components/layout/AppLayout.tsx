import { Outlet, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard',     key: 'dashboard' },
  { to: '/transactions',  key: 'transactions' },
  { to: '/summary',       key: 'summary' },
  { to: '/salaries',      key: 'salaries' },
  { to: '/meals',         key: 'meals' },
  { to: '/students',      key: 'students' },
  { to: '/budget',        key: 'budget' },
  { to: '/employees',     key: 'employees' },
  { to: '/activities',    key: 'activities' },
  { to: '/ocr',           key: 'ocr' },
] as const

const adminItems = [
  { to: '/enrollment-plans', key: 'enrollmentPlans' },
  { to: '/categories',       key: 'categories' },
  { to: '/bank-accounts',    key: 'bankAccounts' },
  { to: '/school-years',     key: 'schoolYears' },
  { to: '/users',            key: 'users' },
] as const

export function AppLayout() {
  const { t, i18n } = useTranslation()
  const { logout, user } = useAuth()

  function toggleLang() {
    const next = i18n.language === 'pt' ? 'en' : 'pt'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-gray-200">
          <span className="text-brand-700 font-bold text-lg tracking-tight">Tribo Verde</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {navItems.map(({ to, key }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx('flex items-center px-3 py-2 text-sm rounded-md font-medium transition-colors', {
                  'bg-brand-50 text-brand-700': isActive,
                  'text-gray-600 hover:bg-gray-50 hover:text-gray-900': !isActive,
                })
              }
            >
              {t(`nav.${key}`)}
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <>
              <div className="pt-4 pb-1 px-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Admin</span>
              </div>
              {adminItems.map(({ to, key }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    clsx('flex items-center px-3 py-2 text-sm rounded-md font-medium transition-colors', {
                      'bg-brand-50 text-brand-700': isActive,
                      'text-gray-600 hover:bg-gray-50 hover:text-gray-900': !isActive,
                    })
                  }
                >
                  {t(`nav.${key}`)}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-gray-200 space-y-1">
          {user && (
            <p className="px-3 py-1 text-xs text-gray-400 truncate">{user.fullName}</p>
          )}
          <button
            onClick={toggleLang}
            className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-50"
          >
            {i18n.language === 'pt' ? '🇬🇧 English' : '🇵🇹 Português'}
          </button>
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-red-600 rounded-md hover:bg-red-50"
          >
            {t('auth.signOut')}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
