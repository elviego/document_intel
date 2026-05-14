import clsx from 'clsx'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size    = 'sm' | 'md'

const base = 'inline-flex items-center gap-1.5 font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed text-xs tracking-wide uppercase'

const variants: Record<Variant, string> = {
  primary:   'bg-brand-600 text-white hover:bg-brand-500 focus:ring-brand-500',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-brand-500',
  danger:    'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500',
  ghost:     'text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:ring-gray-300',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5',
  md: 'px-4 py-2',
}

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: Props) {
  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} {...props} />
  )
}
