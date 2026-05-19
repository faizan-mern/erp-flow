'use client'

import { useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAccessToken, logout } = useAuthStore()

  useEffect(() => {
    const state = useAuthStore.getState()
    if (!state.user) return
    if (state.accessToken) return

    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
    axios
      .post(`${BASE_URL}/api/v1/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        setAccessToken(res.data.data.accessToken)
      })
      .catch(() => {
        logout()
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>
}
