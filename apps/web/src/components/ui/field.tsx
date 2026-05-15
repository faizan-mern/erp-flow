interface FieldProps {
  label: string
  hint?: string
  error?: string
  className?: string
  children: React.ReactNode
}

export function Field({ label, hint, error, className = '', children }: FieldProps) {
  return (
    <div className={className}>
      <label className="block text-[12px] font-medium text-muted mb-1">{label}</label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted mt-1">{hint}</p>}
      {error && <p className="text-[11px] text-danger mt-1">{error}</p>}
    </div>
  )
}
