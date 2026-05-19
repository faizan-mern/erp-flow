import api from './api'
import type { NotificationItem } from '@/store/notification.store'

export async function fetchNotifications(): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
  const { data } = await api.get<{ data: { notifications: NotificationItem[]; unreadCount: number } }>('/api/v1/notifications')
  return data.data
}

export async function markAllRead(): Promise<void> {
  await api.post('/api/v1/notifications/mark-read')
}
