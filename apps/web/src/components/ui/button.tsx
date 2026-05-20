interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}

const variants = {
  primary:   'bg-primary text-white hover:bg-primary-hover',
  secondary: 'border border-border text-muted hover:bg-canvas',
  danger:    'bg-danger-soft text-danger border border-danger/20 hover:bg-red-100',
  ghost:     'text-muted hover:bg-canvas hover:text-strong',
}

const sizes = {
  sm: 'px-3 py-1 text-xs',
  md: 'px-5 py-2 text-[13px]',
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
