import { create } from 'zustand'

export interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  data?: Record<string, unknown>
}

interface NotificationState {
  notifications: NotificationItem[]
  unreadCount: number
  initialized: boolean
  addNotification: (n: NotificationItem) => void
  incrementUnread: () => void
  setInitial: (notifications: NotificationItem[], unreadCount: number) => void
  clearUnread: () => void
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  unreadCount: 0,
  initialized: false,
  addNotification: (n) =>
    set((s) => ({ notifications: [n, ...s.notifications].slice(0, 20) })),
  incrementUnread: () =>
    set((s) => ({ unreadCount: s.unreadCount + 1 })),
  setInitial: (notifications, unreadCount) =>
    set({ notifications, unreadCount, initialized: true }),
  clearUnread: () =>
    set({ unreadCount: 0 }),
}))
