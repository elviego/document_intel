import clsx from 'clsx'

type Variant = 'green' | 'red' | 'gray' | 'blue' | 'yellow'

const styles: Record<Variant, string> = {
  green:  'bg-green-50 text-green-700 ring-green-600/20',
  red:    'bg-red-50 text-red-700 ring-red-600/20',
  gray:   'bg-gray-50 text-gray-600 ring-gray-500/10',
  blue:   'bg-blue-50 text-blue-700 ring-blue-700/10',
  yellow: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
}

export function Badge({ children, variant = 'gray' }: { children: React.ReactNode; variant?: Variant }) {
  return (
    <span className={clsx('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', styles[variant])}>
      {children}
    </span>
  )
}
