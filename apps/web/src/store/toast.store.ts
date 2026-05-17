import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastStore {
  toasts: ToastItem[]
  show: (message: string, variant?: ToastVariant) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show(message, variant = 'success') {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }))
    // Auto-dismiss after 3.5 seconds — runs outside React, so it lives here not in a useEffect
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500)
  },
  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))

// Imperative API — call toast.success('msg') anywhere: mutation callbacks, utils, etc.
// Works because Zustand's getState() is available outside of React components.
export const toast = {
  success: (msg: string) => useToastStore.getState().show(msg, 'success'),
  error:   (msg: string) => useToastStore.getState().show(msg, 'error'),
  info:    (msg: string) => useToastStore.getState().show(msg, 'info'),
}
