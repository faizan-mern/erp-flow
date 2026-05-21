'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchNotifications, markAllRead } from '@/lib/notifications'
import { useNotificationStore } from '@/store/notification.store'
import { useAuthStore } from '@/store/auth.store'

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const { notifications, unreadCount, setInitial, clearUnread } = useNotificationStore()
  const accessToken = useAuthStore((s) => s.accessToken)

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    staleTime: 30_000,
    enabled: !!accessToken,
  })

  useEffect(() => {
    if (data) setInitial(data.notifications, data.unreadCount)
  }, [data, setInitial])

  const markReadMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      clearUnread()
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-1.5 rounded-md hover:bg-canvas transition-colors text-muted hover:text-strong"
        aria-label="Notifications"
      >
        <Bell size={16} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-danger text-white text-[10px] font-semibold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-80 bg-surface border border-border rounded-xl shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-[13px] font-semibold text-strong">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={() => markReadMutation.mutate()}
                className="text-[11px] text-primary hover:text-primary-hover transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <li className="px-4 py-8 text-center text-[13px] text-muted">
                No notifications yet
              </li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.id}
                  className={`px-4 py-3 ${!n.isRead ? 'bg-primary-soft/40' : ''}`}
                >
                  <p className="text-[13px] font-medium text-strong">{n.title}</p>
                  <p className="text-[12px] text-muted mt-0.5 leading-snug">{n.message}</p>
                  <p className="text-[11px] text-muted/60 mt-1">{timeAgo(n.createdAt)}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
