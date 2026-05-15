interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
}

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'border border-border text-muted hover:bg-canvas',
  danger: 'bg-danger-soft text-danger border border-danger/20 hover:bg-red-100',
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
