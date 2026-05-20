type BadgeVariant = 'active' | 'inactive' | 'pending' | 'approved' | 'rejected' | 'success' | 'danger'

const styles: Record<BadgeVariant, string> = {
  active:   'bg-success-soft text-success',
  inactive: 'bg-divider text-muted',
  pending:  'bg-warning-soft text-warning',
  approved: 'bg-success-soft text-success',
  rejected: 'bg-danger-soft text-danger',
  success:  'bg-success-soft text-success',
  danger:   'bg-danger-soft text-danger',
}

interface BadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
}

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${styles[variant]}`}>
      {children}
    </span>
  )
}
