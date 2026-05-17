'use client'

import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { useToastStore, ToastVariant } from '@/store/toast.store'

const ICON: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 size={15} className="text-success shrink-0" />,
  error:   <AlertCircle  size={15} className="text-danger  shrink-0" />,
  info:    <Info         size={15} className="text-primary shrink-0" />,
}

const STYLES: Record<ToastVariant, string> = {
  success: 'border-success/30',
  error:   'border-danger/30',
  info:    'border-primary/30',
}

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border bg-surface shadow-lg min-w-72 max-w-sm text-[13px] text-strong ${STYLES[t.variant]}`}
        >
          {ICON[t.variant]}
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="text-muted hover:text-strong transition-colors ml-1 shrink-0"
            aria-label="Dismiss"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
