'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Loader } from 'lucide-react'
import api from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { PasswordInput } from '@/components/ui/password-input'
import { Button } from '@/components/ui/button'

// useSearchParams() must live inside a Suspense boundary for Next 15+ prerender.
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-md p-8 shadow-sm text-center">
          <Loader size={32} className="mx-auto text-primary animate-spin mb-4" />
          <p className="text-[14px] text-muted">Loading...</p>
        </Card>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await api.post('/api/v1/auth/reset-password', { token, password })
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Reset failed. The link may have expired.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <Card className="w-full max-w-md p-8 shadow-sm text-center">
        <p className="text-[14px] text-danger mb-4">Invalid reset link — no token found.</p>
        <Link href="/forgot-password" className="text-primary text-[13px] hover:underline">
          Request a new link
        </Link>
      </Card>
    )
  }

  if (success) {
    return (
      <Card className="w-full max-w-md p-8 shadow-sm text-center">
        <div className="w-12 h-12 bg-success-soft rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={22} className="text-success" />
        </div>
        <h2 className="text-xl font-semibold text-strong mb-2">Password reset</h2>
        <p className="text-[13px] text-muted">Redirecting you to login...</p>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md p-8 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-strong">New password</h1>
        <p className="text-muted mt-1 text-sm">Choose a strong password for your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="New Password">
          <PasswordInput
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
          />
        </Field>

        <Field label="Confirm Password">
          <PasswordInput
            name="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat your new password"
            required
          />
        </Field>

        {error && (
          <p className="text-[13px] text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Resetting...' : 'Reset password'}
        </Button>
      </form>
    </Card>
  )
}
