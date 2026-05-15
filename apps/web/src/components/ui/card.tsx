interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-surface rounded-xl border border-border ${className}`}>
      {children}
    </div>
  )
}
