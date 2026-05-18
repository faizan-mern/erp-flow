import { ChevronDown } from 'lucide-react'

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

// Token-aware select that mirrors Input styling so forms stay visually consistent.
// `appearance-none` strips the native OS arrow; we draw our own with a Lucide
// ChevronDown absolutely positioned on the right. `pr-8` makes room for it.
export function Select({ className = '', children, ...props }: SelectProps) {
  return (
    <div className="relative w-full">
      <select
        className={`w-full appearance-none pl-3 pr-8 py-2 border border-border rounded-lg text-[13px] bg-surface text-strong focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
      />
    </div>
  )
}
