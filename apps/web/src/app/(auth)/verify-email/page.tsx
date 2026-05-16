'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader } from 'lucide-react'
import api from '@/lib/api'
import { Card } from '@/components/ui/card'

type Status = 'loading' | 'success' | 'error'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No verification token found in the link.')
      return
    }

    api.get(`/api/v1/auth/verify-email/${token}`)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error')
        setMessage(err.response?.data?.message || 'This link is invalid or has already been used.')
      })
  }, [token])

  return (
    <Card className="w-full max-w-md p-8 shadow-sm text-center">
      {status === 'loading' && (
        <>
          <Loader size={32} className="mx-auto text-primary animate-spin mb-4" />
          <p className="text-[14px] text-muted">Verifying your email...</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-12 h-12 bg-success-soft rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={22} className="text-success" />
          </div>
          <h2 className="text-xl font-semibold text-strong mb-2">Email verified</h2>
          <p className="text-[13px] text-muted mb-6">Your account is ready. You can now sign in.</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center bg-primary text-white px-5 py-2 rounded-lg text-[13px] font-medium hover:bg-primary-hover transition-colors"
          >
            Go to login
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-12 h-12 bg-danger-soft rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle size={22} className="text-danger" />
          </div>
          <h2 className="text-xl font-semibold text-strong mb-2">Verification failed</h2>
          <p className="text-[13px] text-muted mb-6">{message}</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center border border-border text-muted px-5 py-2 rounded-lg text-[13px] font-medium hover:bg-canvas transition-colors"
          >
            Back to login
          </Link>
        </>
      )}
    </Card>
  )
}
