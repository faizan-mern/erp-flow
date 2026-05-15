interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="p-12 text-center">
      <p className="text-[14px] font-medium text-strong mb-1">{title}</p>
      {description && <p className="text-[13px] text-muted mb-4">{description}</p>}
      {action}
    </div>
  )
}
