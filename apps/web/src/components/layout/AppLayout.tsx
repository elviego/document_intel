import { Outlet, NavLink } from 'react-router-dom'
import clsx from 'clsx'

const navItems = [
  { to: '/ocr',          label: 'Documents',     icon: '▤' },
  { to: '/ocr/metrics',  label: 'Metrics',        icon: '◈' },
  { to: '/ocr/config',   label: 'Configuration',  icon: '⚙' },
] as const

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 flex flex-col bg-[#0d1117] border-r border-[#21262d]">
        <div className="h-14 flex items-center px-5 border-b border-[#21262d]">
          <span className="text-white font-semibold text-sm tracking-widest uppercase">OCR Studio</span>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/ocr'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2.5 px-3 py-2 text-sm rounded transition-colors',
                  isActive
                    ? 'bg-[#161b22] text-brand-400 border-l-2 border-brand-500'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#161b22] border-l-2 border-transparent',
                )
              }
            >
              <span className="text-xs opacity-70">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-[#21262d]">
          <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">v1.0</p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}
