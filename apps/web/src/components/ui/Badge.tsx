import clsx from 'clsx'

type Variant = 'green' | 'red' | 'gray' | 'blue' | 'yellow'

const dot: Record<Variant, string> = {
  green:  'bg-emerald-400',
  red:    'bg-red-400',
  gray:   'bg-gray-400',
  blue:   'bg-brand-400',
  yellow: 'bg-amber-400',
}

const text: Record<Variant, string> = {
  green:  'text-emerald-700',
  red:    'text-red-600',
  gray:   'text-gray-500',
  blue:   'text-brand-600',
  yellow: 'text-amber-700',
}

export function Badge({ children, variant = 'gray' }: { children: React.ReactNode; variant?: Variant }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide', text[variant])}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dot[variant])} />
      {children}
    </span>
  )
}
