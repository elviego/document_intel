import { Outlet, NavLink } from 'react-router-dom'
import clsx from 'clsx'

const navItems = [
  { to: '/ocr',          label: 'Documents' },
  { to: '/ocr/metrics',  label: 'Metrics' },
  { to: '/ocr/config',   label: 'Configuration' },
] as const

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-gray-200">
          <span className="text-brand-700 font-bold text-lg tracking-tight">OCR Studio</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/ocr'}
              className={({ isActive }) =>
                clsx('flex items-center px-3 py-2 text-sm rounded-md font-medium transition-colors', {
                  'bg-brand-50 text-brand-700': isActive,
                  'text-gray-600 hover:bg-gray-50 hover:text-gray-900': !isActive,
                })
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
