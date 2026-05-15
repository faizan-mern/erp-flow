type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full px-3 py-2 border border-border rounded-lg text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary/40 ${className}`}
      {...props}
    />
  )
}
