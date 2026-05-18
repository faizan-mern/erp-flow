'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationStore } from '@/store/notification.store'

export function useSocket() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const queryClient = useQueryClient()
  const addNotification = useNotificationStore((s) => s.addNotification)
  const incrementUnread = useNotificationStore((s) => s.incrementUnread)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!accessToken) {
      socketRef.current?.disconnect()
      socketRef.current = null
      return
    }

    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    })

    socketRef.current = socket

    socket.on('notification:new', (notification) => {
      addNotification(notification)
      incrementUnread()
    })

    socket.on('inventory:updated', ({ productId }: { productId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', productId] })
      queryClient.invalidateQueries({ queryKey: ['products-low-stock-count'] })
    })

    socket.on('dashboard:refresh', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [accessToken, queryClient, addNotification, incrementUnread])
}
