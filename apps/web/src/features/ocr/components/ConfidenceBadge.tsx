import clsx from 'clsx'

interface Props { value: number | null; className?: string }

export function ConfidenceBadge({ value, className }: Props) {
  if (value == null) return <span className={clsx('text-gray-400 text-xs', className)}>—</span>
  const pct   = Math.round(value * 100)
  const color = pct >= 80 ? 'text-green-700 bg-green-50' : pct >= 50 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', color, className)}>
      {pct}%
    </span>
  )
}
