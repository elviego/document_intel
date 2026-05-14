interface Props {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200">
      <div className="flex items-baseline gap-3">
        <h1 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">{title}</h1>
        {subtitle && <span className="text-xs text-gray-400 font-mono">{subtitle}</span>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
